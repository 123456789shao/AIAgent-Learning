import { PromptTemplate } from "@langchain/core/prompts";

import { createOllamaModel } from "../models/ollama.js";
import { AGENT_PROMPT_TEMPLATE } from "../prompts/agentPrompt.js";
import type { AgentRunInput, AgentRunResult } from "./agentTypes.js";

export async function runAgent(input: AgentRunInput): Promise<AgentRunResult> {
  // Phase 1 只做最小 agent：统一入口 + prompt + model 调用。
  const prompt = PromptTemplate.fromTemplate(AGENT_PROMPT_TEMPLATE);
  const model = createOllamaModel();
  const chain = prompt.pipe(model);
  const result = await chain.invoke({ input: input.userInput });

  const output =
    typeof result.content === "string"
      ? result.content
      : JSON.stringify(result.content, null, 2);

  return {
    mode: "single-agent",
    output,
  };
}
