from langchain_core.messages import HumanMessage

from src.models.ollama import create_ollama_chat_model


def run_basic_chain(user_input: str) -> str:
    model = create_ollama_chat_model()
    response = model.invoke([
        HumanMessage(content=f"请用简洁中文回答：{user_input}")
    ])
    return response.content if isinstance(response.content, str) else str(response.content)
