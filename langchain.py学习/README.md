# LangChain 快速入门

一个用于学习 LangChain Python 版的最小示例项目。

## 当前阶段目标

当前先完成 **basic chain baseline**，只验证最小闭环：

- 环境变量读取与校验
- Ollama 本地模型接入
- LangChain 最小调用链路打通
- Jupyter notebook 可顺序运行

后续再逐步演进到：prompt template、parser、tool、memory、agent。

## 目录说明

- `notebooks/01_basic_chain.ipynb`：最小学习入口
- `src/config/env.py`：环境变量读取与校验
- `src/models/ollama.py`：Ollama 模型创建
- `src/chains/basic_chain.py`：basic chain 执行逻辑
- `requirements.txt`：最小依赖
- `.env.example`：环境变量示例

## 环境要求

- Python 3.11+
- Jupyter
- Ollama
- 可用的本地模型

## 环境变量

在项目根目录创建 `.env`：

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:8b
```

如果你本地使用别的模型，只需要把 `OLLAMA_MODEL` 改成对应名称。

## 安装依赖

推荐先创建虚拟环境，再安装依赖：

```bash
pip install -r requirements.txt
```

## 启动 notebook

```bash
jupyter notebook
```

打开 `notebooks/01_basic_chain.ipynb`，按顺序运行全部 cell。

## 当前 notebook 会验证什么

1. 能成功导入 `src` 下模块
2. 环境变量能被正确读取和校验
3. Ollama 模型能直接返回结果
4. basic chain baseline 能成功返回结果

## 最小通过标准

- 没有环境变量缺失错误
- notebook 能成功导入项目模块
- 直接模型调用成功
- basic chain 调用成功

## 后续建议路线

当前只做第零步：

- 第零步：basic chain baseline

后续可以继续按这个顺序演进：

- 第一步：prompt template
- 第二步：output parser / structured output
- 第三步：tool
- 第四步：memory
- 第五步：agent
