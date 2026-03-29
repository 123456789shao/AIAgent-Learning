from __future__ import annotations

from typing import Any

from langchain_core.messages import HumanMessage, ToolMessage

from src.models.ollama import create_ollama_chat_model
from src.tools.weather import get_weather

TOOLS = {
    get_weather.name: get_weather,
}


def run_weather_agent(user_input: str, max_rounds: int = 3) -> dict[str, Any]:
    model = create_ollama_chat_model().bind_tools([get_weather])
    messages = [HumanMessage(content=user_input)]
    intermediate_steps: list[dict[str, Any]] = []
    tool_names: list[str] = []

    for round_index in range(max_rounds):
        response = model.invoke(messages)
        tool_calls = getattr(response, "tool_calls", []) or []

        if not tool_calls:
            content = response.content if isinstance(response.content, str) else str(response.content)
            return {
                "input": user_input,
                "used_tools": bool(tool_names),
                "tool_names": tool_names,
                "intermediate_steps": intermediate_steps,
                "final_answer": content,
            }

        messages.append(response)

        for tool_call in tool_calls:
            tool_name = str(tool_call.get("name", ""))
            tool_args = tool_call.get("args", {})
            tool_names.append(tool_name)

            tool = TOOLS.get(tool_name)
            if tool is None:
                tool_output = f"暂不支持工具 {tool_name}"
            else:
                try:
                    tool_output = str(tool.invoke(tool_args))
                except Exception as error:
                    tool_output = str(error)

            intermediate_steps.append({
                "round": round_index + 1,
                "tool_name": tool_name,
                "tool_args": tool_args,
                "tool_output": tool_output,
            })
            messages.append(ToolMessage(content=tool_output, tool_call_id=tool_call["id"]))

    return {
        "input": user_input,
        "used_tools": bool(tool_names),
        "tool_names": tool_names,
        "intermediate_steps": intermediate_steps,
        "final_answer": "已达到最大工具调用轮数，请简化问题后重试。",
    }
