# LangChain 快速入门

一个用于学习 LangChain Python 版的最小示例项目。

## 当前阶段目标

当前进入 **tool** 这一步，在已有 basic chain baseline、prompt template 和 structured output 基础上继续验证最小闭环：

- 环境变量读取与校验
- Ollama 本地模型接入
- LangChain 最小调用链路打通
- prompt template 组织用户输入
- structured output 解析模型结果
- weather tool 查询外部天气信息
- Jupyter notebook 可顺序运行

后续再逐步演进到：memory、agent。

## 目录说明

- `notebooks/01_basic_chain.ipynb`：basic chain、prompt template、structured output 学习入口
- `notebooks/02_tool.ipynb`：weather tool 学习入口
- `src/config/env.py`：环境变量读取与校验
- `src/models/ollama.py`：Ollama 模型创建
- `src/chains/basic_chain.py`：basic chain 与 structured output 执行逻辑
- `src/chains/tool_chain.py`：模型与 weather tool 的最小调用链
- `src/tools/weather.py`：WeatherAPI 查询与 LangChain tool 封装
- `requirements.txt`：最小依赖
- `.env.example`：环境变量示例

## 环境要求

- Python 3.11+
- Jupyter
- Ollama
- 可用的本地模型
- WeatherAPI key（仅第 3 步 tool 需要）

## 环境变量

在项目根目录创建 `.env`：

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:8b
WEATHER_API_KEY=your_weatherapi_key
```

如果你本地使用别的模型，只需要把 `OLLAMA_MODEL` 改成对应名称。

说明：

- `OLLAMA_BASE_URL` 与 `OLLAMA_MODEL` 是前几步的基础配置
- `WEATHER_API_KEY` 只在第 3 步 tool 示例中需要

## 安装依赖

推荐先创建虚拟环境，再安装依赖：

```bash
pip install -r requirements.txt
```

## 启动 notebook

```bash
jupyter notebook
```

然后按阶段打开对应 notebook：

- `notebooks/01_basic_chain.ipynb`
- `notebooks/02_tool.ipynb`

## 当前 notebook 会验证什么

### 01_basic_chain.ipynb

1. 能成功导入 `src` 下模块
2. 环境变量能被正确读取和校验
3. Ollama 模型能直接返回结果
4. prompt template 版本的 basic chain 能成功返回结果
5. structured output 版本的 chain 能成功返回结构化结果
6. 不同输入会得到同一结构但不同内容的输出

### 02_tool.ipynb

1. 能读取 weather tool 所需环境变量
2. 能直接调用 weather tool 查询指定城市天气
3. weather tool 能返回稳定的简化结果
4. 模型能绑定 weather tool 并完成一次最小 tool calling
5. 最终输出是基于工具结果生成的中文天气总结

## 最小通过标准

- 没有 Ollama 相关环境变量缺失错误
- `01_basic_chain.ipynb` 能成功运行
- prompt template 与 structured output 调用成功
- 配置 `WEATHER_API_KEY` 后，`02_tool.ipynb` 能成功运行
- weather tool 能查询指定城市的当前天气
- 模型面对天气问题时能触发 weather tool
- 最终输出为基于工具结果的中文回答

## 后续建议路线

当前先做到这一步：

- 第零步：basic chain baseline
- 第一步：prompt template
- 第二步：output parser / structured output
- 第三步：tool

后续可以继续按这个顺序演进：

- 第四步：memory
- 第五步：agent
