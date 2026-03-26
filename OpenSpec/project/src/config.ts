// 统一读取并校验运行配置，避免业务代码到处直接访问 process.env。
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

import { ConfigError } from "./errors.js";

dotenv.config();

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
  evalFilePath: string;
  chunkSize: number;
  chunkOverlap: number;
  retrievalTopK: number;
  rerankTopK: number;
  metricsWindowSize: number;
  appPassword: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  loginRateLimitMaxAttempts: number;
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
const evalFilePath = fileURLToPath(new URL("../eval/cases.json", import.meta.url));
const chunkSize = 700;
const chunkOverlap = 100;
const retrievalTopK = 8;
const rerankTopK = 4;
const metricsWindowSize = 50;
const appPassword = process.env.APP_PASSWORD;
const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 600000);
const rateLimitMaxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 20);
const loginRateLimitMaxAttempts = Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || 5);

export function getConfig(): Config {
  // 启动阶段尽早失败，能比运行到中途才报 provider / auth 错误更容易排查。
  if (!apiKey) {
    throw new ConfigError("缺少 QWEN_API_KEY。请先复制 .env.example 为 .env 并填写你的密钥。");
  }

  if (!appPassword) {
    throw new ConfigError("缺少 APP_PASSWORD。请先在 .env 中配置登录密码。");
  }

  if (!Number.isFinite(port) || port <= 0) {
    throw new ConfigError("PORT 配置不合法，请检查 .env。");
  }

  if (!Number.isFinite(modelTimeoutMs) || modelTimeoutMs <= 0) {
    throw new ConfigError("MODEL_TIMEOUT_MS 配置不合法，请检查 .env。");
  }

  if (!Number.isFinite(rateLimitWindowMs) || rateLimitWindowMs <= 0) {
    throw new ConfigError("RATE_LIMIT_WINDOW_MS 配置不合法，请检查 .env。");
  }

  if (!Number.isFinite(rateLimitMaxRequests) || rateLimitMaxRequests <= 0) {
    throw new ConfigError("RATE_LIMIT_MAX_REQUESTS 配置不合法，请检查 .env。");
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
    evalFilePath,
    chunkSize,
    chunkOverlap,
    retrievalTopK,
    rerankTopK,
    metricsWindowSize,
    appPassword,
    rateLimitWindowMs,
    rateLimitMaxRequests,
    loginRateLimitMaxAttempts,
  };
}
