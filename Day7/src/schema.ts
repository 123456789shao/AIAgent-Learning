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

export const indexedChunkSchema = documentChunkSchema.extend({
  embedding: z.array(z.number()).min(1, "embedding 不能为空"),
});

export const persistedRagIndexSchema = z.object({
  version: z.string().trim().min(1, "version 不能为空"),
  builtAt: z.string().trim().min(1, "builtAt 不能为空"),
  embeddingModel: z.string().trim().min(1, "embeddingModel 不能为空"),
  chunkSize: z.number().int().positive("chunkSize 必须大于 0"),
  chunkOverlap: z.number().int().nonnegative("chunkOverlap 不能小于 0"),
  documents: z.array(sourceDocumentSchema),
  chunks: z.array(indexedChunkSchema),
});

export const retrievedChunkSchema = indexedChunkSchema.extend({
  similarityScore: z.number(),
  keywordScore: z.number(),
  finalScore: z.number(),
});

export const citationSchema = z.object({
  chunkId: z.string().trim().min(1, "chunkId 不能为空"),
  sourcePath: z.string().trim().min(1, "sourcePath 不能为空"),
  sectionPath: z.string().trim().min(1, "sectionPath 不能为空"),
  snippet: z.string().trim().min(1, "snippet 不能为空"),
});

export const groundedAnswerSchema = z.object({
  answer: z.string().trim().min(1, "answer 不能为空"),
  confidence: z.number().min(0, "confidence 不能小于 0").max(1, "confidence 不能大于 1"),
  insufficientEvidence: z.boolean(),
  citations: z.array(citationSchema).max(5, "citations 最多 5 条"),
});

export const answerModeSchema = z.enum(["grounded_qa", "summary", "comparison"]);

export const planSchema = z.object({
  goal: z.string().trim().min(1, "goal 不能为空"),
  needsRetrieval: z.boolean(),
  subtasks: z.array(z.string().trim().min(1, "subtasks 不能为空")).min(1, "subtasks 至少 1 条").max(4, "subtasks 最多 4 条"),
  answerMode: answerModeSchema,
  mustCite: z.boolean(),
  refuseIfInsufficientEvidence: z.boolean(),
});

export const executorResultSchema = z.object({
  answer: groundedAnswerSchema,
  retrievedChunks: z.array(retrievedChunkSchema),
  estimatedCost: z.number().nonnegative("estimatedCost 不能小于 0"),
  latencyMs: z.number().nonnegative("latencyMs 不能小于 0"),
});

export const orchestratorResponseSchema = z.object({
  requestId: z.string().trim().min(1, "requestId 不能为空"),
  question: z.string().trim().min(1, "question 不能为空"),
  plan: planSchema,
  answer: groundedAnswerSchema,
  retrievedChunks: z.array(retrievedChunkSchema),
  plannerLatencyMs: z.number().nonnegative(),
  executorLatencyMs: z.number().nonnegative(),
  totalLatencyMs: z.number().nonnegative(),
  estimatedCost: z.number().nonnegative(),
  degraded: z.boolean(),
  guardrails: z.object({
    validated: z.boolean(),
    hallucinationRisk: z.enum(["low", "medium", "high"]),
  }),
});

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1, "message 不能为空"),
});

export const loginRequestSchema = z.object({
  password: z.string().trim().min(1, "password 不能为空"),
});

export const evalCaseSchema = z.object({
  id: z.string().trim().min(1, "id 不能为空"),
  question: z.string().trim().min(1, "question 不能为空"),
  expectedFacts: z.array(z.string().trim().min(1)).optional().transform((value) => value ?? []),
  expectedInsufficientEvidence: z.boolean(),
  forbiddenClaims: z.array(z.string().trim().min(1)).optional().transform((value) => value ?? []),
  expectedFormat: z.enum(["grounded_answer"]),
});

export const evalReportItemSchema = z.object({
  id: z.string(),
  correctnessScore: z.number().min(0).max(1),
  formatScore: z.number().min(0).max(1),
  hallucinationScore: z.number().min(0).max(1),
  passed: z.boolean(),
  notes: z.array(z.string()),
});

export const evalReportSchema = z.object({
  totalCases: z.number().int().nonnegative(),
  averageCorrectness: z.number().min(0).max(1),
  averageFormat: z.number().min(0).max(1),
  averageHallucination: z.number().min(0).max(1),
  passRate: z.number().min(0).max(100),
  items: z.array(evalReportItemSchema),
});

export type SourceDocument = z.infer<typeof sourceDocumentSchema>;
export type DocumentChunk = z.infer<typeof documentChunkSchema>;
export type IndexedChunk = z.infer<typeof indexedChunkSchema>;
export type PersistedRagIndex = z.infer<typeof persistedRagIndexSchema>;
export type RetrievedChunk = z.infer<typeof retrievedChunkSchema>;
export type Citation = z.infer<typeof citationSchema>;
export type GroundedAnswer = z.infer<typeof groundedAnswerSchema>;
export type AnswerMode = z.infer<typeof answerModeSchema>;
export type Plan = z.infer<typeof planSchema>;
export type ExecutorResult = z.infer<typeof executorResultSchema>;
export type OrchestratorResponse = z.infer<typeof orchestratorResponseSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type EvalCase = z.infer<typeof evalCaseSchema>;
export type EvalReport = z.infer<typeof evalReportSchema>;
export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

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

function parseWithSchema<T>(schema: z.ZodSchema<T>, input: unknown, fallbackMessage: string): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message || fallbackMessage);
  }

  return result.data;
}

function parseJsonText(rawText: string): unknown {
  const jsonText = extractJson(rawText);

  try {
    return JSON.parse(jsonText) as unknown;
  } catch {
    throw new Error("模型输出不是合法 JSON");
  }
}

export function parseGroundedAnswer(rawText: string): GroundedAnswer {
  return parseWithSchema(groundedAnswerSchema, parseJsonText(rawText), "答案结构校验失败");
}

export function parsePlan(rawText: string): Plan {
  return parseWithSchema(planSchema, parseJsonText(rawText), "计划结构校验失败");
}

export function parsePersistedRagIndex(input: unknown): PersistedRagIndex {
  return parseWithSchema(persistedRagIndexSchema, input, "RAG 索引结构不合法");
}

export function parseChatRequest(input: unknown): ChatRequest {
  return parseWithSchema(chatRequestSchema, input, "聊天请求结构不合法");
}

export function parseLoginRequest(input: unknown): LoginRequest {
  return parseWithSchema(loginRequestSchema, input, "登录请求结构不合法");
}

export function parseEvalCases(input: unknown): EvalCase[] {
  const items = parseWithSchema(z.array(evalCaseSchema).length(10, "评测集必须正好 10 条"), input, "评测集结构不合法");
  return items.map((item) => ({
    ...item,
    expectedFacts: item.expectedFacts ?? [],
    forbiddenClaims: item.forbiddenClaims ?? [],
  }));
}
