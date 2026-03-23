import type { IncomingMessage } from "node:http";

import { RateLimitError } from "./errors.js";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function getClientIp(request: IncomingMessage): string {
  return request.socket.remoteAddress || "unknown";
}

export function consumeRateLimit(params: {
  request: IncomingMessage;
  keyPrefix: string;
  maxRequests: number;
  windowMs: number;
  overrideKey?: string;
}): void {
  const key = params.overrideKey || `${params.keyPrefix}:${getClientIp(params.request)}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + params.windowMs,
    });
    return;
  }

  if (bucket.count >= params.maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    throw new RateLimitError("请求过于频繁，请稍后再试。", retryAfterSeconds);
  }

  bucket.count += 1;
}
