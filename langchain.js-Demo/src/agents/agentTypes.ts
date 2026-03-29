export type ToolName = "weather";

export type ToolTrace = {
  toolName: ToolName;
  toolInput: string;
  toolOutput: string;
};

export type AgentStopReason =
  | "final_answer"
  | "max_steps_reached"
  | "tool_failure_limit_reached"
  | "invalid_model_output"
  | "unknown_tool";

export type AgentStepTrace = {
  stepIndex: number;
  decisionType: "tool" | "final";
  reason: string;
  rawModelOutput: string;
  toolTrace?: ToolTrace;
  toolStatus?: "success" | "failed";
  error?: string;
  finalAnswer?: string;
};

export type MessageRole = "user" | "assistant";

export type AgentMessage = {
  role: MessageRole;
  content: string;
};

export type AgentHistory = AgentMessage[];

export type AgentRunInput = {
  // 第二步开始加入 sessionId，用来隔离不同会话的短期记忆。
  sessionId: string;
  userInput: string;
};

export type AgentExecutionInput = {
  // runAgent 只关心当前输入和已经准备好的 history。
  sessionId: string;
  userInput: string;
  history: AgentHistory;
};

export type AgentRunResult = {
  // 标记当前返回来自哪种执行模式，后续接 tool/skill/loop 时便于扩展。
  mode: "single-agent" | "agent-with-tool" | "agent-loop";
  output: string;
  toolTrace?: ToolTrace;
  steps?: AgentStepTrace[];
  stepCount?: number;
  stopReason?: AgentStopReason;
};
