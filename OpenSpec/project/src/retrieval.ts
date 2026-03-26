// 检索阶段采用“向量召回 + 关键词补权”的混合策略，便于演示证据相关性排序。
import type { IndexedChunk, RetrievedChunk } from "./schema.js";

// 计算两个向量的点积。
function dotProduct(left: number[], right: number[]): number {
  let sum = 0;

  for (let index = 0; index < left.length; index += 1) {
    sum += (left[index] || 0) * (right[index] || 0);
  }

  return sum;
}

// 计算向量长度。
function magnitude(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
}

// 计算两个向量的余弦相似度。
export function cosineSimilarity(left: number[], right: number[]): number {
  const denominator = magnitude(left) * magnitude(right);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct(left, right) / denominator;
}

// 把文本切成简单关键词 token。
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}_]+/u)
    .map((item) => item.trim())
    .filter((item) => item.length > 1);
}

// 计算问题和 chunk 的关键词重合分数。
function keywordOverlapScore(question: string, chunk: IndexedChunk): number {
  const questionTokens = new Set(tokenize(question));
  if (questionTokens.size === 0) {
    return 0;
  }

  const chunkTokens = new Set(tokenize(`${chunk.title} ${chunk.sectionPath} ${chunk.content}`));
  let overlapCount = 0;

  for (const token of questionTokens) {
    if (chunkTokens.has(token)) {
      overlapCount += 1;
    }
  }

  return overlapCount / questionTokens.size;
}

// 先按向量召回，再按混合分数做轻量重排。
export function retrieveRelevantChunks(params: {
  question: string;
  queryEmbedding: number[];
  chunks: IndexedChunk[];
  retrievalTopK: number;
  rerankTopK: number;
}): RetrievedChunk[] {
  const recalled = params.chunks
    .map((chunk) => {
      const similarityScore = cosineSimilarity(params.queryEmbedding, chunk.embedding);
      const keywordScore = keywordOverlapScore(params.question, chunk);
      const finalScore = similarityScore * 0.8 + keywordScore * 0.2;

      return {
        ...chunk,
        similarityScore,
        keywordScore,
        finalScore,
      };
    })
    .sort((left, right) => right.similarityScore - left.similarityScore)
    .slice(0, params.retrievalTopK);

  return recalled.sort((left, right) => right.finalScore - left.finalScore).slice(0, params.rerankTopK);
}
