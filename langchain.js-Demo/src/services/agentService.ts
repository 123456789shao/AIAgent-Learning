import { runAgent } from "../agents/runAgent.js";
import type { AgentRunInput } from "../agents/agentTypes.js";

export async function runAgentDemo(input: AgentRunInput) {
  // service 层对外暴露 agent 能力，屏蔽底层执行细节。
  return runAgent(input);
}
