import { askModel } from "./model.js";
import { buildRetryPrompt, buildSystemPrompt } from "./prompts.js";
import { parseStructuredAnswer, type StructuredAnswer } from "./schema.js";

// 描述生成结构化结果时需要的输入参数。
type GenerateStructuredAnswerInput = {
  apiKey: string;
  model: string;
  maxTokens: number;
  maxAttempts: number;
  question: string;
};

// 返回最终合法数据，以及实际用了几次尝试。
type StructuredAnswerResult = {
  data: StructuredAnswer;
  attemptsUsed: number;
};

// 负责“调用模型 -> 校验结果 -> 失败重试”这条完整链路。
export async function generateStructuredAnswer({
  apiKey,
  model,
  maxTokens,
  maxAttempts,
  question,
}: GenerateStructuredAnswerInput): Promise<StructuredAnswerResult> {
  let lastError = "未知错误";
  let lastRawText = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const retryNote = attempt === 1 ? "" : `\n\n重新生成要求：${buildRetryPrompt(lastError)}`;
    const rawText = await askModel({
      apiKey,
      model,
      maxTokens,
      systemPrompt: buildSystemPrompt(),
      question: `${question}${retryNote}`,
    });

    lastRawText = rawText;

    try {
      const data = parseStructuredAnswer(rawText);
      return {
        data,
        attemptsUsed: attempt,
      };
    } catch (error: unknown) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error(
    `结构化输出失败，已重试 ${maxAttempts} 次。最后一次错误：${lastError}。最后一次原始输出：${lastRawText || "<空>"}`,
  );
}
