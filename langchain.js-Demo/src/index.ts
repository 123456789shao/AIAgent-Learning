import { runBasicService } from "./services/basicService.js";
import { runAgentService } from "./services/agentService.js";

async function main() {
  const basicInput = "请用一句话介绍 LangChain.js 的作用。";
  const sessionA = "session-a";
  const sessionB = "session-b";

  // 先保留 basic chain 基线，方便后续和 agent 输出做对照。
  const basicOutput = await runBasicService(basicInput);

  const agentRound1 = await runAgentService({
    sessionId: sessionA,
    userInput: "我叫小王，请记住。",
  });
  const agentRound2 = await runAgentService({
    sessionId: sessionA,
    userInput: "我刚刚叫什么？",
  });
  const weatherResult = await runAgentService({
    sessionId: sessionA,
    userInput: "北京今天天气怎么样？",
  });
  const weatherWithoutCity = await runAgentService({
    sessionId: sessionA,
    userInput: "今天天气怎么样？",
  });
  const isolatedSessionResult = await runAgentService({
    sessionId: sessionB,
    userInput: "我刚刚叫什么？",
  });

  console.log("Basic Input:", basicInput);
  console.log("Basic Output:", basicOutput);
  console.log("Agent Mode:", agentRound1.mode);
  console.log("Session A Round 1:", agentRound1.output);
  console.log("Session A Round 2:", agentRound2.output);
  console.log("Weather Mode:", weatherResult.mode);
  console.log("Weather Tool:", weatherResult.toolTrace?.toolName ?? "none");
  console.log("Weather Output:", weatherResult.output);
  console.log("Weather Missing City:", weatherWithoutCity.output);
  console.log("Session B Isolation Check:", isolatedSessionResult.output);
}

main().catch((error) => {
  console.error("运行失败:", error);
  process.exit(1);
});
