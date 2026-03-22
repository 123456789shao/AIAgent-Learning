import dotenv from "dotenv";

dotenv.config();

export type Config = {
  apiKey: string;
  model: string;
  maxTokens: number;
};

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const maxTokens = 1000;

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
