import { ValidationError } from "./errors.js";
import type { ExecutorResult, Plan, RetrievedChunk } from "./schema.js";

function validateCitations(retrievedChunks: RetrievedChunk[], citations: ExecutorResult["answer"]["citations"]): void {
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

    if (!matchedChunk.content.includes(citation.snippet)) {
      throw new ValidationError(`引用 snippet 不在原始 chunk 中：${citation.chunkId}`);
    }
  }
}

export function validateExecution(plan: Plan, execution: ExecutorResult): { validated: true; hallucinationRisk: "low" | "medium" | "high" } {
  if (plan.mustCite && execution.answer.citations.length === 0) {
    throw new ValidationError("当前计划要求必须引用，但模型没有返回任何 citations。");
  }

  validateCitations(execution.retrievedChunks, execution.answer.citations);

  if (plan.refuseIfInsufficientEvidence && execution.retrievedChunks.length === 0 && !execution.answer.insufficientEvidence) {
    throw new ValidationError("没有检索结果时，回答必须明确证据不足。");
  }

  const hallucinationRisk = execution.answer.insufficientEvidence ? "low" : execution.answer.confidence >= 0.85 ? "low" : "medium";

  return {
    validated: true,
    hallucinationRisk,
  };
}
