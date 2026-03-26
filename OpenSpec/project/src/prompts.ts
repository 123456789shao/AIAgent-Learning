// 所有提示词模板集中放在这里，便于对 planner / executor 的职责边界做统一调整。
import type { AnswerMode, Citation, IndexedChunk, Plan } from "./schema.js";

export function buildPlannerSystemPrompt(): string {
  return [
    "你是一个负责规划回答策略的 planner。",
    "你不直接回答用户问题，只输出合法 JSON 计划。",
    "如果问题明显依赖知识库事实，请把 needsRetrieval 设为 true。",
    "如果问题需要严格依据资料回答，mustCite 必须设为 true。",
    "如果知识库外的问题容易编造，请把 refuseIfInsufficientEvidence 设为 true。",
    "你还必须输出 evidencePolicy，明确 claim 覆盖要求、comparison 是否需要多源证据，以及证据不足时是否必须拒绝确定性结论。",
  ].join("\n");
}

export function buildPlannerUserPrompt(question: string): string {
  return [
    `用户问题：${question}`,
    "",
    "请只输出以下 JSON 结构：",
    "{",
    '  "goal": "字符串",',
    '  "needsRetrieval": true 或 false,',
    '  "subtasks": ["字符串"],',
    '  "answerMode": "grounded_qa" | "summary" | "comparison",',
    '  "mustCite": true 或 false,',
    '  "refuseIfInsufficientEvidence": true 或 false,',
    '  "evidencePolicy": {',
    '    "mustCoverAllCoreClaims": true 或 false,',
    '    "minCitationsPerClaim": 0 到 3 的整数,',
    '    "requireMultiSourceForComparison": true 或 false,',
    '    "mustFlagConflict": true 或 false,',
    '    "refuseIfEvidenceInsufficient": true 或 false',
    "  }",
    "}",
  ].join("\n");
}

export function buildExecutorSystemPrompt(): string {
  return [
    "你是一个负责执行计划并生成最终回答的 executor。",
    "你只能依据提供的计划和检索片段回答，不允许编造知识库中没有的信息。",
    "如果证据不足，必须明确说证据不足或无法确认。",
    "你必须先识别答案中的核心结论，再输出 claims。",
    "每个 core claim 都应该绑定它真正依赖的 citations；如果没有足够证据，仍要输出该 claim，但必须说明支持不足。",
    "你必须输出合法 JSON，不要输出解释文字。",
  ].join("\n");
}

export function buildExecutorUserPrompt(params: {
  question: string;
  plan: Plan;
  chunks: IndexedChunk[];
  retryReason?: string;
}): string {
  const chunkText = params.chunks
    .map((chunk) => {
      return [
        `chunkId: ${chunk.chunkId}`,
        `sourcePath: ${chunk.sourcePath}`,
        `sectionPath: ${chunk.sectionPath}`,
        `content: ${chunk.content}`,
      ].join("\n");
    })
    .join("\n\n---\n\n");

  const retryNote = params.retryReason ? `\n\n上一次输出有问题：${params.retryReason}\n请严格修正。` : "";

  return [
    `用户问题：${params.question}`,
    `执行目标：${params.plan.goal}`,
    `回答模式：${params.plan.answerMode}`,
    `必须引用：${params.plan.mustCite}`,
    `证据不足时拒绝编造：${params.plan.refuseIfInsufficientEvidence}`,
    `执行步骤：${params.plan.subtasks.join("；")}`,
    `证据策略：${JSON.stringify(params.plan.evidencePolicy)}`,
    "",
    "你拿到的是已经检索出来的知识库片段。你只能基于这些片段回答。",
    "请先抽取 1 到 5 条 claims，其中至少把核心结论标记为 core。",
    "如果片段不足以支持结论，请把 insufficientEvidence 设为 true，并在 answer 中明确说明证据不足。",
    "当证据不足时，answer 里还应该给出一个有限、合理的下一步建议，例如请用户补充上下文或缩小范围。",
    "citations 里的每一项都必须来自下面给定的 chunks。snippet 必须是原文里的短片段。",
    "每条 claim 都必须包含 supportSummary，用一句话说明现有证据是如何支持它的；如果支持不足，也要明确写出来。",
    "",
    "请只返回以下 JSON 结构：",
    "{",
    '  "answer": "字符串",',
    '  "confidence": 0 到 1 的数字,',
    '  "insufficientEvidence": true 或 false,',
    '  "citations": [',
    "    {",
    '      "chunkId": "字符串",',
    '      "sourcePath": "字符串",',
    '      "sectionPath": "字符串",',
    '      "snippet": "字符串"',
    "    }",
    "  ],",
    '  "claims": [',
    "    {",
    '      "claimId": "字符串",',
    '      "text": "字符串",',
    '      "importance": "core" | "supporting",',
    '      "citations": [Citation],',
    '      "supportSummary": "字符串"',
    "    }",
    "  ]",
    "}",
    "",
    "可用 chunks：",
    chunkText || "<无可用 chunk>",
    retryNote,
  ].join("\n");
}

export function buildRetryReason(message: string): string {
  return `你的 JSON 结构、claims 或引用不合法：${message}`;
}

export function formatCitations(citations: Citation[]): string[] {
  return citations.map((citation) => {
    return `${citation.sourcePath} | ${citation.sectionPath} | ${citation.snippet}`;
  });
}

export function createFallbackPlan(question: string): Plan {
  // 回退计划默认偏保守：需要检索、必须引用、证据不足时不允许硬答。
  const answerMode: AnswerMode = question.includes("对比") || question.includes("区别") ? "comparison" : "grounded_qa";
  const requireMultiSourceForComparison = answerMode === "comparison";

  return {
    goal: "基于知识库给出可追溯且证据边界明确的回答",
    needsRetrieval: true,
    subtasks: ["检索相关知识片段", "抽取核心 claims", "返回答案并显式标注证据边界"],
    answerMode,
    mustCite: true,
    refuseIfInsufficientEvidence: true,
    evidencePolicy: {
      mustCoverAllCoreClaims: true,
      minCitationsPerClaim: 1,
      requireMultiSourceForComparison,
      mustFlagConflict: true,
      refuseIfEvidenceInsufficient: true,
    },
  };
}
