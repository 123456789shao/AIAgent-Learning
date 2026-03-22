import { getConfig } from "./config.js";
import { promptLabels } from "./prompts.js";
import { askModel } from "./model.js";

function getQuestionFromArgs(): string {
  const question = process.argv.slice(2).join(" ").trim();
  if (!question) {
    throw new Error("请在命令后面带上问题，例如：npm run ask -- 什么是 Prompt？");
  }
  return question;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

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
