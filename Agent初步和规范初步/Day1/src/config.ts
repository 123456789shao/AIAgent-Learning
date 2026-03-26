import dotenv from "dotenv";

dotenv.config();

// 统一管理 Day1 运行时需要的配置。
export type Config = {
  apiKey: string;
  model: string;
  maxTokens: number;
};

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const maxTokens = 1000;

// 读取并返回配置；如果没填 key，就直接报错。
export function getConfig(): Config {
  if (!apiKey) {
    throw new Error("缺少 GEMINI_API_KEY。请先复制 .env.example 为 .env 并填写你的密钥。");
  }

  return {
    apiKey,
    model,
    maxTokens,
  };
}
