import { PromptTemplate } from "@langchain/core/prompts";

import { createOllamaModel } from "../models/ollama.js";
import { BASIC_PROMPT_TEMPLATE } from "../prompts/basicPrompt.js";

export async function runBasicChain(input: string) {
  const prompt = PromptTemplate.fromTemplate(BASIC_PROMPT_TEMPLATE);
  const model = createOllamaModel();
  const chain = prompt.pipe(model);
  const result = await chain.invoke({ input });

  return typeof result.content === "string"
    ? result.content
    : JSON.stringify(result.content, null, 2);
}
