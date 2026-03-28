import { PromptTemplate } from "@langchain/core/prompts";

import { createOllamaModel } from "../models/ollama.js";
import { AGENT_PROMPT_TEMPLATE } from "../prompts/agentPrompt.js";
import { queryWeather } from "../tools/weatherTool.js";
import type { AgentExecutionInput, AgentHistory, AgentRunResult } from "./agentTypes.js";

const SUPPORTED_CITIES = ["北京", "上海", "深圳"];
const WEATHER_KEYWORDS = ["天气", "气温", "温度", "下雨", "冷不冷"];

function formatHistory(history: AgentHistory) {
  if (history.length === 0) {
    return "暂无历史";
  }

  return history.map((message) => `${message.role}: ${message.content}`).join("\n");
}

function isWeatherQuestion(userInput: string) {
  return WEATHER_KEYWORDS.some((keyword) => userInput.includes(keyword));
}

function extractCity(userInput: string) {
  return SUPPORTED_CITIES.find((city) => userInput.includes(city));
}

function buildWeatherAnswer(city: string) {
  const weather = queryWeather({ city });

  return {
    mode: "agent-with-tool" as const,
    output: `${weather.city}当前${weather.condition}，${weather.temperatureC}°C。以上结果来自 mock weather tool。`,
    toolTrace: {
      toolName: "weather" as const,
      toolInput: city,
      toolOutput: JSON.stringify(weather, null, 2),
    },
  };
}

async function runModelAnswer(input: AgentExecutionInput): Promise<AgentRunResult> {
  const prompt = PromptTemplate.fromTemplate(AGENT_PROMPT_TEMPLATE);
  const model = createOllamaModel();
  const chain = prompt.pipe(model);
  const result = await chain.invoke({
    history: formatHistory(input.history),
    input: input.userInput,
  });

  const output =
    typeof result.content === "string"
      ? result.content
      : JSON.stringify(result.content, null, 2);

  return {
    mode: "single-agent",
    output,
  };
}

export async function runAgent(input: AgentExecutionInput): Promise<AgentRunResult> {
  // 第三步先接入最小 mock weather tool，普通问题仍走原模型回答链。
  if (isWeatherQuestion(input.userInput)) {
    const city = extractCity(input.userInput);

    if (!city) {
      return {
        mode: "agent-with-tool",
        output: "请先告诉我你想查询哪个城市的天气，例如：北京今天天气怎么样？",
      };
    }

    return buildWeatherAnswer(city);
  }

  return runModelAnswer(input);
}
