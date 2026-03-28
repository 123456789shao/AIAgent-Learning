import { runAgent } from "../agents/runAgent.js";
import type { AgentRunInput } from "../agents/agentTypes.js";
import {
  appendAssistantMessage,
  appendUserMessage,
  getSessionHistory,
} from "../memory/sessionMemoryStore.js";

export async function runAgentService(input: AgentRunInput) {
  // service 层串起 memory 读写和 agent 执行。
  appendUserMessage(input.sessionId, input.userInput);
  const history = getSessionHistory(input.sessionId);
  const result = await runAgent({
    sessionId: input.sessionId,
    history,
    userInput: input.userInput,
  });

  appendAssistantMessage(input.sessionId, result.output);

  return result;
}
