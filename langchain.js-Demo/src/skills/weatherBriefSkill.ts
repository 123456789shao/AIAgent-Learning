import { queryWeather } from "../tools/weatherTool.js";
import type { SkillHandler } from "./skillTypes.js";

export const weatherBriefSkill: SkillHandler = async (input) => {
  const city = input.params?.city?.trim();

  if (!city) {
    return {
      mode: "skill",
      skillName: "weather-brief",
      output: "请先提供 city 参数，例如：{ city: \"北京\" }。",
    };
  }

  try {
    const weather = await queryWeather({ city });

    return {
      mode: "skill",
      skillName: "weather-brief",
      output: `${weather.city}当前${weather.condition}，${weather.temperatureC}°C。以上结果来自 WeatherAPI。`,
      toolTrace: {
        toolName: "weather",
        toolInput: city,
        toolOutput: JSON.stringify(weather, null, 2),
      },
    };
  } catch {
    return {
      mode: "skill",
      skillName: "weather-brief",
      output: `暂时无法查询到${city}的天气信息，请稍后重试。`,
    };
  }
};
