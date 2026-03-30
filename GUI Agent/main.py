from __future__ import annotations

from src.decision import decide
from src.knowledge import load_rules, load_settings, resolve_path
from src.loop import GuiAgentLoop
from src.operator import GuiAgentApp
from src.perceptor import ScreenPerceptor


def main() -> None:
    settings = load_settings()
    rules = load_rules()
    perceptor = ScreenPerceptor(language=settings.get("ocr_language", "ch"))
    loop = GuiAgentLoop(
        perceptor=perceptor,
        rules=rules,
        decide_fn=decide,
        trace_enabled=bool(settings.get("trace_enabled", True)),
        trace_file=resolve_path(settings.get("trace_file", "logs/gui_agent_trace.jsonl")),
    )
    app = GuiAgentApp(
        title=settings.get("app_title", "GUI Agent MVP"),
        scan_interval_ms=int(settings.get("scan_interval_ms", 2000)),
        run_once=loop.run_once,
    )
    app.start()


if __name__ == "__main__":
    main()
