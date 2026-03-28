import { PromptTemplate } from "@langchain/core/prompts";

import { createOllamaModel } from "../models/ollama.js";
import { AGENT_PROMPT_TEMPLATE } from "../prompts/agentPrompt.js";
import type { AgentExecutionInput, AgentHistory, AgentRunResult } from "./agentTypes.js";

function formatHistory(history: AgentHistory) {
  if (history.length === 0) {
    return "暂无历史";
  }

  return history.map((message) => `${message.role}: ${message.content}`).join("\n");
}

export async function runAgent(input: AgentExecutionInput): Promise<AgentRunResult> {
  // 第二步仍保持最小 agent，只是在 prompt 中注入会话 history。
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
