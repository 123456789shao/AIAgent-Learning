from __future__ import annotations

import time
from typing import Any


def _contains_all(text: str, keywords: list[str]) -> bool:
    return all(keyword in text for keyword in keywords)


def _contains_any(text: str, keywords: list[str]) -> bool:
    return not keywords or any(keyword in text for keyword in keywords)


def _contains_excluded(text: str, keywords: list[str]) -> bool:
    return any(keyword in text for keyword in keywords)


def decide(perception: dict[str, Any], rules: list[dict[str, Any]]) -> dict[str, Any]:
    started_at = time.perf_counter()
    text = perception.get("ocr_text", "")

    for rule in rules:
        keywords_all = rule.get("keywords_all", [])
        keywords_any = rule.get("keywords_any", [])
        exclude_keywords = rule.get("exclude_keywords", [])

        if not _contains_all(text, keywords_all):
            continue
        if not _contains_any(text, keywords_any):
            continue
        if _contains_excluded(text, exclude_keywords):
            continue

        decision_type = "suggest_next_step" if rule.get("next_step") else "remind"
        return {
            "matched": True,
            "scene_id": rule.get("scene_id"),
            "scene_name": rule.get("name"),
            "reason": f"命中规则 {rule.get('scene_id')}，满足关键词条件。",
            "hint": rule.get("hint"),
            "next_step": rule.get("next_step"),
            "risk_level": rule.get("risk_level", "low"),
            "decision_type": decision_type,
            "elapsed_ms": int((time.perf_counter() - started_at) * 1000),
        }

    return {
        "matched": False,
        "scene_id": None,
        "scene_name": None,
        "reason": "未识别到已配置页面。",
        "hint": None,
        "next_step": None,
        "risk_level": None,
        "decision_type": "no_action",
        "elapsed_ms": int((time.perf_counter() - started_at) * 1000),
    }
