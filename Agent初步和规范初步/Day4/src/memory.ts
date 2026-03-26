import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { parsePersistedMemory, type ChatMessage, type PersistedMemory, type UserPreferences } from "./schema.js";

// 生成 Day4 默认空记忆结构。
export function createEmptyMemory(): PersistedMemory {
  return {
    preferences: {},
    session: {
      summary: "",
      recentMessages: [],
    },
  };
}

// 只清空短期记忆，保留长期偏好。
export function clearSessionMemory(memory: PersistedMemory): PersistedMemory {
  return {
    ...memory,
    session: {
      summary: "",
      recentMessages: [],
    },
  };
}

// 只清空长期偏好，保留当前会话记忆。
export function clearPreferences(memory: PersistedMemory): PersistedMemory {
  return {
    ...memory,
    preferences: {},
  };
}

// 从本地 JSON 文件读取记忆，不存在时返回空记忆。
export async function loadMemory(filePath: string): Promise<PersistedMemory> {
  try {
    const rawText = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(rawText) as unknown;
    return parsePersistedMemory(parsed);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return createEmptyMemory();
    }

    if (error instanceof SyntaxError) {
      throw new Error("memory.json 不是合法 JSON，请检查或删除后重试。");
    }

    if (error instanceof Error && error.message.includes("记忆文件结构不合法")) {
      throw error;
    }

    throw new Error(`读取记忆失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

// 把最新记忆保存回本地 JSON 文件。
export async function saveMemory(filePath: string, memory: PersistedMemory): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(memory, null, 2)}\n`, "utf-8");
}

// 向最近历史里追加一条消息。
export function appendMessage(memory: PersistedMemory, message: ChatMessage): PersistedMemory {
  return {
    ...memory,
    session: {
      ...memory.session,
      recentMessages: [...memory.session.recentMessages, message],
    },
  };
}

// 合并用户偏好，只覆盖本轮明确提到的字段。
export function mergePreferences(memory: PersistedMemory, nextPreferences: UserPreferences): PersistedMemory {
  return {
    ...memory,
    preferences: {
      ...memory.preferences,
      ...Object.fromEntries(Object.entries(nextPreferences).filter(([, value]) => Boolean(value))),
    },
  };
}

// 判断当前最近历史是否超过压缩阈值。
export function shouldCompress(memory: PersistedMemory, triggerCount: number): boolean {
  return memory.session.recentMessages.length > triggerCount;
}

// 裁剪最近历史，只保留最后 N 条消息。
export function trimRecentMessages(memory: PersistedMemory, keepCount: number): PersistedMemory {
  return {
    ...memory,
    session: {
      ...memory.session,
      recentMessages: memory.session.recentMessages.slice(-keepCount),
    },
  };
}

// 拿出需要压缩的旧消息部分。
export function splitMessagesForCompression(memory: PersistedMemory, keepCount: number): {
  messagesToCompress: ChatMessage[];
  recentMessages: ChatMessage[];
} {
  const splitIndex = Math.max(0, memory.session.recentMessages.length - keepCount);

  return {
    messagesToCompress: memory.session.recentMessages.slice(0, splitIndex),
    recentMessages: memory.session.recentMessages.slice(splitIndex),
  };
}
