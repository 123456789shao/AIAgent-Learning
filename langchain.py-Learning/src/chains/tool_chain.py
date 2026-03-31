from __future__ import annotations

from typing import Any

from langchain_core.messages import HumanMessage, ToolMessage

from src.models.ollama import create_ollama_chat_model
from src.tools.weather import get_weather


def run_weather_tool_chain(user_input: str) -> dict[str, Any]:
    # 创建模型，并绑定天气工具。
    model = create_ollama_chat_model().bind_tools([get_weather])
    # 先把用户问题发给模型，看它是否决定调用工具。
    response = model.invoke([HumanMessage(content=user_input)])

    tool_calls = getattr(response, "tool_calls", []) or []
    if not tool_calls:
        # 如果模型没有调工具，直接返回它的文本答案。
        content = response.content if isinstance(response.content, str) else str(response.content)
        return {
            "used_tool": False,
            "tool_calls": [],
            "tool_output": None,
            "final_answer": content,
        }

    # 这里只演示最简单的情况：只处理第一个工具调用。
    tool_call = tool_calls[0]
    tool_args = tool_call.get("args", {})
    # 真正执行天气工具。
    tool_output = get_weather.invoke(tool_args)

    # 把“用户问题 + 模型的工具请求 + 工具返回结果”再发给模型，
    # 让模型基于工具结果组织最终回答。
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
