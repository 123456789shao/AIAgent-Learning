import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { parsePersistedRagIndex, type PersistedRagIndex } from "./schema.js";

// 从本地 rag-index.json 读取并校验索引。
export async function loadRagIndex(filePath: string): Promise<PersistedRagIndex> {
  try {
    const rawText = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(rawText) as unknown;
    return parsePersistedRagIndex(parsed);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      throw new Error("还没有构建索引，请先运行 npm run build-index。");
    }

    if (error instanceof SyntaxError) {
      throw new Error("rag-index.json 不是合法 JSON，请删除后重新构建。");
    }

    if (error instanceof Error) {
      throw new Error(`读取索引失败：${error.message}`);
    }

    throw new Error(`读取索引失败：${String(error)}`);
  }
}

// 把索引保存到本地 rag-index.json。
export async function saveRagIndex(filePath: string, index: PersistedRagIndex): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(index, null, 2)}\n`, "utf-8");
}
