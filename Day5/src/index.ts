import { argv } from "node:process";

import { askWithRag, buildRagIndex } from "./agent.js";
import { getConfig } from "./config.js";
import { formatCitations } from "./prompts.js";

// 把 unknown 错误统一转成可打印文本。
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

// 打印 Day5 CLI 可用命令。
function printUsage(): void {
  console.log("可用命令：");
  console.log("- npm run build-index");
  console.log('- npm run ask -- "你的问题"');
}

// 解析命令行参数并分发到索引构建或问答流程。
async function main(): Promise<void> {
  const config = getConfig();
  const [, , command, ...restArgs] = argv;

  if (!command) {
    printUsage();
    return;
  }

  if (command === "build-index") {
    const result = await buildRagIndex(config);
    console.log(`索引构建完成：共 ${result.documentCount} 个文档，${result.chunkCount} 个 chunks。`);
    console.log(`索引文件：${config.indexFilePath}`);
    return;
  }

  if (command === "ask") {
    const question = restArgs.join(" ").trim();
    if (!question) {
      throw new Error("请输入问题，例如：npm run ask -- \"Day4 的长期记忆保存了什么？\"");
    }

    const result = await askWithRag(config, question);

    console.log(`问题：${result.question}`);
    console.log("");
    console.log(`回答：${result.answer.answer}`);
    console.log(`证据是否不足：${result.answer.insufficientEvidence ? "是" : "否"}`);
    console.log(`置信度：${result.answer.confidence}`);
    console.log("");
    console.log("来源：");
    console.log(formatCitations(result.answer.citations));
    return;
  }

  printUsage();
}

main().catch((error: unknown) => {
  console.error(`运行失败：${getErrorMessage(error)}`);
  process.exitCode = 1;
});
