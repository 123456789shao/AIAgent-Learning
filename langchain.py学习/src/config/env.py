from dataclasses import dataclass
import os
from pathlib import Path

from dotenv import load_dotenv


load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env")


@dataclass(frozen=True)
class EnvConfig:
    ollama_base_url: str
    ollama_model: str


def load_env() -> EnvConfig:
    ollama_base_url = os.getenv("OLLAMA_BASE_URL", "").strip()
    ollama_model = os.getenv("OLLAMA_MODEL", "").strip()

    missing_fields = []
    if not ollama_base_url:
        missing_fields.append("OLLAMA_BASE_URL")
    if not ollama_model:
        missing_fields.append("OLLAMA_MODEL")

    if missing_fields:
        raise ValueError(f"环境变量缺失: {', '.join(missing_fields)}")

    return EnvConfig(
        ollama_base_url=ollama_base_url,
        ollama_model=ollama_model,
    )
