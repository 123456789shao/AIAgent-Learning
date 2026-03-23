// 描述一次请求的指标记录。
export type MetricsRecord = {
  requestId: string;
  question: string;
  latencyMs: number;
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
  lastEstimatedCost: number;
  lastStatus: string;
};

const records: MetricsRecord[] = [];
let windowSize = 50;

// 初始化指标窗口大小。
export function initMetrics(size: number): void {
  windowSize = size;
}

// 记录一次请求指标。
export function recordMetrics(record: MetricsRecord): void {
  records.push(record);

  if (records.length > windowSize) {
    records.shift();
  }
}

// 根据 token 用量估算成本。
export function estimateCost(inputTokens: number, outputTokens: number): number {
  const estimated = inputTokens * 0.0000008 + outputTokens * 0.000002;
  return Number(estimated.toFixed(6));
}

// 返回当前指标快照。
export function getMetricsSnapshot(): MetricsSnapshot {
  const totalRequests = records.length;
  const successCount = records.filter((record) => record.success).length;
  const averageLatencyMs =
    totalRequests === 0
      ? 0
      : Math.round(records.reduce((sum, record) => sum + record.latencyMs, 0) / totalRequests);
  const lastRecord = records.at(-1);

  return {
    totalRequests,
    successRate: totalRequests === 0 ? 0 : Number(((successCount / totalRequests) * 100).toFixed(2)),
    averageLatencyMs,
    lastEstimatedCost: lastRecord?.estimatedCost || 0,
    lastStatus: lastRecord ? (lastRecord.success ? "success" : "error") : "idle",
  };
}
