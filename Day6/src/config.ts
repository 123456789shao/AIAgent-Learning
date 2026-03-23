import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config();

// 描述 Day6 运行时需要的配置项。
export type Config = {
  apiKey: string;
  model: string;
  embeddingModel: string;
  baseURL: string;
  maxTokens: number;
  port: number;
  modelTimeoutMs: number;
  knowledgeDirPath: string;
  indexFilePath: string;
  publicDirPath: string;
  chunkSize: number;
  chunkOverlap: number;
  retrievalTopK: number;
  rerankTopK: number;
  metricsWindowSize: number;
};

const apiKey = process.env.QWEN_API_KEY;
const model = process.env.QWEN_MODEL || "qwen-plus";
const embeddingModel = process.env.QWEN_EMBEDDING_MODEL || "text-embedding-v4";
const baseURL = process.env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
const maxTokens = 1400;
const port = Number(process.env.PORT || 3000);
const modelTimeoutMs = Number(process.env.MODEL_TIMEOUT_MS || 30000);
const knowledgeDirPath = fileURLToPath(new URL("../knowledge", import.meta.url));
const indexFilePath = fileURLToPath(new URL("../rag-index.json", import.meta.url));
const publicDirPath = fileURLToPath(new URL("../public", import.meta.url));
const chunkSize = 700;
const chunkOverlap = 100;
const retrievalTopK = 8;
const rerankTopK = 4;
const metricsWindowSize = 50;

// 统一读取并返回 Day6 配置。
export function getConfig(): Config {
  if (!apiKey) {
    throw new Error("缺少 QWEN_API_KEY。请先复制 .env.example 为 .env 并填写你的密钥。");
  }

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("PORT 配置不合法，请检查 .env。");
  }

  if (!Number.isFinite(modelTimeoutMs) || modelTimeoutMs <= 0) {
    throw new Error("MODEL_TIMEOUT_MS 配置不合法，请检查 .env。");
  }

  return {
    apiKey,
    model,
    embeddingModel,
    baseURL,
    maxTokens,
    port,
    modelTimeoutMs,
    knowledgeDirPath,
    indexFilePath,
    publicDirPath,
    chunkSize,
    chunkOverlap,
    retrievalTopK,
    rerankTopK,
    metricsWindowSize,
  };
}
