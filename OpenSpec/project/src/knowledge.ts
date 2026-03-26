// 知识库装载与切片逻辑：把 Markdown 文档整理成后续 embedding / retrieval 可消费的结构。
import { readdir, readFile } from "node:fs/promises";
import { relative } from "node:path";

import type { Config } from "./config.js";
import { type DocumentChunk, type SourceDocument } from "./schema.js";

// 统一清洗文本换行和多余空行。
function normalizeText(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

// 根据相对路径生成稳定的文档 id。
function createDocId(relativePath: string): string {
  return relativePath.replace(/\\/g, "/").replace(/[^a-zA-Z0-9/_-]/g, "-");
}

// 递归收集 knowledge 目录下的 Markdown 文件。
async function collectMarkdownFiles(dirPath: string): Promise<string[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = `${dirPath}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

// 尝试从 Markdown 一级标题提取文档标题。
function getTitleFromContent(content: string, fallback: string): string {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  return titleMatch?.[1]?.trim() || fallback;
}

// 读取 knowledge 目录，组装成标准文档结构。
export async function loadKnowledgeDocuments(config: Config): Promise<SourceDocument[]> {
  const files = await collectMarkdownFiles(config.knowledgeDirPath);

  if (files.length === 0) {
    throw new Error("knowledge 目录里没有可用的 Markdown 文档，请先准备知识库资料。");
  }

  const documents: SourceDocument[] = [];

  for (const filePath of files) {
    const rawText = await readFile(filePath, "utf-8");
    const content = normalizeText(rawText);
    const relativePath = relative(config.knowledgeDirPath, filePath).replace(/\\/g, "/");
    const [category = "misc"] = relativePath.split("/");
    const fallbackTitle = relativePath.split("/").pop()?.replace(/\.md$/i, "") || relativePath;

    documents.push({
      docId: createDocId(relativePath),
      title: getTitleFromContent(content, fallbackTitle),
      sourcePath: relativePath,
      category,
      content,
    });
  }

  return documents;
}

// 描述按标题切出的一个文档小节。
type Section = {
  heading: string;
  content: string;
};

// 先按 Markdown 标题把文档拆成多个 section。
function splitMarkdownSections(document: SourceDocument): Section[] {
  const lines = document.content.split("\n");
  const sections: Section[] = [];
  let currentHeading = document.title;
  let buffer: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);

    if (headingMatch) {
      if (buffer.length > 0) {
        sections.push({
          heading: currentHeading,
          content: buffer.join("\n").trim(),
        });
      }

      currentHeading = headingMatch[2].trim();
      buffer = [];
      continue;
    }

    buffer.push(line);
  }

  if (buffer.length > 0) {
    sections.push({
      heading: currentHeading,
      content: buffer.join("\n").trim(),
    });
  }

  return sections.filter((section) => section.content);
}

// 把单个 section 按字符窗口进一步切成多个 chunk。
function chunkSection(params: {
  document: SourceDocument;
  section: Section;
  chunkSize: number;
  chunkOverlap: number;
  chunkStartIndex: number;
}): DocumentChunk[] {
  const prefix = `${params.document.title}\n${params.section.heading}\n`;
  const text = normalizeText(params.section.content);
  const chunks: DocumentChunk[] = [];
  const step = Math.max(1, params.chunkSize - params.chunkOverlap);

  for (let start = 0; start < text.length; start += step) {
    const end = Math.min(text.length, start + params.chunkSize);
    const rawSlice = text.slice(start, end).trim();

    if (!rawSlice) {
      continue;
    }

    const chunkId = `${params.document.docId}#${params.chunkStartIndex + chunks.length + 1}`;
    chunks.push({
      chunkId,
      docId: params.document.docId,
      title: params.document.title,
      sourcePath: params.document.sourcePath,
      category: params.document.category,
      sectionPath: `${params.document.title} > ${params.section.heading}`,
      content: `${prefix}${rawSlice}`.trim(),
      charStart: start,
      charEnd: end,
    });

    if (end >= text.length) {
      break;
    }
  }

  return chunks;
}

// 把全部知识库文档切成最终可检索的 chunks。
export function chunkDocuments(documents: SourceDocument[], config: Config): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];

  for (const document of documents) {
    const sections = splitMarkdownSections(document);

    for (const section of sections) {
      const sectionChunks = chunkSection({
        document,
        section,
        chunkSize: config.chunkSize,
        chunkOverlap: config.chunkOverlap,
        chunkStartIndex: chunks.filter((chunk) => chunk.docId === document.docId).length,
      });

      chunks.push(...sectionChunks);
    }
  }

  if (chunks.length === 0) {
    throw new Error("知识库文档切片失败，没有生成任何 chunk。");
  }

  return chunks;
}
