// 描述一次模型调用需要的输入参数。
type AskModelInput = {
  apiKey: string;
  model: string;
  maxTokens: number;
  baseURL: string;
  systemPrompt: string;
  question: string;
};

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

// 统一封装 Qwen 文本调用，返回模型原始文本。
export async function askModel({
  apiKey,
  model,
  maxTokens,
  baseURL,
  systemPrompt,
  question,
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
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
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
