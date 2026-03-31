from __future__ import annotations

from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from src.memory.store import append_messages, clear_messages, get_message_count, get_messages
from src.models.ollama import create_ollama_chat_model
from src.tools.weather import get_weather

# 把模型返回的工具名映射到真正可执行的工具对象。
TOOLS = {
    get_weather.name: get_weather,
}


def clear_weather_agent_memory(session_id: str) -> None:
    # 清空当前会话保存的历史消息。
    clear_messages(session_id)


def run_weather_agent_with_memory(
    session_id: str,
    user_input: str,
    max_rounds: int = 3,
) -> dict[str, Any]:
    # 读取历史消息，让 agent 能基于上下文继续对话。
    history_messages = get_messages(session_id)
    history_used = bool(history_messages)

    # 把天气工具绑定给模型，这样模型就能决定是否调用工具。
    model = create_ollama_chat_model().bind_tools([get_weather])
    # 记录当前这一轮新产生的消息，最后会追加到 memory 里。
    current_turn_messages = [HumanMessage(content=user_input)]
    # 传给模型的消息 = 历史消息 + 当前用户输入。
    messages = [*history_messages, *current_turn_messages]
    intermediate_steps: list[dict[str, Any]] = []
    tool_names: list[str] = []

    for round_index in range(max_rounds):
        response = model.invoke(messages)
        tool_calls = getattr(response, "tool_calls", []) or []

        if not tool_calls:
            # 如果模型没有要求调用工具，说明这次已经可以直接返回最终答案。
            current_turn_messages.append(response)
            append_messages(session_id, current_turn_messages)
            content = response.content if isinstance(response.content, str) else str(response.content)
            return {
                "session_id": session_id,
                "input": user_input,
                "used_tools": bool(tool_names),
                "tool_names": tool_names,
                "intermediate_steps": intermediate_steps,
                "history_used": history_used,
                "message_count": get_message_count(session_id),
                "final_answer": content,
            }

        # 先把模型这次的响应加入上下文，后面工具返回结果时才能接着推理。
        messages.append(response)
        current_turn_messages.append(response)

        for tool_call in tool_calls:
            tool_name = str(tool_call.get("name", ""))
            tool_args = tool_call.get("args", {})
            tool_names.append(tool_name)

            tool = TOOLS.get(tool_name)
            if tool is None:
                tool_output = f"暂不支持工具：{tool_name}"
            else:
                try:
                    # 用模型给出的参数真正执行工具。
                    tool_output = str(tool.invoke(tool_args))
                except Exception as error:
                    tool_output = str(error)

            # 把每一步工具调用过程保存下来，方便调试和学习。
            intermediate_steps.append({
                "round": round_index + 1,
                "tool_name": tool_name,
                "tool_args": tool_args,
                "tool_output": tool_output,
            })

            # 把工具执行结果重新喂给模型，进入下一步推理。
            tool_message = ToolMessage(content=tool_output, tool_call_id=tool_call["id"])
            messages.append(tool_message)
            current_turn_messages.append(tool_message)

    fallback_answer = "已达到最大工具调用轮数，请简化问题后再试。"
    # 如果连续多轮都在调工具，就在达到上限后停止，避免死循环。
    current_turn_messages.append(AIMessage(content=fallback_answer))
    append_messages(session_id, current_turn_messages)
    return {
        "session_id": session_id,
        "input": user_input,
        "used_tools": bool(tool_names),
        "tool_names": tool_names,
        "intermediate_steps": intermediate_steps,
        "history_used": history_used,
        "message_count": get_message_count(session_id),
        "final_answer": fallback_answer,
    }
