import { runBasicService } from "./services/basicService.js";
import { runAgentService } from "./services/agentService.js";
import { runSkillService } from "./services/skillService.js";

function summarizeLoopSteps(result: Awaited<ReturnType<typeof runAgentService>>) {
  return (
    result.steps?.map((step) => ({
      stepIndex: step.stepIndex,
      decisionType: step.decisionType,
      toolName: step.toolTrace?.toolName ?? "none",
      toolStatus: step.toolStatus ?? "none",
      finalAnswer: step.finalAnswer ?? "",
      error: step.error ?? "",
    })) ?? []
  );
}

async function main() {
  const basicInput = "请用一句话介绍 LangChain.js 的作用。";
  const sessionA = "session-a";
  const sessionB = "session-b";
  const skillSession = "skill-session";
  const weatherInput = "北京今天天气怎么样？";
  const weatherWithoutCityInput = "今天天气怎么样？";

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
    userInput: weatherInput,
  });
  const weatherWithoutCity = await runAgentService({
    sessionId: sessionA,
    userInput: weatherWithoutCityInput,
  });
  const isolatedSessionResult = await runAgentService({
    sessionId: sessionB,
    userInput: "我刚刚叫什么？",
  });
  const skillWeatherResult = await runSkillService({
    sessionId: skillSession,
    skillName: "weather-brief",
    params: {
      city: "上海",
    },
  });
  const skillMissingCityResult = await runSkillService({
    sessionId: skillSession,
    skillName: "weather-brief",
    params: {},
  });

  console.log("Basic Input:", basicInput);
  console.log("Basic Output:", basicOutput);
  console.log("Agent Mode:", agentRound1.mode);
  console.log("Session A Round 1:", agentRound1.output);
  console.log("Session A Round 2:", agentRound2.output);
  console.log("Session A Round 2 Stop Reason:", agentRound2.stopReason ?? "none");
  console.log("Session A Round 2 Steps:", JSON.stringify(summarizeLoopSteps(agentRound2), null, 2));
  console.log("Weather Input:", weatherInput);
  console.log("Weather Mode:", weatherResult.mode);
  console.log("Weather Stop Reason:", weatherResult.stopReason ?? "none");
  console.log("Weather Tool:", weatherResult.toolTrace?.toolName ?? "none");
  console.log("Weather Steps:", JSON.stringify(summarizeLoopSteps(weatherResult), null, 2));
  console.log("Weather Output:", weatherResult.output);
  console.log("Weather Missing City Input:", weatherWithoutCityInput);
  console.log("Weather Missing City Stop Reason:", weatherWithoutCity.stopReason ?? "none");
  console.log("Weather Missing City Steps:", JSON.stringify(summarizeLoopSteps(weatherWithoutCity), null, 2));
  console.log("Weather Missing City:", weatherWithoutCity.output);
  console.log("Session B Isolation Check:", isolatedSessionResult.output);
  console.log("Skill Name:", skillWeatherResult.skillName);
  console.log("Skill Mode:", skillWeatherResult.mode);
  console.log("Skill Tool:", skillWeatherResult.toolTrace?.toolName ?? "none");
  console.log("Skill Output:", skillWeatherResult.output);
  console.log("Skill Missing City:", skillMissingCityResult.output);
}

main().catch((error) => {
  console.error("运行失败:", error);
  process.exit(1);
});
