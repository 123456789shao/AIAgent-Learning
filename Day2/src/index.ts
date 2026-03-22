import { getConfig } from "./config.js";
import { generateStructuredAnswer } from "./retry.js";

// 从命令行参数里读取用户问题。
function getQuestionFromArgs(): string {
  const question = process.argv.slice(2).join(" ").trim();
  if (!question) {
    throw new Error("请在命令后面带上问题，例如：npm run ask -- 什么是 Prompt？");
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

// 串起 Day2 主流程：读取问题、生成结构化结果、打印输出。
async function main(): Promise<void> {
  try {
    const question = getQuestionFromArgs();
    const config = getConfig();

    console.log(`用户问题：${question}\n`);

    const result = await generateStructuredAnswer({
      ...config,
      question,
    });

    console.log(`尝试次数：${result.attemptsUsed}`);
    console.log("最终结构化结果：");
    console.log(JSON.stringify(result.data, null, 2));
  } catch (error: unknown) {
    console.error(`运行失败：${getErrorMessage(error)}`);
    process.exit(1);
  }
}

main();
