from pydantic import BaseModel, Field

from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate

from src.models.ollama import create_ollama_chat_model


# 先定义“结构化输出”长什么样。
# 也就是告诉程序：模型最后应该返回哪些字段、每个字段是什么类型。
class StructuredAnswer(BaseModel):
    question: str = Field(description="用户原始问题")
    answer: str = Field(description="对问题的简洁中文回答")
    key_points: list[str] = Field(description="回答要点列表")


# 普通链：只要求模型直接回答，不强制固定输出结构。
BASIC_PROMPT = ChatPromptTemplate.from_messages([
    ("human", "请用简洁中文回答：{user_input}"),
])

# 结构化输出解析器：
# 它会根据 StructuredAnswer 这个模型，生成输出格式要求，
# 并在最后把模型返回的文本解析成 StructuredAnswer 对象。
STRUCTURED_OUTPUT_PARSER = PydanticOutputParser(pydantic_object=StructuredAnswer)

# 结构化链：
# 除了传入用户问题，还会额外告诉模型“你必须按指定格式输出”。
STRUCTURED_PROMPT = ChatPromptTemplate.from_messages([
    (
        "human",
        "请阅读用户问题，并严格按照指定格式输出。\n"
        "用户问题：{user_input}\n\n"
        "{format_instructions}"
    ),
])


def run_basic_chain(user_input: str) -> str:
    # 创建模型
    model = create_ollama_chat_model()
    # 把 user_input 填进 prompt 模板，生成真正发给模型的消息
    messages = BASIC_PROMPT.format_messages(user_input=user_input)
    # 调用模型
    response = model.invoke(messages)
    # 普通链直接返回文本结果
    return response.content if isinstance(response.content, str) else str(response.content)


def run_structured_chain(user_input: str) -> StructuredAnswer:
    # 创建模型
    model = create_ollama_chat_model()
    # 这里除了 user_input，还会把“格式要求”一起塞给模型
    messages = STRUCTURED_PROMPT.format_messages(
        user_input=user_input,
        format_instructions=STRUCTURED_OUTPUT_PARSER.get_format_instructions(),
    )
    # 调用模型
    response = model.invoke(messages)
    content = response.content if isinstance(response.content, str) else str(response.content)
    # 把模型返回的文本解析成 StructuredAnswer 对象
    return STRUCTURED_OUTPUT_PARSER.parse(content)
