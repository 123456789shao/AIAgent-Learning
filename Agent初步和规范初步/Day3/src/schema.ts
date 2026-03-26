import { z } from "zod";

// 模型不需要工具时，直接返回最终回答动作。
const finalAnswerActionSchema = z.object({
  type: z.literal("final_answer"),
  answer: z.string().trim().min(1, "answer 不能为空"),
});

// 工具调用时允许出现的参数集合。
const toolArgsSchema = z.object({
  city: z.string().trim().min(1).optional(),
  url: z.string().trim().min(1).optional(),
});

// 模型需要工具时，必须返回工具名和参数。
const toolCallActionSchema = z.object({
  type: z.literal("tool_call"),
  toolName: z.enum(["getWeather", "summarizeWebpage"], {
    errorMap: () => ({ message: "toolName 不合法" }),
  }),
  args: toolArgsSchema,
});

// Day3 第一阶段允许的动作类型：直答或工具调用。
export const actionSchema = z.union([finalAnswerActionSchema, toolCallActionSchema]);

// Day3 最终给用户展示的结果结构。
export const finalResultSchema = z.object({
  answer: z.string().trim().min(1, "最终 answer 不能为空"),
  usedTool: z.enum(["none", "getWeather", "summarizeWebpage"]),
});

export type AgentAction = z.infer<typeof actionSchema>;
export type FinalResult = z.infer<typeof finalResultSchema>;

// 如果模型包了 ```json 代码块，就先把里面的 JSON 拿出来。
function extractJson(rawText: string): string {
  const trimmed = rawText.trim();

  if (trimmed.startsWith("```")) {
    const codeFenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeFenceMatch?.[1]) {
      return codeFenceMatch[1].trim();
    }
  }

  return trimmed;
}

// 负责把模型第一阶段动作解析成可信数据。
export function parseAgentAction(rawText: string): AgentAction {
  const jsonText = extractJson(rawText);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("模型动作不是合法 JSON");
  }

  const result = actionSchema.safeParse(parsed);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message || "动作结构校验失败");
  }

  if (result.data.type === "tool_call") {
    if (result.data.toolName === "getWeather" && !result.data.args.city) {
      throw new Error("getWeather 缺少 city 参数");
    }

    if (result.data.toolName === "summarizeWebpage" && !result.data.args.url) {
      throw new Error("summarizeWebpage 缺少 url 参数");
    }
  }

  return result.data;
}

// 负责把最终回答解析成给 CLI 展示的稳定结构。
export function parseFinalResult(rawText: string): FinalResult {
  const jsonText = extractJson(rawText);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("最终结果不是合法 JSON");
  }

  const result = finalResultSchema.safeParse(parsed);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message || "最终结果结构校验失败");
  }

  return result.data;
}
