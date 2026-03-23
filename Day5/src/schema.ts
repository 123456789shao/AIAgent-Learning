import { z } from "zod";

// 校验知识库原始文档结构。
export const sourceDocumentSchema = z.object({
  docId: z.string().trim().min(1, "docId 不能为空"),
  title: z.string().trim().min(1, "title 不能为空"),
  sourcePath: z.string().trim().min(1, "sourcePath 不能为空"),
  category: z.string().trim().min(1, "category 不能为空"),
  content: z.string().trim().min(1, "content 不能为空"),
});

// 校验切片后的 chunk 结构。
export const documentChunkSchema = z.object({
  chunkId: z.string().trim().min(1, "chunkId 不能为空"),
  docId: z.string().trim().min(1, "docId 不能为空"),
  title: z.string().trim().min(1, "title 不能为空"),
  sourcePath: z.string().trim().min(1, "sourcePath 不能为空"),
  category: z.string().trim().min(1, "category 不能为空"),
  sectionPath: z.string().trim().min(1, "sectionPath 不能为空"),
  content: z.string().trim().min(1, "content 不能为空"),
  charStart: z.number().int().min(0, "charStart 不能小于 0"),
  charEnd: z.number().int().min(0, "charEnd 不能小于 0"),
});

// 校验带 embedding 的索引 chunk 结构。
export const indexedChunkSchema = documentChunkSchema.extend({
  embedding: z.array(z.number()).min(1, "embedding 不能为空"),
});

// 校验保存到本地 rag-index.json 的完整索引结构。
export const persistedRagIndexSchema = z.object({
  version: z.string().trim().min(1, "version 不能为空"),
  builtAt: z.string().trim().min(1, "builtAt 不能为空"),
  embeddingModel: z.string().trim().min(1, "embeddingModel 不能为空"),
  chunkSize: z.number().int().positive("chunkSize 必须大于 0"),
  chunkOverlap: z.number().int().nonnegative("chunkOverlap 不能小于 0"),
  documents: z.array(sourceDocumentSchema),
  chunks: z.array(indexedChunkSchema),
});

// 校验召回结果结构，额外包含各类分数字段。
export const retrievedChunkSchema = indexedChunkSchema.extend({
  similarityScore: z.number(),
  keywordScore: z.number(),
  finalScore: z.number(),
});

// 校验最终回答里的单条引用结构。
export const citationSchema = z.object({
  chunkId: z.string().trim().min(1, "chunkId 不能为空"),
  sourcePath: z.string().trim().min(1, "sourcePath 不能为空"),
  sectionPath: z.string().trim().min(1, "sectionPath 不能为空"),
  snippet: z.string().trim().min(1, "snippet 不能为空"),
});

// 校验最终带依据回答的结构。
export const groundedAnswerSchema = z.object({
  answer: z.string().trim().min(1, "answer 不能为空"),
  confidence: z.number().min(0, "confidence 不能小于 0").max(1, "confidence 不能大于 1"),
  insufficientEvidence: z.boolean(),
  citations: z.array(citationSchema).max(5, "citations 最多 5 条"),
});

export type SourceDocument = z.infer<typeof sourceDocumentSchema>;
export type DocumentChunk = z.infer<typeof documentChunkSchema>;
export type IndexedChunk = z.infer<typeof indexedChunkSchema>;
export type PersistedRagIndex = z.infer<typeof persistedRagIndexSchema>;
export type RetrievedChunk = z.infer<typeof retrievedChunkSchema>;
export type Citation = z.infer<typeof citationSchema>;
export type GroundedAnswer = z.infer<typeof groundedAnswerSchema>;
export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

// 从模型原始输出里提取 JSON 文本。
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

// 解析并校验模型生成的最终回答。
export function parseGroundedAnswer(rawText: string): GroundedAnswer {
  const jsonText = extractJson(rawText);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("模型输出不是合法 JSON");
  }

  const result = groundedAnswerSchema.safeParse(parsed);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message || "答案结构校验失败");
  }

  return result.data;
}

// 解析并校验本地 rag-index.json。
export function parsePersistedRagIndex(input: unknown): PersistedRagIndex {
  const result = persistedRagIndexSchema.safeParse(input);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message || "RAG 索引结构不合法");
  }

  return result.data;
}
