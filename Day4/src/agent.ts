import { askModel } from "./model.js";
import { buildChatSystemPrompt, buildCompressionPrompt, buildPreferenceExtractionPrompt } from "./prompts.js";
import {
  appendMessage,
  loadMemory,
  mergePreferences,
  saveMemory,
  shouldCompress,
  splitMessagesForCompression,
} from "./memory.js";
import { parseCompressionResult, parsePreferenceExtraction, type ChatMessage, type PersistedMemory } from "./schema.js";

// 描述运行 Day4 单轮对话时需要的输入参数。
type RunAgentTurnInput = {
  apiKey: string;
  model: string;
  baseURL: string;
  maxTokens: number;
  memoryFilePath: string;
  recentMessagesLimit: number;
  compressionTriggerCount: number;
  userInput: string;
};

// 返回本轮回复以及更新后的记忆。
type RunAgentTurnResult = {
  reply: string;
  memory: PersistedMemory;
};

// 串起 Day4 单轮对话：读记忆、生成回复、更新偏好、必要时压缩并保存。
export async function runAgentTurn({
  apiKey,
  model,
  baseURL,
  maxTokens,
  memoryFilePath,
  recentMessagesLimit,
  compressionTriggerCount,
  userInput,
}: RunAgentTurnInput): Promise<RunAgentTurnResult> {
  let memory = await loadMemory(memoryFilePath);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: buildChatSystemPrompt({
        preferences: memory.preferences,
        summary: memory.session.summary,
      }),
    },
    ...memory.session.recentMessages,
    {
      role: "user",
      content: userInput,
    },
  ];

  const reply = await askModel({
    apiKey,
    model,
    baseURL,
    maxTokens,
    messages,
  });

  memory = appendMessage(memory, { role: "user", content: userInput });
  memory = appendMessage(memory, { role: "assistant", content: reply });

  const preferenceRawText = await askModel({
    apiKey,
    model,
    baseURL,
    maxTokens,
    messages: [
      {
        role: "system",
        content: "你是一个负责提取用户长期偏好的助手。",
      },
      {
        role: "user",
        content: buildPreferenceExtractionPrompt({
          currentPreferences: memory.preferences,
          latestUserMessage: userInput,
        }),
      },
    ],
  });

  try {
    const preferenceResult = parsePreferenceExtraction(preferenceRawText);
    if (preferenceResult.shouldUpdate) {
      memory = mergePreferences(memory, {
        language: preferenceResult.language,
        outputStyle: preferenceResult.outputStyle,
        techStack: preferenceResult.techStack,
      });
    }
  } catch {
    // 偏好提取失败时，保留当前已知偏好，不中断主聊天流程。
  }

  if (shouldCompress(memory, compressionTriggerCount)) {
    const { messagesToCompress, recentMessages } = splitMessagesForCompression(memory, recentMessagesLimit);

    if (messagesToCompress.length > 0) {
      const compressionRawText = await askModel({
        apiKey,
        model,
        baseURL,
        maxTokens,
        messages: [
          {
            role: "system",
            content: "你是一个负责压缩历史对话的助手。",
          },
          {
            role: "user",
            content: buildCompressionPrompt({
              previousSummary: memory.session.summary,
              messagesToCompress,
            }),
          },
        ],
      });

      try {
        const compressionResult = parseCompressionResult(compressionRawText);
        memory = {
          ...memory,
          session: {
            summary: compressionResult.summary,
            recentMessages,
          },
        };
      } catch {
        memory = {
          ...memory,
          session: {
            ...memory.session,
            recentMessages,
          },
        };
      }
    }
  }

  await saveMemory(memoryFilePath, memory);

  return {
    reply,
    memory,
  };
}
