import { PromptTemplate } from "@langchain/core/prompts";

import { createOllamaModel } from "../models/ollama.js";
import { AGENT_PROMPT_TEMPLATE } from "../prompts/agentPrompt.js";
import type { AgentExecutionInput, AgentHistory, AgentRunResult } from "./agentTypes.js";
import { runAgentLoop } from "./runAgentLoop.js";

function formatHistory(history: AgentHistory) {
  if (history.length === 0) {
    return "暂无历史";
  }

  return history.map((message) => `${message.role}: ${message.content}`).join("\n");
}

async function runModelAnswer(input: AgentExecutionInput): Promise<AgentRunResult> {
  const prompt = PromptTemplate.fromTemplate(AGENT_PROMPT_TEMPLATE);
  const model = createOllamaModel();
  const chain = prompt.pipe(model);
  const result = await chain.invoke({
    history: formatHistory(input.history),
    input: input.userInput,
  });

  const output =
    typeof result.content === "string"
      ? result.content
      : JSON.stringify(result.content, null, 2);

  return {
    mode: "single-agent",
    output,
  };
}

export async function runAgent(input: AgentExecutionInput): Promise<AgentRunResult> {
  try {
    return await runAgentLoop(input);
  } catch {
    return runModelAnswer(input);
  }
}
