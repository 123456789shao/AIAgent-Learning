from __future__ import annotations

from typing import Any

from src.skills.skill_registry import get_skill_handler


def run_skill(
    session_id: str,
    skill_name: str,
    params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    # 先根据 skill 名称，去注册表里找到对应的处理函数。
    handler = get_skill_handler(skill_name)
    if handler is None:
        # 如果这个 skill 没注册，就直接返回一个失败结果。
        return {
            "mode": "skill",
            "session_id": session_id,
            "skill_name": skill_name,
            "params": params,
            "used_tools": False,
            "tool_trace": None,
            "output": f"未注册的 skill: {skill_name}",
        }

    # 找到处理函数后，直接把 session_id 和参数交给它执行。
    return handler(session_id, params)
