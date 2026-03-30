from __future__ import annotations

from typing import Any

from src.tools.weather import query_weather


SKILL_NAME = "weather-brief"


def run_weather_brief_skill(session_id: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    city = str((params or {}).get("city", "")).strip()

    if not city:
        return {
            "mode": "skill",
            "session_id": session_id,
            "skill_name": SKILL_NAME,
            "params": params,
            "used_tools": False,
            "tool_trace": None,
            "output": '请先提供 city 参数，例如：{"city": "北京"}。',
        }

    try:
        weather = query_weather(city)
    except Exception:
        return {
            "mode": "skill",
            "session_id": session_id,
            "skill_name": SKILL_NAME,
            "params": params,
            "used_tools": True,
            "tool_trace": {
                "tool_name": "query_weather",
                "tool_input": {"city": city},
                "tool_output": None,
            },
            "output": f"暂时无法查询到{city}的天气信息，请稍后重试。",
        }

    return {
        "mode": "skill",
        "session_id": session_id,
        "skill_name": SKILL_NAME,
        "params": {"city": city},
        "used_tools": True,
        "tool_trace": {
            "tool_name": "query_weather",
            "tool_input": {"city": city},
            "tool_output": weather.model_dump(),
        },
        "output": (
            f"{weather.location_name}当前天气{weather.condition_text}，"
            f"气温{weather.temp_c}°C，体感温度{weather.feelslike_c}°C，"
            f"湿度{weather.humidity}%，风速{weather.wind_kph} km/h。"
        ),
    }
