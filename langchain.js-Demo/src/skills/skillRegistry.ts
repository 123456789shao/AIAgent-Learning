import type { SkillHandler, SkillName } from "./skillTypes.js";
import { weatherBriefSkill } from "./weatherBriefSkill.js";

const skillRegistry: Record<SkillName, SkillHandler> = {
  "weather-brief": weatherBriefSkill,
};

export function getSkillHandler(skillName: string) {
  return skillRegistry[skillName as SkillName];
}
