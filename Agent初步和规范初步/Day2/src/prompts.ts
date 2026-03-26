// 统一定义模型必须遵守的 JSON 输出规则。
const sharedJsonRules = `
请严格遵守以下输出要求：
1. 只能返回合法 JSON，对象最外层必须是 { }。
2. 不要输出 markdown 代码块，不要输出解释文字，不要输出多余前后缀。
3. 必须包含以下字段：
   - answer: string，简短清晰回答用户问题
   - confidence: number，范围 0 到 1
   - keyPoints: string[]，1 到 3 条要点
4. keyPoints 每一项都必须是非空字符串。
5. 回答风格要友好、清晰，适合 AI Agent 初学者。
`;

// 正常首次调用时使用的 system prompt。
export function buildSystemPrompt(): string {
  return `你是一个专门输出结构化结果的 AI 学习助手。${sharedJsonRules}`;
}

// 当上一次输出不合格时，生成带错误原因的重试提示。
export function buildRetryPrompt(errorMessage: string): string {
  return `你上一次输出不符合要求。错误原因：${errorMessage}\n请重新输出，并且只返回合法 JSON。`;
}
