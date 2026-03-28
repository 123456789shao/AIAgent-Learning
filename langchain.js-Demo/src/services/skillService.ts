import {
  appendAssistantMessage,
  appendUserMessage,
  getSessionHistory,
} from "../memory/sessionMemoryStore.js";
import { getSkillHandler } from "../skills/skillRegistry.js";
import type { SkillName, SkillRunInput } from "../skills/skillTypes.js";

export async function runSkillService(input: SkillRunInput) {
  appendUserMessage(input.sessionId, `[skill:${input.skillName}] ${JSON.stringify(input.params ?? {})}`);

  const history = getSessionHistory(input.sessionId);
  const skillHandler = getSkillHandler(input.skillName);

  if (!skillHandler) {
    const output = `当前不支持 skill: ${input.skillName}`;

    appendAssistantMessage(input.sessionId, output);

    throw new Error(output);
  }

  const result = await skillHandler({
    sessionId: input.sessionId,
    skillName: input.skillName as SkillName,
    history,
    params: input.params,
  });

  appendAssistantMessage(input.sessionId, result.output);

  return result;
}
