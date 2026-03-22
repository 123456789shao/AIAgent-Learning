import { GoogleGenAI } from "@google/genai";

type AskModelInput = {
  apiKey: string;
  model: string;
  maxTokens: number;
  systemPrompt: string;
  question: string;
};

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
