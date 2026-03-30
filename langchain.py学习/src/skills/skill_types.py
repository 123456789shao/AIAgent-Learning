from __future__ import annotations

from collections.abc import Callable
from typing import Any, Literal

SkillName = Literal["weather-brief"]
SkillParams = dict[str, Any] | None
ToolTrace = dict[str, Any] | None
SkillResult = dict[str, Any]
SkillHandler = Callable[[str, SkillParams], SkillResult]
