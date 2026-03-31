from __future__ import annotations

from src.skills.skill_types import SkillHandler
from src.skills.weather_brief_skill import run_weather_brief_skill

_SKILL_REGISTRY: dict[str, SkillHandler] = {
    "weather-brief": run_weather_brief_skill,
}


def get_skill_handler(skill_name: str) -> SkillHandler | None:
    return _SKILL_REGISTRY.get(skill_name)


def get_registered_skill_names() -> list[str]:
    return sorted(_SKILL_REGISTRY)
