import { getConfig } from "./config.js";
import { runEvaluation } from "./eval.js";
import { buildRagIndex } from "./orchestrator.js";
import { createAppServer } from "./server.js";
import { initMetrics } from "./metrics.js";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if ("code" in error && error.code === "EADDRINUSE") {
      return "端口已被占用，请先关闭已有服务，或在 .env 中修改 PORT 后重试。";
    }

    return error.message;
  }

  return String(error);
}

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

  if (command === "eval") {
    const report = await runEvaluation(config);
    console.log(`评测完成：${report.totalCases} 条 case`);
    console.log(`正确性均分：${report.averageCorrectness}`);
    console.log(`格式均分：${report.averageFormat}`);
    console.log(`幻觉控制均分：${report.averageHallucination}`);
    console.log(`通过率：${report.passRate}%`);

    for (const item of report.items) {
      console.log(`- ${item.id} | passed=${item.passed} | correctness=${item.correctnessScore} | format=${item.formatScore} | hallucination=${item.hallucinationScore}`);
      if (item.notes.length > 0) {
        console.log(`  notes: ${item.notes.join("；")}`);
      }
    }
    return;
  }

  const server = createAppServer(config);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, () => {
      server.off("error", reject);
      console.log(`Day7 Web Demo 已启动：http://127.0.0.1:${config.port}`);
      resolve();
    });
  });
}

main().catch((error: unknown) => {
  console.error(`运行失败：${getErrorMessage(error)}`);
  process.exitCode = 1;
});
