# OpenSpec 项目导航

这个目录现在采用拆分后的 OpenSpec 结构。

当前 `langchain.js-Demo` 的规范来源以 `openspec/changes/langchain-js-mvp-demo/` 为主，根目录这个文件只负责导航，不再并行维护完整规范内容。

## 当前变更主题

当前项目聚焦：**用 TypeScript + Node.js + LangChain.js 搭建一个最小可运行、可继续服务化演进的 AI Demo。**

重点约束：

- 坚持 MVP，不做大而全
- 先跑通最小 AI 主链路
- 保持配置、模型调用、Prompt、编排、入口分层
- 为后续服务化预留结构

## 规范入口

当前活跃变更位于：

- [openspec/changes/langchain-js-mvp-demo/proposal.md](openspec/changes/langchain-js-mvp-demo/proposal.md)
- [openspec/changes/langchain-js-mvp-demo/tasks.md](openspec/changes/langchain-js-mvp-demo/tasks.md)
- [openspec/changes/langchain-js-mvp-demo/specs/langchain-js-mvp-demo/spec.md](openspec/changes/langchain-js-mvp-demo/specs/langchain-js-mvp-demo/spec.md)

推荐阅读顺序：

1. `proposal.md`：为什么做这件事、范围是什么
2. `spec.md`：项目必须满足哪些行为和结构约束
3. `tasks.md`：当前落地事项和推进顺序

## 当前目录说明

- [src/](src/)：项目源码目录，按职责拆分配置、模型、Prompt、链路和服务
- [scripts/](scripts/)：辅助脚本与一次性调试脚本
- [examples/](examples/)：示例输入输出与演示材料
- [openspec/](openspec/)：OpenSpec 规范目录

## 一句话理解

**这里的 OpenSpec 作用是：先把 MVP 的目标、范围、边界和验收写清楚，再进入实现。**
