from __future__ import annotations

from typing import Any

from langchain_core.messages import HumanMessage, ToolMessage

from src.models.ollama import create_ollama_chat_model
from src.tools.weather import get_weather


def run_weather_tool_chain(user_input: str) -> dict[str, Any]:
    model = create_ollama_chat_model().bind_tools([get_weather])
    response = model.invoke([HumanMessage(content=user_input)])

    tool_calls = getattr(response, "tool_calls", []) or []
    if not tool_calls:
        content = response.content if isinstance(response.content, str) else str(response.content)
        return {
            "used_tool": False,
            "tool_calls": [],
            "tool_output": None,
            "final_answer": content,
        }

    tool_call = tool_calls[0]
    tool_args = tool_call.get("args", {})
    tool_output = get_weather.invoke(tool_args)

    final_response = model.invoke([
        HumanMessage(content=user_input),
        response,
        ToolMessage(content=tool_output, tool_call_id=tool_call["id"]),
    ])
    final_answer = final_response.content if isinstance(final_response.content, str) else str(final_response.content)

    return {
        "used_tool": True,
        "tool_calls": tool_calls,
        "tool_output": tool_output,
        "final_answer": final_answer,
    }
