import { z } from "zod";

// 定义模型最终必须满足的数据结构。
export const answerSchema = z.object({
  answer: z.string().trim().min(1, "answer 不能为空"),
  confidence: z.number().min(0, "confidence 不能小于 0").max(1, "confidence 不能大于 1"),
  keyPoints: z.array(z.string().trim().min(1, "keyPoints 里不能有空字符串")).min(1, "keyPoints 至少 1 条").max(3, "keyPoints 最多 3 条"),
});

export type StructuredAnswer = z.infer<typeof answerSchema>;

// 如果模型包了 ```json 代码块，就先把里面的 JSON 提出来。
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

// 负责把模型原始文本解析成可信的结构化数据。
export function parseStructuredAnswer(rawText: string): StructuredAnswer {
  const jsonText = extractJson(rawText);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("模型输出不是合法 JSON");
  }

  const result = answerSchema.safeParse(parsed);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(firstIssue?.message || "JSON 结构校验失败");
  }

  return result.data;
}
