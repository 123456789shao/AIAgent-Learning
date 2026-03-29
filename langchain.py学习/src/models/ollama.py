from langchain_ollama import ChatOllama

from src.config.env import load_env


def create_ollama_chat_model() -> ChatOllama:
    env = load_env()
    return ChatOllama(
        base_url=env.ollama_base_url,
        model=env.ollama_model,
    )
