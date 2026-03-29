from pydantic import BaseModel, Field

from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate

from src.models.ollama import create_ollama_chat_model


class StructuredAnswer(BaseModel):
    question: str = Field(description="用户原始问题")
    answer: str = Field(description="对问题的简洁中文回答")
    key_points: list[str] = Field(description="回答要点列表")


BASIC_PROMPT = ChatPromptTemplate.from_messages([
    ("human", "请用简洁中文回答：{user_input}"),
])

STRUCTURED_OUTPUT_PARSER = PydanticOutputParser(pydantic_object=StructuredAnswer)
STRUCTURED_PROMPT = ChatPromptTemplate.from_messages([
    (
        "human",
        "请阅读用户问题，并严格按照指定格式输出。\n"
        "用户问题：{user_input}\n\n"
        "{format_instructions}"
    ),
])


def run_basic_chain(user_input: str) -> str:
    model = create_ollama_chat_model()
    messages = BASIC_PROMPT.format_messages(user_input=user_input)
    response = model.invoke(messages)
    return response.content if isinstance(response.content, str) else str(response.content)


def run_structured_chain(user_input: str) -> StructuredAnswer:
    model = create_ollama_chat_model()
    messages = STRUCTURED_PROMPT.format_messages(
        user_input=user_input,
        format_instructions=STRUCTURED_OUTPUT_PARSER.get_format_instructions(),
    )
    response = model.invoke(messages)
    content = response.content if isinstance(response.content, str) else str(response.content)
    return STRUCTURED_OUTPUT_PARSER.parse(content)
