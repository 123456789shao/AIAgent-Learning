import { toolDefinitions, type ToolName } from "./tools.js";

// 把工具列表整理成可直接塞进 system prompt 的说明文本。
const toolDescriptionText = toolDefinitions
  .map((tool) => `- ${tool.name}：${tool.description}，示例参数：${JSON.stringify(tool.inputExample)}`)
  .join("\n");

// 构造第一阶段 prompt：让模型决定要不要调用工具。
export function buildActionSystemPrompt(): string {
  return `你是一个会选择工具的 AI Agent。\n请先判断当前问题是否需要调用工具。\n可用工具如下：\n${toolDescriptionText}\n\n请严格遵守以下规则：\n1. 只能返回合法 JSON，不要输出 markdown 代码块，不要输出解释文字。\n2. 如果不需要工具，返回：{"type":"final_answer","answer":"..."}\n3. 如果需要工具，返回：{"type":"tool_call","toolName":"getWeather 或 summarizeWebpage","args":{...}}\n4. getWeather 只能接收 city。\n5. summarizeWebpage 只能接收 url。\n6. 不要编造不存在的工具。`;
}

// 构造第二阶段 prompt：基于工具结果生成最终回答。
export function buildFinalAnswerPrompt(params: {
  question: string;
  toolName: ToolName;
  toolResult: string;
}): string {
  return `用户问题：${params.question}\n\n你刚刚调用了工具 ${params.toolName}，工具返回结果如下：\n${params.toolResult}\n\n请基于工具结果回答用户，并且只返回合法 JSON，格式如下：\n{"answer":"...","usedTool":"${params.toolName}"}`;
}
