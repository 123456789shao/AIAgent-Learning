## Why

当前 `langchain.js-Demo` 已经完成最小可运行 AI 主链路：

- TypeScript + Node.js 基础工程
- 本地模型调用
- LangChain.js 最小编排
- `Prompt -> Model -> Output` 可独立运行

但当前实现本质上仍然是一个单次 chain demo，还不具备以下能力：

- 统一的 agent 执行入口
- 会话内上下文记忆
- 受控的工具调用
- 可复用的 skill 抽象
- 有边界的多步 loop 执行

为了让项目继续在当前目录中演进，并按照 `agent -> memory -> tool -> skill -> loop` 的顺序推进，需要定义第二阶段规范，用于将项目从最小 chain demo 演进为最小 agent runtime demo。

## What Changes

本次变更为 `langchain.js-Demo` 定义一个 **Single Agent Runtime MVP**。

本阶段将按以下顺序逐步演进：

1. agent
2. memory
3. tool
4. skill
5. loop

本阶段目标不是构建多 Agent 平台，也不是完整 AI 工作流框架，而是形成一个：

- 单 Agent
- 会话内短期 memory
- 少量受控 tool
- 少量预设 skill
- 有边界 loop

的最小可运行运行时。

同时，本次变更要求保留现有最小 chain 路径，作为基础验证与回归基线。

## Scope

### In Scope

- 单 Agent 执行入口
- 统一的 agent 输入输出结构
- 会话范围内短期 memory
- 少量本地、低副作用 tool
- 少量固定任务型 skill
- 有最大步数和终止条件的 loop
- 保留现有 basic chain 作为基线
- 延续当前分层结构进行增量演进

### Out of Scope

- 多 Agent 协作
- 长期持久化 memory
- RAG / 向量检索
- 高副作用外部系统工具
- 复杂权限系统
- 工作流平台化
- 动态远程 skill / 插件市场
- 一开始就服务化为完整前后端系统

## Expected Outcome

完成后，项目应具备：

- 一个统一的 agent 运行入口
- 支持 session 级上下文连续
- 能通过少量 tool 完成简单任务
- 能通过 skill 提供稳定的高层任务能力
- 能在有限步内执行多轮任务
- 同时保留最小 chain demo 作为基础验证路径

## Design Principles

- 先最小可运行，再逐步增强
- 优先复用现有 `config / models / prompts / chains / services`
- 保留 `runBasicChain` 作为最小回归基线
- 每阶段只引入一个新的核心变量
- 所有能力保持可观察、可验证、可回退
- 避免过度抽象和平台化设计
