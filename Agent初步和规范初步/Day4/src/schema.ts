import { z } from "zod";

// 描述一条聊天消息的基础结构。
export const chatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().trim().min(1, "消息内容不能为空"),
});

// 描述用户的长期偏好信息。
export const userPreferencesSchema = z.object({
  language: z.string().trim().min(1).optional(),
  outputStyle: z.string().trim().min(1).optional(),
  techStack: z.string().trim().min(1).optional(),
});

// 描述会话记忆：历史摘要 + 最近消息。
export const sessionMemorySchema = z.object({
  summary: z.string(),
  recentMessages: z.array(chatMessageSchema),
});

// 描述本地持久化的完整记忆文件结构。
export const persistedMemorySchema = z.object({
  preferences: userPreferencesSchema,
  session: sessionMemorySchema,
});

// 描述偏好提取步骤的结构化结果。
export const preferenceExtractionSchema = z.object({
  language: z.string().trim().min(1).optional(),
  outputStyle: z.string().trim().min(1).optional(),
  techStack: z.string().trim().min(1).optional(),
  shouldUpdate: z.boolean(),
});

// 描述历史压缩步骤的结构化结果。
export const compressionResultSchema = z.object({
  summary: z.string().trim().min(1, "摘要不能为空"),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type SessionMemory = z.infer<typeof sessionMemorySchema>;
export type PersistedMemory = z.infer<typeof persistedMemorySchema>;
export type PreferenceExtractionResult = z.infer<typeof preferenceExtractionSchema>;
export type CompressionResult = z.infer<typeof compressionResultSchema>;

// 如果模型包了 ```json 代码块，就先把里面的 JSON 拿出来。
function extractJson(rawText: string): string {
  const trimmed = rawText.trim();

  if (trimmed.startsWith("```")) {
    const codeFenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeFenceMatch?.[1]) {
      return codeFenceMatch[1].trim();
    }
  }

  return trimmed;
}

// 统一解析模型返回的 JSON 文本。
function parseJson<T>(rawText: string, schema: z.ZodSchema<T>, fallbackMessage: string): T {
  const jsonText = extractJson(rawText);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(fallbackMessage);
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message || fallbackMessage);
  }

  return result.data;
}

// 解析偏好提取结果。
export function parsePreferenceExtraction(rawText: string): PreferenceExtractionResult {
  return parseJson(rawText, preferenceExtractionSchema, "偏好提取结果不是合法 JSON");
}

// 解析历史压缩结果。
export function parseCompressionResult(rawText: string): CompressionResult {
  return parseJson(rawText, compressionResultSchema, "历史压缩结果不是合法 JSON");
}

// 校验本地持久化记忆数据。
export function parsePersistedMemory(rawData: unknown): PersistedMemory {
  const result = persistedMemorySchema.safeParse(rawData);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message || "记忆文件结构不合法");
  }

  return result.data;
}
