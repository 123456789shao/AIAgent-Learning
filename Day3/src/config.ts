import dotenv from "dotenv";

dotenv.config();

// 统一描述 Day3 运行时需要的配置项。
export type Config = {
  apiKey: string;
  model: string;
  maxTokens: number;
  baseURL: string;
};

const apiKey = process.env.QWEN_API_KEY;
const model = process.env.QWEN_MODEL || "qwen-plus";
const maxTokens = 1000;
const baseURL = process.env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";

// 读取并校验本地 .env 配置。
export function getConfig(): Config {
  if (!apiKey) {
    throw new Error("缺少 QWEN_API_KEY。请先复制 .env.example 为 .env 并填写你的密钥。");
  }

  return {
    apiKey,
    model,
    maxTokens,
    baseURL,
  };
}
