import { getConfig } from "./config.js";
import { runAgent } from "./agent.js";

// 从命令行参数里读取用户问题。
function getQuestionFromArgs(): string {
  const question = process.argv.slice(2).join(" ").trim();
  if (!question) {
    throw new Error("请在命令后面带上问题，例如：npm run ask -- 北京今天天气怎么样？");
  }
  return question;
}

// 把未知错误统一转成可打印的字符串。
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// 串起 Day3 主流程：读取问题、执行 Agent、打印轨迹和结果。
async function main(): Promise<void> {
  try {
    const question = getQuestionFromArgs();
    const config = getConfig();

    console.log(`用户问题：${question}\n`);

    const result = await runAgent({
      ...config,
      question,
    });

    console.log("执行轨迹：");
    for (const step of result.steps) {
      console.log(`- ${step.label}：`);
      console.log(step.value);
      console.log("");
    }

    console.log("最终结果：");
    console.log(JSON.stringify(result.finalResult, null, 2));
  } catch (error: unknown) {
    console.error(`运行失败：${getErrorMessage(error)}`);
    process.exit(1);
  }
}

main();
