import { PromptTemplate } from "@langchain/core/prompts";

import { createOllamaModel } from "../models/ollama.js";
import { AGENT_LOOP_PROMPT_TEMPLATE } from "../prompts/agentPrompt.js";
import { queryWeather } from "../tools/weatherTool.js";
import type {
  AgentExecutionInput,
  AgentRunResult,
  AgentStepTrace,
  AgentStopReason,
  ToolName,
  ToolTrace,
} from "./agentTypes.js";

type LoopDecision =
  | {
      type: "final";
      answer: string;
      reason: string;
    }
  | {
      type: "tool";
      toolName: ToolName;
      toolInput: {
        city?: string;
      };
      reason: string;
    };

const MAX_STEPS = 3;
const MAX_TOOL_FAILURES = 1;

function formatHistory(history: AgentExecutionInput["history"]) {
  if (history.length === 0) {
    return "暂无历史";
  }

  return history.map((message) => `${message.role}: ${message.content}`).join("\n");
}

function formatSteps(steps: AgentStepTrace[]) {
  if (steps.length === 0) {
    return "暂无已执行步骤";
  }

  return steps
    .map((step) => {
      if (step.decisionType === "final") {
        return `step ${step.stepIndex}: final -> ${step.finalAnswer ?? ""}`;
      }

      return `step ${step.stepIndex}: tool(${step.toolTrace?.toolName ?? "unknown"}) -> ${step.toolStatus ?? "unknown"}`;
    })
    .join("\n");
}

function buildObservation(step: AgentStepTrace) {
  if (!step.toolTrace) {
    return "暂无 tool observation";
  }

  if (step.toolStatus === "failed") {
    return JSON.stringify(
      {
        toolName: step.toolTrace.toolName,
        toolInput: step.toolTrace.toolInput,
        error: step.error ?? "工具执行失败",
      },
      null,
      2,
    );
  }

  return JSON.stringify(
    {
      toolName: step.toolTrace.toolName,
      toolInput: step.toolTrace.toolInput,
      toolOutput: step.toolTrace.toolOutput,
    },
    null,
    2,
  );
}

function isLoopDecision(value: unknown): value is LoopDecision {
  if (!value || typeof value !== "object") {
    return false;
  }

  const decision = value as Record<string, unknown>;

  if (decision.type === "final") {
    return typeof decision.answer === "string" && typeof decision.reason === "string";
  }

  if (decision.type === "tool") {
    return (
      decision.toolName === "weather" &&
      typeof decision.reason === "string" &&
      typeof decision.toolInput === "object" &&
      decision.toolInput !== null
    );
  }

  return false;
}

function extractRememberedName(userInput: string) {
  const match = userInput.match(/我叫([^，。！!？?\s]+)/);

  return match?.[1]?.trim();
}

function buildStopResult(
  output: string,
  steps: AgentStepTrace[],
  stopReason: AgentStopReason,
  toolTrace?: ToolTrace,
): AgentRunResult {
  return {
    mode: "agent-loop",
    output,
    toolTrace,
    steps,
    stepCount: steps.length,
    stopReason,
  };
}

function buildRememberNameResult(input: AgentExecutionInput) {
  const rememberedName = extractRememberedName(input.userInput);

  if (!rememberedName || !input.userInput.includes("记住")) {
    return;
  }

  const output = `好的，我记住了，你叫${rememberedName}。`;
  const steps: AgentStepTrace[] = [
    {
      stepIndex: 1,
      decisionType: "final",
      reason: "用户在主动提供身份信息并要求记住，直接确认即可。",
      rawModelOutput: JSON.stringify(
        {
          type: "final",
          answer: output,
          reason: "用户在主动提供身份信息并要求记住，直接确认即可。",
        },
        null,
        2,
      ),
      finalAnswer: output,
    },
  ];

  return buildStopResult(output, steps, "final_answer");
}

async function runLoopDecision(input: AgentExecutionInput, steps: AgentStepTrace[]) {
  const prompt = PromptTemplate.fromTemplate(AGENT_LOOP_PROMPT_TEMPLATE);
  const model = createOllamaModel();
  const chain = prompt.pipe(model);
  const result = await chain.invoke({
    history: formatHistory(input.history),
    input: input.userInput,
    step: String(steps.length + 1),
    steps: formatSteps(steps),
    observation: steps.length === 0 ? "暂无 tool observation" : buildObservation(steps.at(-1)!),
  });

  const rawModelOutput =
    typeof result.content === "string"
      ? result.content
      : JSON.stringify(result.content, null, 2);

  try {
    const parsed = JSON.parse(rawModelOutput) as unknown;

    if (!isLoopDecision(parsed)) {
      return { rawModelOutput };
    }

    return {
      rawModelOutput,
      decision: parsed,
    };
  } catch {
    return { rawModelOutput };
  }
}

export async function runAgentLoop(input: AgentExecutionInput): Promise<AgentRunResult> {
  const rememberNameResult = buildRememberNameResult(input);

  if (rememberNameResult) {
    return rememberNameResult;
  }

  const steps: AgentStepTrace[] = [];
  let toolFailures = 0;
  let lastToolTrace: ToolTrace | undefined;

  for (let index = 1; index <= MAX_STEPS; index += 1) {
    const { decision, rawModelOutput } = await runLoopDecision(input, steps);

    if (!decision) {
      steps.push({
        stepIndex: index,
        decisionType: "final",
        reason: "模型输出不符合预期 JSON 结构",
        rawModelOutput,
        finalAnswer: "暂时无法稳定解析本次模型决策，请稍后重试。",
      });

      return buildStopResult(
        "暂时无法稳定解析本次模型决策，请稍后重试。",
        steps,
        "invalid_model_output",
        lastToolTrace,
      );
    }

    if (decision.type === "final") {
      steps.push({
        stepIndex: index,
        decisionType: "final",
        reason: decision.reason,
        rawModelOutput,
        finalAnswer: decision.answer,
      });

      return buildStopResult(decision.answer, steps, "final_answer", lastToolTrace);
    }

    if (decision.toolName !== "weather") {
      steps.push({
        stepIndex: index,
        decisionType: "tool",
        reason: decision.reason,
        rawModelOutput,
        toolStatus: "failed",
        error: `当前不支持 tool: ${decision.toolName}`,
      });

      return buildStopResult(
        `当前不支持 tool: ${decision.toolName}`,
        steps,
        "unknown_tool",
        lastToolTrace,
      );
    }

    const city = decision.toolInput.city?.trim();

    if (!city) {
      steps.push({
        stepIndex: index,
        decisionType: "final",
        reason: decision.reason,
        rawModelOutput,
        finalAnswer: "请先告诉我你想查询哪个城市的天气，例如：北京今天天气怎么样？",
      });

      return buildStopResult(
        "请先告诉我你想查询哪个城市的天气，例如：北京今天天气怎么样？",
        steps,
        "final_answer",
        lastToolTrace,
      );
    }

    try {
      const weather = await queryWeather({ city });
      lastToolTrace = {
        toolName: "weather",
        toolInput: city,
        toolOutput: JSON.stringify(weather, null, 2),
      };

      steps.push({
        stepIndex: index,
        decisionType: "tool",
        reason: decision.reason,
        rawModelOutput,
        toolTrace: lastToolTrace,
        toolStatus: "success",
      });
    } catch (error) {
      toolFailures += 1;
      lastToolTrace = {
        toolName: "weather",
        toolInput: city,
        toolOutput: "",
      };

      steps.push({
        stepIndex: index,
        decisionType: "tool",
        reason: decision.reason,
        rawModelOutput,
        toolTrace: lastToolTrace,
        toolStatus: "failed",
        error: error instanceof Error ? error.message : "weather tool 执行失败",
      });

      if (toolFailures >= MAX_TOOL_FAILURES) {
        return buildStopResult(
          `暂时无法查询到${city}的天气信息，请稍后重试。`,
          steps,
          "tool_failure_limit_reached",
          lastToolTrace,
        );
      }
    }
  }

  return buildStopResult(
    "本次任务已达到最大执行步数，请换一种问法再试。",
    steps,
    "max_steps_reached",
    lastToolTrace,
  );
}
