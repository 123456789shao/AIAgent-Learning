## Why

当前 `langchain.js-Demo` 的目标不是做一个大而全的 AI 平台，而是做一个能快速跑通、便于理解、后续可继续服务化演进的小 demo。

如果没有清晰规范，最容易出现的问题是：

- 一开始同时堆太多能力，主线不清
- 一边写代码一边改目标
- 把脚本验证、AI 编排、服务化混在一起
- 最后 demo 虽然能跑，但结构难以扩展

因此需要先把第一阶段的目标、范围和边界写清楚，再进入实现。

## What Changes

本次变更为 `langchain.js-Demo` 定义第一阶段 OpenSpec：

- 使用 `TypeScript + Node.js` 作为工程基础
- 使用本地模型运行环境作为推理底座
- 使用 `LangChain.js` 作为 AI 编排层
- 先完成一个最小可运行 MVP，再考虑服务化扩展

同时明确第一阶段不追求：

- 大规模多 Agent 协作
- 完整 RAG / Memory 体系
- 重型平台化架构
- 面向未来假设场景的过度抽象

## Scope

### In Scope
- TypeScript / Node.js 基础工程搭建
- 本地模型调用链路打通
- LangChain.js 最小调用与编排
- 一个可运行的 MVP demo
- 为后续服务化保留清晰分层

### Out of Scope
- 多 Agent 编排系统
- 完整知识库问答系统
- 跨会话记忆
- 复杂权限体系
- 一开始就接入完整前后端平台

## Expected Outcome

完成后，项目应具备：

- 本地最小 AI 调用能力
- 清晰的模块边界
- 可继续演进到服务接口层的结构
- 保持小而清晰的 MVP 复杂度
