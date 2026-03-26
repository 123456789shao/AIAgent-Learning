import type { Config } from "./config.js";
import { loadRagIndex, saveRagIndex } from "./index-store.js";
import { chunkDocuments, loadKnowledgeDocuments } from "./knowledge.js";
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

// 返回一次 RAG 问答后的结果和召回片段。
export type AskWithRagResult = {
  question: string;
  answer: GroundedAnswer;
  retrievedChunks: RetrievedChunk[];
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
}): Promise<GroundedAnswer> {
  let lastError = "未知错误";
  let lastRawText = "";

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const retryReason = attempt === 1 ? undefined : buildRetryReason(lastError);
    const rawText = await askModel({
      apiKey: params.config.apiKey,
      model: params.config.model,
      baseURL: params.config.baseURL,
      maxTokens: params.config.maxTokens,
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

    lastRawText = rawText;

    try {
      const answer = parseGroundedAnswer(rawText);
      validateCitations(answer.citations, params.retrievedChunks);
      return answer;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error(`生成带引用答案失败：${lastError}。最后一次原始输出：${lastRawText || "<空>"}`);
}

// 串起 Day5 问答流程：读索引、召回、重排、生成答案并校验引用。
export async function askWithRag(config: Config, question: string): Promise<AskWithRagResult> {
  const index = await loadRagIndex(config.indexFilePath);
  const [queryEmbedding] = await getEmbeddings({
    apiKey: config.apiKey,
    model: config.embeddingModel,
    baseURL: config.baseURL,
    texts: [question],
  });

  const retrievedChunks = retrieveRelevantChunks({
    question,
    queryEmbedding,
    chunks: index.chunks,
    retrievalTopK: config.retrievalTopK,
    rerankTopK: config.rerankTopK,
  });

  if (retrievedChunks.length === 0) {
    throw new Error("没有检索到任何相关片段，请先检查知识库和索引。");
  }

  const answer = await generateGroundedAnswer({
    config,
    question,
    retrievedChunks,
  });

  return {
    question,
    answer,
    retrievedChunks,
  };
}
