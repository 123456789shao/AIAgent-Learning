// Executor 负责“拿计划 + 跑检索 + 生成可审计答案”，是回答阶段的核心实现。
import type { Config } from "./config.js";
import { loadRagIndex } from "./index-store.js";
import { estimateCost } from "./metrics.js";
import { getEmbeddings, askModel } from "./model.js";
import { buildExecutorSystemPrompt, buildExecutorUserPrompt, buildRetryReason } from "./prompts.js";
import { retrieveRelevantChunks } from "./retrieval.js";
import { assessEvidenceBeforeAnswer, buildInsufficientEvidenceAnswer } from "./safe-response.js";
import { parseGroundedAnswer, type AuditedAnswer, type Citation, type ExecutorResult, type Plan, type RetrievedChunk } from "./schema.js";

function normalizeLooseText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/[：]/g, ":")
    .trim();
}

function tokenizeLooseText(text: string): string[] {
  return normalizeLooseText(text)
    .toLowerCase()
    .split(/[^\p{L}\p{N}_]+/u)
    .map((item) => item.trim())
    .filter((item) => item.length > 1);
}

function findBestSnippet(chunkContent: string, snippet: string): string | null {
  const normalizedChunk = normalizeLooseText(chunkContent);
  const normalizedSnippet = normalizeLooseText(snippet);

  if (!normalizedSnippet) {
    return null;
  }

  if (normalizedChunk.includes(normalizedSnippet)) {
    return snippet.trim();
  }

  const snippetTokens = new Set(tokenizeLooseText(snippet));
  if (snippetTokens.size === 0) {
    return null;
  }

  const candidates = chunkContent
    .split(/\n|[。！？!?；;]+/u)
    .map((item) => item.trim())
    .filter((item) => item.length >= 6);

  let bestCandidate: string | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const candidateTokens = new Set(tokenizeLooseText(candidate));
    if (candidateTokens.size === 0) {
      continue;
    }

    let overlapCount = 0;
    for (const token of snippetTokens) {
      if (candidateTokens.has(token)) {
        overlapCount += 1;
      }
    }

    const score = overlapCount / snippetTokens.size;
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return bestScore >= 0.6 ? bestCandidate : null;
}

function repairCitation(citation: Citation, retrievedChunks: RetrievedChunk[]): Citation | null {
  const matchedChunk = retrievedChunks.find((chunk) => chunk.chunkId === citation.chunkId);
  if (!matchedChunk) {
    return null;
  }

  const repairedSnippet = findBestSnippet(matchedChunk.content, citation.snippet);
  if (!repairedSnippet) {
    return null;
  }

  return {
    chunkId: matchedChunk.chunkId,
    sourcePath: matchedChunk.sourcePath,
    sectionPath: matchedChunk.sectionPath,
    snippet: repairedSnippet,
  };
}

function repairAnswerCitations(answer: AuditedAnswer, retrievedChunks: RetrievedChunk[]): AuditedAnswer {
  const repairedCitations = answer.citations
    .map((citation) => repairCitation(citation, retrievedChunks))
    .filter((citation): citation is Citation => Boolean(citation));

  const repairedClaims = answer.claims.map((claim) => ({
    ...claim,
    citations: claim.citations
      .map((citation) => repairCitation(citation, retrievedChunks))
      .filter((citation): citation is Citation => Boolean(citation)),
  }));

  return {
    ...answer,
    citations: repairedCitations,
    claims: repairedClaims,
  };
}

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

  // 给模型一次结构化重试机会，优先修复 JSON / citation 格式问题，而不是立刻整次失败。
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
      const parsedAnswer = parseGroundedAnswer(result.text);
      return {
        answer: repairAnswerCitations(parsedAnswer, params.retrievedChunks),
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
    // 只有计划明确要求检索时才生成 query embedding，避免无谓的 provider 调用成本。
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

  const assessment = assessEvidenceBeforeAnswer(plan, retrievedChunks);
  if (assessment.shouldShortCircuit) {
    return {
      answer: buildInsufficientEvidenceAnswer({
        plan,
        reason: assessment.reason,
      }),
      retrievedChunks,
      estimatedCost: 0,
      latencyMs: 0,
    };
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
