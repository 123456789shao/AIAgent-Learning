// 统一生成规范化安全回应，避免不同入口在“证据不足”时各说各话。
import type { AuditedAnswer, Citation, Guardrails, Plan, RetrievedChunk } from "./schema.js";

type PreAnswerAssessment =
  | { shouldShortCircuit: false }
  | {
      shouldShortCircuit: true;
      reason: string;
    };

function pickNextStep(plan: Plan): string {
  if (plan.answerMode === "comparison") {
    return "建议把比较范围缩小到两个明确维度，或补充更直接的对照资料后再问。";
  }

  return "建议补充更具体的上下文、术语或相关文档后再问。";
}

function dedupeCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  return citations.filter((citation) => {
    const key = `${citation.chunkId}|${citation.snippet}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function assessEvidenceBeforeAnswer(plan: Plan, retrievedChunks: RetrievedChunk[]): PreAnswerAssessment {
  if (!plan.needsRetrieval || !plan.refuseIfInsufficientEvidence) {
    return { shouldShortCircuit: false };
  }

  if (retrievedChunks.length === 0) {
    return {
      shouldShortCircuit: true,
      reason: "当前没有检索到可直接支持该问题的资料",
    };
  }

  const topChunk = retrievedChunks[0];
  const averageFinalScore =
    retrievedChunks.reduce((sum, chunk) => sum + chunk.finalScore, 0) / retrievedChunks.length;
  const keywordMatchedChunks = retrievedChunks.filter((chunk) => chunk.keywordScore >= 0.12).length;

  // 只在“明显弱相关”的情况下提前兜底，尽量不打断原有正常问答能力。
  if (topChunk.finalScore < 0.35 && averageFinalScore < 0.32 && keywordMatchedChunks === 0) {
    return {
      shouldShortCircuit: true,
      reason: "当前召回片段与问题的相关性偏弱，无法支撑关键结论",
    };
  }

  return { shouldShortCircuit: false };
}

export function buildInsufficientEvidenceAnswer(params: {
  plan: Plan;
  reason: string;
  citations?: Citation[];
}): AuditedAnswer {
  const nextStep = pickNextStep(params.plan);
  const citations = dedupeCitations(params.citations ?? []).slice(0, 2);

  return {
    answer: `我目前无法根据现有资料可靠回答这个问题。${params.reason}。${nextStep}`,
    confidence: 0.22,
    insufficientEvidence: true,
    citations,
    claims: [
      {
        claimId: "insufficient-evidence",
        text: "当前资料不足以支持对该问题给出确定性结论。",
        importance: "core",
        citations,
        supportSummary: `${params.reason}。`,
      },
    ],
  };
}

export function normalizeFinalAnswer(params: {
  plan: Plan;
  answer: AuditedAnswer;
  guardrails: Guardrails;
}): AuditedAnswer {
  if (params.guardrails.decision === "pass") {
    return params.answer;
  }

  if (params.guardrails.decision === "conflict") {
    return buildInsufficientEvidenceAnswer({
      plan: params.plan,
      reason: "现有资料之间存在冲突，暂时无法给出稳定的一致结论",
      citations: params.answer.citations,
    });
  }

  if (params.guardrails.decision === "insufficient_evidence") {
    return buildInsufficientEvidenceAnswer({
      plan: params.plan,
      reason: "现有证据不足以覆盖回答所需的核心结论",
      citations: params.answer.citations,
    });
  }

  return params.answer;
}
