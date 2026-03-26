// 当前 Day3 里允许模型选择的工具名称。
export type ToolName = "getWeather" | "summarizeWebpage";

type WeatherArgs = {
  city: string;
};

type WebpageArgs = {
  url: string;
};

// 描述一个工具的对外信息，方便写进 prompt。
export type ToolDefinition = {
  name: ToolName;
  description: string;
  inputExample: Record<string, string>;
};

// 统一列出所有可用工具及其用途。
export const toolDefinitions: ToolDefinition[] = [
  {
    name: "getWeather",
    description: "查询某个城市的天气情况，适合天气、温度、出行建议类问题。",
    inputExample: { city: "Beijing" },
  },
  {
    name: "summarizeWebpage",
    description: "总结某个网页的大意，适合网页摘要、文章概览、链接内容总结类问题。",
    inputExample: { url: "https://example.com" },
  },
];

// 根据模型选择的工具名，把请求分发到对应工具实现。
export async function runTool(toolName: ToolName, args: Record<string, unknown>): Promise<string> {
  if (toolName === "getWeather") {
    return getWeather({ city: String(args.city || "") });
  }

  return summarizeWebpage({ url: String(args.url || "") });
}

// mock 天气工具：返回固定的演示数据。
function getWeather({ city }: WeatherArgs): string {
  return JSON.stringify({
    city,
    condition: "晴",
    temperatureC: 26,
    suggestion: `${city} 今天适合轻便出行，早晚注意温差。`,
  });
}

// mock 网页摘要工具：返回固定的演示结果。
function summarizeWebpage({ url }: WebpageArgs): string {
  return JSON.stringify({
    url,
    summary: "这是一个用于 Day3 演示的 mock 网页摘要结果，表示工具已经被成功调用。",
    keyPoints: ["页面主题明确", "适合快速浏览", "可继续深挖细节"],
  });
}
