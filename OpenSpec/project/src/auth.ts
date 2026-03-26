// 极简内存会话实现，适合本地 demo；进程重启后登录态会丢失。
import { randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import type { Config } from "./config.js";
import { AuthError } from "./errors.js";

type SessionRecord = {
  sessionId: string;
  createdAt: number;
};

const sessions = new Map<string, SessionRecord>();
const cookieName = "day7_session";

function parseCookies(request: IncomingMessage): Record<string, string> {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) {
    return {};
  }

  return Object.fromEntries(
    cookieHeader.split(";").map((item) => {
      const [key, ...rest] = item.trim().split("=");
      return [key, decodeURIComponent(rest.join("="))];
    }),
  );
}

export function createSession(response: ServerResponse): string {
  const sessionId = randomBytes(24).toString("hex");
  sessions.set(sessionId, {
    sessionId,
    createdAt: Date.now(),
  });

  // 这里只做最小安全配置，便于在本地 HTTP 环境直接演示。
  response.setHeader("Set-Cookie", `${cookieName}=${sessionId}; HttpOnly; Path=/; SameSite=Lax`);
  return sessionId;
}

export function clearSession(request: IncomingMessage, response: ServerResponse): void {
  const cookies = parseCookies(request);
  const sessionId = cookies[cookieName];
  if (sessionId) {
    sessions.delete(sessionId);
  }

  response.setHeader("Set-Cookie", `${cookieName}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

export function assertAuthenticated(request: IncomingMessage): string {
  const cookies = parseCookies(request);
  const sessionId = cookies[cookieName];
  if (!sessionId || !sessions.has(sessionId)) {
    throw new AuthError();
  }

  return sessionId;
}

export function verifyPassword(config: Config, password: string): void {
  if (password !== config.appPassword) {
    throw new AuthError("登录失败，密码不正确。");
  }
}
