from __future__ import annotations

import json
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Callable


class GuiAgentLoop:
    def __init__(
        self,
        perceptor,
        rules: list[dict[str, Any]],
        decide_fn: Callable[[dict[str, Any], list[dict[str, Any]]], dict[str, Any]],
        trace_enabled: bool = True,
        trace_file: str | Path | None = None,
    ) -> None:
        self.perceptor = perceptor
        self.rules = rules
        self.decide_fn = decide_fn
        self.trace_enabled = trace_enabled
        self.trace_file = Path(trace_file) if trace_file else None

    def run_once(self) -> dict[str, Any]:
        started_at = time.perf_counter()
        try:
            perception = self.perceptor.perceive()
            decision = self.decide_fn(perception, self.rules)
            result = {
                "status": "ok",
                "timestamp": perception["timestamp"],
                "perception": {
                    "ocr_text": perception["ocr_text"],
                    "ocr_lines": perception["ocr_lines"],
                    "screen_size": perception["screen_size"],
                },
                "decision": {
                    "matched": decision["matched"],
                    "scene_id": decision["scene_id"],
                    "scene_name": decision["scene_name"],
                    "reason": decision["reason"],
                    "hint": decision["hint"],
                    "next_step": decision["next_step"],
                    "risk_level": decision["risk_level"],
                    "decision_type": decision["decision_type"],
                },
                "elapsed_ms": int((time.perf_counter() - started_at) * 1000),
            }
        except Exception as exc:
            result = {
                "status": "error",
                "timestamp": datetime.now().isoformat(timespec="seconds"),
                "perception": {
                    "ocr_text": "",
                    "ocr_lines": [],
                    "screen_size": [],
                },
                "decision": {
                    "matched": False,
                    "scene_id": None,
                    "scene_name": None,
                    "reason": str(exc),
                    "hint": None,
                    "next_step": None,
                    "risk_level": None,
                    "decision_type": "no_action",
                },
                "elapsed_ms": int((time.perf_counter() - started_at) * 1000),
            }
            self._write_trace(result)
            raise

        self._write_trace(result)
        return result

    def _write_trace(self, result: dict[str, Any]) -> None:
        if not self.trace_enabled or self.trace_file is None:
            return
        self.trace_file.parent.mkdir(parents=True, exist_ok=True)
        with self.trace_file.open("a", encoding="utf-8") as file:
            file.write(json.dumps(result, ensure_ascii=False) + "\n")
