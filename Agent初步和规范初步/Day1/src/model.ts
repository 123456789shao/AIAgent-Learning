import { GoogleGenAI } from "@google/genai";

// 描述一次模型调用需要的输入参数。
type AskModelInput = {
  apiKey: string;
  model: string;
  maxTokens: number;
  systemPrompt: string;
  question: string;
};

// 只负责调用 Gemini，并返回原始文本结果。
export async function askModel({
  apiKey,
  model,
  maxTokens,
  systemPrompt,
  question,
}: AskModelInput): Promise<string> {
  const client = new GoogleGenAI({ apiKey });

  const response = await client.models.generateContent({
    model,
    contents: question,
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: maxTokens,
    },
  });

  return response.text?.trim() || "";
}
