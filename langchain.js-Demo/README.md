# langchain.js-Demo

一个用于学习 LangChain.js 的最小示例项目。

当前阶段目标：
- 保留最小 basic chain 基线
- 完成单 Agent Runtime MVP 的前两步：agent + memory

## 当前已完成

- 基础环境变量读取与校验
- Ollama 本地模型接入
- basic chain 调用链路
- 单 Agent 最小执行入口
- session 级短期 memory
- basic chain 与 agent 双路径运行验证
- 同 session 多轮对话验证
- 不同 session 隔离验证

## 目录说明

- `src/config`：环境变量读取与校验
- `src/models`：模型工厂
- `src/prompts`：prompt 模板
- `src/chains`：基础 chain 执行逻辑
- `src/agents`：agent 类型与执行入口
- `src/memory`：session 级短期记忆存储
- `src/services`：对外服务层入口
  - `basicService.ts`：basic 路线入口
  - `agentService.ts`：agent 路线入口
- `src/index.ts`：demo 启动入口
- `openspec/`：需求变更、任务拆分、规格说明

## 环境要求

- Node.js
- Ollama
- 可用的本地模型

## 环境变量

在项目根目录创建 `.env`：

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:8b
```

如果你使用别的模型，只需要把 `OLLAMA_MODEL` 改成对应名称。

## 安装依赖

```bash
npm install
```

## 运行项目

```bash
npm run dev
```

当前运行后会输出两部分结果：
- Basic Output：来自 `runBasicService -> runBasicChain`
- Agent Output：来自 `runAgentService -> runAgent`

同时会展示：
- Session A 第一轮结果
- Session A 第二轮结果
- Session B 隔离结果

## 当前第二阶段说明

当前实现的是同事建议顺序里的前两步：

`agent -> memory -> tool -> skill -> loop`

现在已完成的是：
- agent 初始化
- agent 能接收输入
- agent 能调用模型
- agent 能返回结果
- memory 能按 `sessionId` 隔离
- 同一 session 内能记住最近几轮对话
- history 超出上限时会自动裁剪

当前 memory 的边界是：
- 只做当前进程内短期记忆
- 只做 session 级隔离
- 只保留最近 6 条消息
- 不做长期持久化
- 不做 RAG / 向量检索
- 不做摘要压缩

还未开始的是：
- tool
- skill
- loop

## 命名说明

当前项目按“路线名 + 职责名”理解最清楚：

- basic：最小闭环 baseline
- agent：按同事思路继续演进的 runtime 线

当前对外主干可以这样看：
- basic 线：`basicPrompt` / `basicService` / `runBasicChain`
- agent 线：`agentPrompt` / `agentService` / `runAgent`

## 验证示例

当前 demo 默认验证这几件事：

1. basic chain 仍可正常运行
2. `session-a` 第一轮说“我叫小王，请记住”
3. `session-a` 第二轮追问“我刚刚叫什么？”
4. `session-b` 直接追问“我刚刚叫什么？”，验证不会串会话

预期现象：
- `session-a` 第二轮能答出“小王”
- `session-b` 因为没有历史，答不出来

## OpenSpec 说明

当前有两个 change：

- `langchain-js-mvp-demo`
  - 对应最早的 basic chain demo
- `langchain-js-agent-runtime-mvp`
  - 对应当前单 Agent Runtime MVP 演进

可以理解为：
- 前者记录“最小 chain demo”
- 后者记录“从 chain 继续演进到 agent runtime”
