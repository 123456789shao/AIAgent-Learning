import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

import type { Config } from "./config.js";
import { askWithRag } from "./agent.js";
import { normalizeError } from "./errors.js";
import { getMetricsSnapshot } from "./metrics.js";
import { parseChatRequest } from "./schema.js";

// 根据文件扩展名返回简单的 content-type。
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

// 把对象写成 JSON 响应。
function writeJson(response: ServerResponse, statusCode: number, data: unknown): void {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(`${JSON.stringify(data)}\n`);
}

// 读取请求体并解析成 JSON。
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

// 按短句切片，模拟更自然的流式输出。
function chunkText(text: string): string[] {
  const normalized = text.trim();
  if (!normalized) {
    return [];
  }

  const chunks = normalized.match(/[^。！？!?；;，,\n]+[。！？!?；;，,\n]?/g);
  return chunks?.map((item) => item.trim()).filter(Boolean) ?? [normalized];
}

// 根据切片内容决定停顿时间，让句号停顿更明显。
function getChunkDelay(text: string): number {
  if (/[。！？!?]$/.test(text)) {
    return 320;
  }

  if (/[；;，,]$/.test(text)) {
    return 180;
  }

  return 120;
}

// 简单等待一小段时间，避免 token 一次性全部刷出。
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// 发送 SSE 事件。
function writeSseEvent(response: ServerResponse, event: string, data: unknown): void {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
}

// 返回静态文件。
async function handleStaticFile(config: Config, pathname: string, response: ServerResponse): Promise<void> {
  const relativePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = join(config.publicDirPath, relativePath);
  const content = await readFile(filePath);

  response.writeHead(200, { "Content-Type": getContentType(filePath) });
  response.end(content);
}

// 处理聊天接口，按 SSE 方式推送伪流式结果。
async function handleChatRequest(config: Config, request: IncomingMessage, response: ServerResponse): Promise<void> {
  const body = await readJsonBody(request);
  const parsed = parseChatRequest(body);

  response.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    Connection: "keep-alive",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
  });

  response.flushHeaders();
  writeSseEvent(response, "status", { stage: "retrieving", message: "正在检索知识库" });

  try {
    const result = await askWithRag(config, parsed.message);
    writeSseEvent(response, "status", { stage: "streaming", message: "正在生成回答" });

    for (const piece of chunkText(result.answer.answer)) {
      writeSseEvent(response, "token", { text: piece });
      await sleep(getChunkDelay(piece));
    }

    writeSseEvent(response, "citations", { citations: result.answer.citations });
    writeSseEvent(response, "meta", {
      confidence: result.answer.confidence,
      insufficientEvidence: result.answer.insufficientEvidence,
      latencyMs: result.latencyMs,
      estimatedCost: result.estimatedCost,
      degraded: result.degraded,
    });
    writeSseEvent(response, "done", { ok: true });
  } catch (error: unknown) {
    const normalized = normalizeError(error);
    writeSseEvent(response, "error", {
      message: normalized.message,
      type: normalized.type,
      canRetry: true,
    });
  } finally {
    response.end();
  }
}

// 创建 Day6 HTTP 服务。
export function createAppServer(config: Config) {
  return createServer(async (request, response) => {
    const method = request.method || "GET";
    const url = new URL(request.url || "/", `http://127.0.0.1:${config.port}`);

    try {
      if (method === "GET" && url.pathname === "/api/metrics") {
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
      });
    }
  });
}
