// 描述一次请求的指标记录。
export type MetricsRecord = {
  requestId: string;
  question: string;
  latencyMs: number;
  plannerLatencyMs: number;
  executorLatencyMs: number;
  success: boolean;
  degraded: boolean;
  errorType: string | null;
  estimatedCost: number;
};

// 描述前端展示用的聚合指标。
export type MetricsSnapshot = {
  totalRequests: number;
  successRate: number;
  averageLatencyMs: number;
  averagePlannerLatencyMs: number;
  averageExecutorLatencyMs: number;
  lastEstimatedCost: number;
  lastStatus: string;
};

const records: MetricsRecord[] = [];
let windowSize = 50;

export function initMetrics(size: number): void {
  windowSize = size;
}

export function recordMetrics(record: MetricsRecord): void {
  records.push(record);

  if (records.length > windowSize) {
    records.shift();
  }
}

export function estimateCost(inputTokens: number, outputTokens: number): number {
  const estimated = inputTokens * 0.0000008 + outputTokens * 0.000002;
  return Number(estimated.toFixed(6));
}

export function getMetricsSnapshot(): MetricsSnapshot {
  const totalRequests = records.length;
  const successCount = records.filter((record) => record.success).length;
  const averageLatencyMs = totalRequests === 0 ? 0 : Math.round(records.reduce((sum, record) => sum + record.latencyMs, 0) / totalRequests);
  const averagePlannerLatencyMs = totalRequests === 0 ? 0 : Math.round(records.reduce((sum, record) => sum + record.plannerLatencyMs, 0) / totalRequests);
  const averageExecutorLatencyMs = totalRequests === 0 ? 0 : Math.round(records.reduce((sum, record) => sum + record.executorLatencyMs, 0) / totalRequests);
  const lastRecord = records.at(-1);

  return {
    totalRequests,
    successRate: totalRequests === 0 ? 0 : Number(((successCount / totalRequests) * 100).toFixed(2)),
    averageLatencyMs,
    averagePlannerLatencyMs,
    averageExecutorLatencyMs,
    lastEstimatedCost: lastRecord?.estimatedCost || 0,
    lastStatus: lastRecord ? (lastRecord.success ? "success" : "error") : "idle",
  };
}
