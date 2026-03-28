import { env } from "../config/env.js";
import type { WeatherQuery, WeatherResult } from "./weatherTypes.js";

type WeatherApiResponse = {
  current?: {
    temp_c?: number;
    condition?: {
      text?: string;
    };
  };
  location?: {
    name?: string;
  };
};

function buildWeatherApiUrl(city: string) {
  const url = new URL("https://api.weatherapi.com/v1/current.json");

  url.searchParams.set("key", env.WEATHER_API_KEY);
  url.searchParams.set("q", city);
  url.searchParams.set("lang", "zh");

  return url;
}

export async function queryWeather(query: WeatherQuery): Promise<WeatherResult> {
  const response = await fetch(buildWeatherApiUrl(query.city));

  if (!response.ok) {
    throw new Error(`WeatherAPI 查询失败: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as WeatherApiResponse;
  const condition = data.current?.condition?.text;
  const temperatureC = data.current?.temp_c;
  const city = data.location?.name ?? query.city;

  if (!condition || typeof temperatureC !== "number") {
    throw new Error("WeatherAPI 返回的天气数据不完整");
  }

  return {
    city,
    condition,
    temperatureC,
    source: "weatherapi",
  };
}
