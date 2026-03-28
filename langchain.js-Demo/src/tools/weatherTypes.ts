export type WeatherQuery = {
  city: string;
};

export type WeatherResult = {
  city: string;
  condition: string;
  temperatureC: number;
  source: "mock" | "weatherapi";
};
