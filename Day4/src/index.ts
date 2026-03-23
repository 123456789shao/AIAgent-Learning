import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { runAgentTurn } from "./agent.js";
import { getConfig } from "./config.js";
import { clearPreferences, clearSessionMemory, createEmptyMemory, loadMemory, saveMemory } from "./memory.js";

// 把未知错误统一转成可打印的字符串。
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// 启动 Day4 交互式聊天循环。
async function main(): Promise<void> {
  const config = getConfig();
  const rl = readline.createInterface({ input, output });

  console.log("Day4 多轮记忆聊天助手已启动。输入 exit 或 quit 可退出。");
  console.log("输入 :memory 查看记忆，:clear 清空短期记忆，:clear-preferences 清空长期偏好，:clear-all 清空全部记忆。\n");

  try {
    while (true) {
      let userInput = "";

      try {
        userInput = (await rl.question("你：")).trim();
      } catch (error: unknown) {
        if (error instanceof Error && error.message === "readline was closed") {
          break;
        }
        throw error;
      }

      if (!userInput) {
        continue;
      }

      if (userInput === "exit" || userInput === "quit") {
        console.log("已退出 Day4 聊天。");
        break;
      }

      if (userInput === ":memory") {
        const memory = await loadMemory(config.memoryFilePath);
        console.log(JSON.stringify(memory, null, 2));
        console.log("");
        continue;
      }

      if (userInput === ":clear") {
        const memory = await loadMemory(config.memoryFilePath);
        await saveMemory(config.memoryFilePath, clearSessionMemory(memory));
        console.log("短期记忆已清空，长期偏好已保留。\n");
        continue;
      }

      if (userInput === ":clear-preferences") {
        const memory = await loadMemory(config.memoryFilePath);
        await saveMemory(config.memoryFilePath, clearPreferences(memory));
        console.log("长期偏好已清空，短期记忆已保留。\n");
        continue;
      }

      if (userInput === ":clear-all") {
        await saveMemory(config.memoryFilePath, createEmptyMemory());
        console.log("全部记忆已清空。\n");
        continue;
      }

      const result = await runAgentTurn({
        ...config,
        userInput,
      });

      console.log(`助手：${result.reply}`);
      console.log("");
    }
  } catch (error: unknown) {
    console.error(`运行失败：${getErrorMessage(error)}`);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

main();
