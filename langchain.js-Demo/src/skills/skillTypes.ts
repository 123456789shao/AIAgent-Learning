import type { AgentHistory, ToolTrace } from "../agents/agentTypes.js";

export type SkillName = "weather-brief";

export type SkillRunInput = {
  sessionId: string;
  skillName: SkillName | string;
  params?: {
    city?: string;
  };
};

export type SkillExecutionInput = {
  sessionId: string;
  skillName: SkillName;
  history: AgentHistory;
  params?: {
    city?: string;
  };
};

export type SkillRunResult = {
  mode: "skill";
  skillName: SkillName;
  output: string;
  toolTrace?: ToolTrace;
};

export type SkillHandler = (input: SkillExecutionInput) => Promise<SkillRunResult>;
