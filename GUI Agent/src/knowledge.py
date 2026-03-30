import yaml
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parent.parent


def _read_yaml(file_path: Path) -> dict[str, Any]:
    with file_path.open("r", encoding="utf-8") as file:
        data = yaml.safe_load(file) or {}
    if not isinstance(data, dict):
        raise ValueError(f"YAML 文件格式错误: {file_path}")
    return data


def load_settings(settings_path: str | None = None) -> dict[str, Any]:
    path = Path(settings_path) if settings_path else BASE_DIR / "config" / "settings.yaml"
    settings = _read_yaml(path)
    settings.setdefault("app_title", "GUI Agent MVP")
    settings.setdefault("scan_interval_ms", 2000)
    settings.setdefault("debug", True)
    settings.setdefault("ocr_language", "ch")
    settings.setdefault("rules_file", "rules/scene_rules.yaml")
    settings.setdefault("trace_enabled", True)
    settings.setdefault("trace_file", "logs/gui_agent_trace.jsonl")
    return settings


def load_rules(rules_path: str | None = None) -> list[dict[str, Any]]:
    settings = load_settings() if rules_path is None else None
    if rules_path:
        path = Path(rules_path)
    else:
        path = BASE_DIR / settings["rules_file"]

    data = _read_yaml(path)
    rules = data.get("scene_rules", [])
    if not isinstance(rules, list):
        raise ValueError(f"规则文件格式错误: {path}")
    return [rule for rule in rules if isinstance(rule, dict)]


def resolve_path(path_str: str) -> Path:
    path = Path(path_str)
    return path if path.is_absolute() else BASE_DIR / path
