// Validator 是回答后的守门员：检查 claim、citation 和证据覆盖是否真的站得住。
import { ValidationError } from "./errors.js";
import type { Claim, ClaimCheck, Citation, ExecutorResult, Guardrails, Plan, RetrievedChunk, SupportStrength } from "./schema.js";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}_]+/u)
    .map((item) => item.trim())
    .filter((item) => item.length > 1);
}

function overlapScore(leftText: string, rightText: string): number {
  const left = new Set(tokenize(leftText));
  const right = new Set(tokenize(rightText));
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  let hits = 0;
  for (const token of left) {
    if (right.has(token)) {
      hits += 1;
    }
  }

  return hits / left.size;
}

function normalizeSnippetText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function validateCitations(retrievedChunks: RetrievedChunk[], citations: Citation[]): void {
  const chunkMap = new Map(retrievedChunks.map((chunk) => [chunk.chunkId, chunk]));

  for (const citation of citations) {
    const matchedChunk = chunkMap.get(citation.chunkId);
    if (!matchedChunk) {
      throw new ValidationError(`引用了未召回的 chunkId：${citation.chunkId}`);
    }

    if (matchedChunk.sourcePath !== citation.sourcePath) {
      throw new ValidationError(`引用 sourcePath 与 chunk 不一致：${citation.chunkId}`);
    }

    if (matchedChunk.sectionPath !== citation.sectionPath) {
      throw new ValidationError(`引用 sectionPath 与 chunk 不一致：${citation.chunkId}`);
    }

    const normalizedChunkContent = normalizeSnippetText(matchedChunk.content);
    const normalizedSnippet = normalizeSnippetText(citation.snippet);
    if (!normalizedChunkContent.includes(normalizedSnippet)) {
      throw new ValidationError(`引用 snippet 不在原始 chunk 中：${citation.chunkId}`);
    }
  }
}

function detectConflict(claim: Claim, retrievedChunks: RetrievedChunk[]): boolean {
  const citedChunkIds = new Set(claim.citations.map((citation: Citation) => citation.chunkId));
  const chunks = retrievedChunks.filter((chunk: RetrievedChunk) => citedChunkIds.has(chunk.chunkId));
  if (chunks.length < 2) {
    return false;
  }

  // 这里只做启发式冲突检测：适合 demo 讲清“发现冲突后要降级”，不追求语义完备。
  const positiveSignals = ["支持", "可以", "已经", "已", "包含", "提供", "允许"];
  const negativeSignals = ["不支持", "没有", "未", "无法", "不能", "缺少"];

  let hasPositive = false;
  let hasNegative = false;
  for (const chunk of chunks) {
    const text = `${chunk.sectionPath} ${chunk.content}`;
    if (positiveSignals.some((token) => text.includes(token))) {
      hasPositive = true;
    }
    if (negativeSignals.some((token) => text.includes(token))) {
      hasNegative = true;
    }
  }

  return hasPositive && hasNegative;
}

function computeSupportStrength(claim: Claim, retrievedChunks: RetrievedChunk[]): SupportStrength {
  if (claim.citations.length === 0) {
    return "none";
  }

  const chunkMap = new Map(retrievedChunks.map((chunk: RetrievedChunk) => [chunk.chunkId, chunk]));
  const citedChunks = claim.citations
    .map((citation: Citation) => chunkMap.get(citation.chunkId))
    .filter((chunk: RetrievedChunk | undefined): chunk is RetrievedChunk => Boolean(chunk));

  if (citedChunks.length === 0) {
    return "none";
  }

  const distinctSources = new Set(citedChunks.map((chunk: RetrievedChunk) => chunk.sourcePath)).size;
  const averageFinalScore = citedChunks.reduce((sum: number, chunk: RetrievedChunk) => sum + chunk.finalScore, 0) / citedChunks.length;
  const maxOverlap = Math.max(
    ...claim.citations.map((citation: Citation) => overlapScore(claim.text, `${citation.sectionPath} ${citation.snippet}`)),
  );

  if (averageFinalScore >= 0.7 && maxOverlap >= 0.35 && distinctSources >= 1) {
    return claim.citations.length >= 2 || distinctSources >= 2 ? "strong" : "medium";
  }

  if (averageFinalScore >= 0.5 && maxOverlap >= 0.2) {
    return "medium";
  }

  if (maxOverlap > 0 || averageFinalScore > 0.3) {
    return "weak";
  }

  return "none";
}

function buildClaimChecks(plan: Plan, execution: ExecutorResult): ClaimCheck[] {
  return execution.answer.claims.map((claim: Claim) => {
    validateCitations(execution.retrievedChunks, claim.citations);

    const supportStrength = computeSupportStrength(claim, execution.retrievedChunks);
    const citationCount = claim.citations.length;
    const distinctChunkCount = new Set(claim.citations.map((citation: Citation) => citation.chunkId)).size;
    const hasConflict = detectConflict(claim, execution.retrievedChunks);
    const supported = supportStrength === "strong" || supportStrength === "medium";

    let reason = "引用数量和相关度足以支撑该 claim。";
    if (supportStrength === "none") {
      reason = "当前没有找到能直接支撑该 claim 的证据。";
    } else if (supportStrength === "weak") {
      reason = "有引用，但现有片段对该 claim 的支撑偏弱或偏间接。";
    } else if (hasConflict) {
      reason = "相关证据之间存在冲突，不能维持高确定性结论。";
    }

    if (plan.evidencePolicy.minCitationsPerClaim > citationCount && claim.importance === "core") {
      reason = `当前 core claim 的引用数低于 evidence policy 要求（${plan.evidencePolicy.minCitationsPerClaim}）。`;
    }

    return {
      claimId: claim.claimId,
      supported,
      supportStrength,
      citationCount,
      hasCrossChunkSupport: distinctChunkCount >= 2,
      hasConflict,
      reason,
    };
  });
}

export function validateExecution(plan: Plan, execution: ExecutorResult): Guardrails {
  validateCitations(execution.retrievedChunks, execution.answer.citations);

  const claimChecks = buildClaimChecks(plan, execution);
  const coreClaims = execution.answer.claims.filter((claim: Claim) => claim.importance === "core");
  const coreChecks = claimChecks.filter((check) => coreClaims.some((claim: Claim) => claim.claimId === check.claimId));
  const missingClaims = coreClaims
    .filter((claim: Claim) => {
      const check = coreChecks.find((item) => item.claimId === claim.claimId);
      return !check || check.supportStrength === "none";
    })
    .map((claim: Claim) => claim.text);

  const notes: string[] = [];
  if (execution.retrievedChunks.length === 0) {
    notes.push("当前没有召回任何检索结果。");
  }

  if (plan.mustCite && execution.answer.citations.length === 0 && !execution.answer.insufficientEvidence) {
    throw new ValidationError("当前计划要求必须引用；如果无法引用，必须明确标记 insufficientEvidence。");
  }

  if (plan.refuseIfInsufficientEvidence && execution.retrievedChunks.length === 0 && !execution.answer.insufficientEvidence) {
    throw new ValidationError("没有检索结果时，回答必须明确证据不足。");
  }

  if (plan.evidencePolicy.mustCoverAllCoreClaims && missingClaims.length > 0) {
    notes.push("存在未被证据覆盖的核心 claim。");
  }

  const conflictChecks = coreChecks.filter((check) => check.hasConflict);
  if (conflictChecks.length > 0) {
    notes.push("核心 claim 存在冲突证据。");
  }

  if (plan.answerMode === "comparison" && plan.evidencePolicy.requireMultiSourceForComparison) {
    const coveredByMultiSource = coreChecks.every((check) => check.hasCrossChunkSupport || check.supportStrength === "none");
    if (!coveredByMultiSource) {
      notes.push("comparison 问题缺少多源证据支撑。");
    }
  }

  const coverageScore = coreClaims.length === 0 ? 1 : Number(((coreClaims.length - missingClaims.length) / coreClaims.length).toFixed(2));
  const sufficiencyValues: number[] = coreChecks.map((check) => {
    if (check.supportStrength === "strong") return 1;
    if (check.supportStrength === "medium") return 0.75;
    if (check.supportStrength === "weak") return 0.4;
    return 0;
  });
  const sufficiencyScore = sufficiencyValues.length === 0 ? 1 : Number((sufficiencyValues.reduce((sum, value) => sum + value, 0) / sufficiencyValues.length).toFixed(2));
  const conflictScore = coreChecks.length === 0 ? 0 : Number((conflictChecks.length / coreChecks.length).toFixed(2));
  const allCoreClaimsWeak = coreChecks.length > 0 && coreChecks.every((check) => check.supportStrength === "weak");

  let decision: "pass" | "revise" | "insufficient_evidence" | "conflict" = "pass";
  // decision 优先级体现的是产品策略：冲突 > 证据不足 > 需要修订 > 可通过。
  if (conflictChecks.length > 0 && plan.evidencePolicy.mustFlagConflict) {
    decision = "conflict";
  } else if (missingClaims.length > 0 || execution.answer.insufficientEvidence || allCoreClaimsWeak) {
    decision = "insufficient_evidence";
  } else if (coreChecks.some((check) => check.supportStrength === "weak")) {
    decision = "revise";
  }

  const hallucinationRisk = decision === "pass" ? (execution.answer.confidence >= 0.85 ? "low" : "medium") : decision === "revise" ? "medium" : "high";

  return {
    validated: true as const,
    decision,
    hallucinationRisk,
    coverageScore,
    sufficiencyScore,
    conflictScore,
    claimChecks,
    missingClaims,
    notes,
  };
}
