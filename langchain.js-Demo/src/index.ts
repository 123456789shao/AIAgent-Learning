import { runDemo } from "./services/demoService.js";
import { runAgentDemo } from "./services/agentService.js";

async function main() {
  const input = "请用一句话介绍 LangChain.js 的作用。";

  // 先保留 basic chain 基线，方便后续和 agent 输出做对照。
  const basicOutput = await runDemo(input);
  const agentResult = await runAgentDemo({ userInput: input });

  console.log("Input:", input);
  console.log("Basic Output:", basicOutput);
  console.log("Agent Mode:", agentResult.mode);
  console.log("Agent Output:", agentResult.output);
}

main().catch((error) => {
  console.error("运行失败:", error);
  process.exit(1);
});
