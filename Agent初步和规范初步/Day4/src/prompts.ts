import type { ChatMessage, UserPreferences } from "./schema.js";

// 构造 Day4 主聊天的 system prompt。
export function buildChatSystemPrompt(params: {
  preferences: UserPreferences;
  summary: string;
}): string {
  const preferenceLines = [
    `- language: ${params.preferences.language || "未设置"}`,
    `- outputStyle: ${params.preferences.outputStyle || "未设置"}`,
    `- techStack: ${params.preferences.techStack || "未设置"}`,
  ].join("\n");

  const summaryText = params.summary || "暂无历史摘要。";

  return `你是一个会记住用户偏好的聊天助手。\n请优先遵守当前用户输入；如果当前输入没有冲突，再参考已知偏好。\n\n当前已知用户偏好：\n${preferenceLines}\n\n更早历史摘要：\n${summaryText}\n\n要求：\n1. 回答要自然、直接、清晰。\n2. 如果用户当前要求与旧偏好冲突，优先听当前这一轮。\n3. 不要主动暴露内部记忆机制，除非用户询问。`;
}

// 构造偏好提取 prompt，只从最新输入里识别稳定偏好。
export function buildPreferenceExtractionPrompt(params: {
  currentPreferences: UserPreferences;
  latestUserMessage: string;
}): string {
  return `你负责从用户最新输入里提取稳定偏好。\n\n当前已知偏好：\n${JSON.stringify(params.currentPreferences, null, 2)}\n\n用户最新输入：\n${params.latestUserMessage}\n\n请严格只返回合法 JSON：\n{\n  "language": "可选，字符串",\n  "outputStyle": "可选，字符串",\n  "techStack": "可选，字符串",\n  "shouldUpdate": true 或 false\n}\n\n规则：\n1. 只有当用户明确表达长期偏好时，shouldUpdate 才能是 true。\n2. 如果只是普通聊天，不要乱记偏好。\n3. 不要输出解释文字，不要输出 markdown。`;
}

// 构造历史压缩 prompt，把较早对话压成短摘要。
export function buildCompressionPrompt(params: {
  previousSummary: string;
  messagesToCompress: ChatMessage[];
}): string {
  return `你负责压缩较早的对话历史，保留对后续聊天最有用的信息。\n\n已有摘要：\n${params.previousSummary || "暂无"}\n\n需要压缩的消息：\n${JSON.stringify(params.messagesToCompress, null, 2)}\n\n请严格只返回合法 JSON：\n{\n  "summary": "压缩后的简短摘要"\n}\n\n规则：\n1. 保留用户目标、稳定事实、重要偏好和关键上下文。\n2. 不要逐字复述全部聊天。\n3. 摘要尽量短，但不能丢失关键点。\n4. 不要输出解释文字，不要输出 markdown。`;
}
