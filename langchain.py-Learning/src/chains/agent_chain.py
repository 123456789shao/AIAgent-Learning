from __future__ import annotations

from typing import Any

from langchain_core.messages import HumanMessage, ToolMessage

from src.models.ollama import create_ollama_chat_model
from src.tools.weather import get_weather

# 把模型返回的工具名映射到真正可执行的工具对象。
TOOLS = {
    get_weather.name: get_weather,
}


def run_weather_agent(user_input: str, max_rounds: int = 3) -> dict[str, Any]:
    # 创建模型，并绑定天气工具。
    # 这样模型回答时就可以主动决定要不要调用 get_weather。
    model = create_ollama_chat_model().bind_tools([get_weather])
    # 对话从用户输入开始。
    messages = [HumanMessage(content=user_input)]
    # 记录每一步工具调用过程，方便调试和学习。
    intermediate_steps: list[dict[str, Any]] = []
    tool_names: list[str] = []

    for round_index in range(max_rounds):
        # 先让模型看当前上下文，决定是直接回答，还是先调工具。
        response = model.invoke(messages)
        tool_calls = getattr(response, "tool_calls", []) or []

        if not tool_calls:
            # 如果没有工具调用，说明模型已经给出了最终答案。
            content = response.content if isinstance(response.content, str) else str(response.content)
            return {
                "input": user_input,
                "used_tools": bool(tool_names),
                "tool_names": tool_names,
                "intermediate_steps": intermediate_steps,
                "final_answer": content,
            }

        # 把模型这一步响应加入消息列表，后面工具结果会接在它后面。
        messages.append(response)

        for tool_call in tool_calls:
            tool_name = str(tool_call.get("name", ""))
            tool_args = tool_call.get("args", {})
            tool_names.append(tool_name)

            tool = TOOLS.get(tool_name)
            if tool is None:
                tool_output = f"暂不支持工具：{tool_name}"
            else:
                try:
                    # 真正执行模型请求的工具。
                    tool_output = str(tool.invoke(tool_args))
                except Exception as error:
                    tool_output = str(error)

            intermediate_steps.append({
                "round": round_index + 1,
                "tool_name": tool_name,
                "tool_args": tool_args,
                "tool_output": tool_output,
            })

            # 把工具结果包装成 ToolMessage，再交回给模型继续推理。
            messages.append(ToolMessage(content=tool_output, tool_call_id=tool_call["id"]))

    # 超过最大轮数还没结束时，返回兜底提示，避免无限循环。
    return {
        "input": user_input,
        "used_tools": bool(tool_names),
        "tool_names": tool_names,
        "intermediate_steps": intermediate_steps,
        "final_answer": "已达到最大工具调用轮数，请简化问题后再试。",
    }
