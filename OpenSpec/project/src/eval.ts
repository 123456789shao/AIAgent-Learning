// 评测入口：把一次真实问答结果映射成 correctness / citation / hallucination 等维度分数。
import { readFile } from "node:fs/promises";

import type { Config } from "./config.js";
import { runAgentFlow } from "./orchestrator.js";
import { parseEvalCases, type EvalReport, type EvalCase, type ClaimCheck } from "./schema.js";

function containsAllFacts(text: string, expectedFacts: string[]): number {
  if (expectedFacts.length === 0) {
    return 1;
  }

  const hits = expectedFacts.filter((fact) => text.includes(fact)).length;
  if (hits === expectedFacts.length) {
    return 1;
  }

  if (hits > 0) {
    return 0.5;
  }

  return 0;
}

function hasForbiddenClaims(text: string, forbiddenClaims: string[]): boolean {
  return forbiddenClaims.some((claim) => text.includes(claim));
}

function countSupportedCoreClaims(claimChecks: ClaimCheck[]): number {
  return claimChecks.filter((check) => check.supported).length;
}

function computeCitationCoverage(claimChecks: ClaimCheck[]): number {
  if (claimChecks.length === 0) {
    return 1;
  }

  return Number((claimChecks.filter((check) => check.citationCount > 0).length / claimChecks.length).toFixed(2));
}

async function runCase(config: Config, testCase: EvalCase) {
  const result = await runAgentFlow(config, testCase.question);
  const notes: string[] = [];

  // 这里是启发式评分，不追求学术严谨，重点是把“证据边界”要求固化成可回归检查。
  const correctnessScore = containsAllFacts(result.answer.answer, testCase.expectedFacts);
  const citationValidityScore = result.answer.citations.length > 0 || result.answer.insufficientEvidence ? 1 : 0;

  if (correctnessScore < 1) {
    notes.push("expectedFacts 未完全命中");
  }

  if (citationValidityScore === 0) {
    notes.push("回答缺少 citations，且没有标记 insufficientEvidence");
  }

  const coreClaimChecks = result.guardrails.claimChecks.filter((check) => {
    return result.answer.claims.some((claim) => claim.claimId === check.claimId && claim.importance === "core");
  });
  const supportedCoreClaims = countSupportedCoreClaims(coreClaimChecks);

  let claimCoverageScore = result.guardrails.coverageScore;
  if (testCase.minSupportedCoreClaims > 0 && supportedCoreClaims < testCase.minSupportedCoreClaims) {
    claimCoverageScore = 0;
    notes.push(`已支撑的 core claims 数不足，期望至少 ${testCase.minSupportedCoreClaims} 条`);
  }

  if (testCase.expectedCoreClaims.length > 0) {
    const matchedCoreClaims = testCase.expectedCoreClaims.filter((expected) => result.answer.claims.some((claim) => claim.text.includes(expected))).length;
    if (matchedCoreClaims < testCase.expectedCoreClaims.length) {
      claimCoverageScore = Math.min(claimCoverageScore, matchedCoreClaims > 0 ? 0.5 : 0);
      notes.push("expectedCoreClaims 未完全覆盖");
    }
  }

  let evidenceSufficiencyScore = result.guardrails.sufficiencyScore;
  const citationCoverage = computeCitationCoverage(coreClaimChecks);
  if (testCase.requiredCitationCoverage > citationCoverage) {
    evidenceSufficiencyScore = Math.min(evidenceSufficiencyScore, 0.5);
    notes.push(`core claims 的 citation coverage 低于要求（${testCase.requiredCitationCoverage}）`);
  }

  let hallucinationControlScore = 1;
  if (testCase.expectedInsufficientEvidence && !result.answer.insufficientEvidence) {
    hallucinationControlScore = 0;
    notes.push("应当提示证据不足，但没有提示");
  }

  if (testCase.requiresRefusal && result.guardrails.decision === "pass") {
    hallucinationControlScore = 0;
    notes.push("应当降级或拒绝确定性结论，但当前 decision 仍为 pass");
  }

  if (testCase.requiresConflictNotice && result.guardrails.decision !== "conflict") {
    hallucinationControlScore = Math.min(hallucinationControlScore, 0.5);
    notes.push("存在冲突预期，但没有输出 conflict decision");
  }

  if (hasForbiddenClaims(result.answer.answer, testCase.forbiddenClaims) || hasForbiddenClaims(result.answer.answer, testCase.forbiddenOverclaims)) {
    hallucinationControlScore = 0;
    notes.push("命中了 forbiddenClaims / forbiddenOverclaims，疑似过度推断");
  }

  return {
    id: testCase.id,
    correctnessScore,
    citationValidityScore,
    claimCoverageScore,
    evidenceSufficiencyScore,
    hallucinationControlScore,
    passed:
      correctnessScore >= 0.5 &&
      citationValidityScore === 1 &&
      claimCoverageScore >= 0.5 &&
      evidenceSufficiencyScore >= 0.5 &&
      hallucinationControlScore >= 0.5,
    notes,
  };
}

export async function runEvaluation(config: Config): Promise<EvalReport> {
  const rawText = await readFile(config.evalFilePath, "utf-8");
  const cases = parseEvalCases(JSON.parse(rawText) as unknown);
  const items = [];

  for (const testCase of cases) {
    items.push(await runCase(config, testCase));
  }

  const totalCases = items.length;
  const passedCount = items.filter((item) => item.passed).length;
  const averageCorrectness = Number((items.reduce((sum, item) => sum + item.correctnessScore, 0) / totalCases).toFixed(2));
  const averageCitationValidity = Number((items.reduce((sum, item) => sum + item.citationValidityScore, 0) / totalCases).toFixed(2));
  const averageClaimCoverage = Number((items.reduce((sum, item) => sum + item.claimCoverageScore, 0) / totalCases).toFixed(2));
  const averageEvidenceSufficiency = Number((items.reduce((sum, item) => sum + item.evidenceSufficiencyScore, 0) / totalCases).toFixed(2));
  const averageHallucinationControl = Number((items.reduce((sum, item) => sum + item.hallucinationControlScore, 0) / totalCases).toFixed(2));

  return {
    totalCases,
    averageCorrectness,
    averageCitationValidity,
    averageClaimCoverage,
    averageEvidenceSufficiency,
    averageHallucinationControl,
    passRate: Number(((passedCount / totalCases) * 100).toFixed(2)),
    items,
  };
}
