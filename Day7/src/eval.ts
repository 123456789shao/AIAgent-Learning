import { readFile } from "node:fs/promises";

import type { Config } from "./config.js";
import { runAgentFlow } from "./orchestrator.js";
import { parseEvalCases, type EvalReport, type EvalCase } from "./schema.js";

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

async function runCase(config: Config, testCase: EvalCase) {
  const result = await runAgentFlow(config, testCase.question);
  const notes: string[] = [];
  const correctnessScore = containsAllFacts(result.answer.answer, testCase.expectedFacts);
  const formatScore = result.answer.citations.length > 0 || result.answer.insufficientEvidence ? 1 : 0;

  if (correctnessScore < 1) {
    notes.push("expectedFacts 未完全命中");
  }

  if (formatScore === 0) {
    notes.push("回答格式不符合 grounded answer 预期");
  }

  let hallucinationScore = 1;
  if (testCase.expectedInsufficientEvidence && !result.answer.insufficientEvidence) {
    hallucinationScore = 0;
    notes.push("应当提示证据不足，但没有提示");
  }

  if (hasForbiddenClaims(result.answer.answer, testCase.forbiddenClaims)) {
    hallucinationScore = 0;
    notes.push("命中了 forbiddenClaims，疑似幻觉");
  }

  return {
    id: testCase.id,
    correctnessScore,
    formatScore,
    hallucinationScore,
    passed: correctnessScore >= 0.5 && formatScore === 1 && hallucinationScore === 1,
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
  const averageFormat = Number((items.reduce((sum, item) => sum + item.formatScore, 0) / totalCases).toFixed(2));
  const averageHallucination = Number((items.reduce((sum, item) => sum + item.hallucinationScore, 0) / totalCases).toFixed(2));

  return {
    totalCases,
    averageCorrectness,
    averageFormat,
    averageHallucination,
    passRate: Number(((passedCount / totalCases) * 100).toFixed(2)),
    items,
  };
}
