import { runDemo } from "./services/demoService.js";

async function main() {
  const input = "请用一句话介绍 LangChain.js 的作用。";
  const output = await runDemo(input);

  console.log("Input:", input);
  console.log("Output:", output);
}

main().catch((error) => {
  console.error("运行失败:", error);
  process.exit(1);
});
