import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config();

// 统一描述 Day4 运行时需要的配置项。
export type Config = {
  apiKey: string;
  model: string;
  baseURL: string;
  maxTokens: number;
  memoryFilePath: string;
  recentMessagesLimit: number;
  compressionTriggerCount: number;
};

const apiKey = process.env.QWEN_API_KEY;
const model = process.env.QWEN_MODEL || "qwen-plus";
const baseURL = process.env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
const maxTokens = 1200;
const memoryFilePath = fileURLToPath(new URL("../memory.json", import.meta.url));
const recentMessagesLimit = 6;
const compressionTriggerCount = 8;

// 读取并校验本地 .env 配置。
export function getConfig(): Config {
  if (!apiKey) {
    throw new Error("缺少 QWEN_API_KEY。请先复制 .env.example 为 .env 并填写你的密钥。");
  }

  return {
    apiKey,
    model,
    baseURL,
    maxTokens,
    memoryFilePath,
    recentMessagesLimit,
    compressionTriggerCount,
  };
}
