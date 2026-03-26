import type { Config } from "./config.js";
import { loadRagIndex, saveRagIndex } from "./index-store.js";
import { chunkDocuments, loadKnowledgeDocuments } from "./knowledge.js";
import { normalizeError } from "./errors.js";
import { recordMetrics } from "./metrics.js";
import { getEmbeddings } from "./model.js";
import { createPlan } from "./planner.js";
import { executePlan } from "./executor.js";
import { validateExecution } from "./validator.js";
import { type IndexedChunk, type OrchestratorResponse, type PersistedRagIndex } from "./schema.js";

export type BuildIndexResult = {
  documentCount: number;
  chunkCount: number;
  index: PersistedRagIndex;
};

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

export async function runAgentFlow(config: Config, question: string): Promise<OrchestratorResponse> {
  const requestId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  try {
    await loadRagIndex(config.indexFilePath);
    const planner = await createPlan(config, question);
    const execution = await executePlan(config, question, planner.plan);
    const guardrails = validateExecution(planner.plan, execution);

    const result: OrchestratorResponse = {
      requestId,
      question,
      plan: planner.plan,
      answer: execution.answer,
      retrievedChunks: execution.retrievedChunks,
      plannerLatencyMs: Math.round(planner.latencyMs),
      executorLatencyMs: Math.round(execution.latencyMs),
      totalLatencyMs: Math.round(planner.latencyMs + execution.latencyMs),
      estimatedCost: Number((planner.estimatedCost + execution.estimatedCost).toFixed(6)),
      degraded: false,
      guardrails,
    };

    recordMetrics({
      requestId,
      question,
      latencyMs: result.totalLatencyMs,
      plannerLatencyMs: result.plannerLatencyMs,
      executorLatencyMs: result.executorLatencyMs,
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
      plannerLatencyMs: 0,
      executorLatencyMs: 0,
      success: false,
      degraded: false,
      errorType: normalized.type,
      estimatedCost: 0,
    });

    throw normalized;
  }
}
