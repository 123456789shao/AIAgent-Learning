import type { ChatMessage } from "./schema.js";

// 描述一次聊天模型调用所需的输入。
type AskModelInput = {
  apiKey: string;
  model: string;
  baseURL: string;
  maxTokens: number;
  messages: ChatMessage[];
};

// 描述一次 embedding 批量生成所需的输入。
type GetEmbeddingsInput = {
  apiKey: string;
  model: string;
  baseURL: string;
  texts: string[];
};

// 描述聊天接口返回结构中会用到的字段。
type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

// 描述 embedding 接口返回结构中会用到的字段。
type EmbeddingResponse = {
  data?: Array<{
    embedding?: number[];
  }>;
  error?: {
    message?: string;
  };
};

// 调用 Qwen 聊天接口，返回模型文本结果。
export async function askModel({
  apiKey,
  model,
  baseURL,
  maxTokens,
  messages,
}: AskModelInput): Promise<string> {
  const response = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages,
    }),
  });

  const data = (await response.json()) as ChatCompletionResponse;

  if (!response.ok) {
    throw new Error(data.error?.message || `Qwen 请求失败：${response.status}`);
  }

  const content = data.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => (item.type === "text" ? item.text || "" : ""))
      .join("")
      .trim();
  }

  return "";
}

// 调用 embedding 接口，把多段文本转成向量。
export async function getEmbeddings({
  apiKey,
  model,
  baseURL,
  texts,
}: GetEmbeddingsInput): Promise<number[][]> {
  const vectors: number[][] = [];

  for (const text of texts) {
    const response = await fetch(`${baseURL}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: text,
      }),
    });

    const data = (await response.json()) as EmbeddingResponse;

    if (!response.ok) {
      throw new Error(data.error?.message || `Embedding 请求失败：${response.status}`);
    }

    const embedding = data.data?.[0]?.embedding;
    if (!embedding || embedding.length === 0) {
      throw new Error("Embedding 返回为空");
    }

    vectors.push(embedding);
  }

  return vectors;
}
