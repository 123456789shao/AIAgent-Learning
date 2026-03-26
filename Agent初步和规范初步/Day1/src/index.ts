import { getConfig } from "./config.js";
import { promptLabels } from "./prompts.js";
import { askModel } from "./model.js";

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

// 串起 Day1 主流程：同一个问题跑两套 Prompt 并打印结果。
async function main(): Promise<void> {
  try {
    const question = getQuestionFromArgs();
    const config = getConfig();

    console.log(`用户问题：${question}\n`);

    for (const item of promptLabels) {
      const answer = await askModel({
        ...config,
        systemPrompt: item.prompt,
        question,
      });

      console.log(`===== ${item.name} =====`);
      console.log(answer || "未获取到文本回答");
      console.log("");
    }
  } catch (error: unknown) {
    console.error(`运行失败：${getErrorMessage(error)}`);
    process.exit(1);
  }
}

main();
