import type { Config } from "./config.js";
import { loadRagIndex, saveRagIndex } from "./index-store.js";
import { chunkDocuments, loadKnowledgeDocuments } from "./knowledge.js";
import { normalizeError, RetrievalError } from "./errors.js";
import { estimateCost, recordMetrics } from "./metrics.js";
import { getEmbeddings, askModel } from "./model.js";
import { buildAnswerSystemPrompt, buildAnswerUserPrompt, buildRetryReason } from "./prompts.js";
import { retrieveRelevantChunks } from "./retrieval.js";
import {
  parseGroundedAnswer,
  type Citation,
  type GroundedAnswer,
  type IndexedChunk,
  type PersistedRagIndex,
  type RetrievedChunk,
} from "./schema.js";

// 返回构建索引后的统计信息和完整索引。
export type BuildIndexResult = {
  documentCount: number;
  chunkCount: number;
  index: PersistedRagIndex;
};

// 返回一次 RAG 问答后的完整结果。
export type AskWithRagResult = {
  requestId: string;
  question: string;
  answer: GroundedAnswer;
  retrievedChunks: RetrievedChunk[];
  latencyMs: number;
  estimatedCost: number;
  degraded: boolean;
};

// 串起索引构建流程：读文档、切片、生成向量并保存本地索引。
export async function buildRagIndex(config: Config): Promise<BuildIndexResult> {
  const documents = await loadKnowledgeDocuments(config);
  const chunks = chunkDocuments(documents, config);
  const embeddings = await getEmbeddings({
    apiKey: config.apiKey,
    model: config.embeddingModel,
    baseURL: config.baseURL,
    texts: chunks.map((chunk) => chunk.content),
    timeoutMs: config.modelTimeoutMs,
  });

  const indexedChunks: IndexedChunk[] = chunks.map((chunk, index) => ({
    ...chunk,
    embedding: embeddings[index],
  }));

  const index: PersistedRagIndex = {
    version: "1.0.0",
    builtAt: new Date().toISOString(),
    embeddingModel: config.embeddingModel,
    chunkSize: config.chunkSize,
    chunkOverlap: config.chunkOverlap,
    documents,
    chunks: indexedChunks,
  };

  await saveRagIndex(config.indexFilePath, index);

  return {
    documentCount: documents.length,
    chunkCount: indexedChunks.length,
    index,
  };
}

// 校验模型给出的 citations 是否真的来自召回片段。
function validateCitations(citations: Citation[], retrievedChunks: RetrievedChunk[]): void {
  const chunkMap = new Map(retrievedChunks.map((chunk) => [chunk.chunkId, chunk]));

  for (const citation of citations) {
    const matchedChunk = chunkMap.get(citation.chunkId);
    if (!matchedChunk) {
      throw new Error(`引用了未召回的 chunkId：${citation.chunkId}`);
    }

    if (matchedChunk.sourcePath !== citation.sourcePath) {
      throw new Error(`引用 sourcePath 与 chunk 不一致：${citation.chunkId}`);
    }

    if (matchedChunk.sectionPath !== citation.sectionPath) {
      throw new Error(`引用 sectionPath 与 chunk 不一致：${citation.chunkId}`);
    }

    if (!matchedChunk.content.includes(citation.snippet)) {
      throw new Error(`引用 snippet 不在原始 chunk 中：${citation.chunkId}`);
    }
  }
}

// 生成最终带依据回答，失败时按原因重试一次。
async function generateGroundedAnswer(params: {
  config: Config;
  question: string;
  retrievedChunks: RetrievedChunk[];
}): Promise<{ answer: GroundedAnswer; latencyMs: number; estimatedCost: number }> {
  let lastError = "未知错误";
  let lastRawText = "";
  let totalLatencyMs = 0;
  let totalEstimatedCost = 0;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const retryReason = attempt === 1 ? undefined : buildRetryReason(lastError);
    const result = await askModel({
      apiKey: params.config.apiKey,
      model: params.config.model,
      baseURL: params.config.baseURL,
      maxTokens: params.config.maxTokens,
      timeoutMs: params.config.modelTimeoutMs,
      messages: [
        {
          role: "system",
          content: buildAnswerSystemPrompt(),
        },
        {
          role: "user",
          content: buildAnswerUserPrompt({
            question: params.question,
            chunks: params.retrievedChunks,
            retryReason,
          }),
        },
      ],
    });

    totalLatencyMs += result.latencyMs;
    totalEstimatedCost += estimateCost(result.inputTokens, result.outputTokens);
    lastRawText = result.text;

    try {
      const answer = parseGroundedAnswer(result.text);
      validateCitations(answer.citations, params.retrievedChunks);
      return {
        answer,
        latencyMs: totalLatencyMs,
        estimatedCost: Number(totalEstimatedCost.toFixed(6)),
      };
    } catch (error: unknown) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error(`生成带引用答案失败：${lastError}。最后一次原始输出：${lastRawText || "<空>"}`);
}

// 串起 Day6 问答流程：读索引、召回、重排、生成答案并记录指标。
export async function askWithRag(config: Config, question: string): Promise<AskWithRagResult> {
  const requestId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  try {
    const index = await loadRagIndex(config.indexFilePath);
    const [queryEmbedding] = await getEmbeddings({
      apiKey: config.apiKey,
      model: config.embeddingModel,
      baseURL: config.baseURL,
      texts: [question],
      timeoutMs: config.modelTimeoutMs,
    });

    const retrievedChunks = retrieveRelevantChunks({
      question,
      queryEmbedding,
      chunks: index.chunks,
      retrievalTopK: config.retrievalTopK,
      rerankTopK: config.rerankTopK,
    });

    if (retrievedChunks.length === 0) {
      throw new RetrievalError("没有检索到任何相关片段，请先检查知识库和索引。");
    }

    const generated = await generateGroundedAnswer({
      config,
      question,
      retrievedChunks,
    });

    const result: AskWithRagResult = {
      requestId,
      question,
      answer: generated.answer,
      retrievedChunks,
      latencyMs: generated.latencyMs,
      estimatedCost: generated.estimatedCost,
      degraded: false,
    };

    recordMetrics({
      requestId,
      question,
      latencyMs: result.latencyMs,
      success: true,
      degraded: false,
      errorType: null,
      estimatedCost: result.estimatedCost,
    });

    return result;
  } catch (error: unknown) {
    const normalized = normalizeError(error);

    recordMetrics({
      requestId,
      question,
      latencyMs: 0,
      success: false,
      degraded: false,
      errorType: normalized.type,
      estimatedCost: 0,
    });

    throw normalized;
  }
}
