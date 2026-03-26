import type { Config } from "./config.js";
import { loadRagIndex } from "./index-store.js";
import { estimateCost } from "./metrics.js";
import { getEmbeddings, askModel } from "./model.js";
import { buildExecutorSystemPrompt, buildExecutorUserPrompt, buildRetryReason } from "./prompts.js";
import { retrieveRelevantChunks } from "./retrieval.js";
import { parseGroundedAnswer, type ExecutorResult, type Plan, type RetrievedChunk } from "./schema.js";
import { RetrievalError } from "./errors.js";

async function generateGroundedAnswer(params: {
  config: Config;
  question: string;
  plan: Plan;
  retrievedChunks: RetrievedChunk[];
}): Promise<{ answer: ExecutorResult["answer"]; latencyMs: number; estimatedCost: number }> {
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
        { role: "system", content: buildExecutorSystemPrompt() },
        {
          role: "user",
          content: buildExecutorUserPrompt({
            question: params.question,
            plan: params.plan,
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
      return {
        answer: parseGroundedAnswer(result.text),
        latencyMs: totalLatencyMs,
        estimatedCost: Number(totalEstimatedCost.toFixed(6)),
      };
    } catch (error: unknown) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error(`生成执行结果失败：${lastError}。最后一次原始输出：${lastRawText || "<空>"}`);
}

export async function executePlan(config: Config, question: string, plan: Plan): Promise<ExecutorResult> {
  const index = await loadRagIndex(config.indexFilePath);
  let retrievedChunks: RetrievedChunk[] = [];

  if (plan.needsRetrieval) {
    const [queryEmbedding] = await getEmbeddings({
      apiKey: config.apiKey,
      model: config.embeddingModel,
      baseURL: config.baseURL,
      texts: [question],
      timeoutMs: config.modelTimeoutMs,
    });

    retrievedChunks = retrieveRelevantChunks({
      question,
      queryEmbedding,
      chunks: index.chunks,
      retrievalTopK: config.retrievalTopK,
      rerankTopK: config.rerankTopK,
    });
  }

  if (plan.needsRetrieval && retrievedChunks.length === 0) {
    throw new RetrievalError("没有检索到任何相关片段，请先检查知识库和索引。");
  }

  const generated = await generateGroundedAnswer({
    config,
    question,
    plan,
    retrievedChunks,
  });

  return {
    answer: generated.answer,
    retrievedChunks,
    estimatedCost: generated.estimatedCost,
    latencyMs: generated.latencyMs,
  };
}
