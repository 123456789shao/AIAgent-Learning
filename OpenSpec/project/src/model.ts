// 与模型供应商交互的最薄封装层，统一处理超时、响应格式和 token 用量。
import { performance } from "node:perf_hooks";

// 描述一次聊天模型调用所需的输入。
type AskModelInput = {
  apiKey: string;
  model: string;
  baseURL: string;
  maxTokens: number;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  timeoutMs: number;
};

// 描述一次 embedding 批量生成所需的输入。
type GetEmbeddingsInput = {
  apiKey: string;
  model: string;
  baseURL: string;
  texts: string[];
  timeoutMs: number;
};

// 描述模型调用结果，包含文本、耗时和 token 用量。
export type AskModelResult = {
  text: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
};

// 描述聊天接口返回结构中会用到的字段。
type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
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

// 调用 fetch 并附带超时控制。
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("模型请求超时，请稍后重试。");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// 调用 Qwen 聊天接口，返回模型文本和用量信息。
export async function askModel({
  apiKey,
  model,
  baseURL,
  maxTokens,
  messages,
  timeoutMs,
}: AskModelInput): Promise<AskModelResult> {
  const startedAt = performance.now();
  const response = await fetchWithTimeout(
    `${baseURL}/chat/completions`,
    {
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
    },
    timeoutMs,
  );

  const data = (await response.json()) as ChatCompletionResponse;

  if (!response.ok) {
    throw new Error(data.error?.message || `Qwen 请求失败：${response.status}`);
  }

  const content = data.choices?.[0]?.message?.content;
  let text = "";

  if (typeof content === "string") {
    text = content.trim();
  } else if (Array.isArray(content)) {
    text = content
      .map((item) => (item.type === "text" ? item.text || "" : ""))
      .join("")
      .trim();
  }

  return {
    text,
    latencyMs: performance.now() - startedAt,
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
  };
}

// 调用 embedding 接口，把多段文本转成向量。
export async function getEmbeddings({
  apiKey,
  model,
  baseURL,
  texts,
  timeoutMs,
}: GetEmbeddingsInput): Promise<number[][]> {
  const vectors: number[][] = [];

  // 逐条调用虽然慢一些，但逻辑最直观，也更容易定位是哪段文本 embedding 失败。
  for (const text of texts) {
    const response = await fetchWithTimeout(
      `${baseURL}/embeddings`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: text,
        }),
      },
      timeoutMs,
    );

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
