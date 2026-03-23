import { askModel } from "./model.js";
import { buildActionSystemPrompt, buildFinalAnswerPrompt } from "./prompts.js";
import { parseAgentAction, parseFinalResult, type FinalResult } from "./schema.js";
import { runTool } from "./tools.js";

// 描述运行 Day3 Agent 时需要的输入参数。
type RunAgentInput = {
  apiKey: string;
  model: string;
  maxTokens: number;
  baseURL: string;
  question: string;
};

// 描述终端里展示的一条执行步骤。
export type AgentStep = {
  label: string;
  value: string;
};

// 返回最终结果，以及完整执行轨迹。
type RunAgentResult = {
  finalResult: FinalResult;
  steps: AgentStep[];
};

// 串起 Day3 主流程：决策动作、执行工具、生成最终答案。
export async function runAgent({
  apiKey,
  model,
  maxTokens,
  baseURL,
  question,
}: RunAgentInput): Promise<RunAgentResult> {
  const steps: AgentStep[] = [];

  const actionRawText = await askModel({
    apiKey,
    model,
    maxTokens,
    baseURL,
    systemPrompt: buildActionSystemPrompt(),
    question,
  });

  steps.push({ label: "模型动作原文", value: actionRawText || "<空>" });

  const action = parseAgentAction(actionRawText);
  steps.push({ label: "解析后的动作", value: JSON.stringify(action, null, 2) });

  if (action.type === "final_answer") {
    const finalResult = parseFinalResult(
      JSON.stringify({ answer: action.answer, usedTool: "none" }),
    );

    steps.push({ label: "是否调用工具", value: "否" });
    return { finalResult, steps };
  }

  steps.push({ label: "是否调用工具", value: "是" });
  steps.push({ label: "工具名称", value: action.toolName });
  steps.push({ label: "工具参数", value: JSON.stringify(action.args, null, 2) });

  const toolResult = await runTool(action.toolName, action.args);
  steps.push({ label: "工具返回结果", value: toolResult });

  const finalRawText = await askModel({
    apiKey,
    model,
    maxTokens,
    baseURL,
    systemPrompt: "你是一个负责基于工具结果生成最终答案的 AI 助手。",
    question: buildFinalAnswerPrompt({
      question,
      toolName: action.toolName,
      toolResult,
    }),
  });

  steps.push({ label: "最终答案原文", value: finalRawText || "<空>" });

  const finalResult = parseFinalResult(finalRawText);
  return { finalResult, steps };
}
