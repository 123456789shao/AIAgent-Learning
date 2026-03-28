import type { WeatherQuery, WeatherResult } from "./weatherTypes.js";

const MOCK_WEATHER_DATA: Record<string, Omit<WeatherResult, "city" | "source">> = {
  北京: {
    condition: "晴",
    temperatureC: 22,
  },
  上海: {
    condition: "多云",
    temperatureC: 25,
  },
  深圳: {
    condition: "小雨",
    temperatureC: 27,
  },
};

const DEFAULT_WEATHER = {
  condition: "阴",
  temperatureC: 23,
};

export function queryWeather(query: WeatherQuery): WeatherResult {
  const weather = MOCK_WEATHER_DATA[query.city] ?? DEFAULT_WEATHER;

  return {
    city: query.city,
    condition: weather.condition,
    temperatureC: weather.temperatureC,
    source: "mock",
  };
}
