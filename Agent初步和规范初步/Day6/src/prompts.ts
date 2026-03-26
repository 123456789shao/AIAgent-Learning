import type { Citation, IndexedChunk } from "./schema.js";

// 构造系统提示词，强制模型只基于检索片段回答。
export function buildAnswerSystemPrompt(): string {
  return [
    "你是一个基于私有知识库回答问题的助手。",
    "你只能依据提供的检索片段回答，不允许编造知识库中没有的信息。",
    "如果证据不足，必须明确说证据不足或无法确认。",
    "你必须输出合法 JSON，不要输出解释文字。",
  ].join("\n");
}

// 构造用户提示词，把问题、chunks 和输出格式要求一起交给模型。
export function buildAnswerUserPrompt(params: {
  question: string;
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
    "",
    "你拿到的是已经检索出来的知识库片段。你只能基于这些片段回答。",
    "如果片段不足以支持结论，请把 insufficientEvidence 设为 true，并在 answer 中明确说明证据不足。",
    "citations 里的每一项都必须来自下面给定的 chunks。snippet 必须是原文里的短片段，不能自己改写得太离谱。",
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
    "  ]",
    "}",
    "",
    "可用 chunks：",
    chunkText,
    retryNote,
  ].join("\n");
}

// 把上一次失败原因转成重试提示词。
export function buildRetryReason(message: string): string {
  return `你的 JSON 结构或引用不合法：${message}`;
}

// 把 citations 格式化成适合前端展示的文本。
export function formatCitations(citations: Citation[]): string[] {
  return citations.map((citation) => {
    return `${citation.sourcePath} | ${citation.sectionPath} | ${citation.snippet}`;
  });
}
