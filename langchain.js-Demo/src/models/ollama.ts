import { ChatOllama } from "@langchain/ollama";

import { env } from "../config/env.js";

export function createOllamaModel() {
  return new ChatOllama({
    baseUrl: env.OLLAMA_BASE_URL,
    model: env.OLLAMA_MODEL,
  });
}
