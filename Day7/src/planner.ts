import { performance } from "node:perf_hooks";

import type { Config } from "./config.js";
import { askModel } from "./model.js";
import { estimateCost } from "./metrics.js";
import { buildPlannerSystemPrompt, buildPlannerUserPrompt, createFallbackPlan } from "./prompts.js";
import { parsePlan, type Plan } from "./schema.js";

export type PlannerResult = {
  plan: Plan;
  latencyMs: number;
  estimatedCost: number;
};

export async function createPlan(config: Config, question: string): Promise<PlannerResult> {
  const startedAt = performance.now();

  try {
    const result = await askModel({
      apiKey: config.apiKey,
      model: config.model,
      baseURL: config.baseURL,
      maxTokens: 400,
      timeoutMs: config.modelTimeoutMs,
      messages: [
        { role: "system", content: buildPlannerSystemPrompt() },
        { role: "user", content: buildPlannerUserPrompt(question) },
      ],
    });

    return {
      plan: parsePlan(result.text),
      latencyMs: performance.now() - startedAt,
      estimatedCost: estimateCost(result.inputTokens, result.outputTokens),
    };
  } catch {
    return {
      plan: createFallbackPlan(question),
      latencyMs: performance.now() - startedAt,
      estimatedCost: 0,
    };
  }
}
