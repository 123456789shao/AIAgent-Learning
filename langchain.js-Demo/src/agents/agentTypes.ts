export type AgentRunInput = {
  // 先保留最小输入，只接一条用户消息。
  userInput: string;
};

export type AgentRunResult = {
  // 标记当前返回来自哪种执行模式，后续接 memory/tool/loop 时便于扩展。
  mode: "single-agent";
  output: string;
};
