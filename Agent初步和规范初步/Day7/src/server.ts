import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

import type { Config } from "./config.js";
import { assertAuthenticated, clearSession, createSession, verifyPassword } from "./auth.js";
import { normalizeError, RateLimitError } from "./errors.js";
import { getMetricsSnapshot } from "./metrics.js";
import { runAgentFlow } from "./orchestrator.js";
import { consumeRateLimit } from "./rate-limit.js";
import { parseChatRequest, parseLoginRequest } from "./schema.js";

function getContentType(filePath: string): string {
  const extension = extname(filePath).toLowerCase();

  if (extension === ".css") {
    return "text/css; charset=utf-8";
  }

  if (extension === ".js") {
    return "application/javascript; charset=utf-8";
  }

  return "text/html; charset=utf-8";
}

function writeJson(response: ServerResponse, statusCode: number, data: unknown): void {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(`${JSON.stringify(data)}\n`);
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawText = Buffer.concat(chunks).toString("utf-8").trim();
  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    throw new Error("请求体不是合法 JSON");
  }
}

function chunkText(text: string): string[] {
  const normalized = text.trim();
  if (!normalized) {
    return [];
  }

  const chunks = normalized.match(/[^。！？!?；;，,\n]+[。！？!?；;，,\n]?/g);
  return chunks?.map((item) => item.trim()).filter(Boolean) ?? [normalized];
}

function getChunkDelay(text: string): number {
  if (/[。！？!?]$/.test(text)) {
    return 320;
  }

  if (/[；;，,]$/.test(text)) {
    return 180;
  }

  return 120;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function writeSseEvent(response: ServerResponse, event: string, data: unknown): void {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function handleStaticFile(config: Config, pathname: string, response: ServerResponse): Promise<void> {
  const relativePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = join(config.publicDirPath, relativePath);
  const content = await readFile(filePath);

  response.writeHead(200, { "Content-Type": getContentType(filePath) });
  response.end(content);
}

async function handleLogin(config: Config, request: IncomingMessage, response: ServerResponse): Promise<void> {
  consumeRateLimit({
    request,
    keyPrefix: "login",
    maxRequests: config.loginRateLimitMaxAttempts,
    windowMs: config.rateLimitWindowMs,
  });

  const body = await readJsonBody(request);
  const parsed = parseLoginRequest(body);
  verifyPassword(config, parsed.password);
  createSession(response);
  writeJson(response, 200, { ok: true, message: "登录成功。" });
}

function handleLogout(request: IncomingMessage, response: ServerResponse): void {
  clearSession(request, response);
  writeJson(response, 200, { ok: true, message: "已退出登录。" });
}

async function handleChatRequest(config: Config, request: IncomingMessage, response: ServerResponse): Promise<void> {
  const sessionId = assertAuthenticated(request);
  consumeRateLimit({
    request,
    keyPrefix: "chat",
    maxRequests: config.rateLimitMaxRequests,
    windowMs: config.rateLimitWindowMs,
    overrideKey: `chat:${sessionId}`,
  });

  const body = await readJsonBody(request);
  const parsed = parseChatRequest(body);

  response.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    Connection: "keep-alive",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
  });

  response.flushHeaders();
  writeSseEvent(response, "status", { stage: "planning", message: "正在生成执行计划" });

  try {
    const result = await runAgentFlow(config, parsed.message);
    writeSseEvent(response, "plan", { plan: result.plan, plannerLatencyMs: result.plannerLatencyMs });
    writeSseEvent(response, "status", { stage: "executing", message: "正在执行计划并生成回答" });

    for (const piece of chunkText(result.answer.answer)) {
      writeSseEvent(response, "token", { text: piece });
      await sleep(getChunkDelay(piece));
    }

    writeSseEvent(response, "citations", { citations: result.answer.citations });
    writeSseEvent(response, "meta", {
      confidence: result.answer.confidence,
      insufficientEvidence: result.answer.insufficientEvidence,
      plannerLatencyMs: result.plannerLatencyMs,
      executorLatencyMs: result.executorLatencyMs,
      totalLatencyMs: result.totalLatencyMs,
      estimatedCost: result.estimatedCost,
      hallucinationRisk: result.guardrails.hallucinationRisk,
      degraded: result.degraded,
    });
    writeSseEvent(response, "done", { ok: true });
  } catch (error: unknown) {
    const normalized = normalizeError(error);
    writeSseEvent(response, "error", {
      message: normalized.message,
      type: normalized.type,
      canRetry: !(normalized instanceof RateLimitError),
      retryAfterSeconds: normalized instanceof RateLimitError ? normalized.retryAfterSeconds : undefined,
    });
  } finally {
    response.end();
  }
}

export function createAppServer(config: Config) {
  return createServer(async (request, response) => {
    const method = request.method || "GET";
    const url = new URL(request.url || "/", `http://127.0.0.1:${config.port}`);

    try {
      if (method === "POST" && url.pathname === "/api/login") {
        await handleLogin(config, request, response);
        return;
      }

      if (method === "POST" && url.pathname === "/api/logout") {
        handleLogout(request, response);
        return;
      }

      if (method === "GET" && url.pathname === "/api/metrics") {
        assertAuthenticated(request);
        writeJson(response, 200, getMetricsSnapshot());
        return;
      }

      if (method === "POST" && url.pathname === "/api/chat") {
        await handleChatRequest(config, request, response);
        return;
      }

      if (method === "GET") {
        await handleStaticFile(config, url.pathname, response);
        return;
      }

      writeJson(response, 404, { message: "接口不存在" });
    } catch (error: unknown) {
      const normalized = normalizeError(error);
      writeJson(response, normalized.statusCode, {
        message: normalized.message,
        type: normalized.type,
        retryAfterSeconds: normalized instanceof RateLimitError ? normalized.retryAfterSeconds : undefined,
      });
    }
  });
}
