import { getConfig } from "./config.js";
import { buildRagIndex } from "./agent.js";
import { createAppServer } from "./server.js";
import { initMetrics } from "./metrics.js";

// 把 unknown 错误统一转成可打印文本。
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if ("code" in error && error.code === "EADDRINUSE") {
      return "端口已被占用，请先关闭已有服务，或在 .env 中修改 PORT 后重试。";
    }

    return error.message;
  }

  return String(error);
}

// 解析命令行并启动索引构建或 Web 服务。
async function main(): Promise<void> {
  const config = getConfig();
  initMetrics(config.metricsWindowSize);

  const [, , command] = process.argv;

  if (command === "build-index") {
    const result = await buildRagIndex(config);
    console.log(`索引构建完成：共 ${result.documentCount} 个文档，${result.chunkCount} 个 chunks。`);
    console.log(`索引文件：${config.indexFilePath}`);
    return;
  }

  const server = createAppServer(config);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, () => {
      server.off("error", reject);
      console.log(`Day6 Web Demo 已启动：http://127.0.0.1:${config.port}`);
      resolve();
    });
  });
}

main().catch((error: unknown) => {
  console.error(`运行失败：${getErrorMessage(error)}`);
  process.exitCode = 1;
});
