from __future__ import annotations

from typing import Any, Literal

from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from src.models.ollama import create_ollama_chat_model
from src.tools.weather import get_weather


class LoopDecision(BaseModel):
    type: Literal["final", "tool"] = Field(description="当前这一步的决策类型")
    reason: str = Field(description="当前这一步为什么这样决策")
    answer: str | None = Field(default=None, description="当 type 为 final 时使用")
    tool_name: str | None = Field(default=None, description="当 type 为 tool 时使用，当前只允许 get_weather")
    tool_input: dict[str, Any] | None = Field(default=None, description="当 type 为 tool 时使用的工具参数")


DECISION_PARSER = PydanticOutputParser(pydantic_object=LoopDecision)
LOOP_PROMPT = ChatPromptTemplate.from_messages([
    (
        "human",
        "你是一个带最小 loop / ReAct 的单 Agent 执行器。\n"
        "你每一步只能输出一个 JSON 对象，不能输出额外解释、不能输出 markdown。\n\n"
        "你只能输出两类决策：\n"
        "1. final：表示你已经可以直接给最终答案\n"
        "2. tool：表示你需要调用工具后再继续\n\n"
        "如果你输出 final，必须同时提供 answer 和 reason。\n"
        "如果你输出 tool，必须同时提供 tool_name、tool_input 和 reason。\n\n"
        "当前只允许使用一个工具：get_weather。\n"
        "get_weather 的输入格式必须是：\n"
        "{{\n"
        '  "city": "城市名"\n'
        "}}\n\n"
        "规则：\n"
        "- 如果问题是天气相关且已经明确给出城市，可以调用 get_weather\n"
        "- 如果问题是天气相关但没有城市，不要调用工具，直接输出 final，answer 要明确提示用户补充城市\n"
        "- 如果最近一步已经拿到了 tool observation，就优先基于 observation 输出 final，answer 要直接给出结果\n"
        "- 如果问题不需要天气工具，就直接输出 final，answer 要直接回答用户问题\n"
        "- 绝对不要编造不存在的工具或工具结果\n"
        "- 你的输出必须是合法 JSON\n\n"
        "用户输入：{user_input}\n"
        "当前步骤：{step}\n"
        "已执行步骤摘要：\n{steps_summary}\n\n"
        "最近一次 tool observation：\n{observation}\n\n"
        "{format_instructions}"
    ),
])


def _format_steps_summary(steps: list[dict[str, Any]]) -> str:
    if not steps:
        return "暂无已执行步骤"

    lines: list[str] = []
    for step in steps:
        if step["decision_type"] == "final":
            lines.append(f"step {step['step']}: final -> {step.get('final_answer') or ''}")
        else:
            lines.append(
                f"step {step['step']}: tool({step.get('tool_name') or 'unknown'}) -> {step.get('tool_status') or 'unknown'}"
            )
    return "\n".join(lines)


def _build_observation(steps: list[dict[str, Any]]) -> str:
    if not steps:
        return "暂无 tool observation"

    last_step = steps[-1]
    if last_step["decision_type"] != "tool":
        return "暂无 tool observation"

    if last_step.get("tool_status") == "failed":
        return str({
            "tool_name": last_step.get("tool_name"),
            "tool_input": last_step.get("tool_input"),
            "error": last_step.get("tool_output"),
        })

    return str({
        "tool_name": last_step.get("tool_name"),
        "tool_input": last_step.get("tool_input"),
        "tool_output": last_step.get("tool_output"),
    })


def _build_result(
    user_input: str,
    steps: list[dict[str, Any]],
    stop_reason: str,
    final_answer: str,
) -> dict[str, Any]:
    tool_names = [step["tool_name"] for step in steps if step.get("tool_name")]
    return {
        "mode": "loop-react",
        "input": user_input,
        "used_tools": bool(tool_names),
        "tool_names": tool_names,
        "steps": steps,
        "step_count": len(steps),
        "stop_reason": stop_reason,
        "final_answer": final_answer,
    }


def run_weather_loop_react(user_input: str, max_steps: int = 3) -> dict[str, Any]:
    model = create_ollama_chat_model()
    steps: list[dict[str, Any]] = []

    for step_index in range(1, max_steps + 1):
        messages = LOOP_PROMPT.format_messages(
            user_input=user_input,
            step=step_index,
            steps_summary=_format_steps_summary(steps),
            observation=_build_observation(steps),
            format_instructions=DECISION_PARSER.get_format_instructions(),
        )
        response = model.invoke(messages)
        raw_model_output = response.content if isinstance(response.content, str) else str(response.content)

        try:
            decision = DECISION_PARSER.parse(raw_model_output)
        except Exception:
            fallback_answer = "暂时无法稳定解析本次模型决策，请稍后重试。"
            steps.append({
                "step": step_index,
                "decision_type": "final",
                "reason": "模型输出不符合预期 JSON 结构。",
                "raw_model_output": raw_model_output,
                "tool_name": None,
                "tool_input": None,
                "tool_output": None,
                "tool_status": None,
                "final_answer": fallback_answer,
            })
            return _build_result(user_input, steps, "invalid_model_output", fallback_answer)

        if decision.type == "final":
            final_answer = (decision.answer or "").strip()
            if not final_answer:
                final_answer = "请补充具体城市，例如北京、上海。"
            steps.append({
                "step": step_index,
                "decision_type": "final",
                "reason": decision.reason,
                "raw_model_output": raw_model_output,
                "tool_name": None,
                "tool_input": None,
                "tool_output": None,
                "tool_status": None,
                "final_answer": final_answer,
            })
            return _build_result(user_input, steps, "final_answer", final_answer)

        tool_name = (decision.tool_name or "").strip()
        tool_input = decision.tool_input or {}

        if tool_name != get_weather.name:
            fallback_answer = f"当前不支持工具：{tool_name or 'unknown'}"
            steps.append({
                "step": step_index,
                "decision_type": "tool",
                "reason": decision.reason,
                "raw_model_output": raw_model_output,
                "tool_name": tool_name or None,
                "tool_input": tool_input,
                "tool_output": fallback_answer,
                "tool_status": "failed",
                "final_answer": None,
            })
            return _build_result(user_input, steps, "unknown_tool", fallback_answer)

        try:
            tool_output = str(get_weather.invoke(tool_input))
            tool_status = "success"
        except Exception as error:
            tool_output = str(error)
            tool_status = "failed"

        steps.append({
            "step": step_index,
            "decision_type": "tool",
            "reason": decision.reason,
            "raw_model_output": raw_model_output,
            "tool_name": tool_name,
            "tool_input": tool_input,
            "tool_output": tool_output,
            "tool_status": tool_status,
            "final_answer": None,
        })

        if tool_status == "failed":
            return _build_result(user_input, steps, "tool_failed", tool_output)

    fallback_answer = "已达到最大循环步数，请简化问题后再试。"
    return _build_result(user_input, steps, "max_steps_reached", fallback_answer)
