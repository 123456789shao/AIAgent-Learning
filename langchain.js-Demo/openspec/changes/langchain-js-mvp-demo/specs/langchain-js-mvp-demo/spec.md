# langchain-js-mvp-demo Spec

## Goal

定义 `langchain.js-Demo` 第一阶段的实现约束，确保项目以 MVP 方式推进：先跑通最小 AI 链路，再逐步演进到服务化。

## Requirements

### Requirement: 工程基础必须以 TypeScript + Node.js 为核心
项目 MUST 使用 TypeScript 与 Node.js 作为第一阶段工程基础。

#### Scenario: 初始化项目基础
- **WHEN** 开始第一阶段实现
- **THEN** 项目应以 TypeScript + Node.js 作为默认运行与开发环境
- **AND** 基础配置应支持本地脚本运行

### Requirement: 项目必须先跑通最小 AI 主链路
项目 MUST 先完成最小可运行链路，而不是优先扩展复杂能力。

#### Scenario: 跑通最小调用
- **WHEN** 第一阶段 MVP 完成
- **THEN** 项目应能够完成一次从输入到模型输出的最小调用流程
- **AND** 该流程应可在本地独立验证

### Requirement: LangChain.js 只作为 AI 编排层
项目 MUST 将 LangChain.js 作为上层 AI 编排能力，而不是把它与运行环境或服务入口混写。

#### Scenario: 组织 AI 能力
- **WHEN** 接入 LangChain.js
- **THEN** Prompt、模型调用、链路编排应具备清晰职责边界
- **AND** 不应把所有逻辑堆叠在单一入口文件中

### Requirement: 第一阶段必须遵守 MVP 范围
项目 MUST 聚焦当前最小 demo 目标，不得在第一阶段引入超出范围的重型能力。

#### Scenario: 控制实现范围
- **WHEN** 设计第一阶段功能
- **THEN** 只应覆盖最小调用、基本编排与必要结构
- **AND** 不应默认包含多 Agent、完整 RAG、跨会话记忆等复杂能力

### Requirement: 结构必须为服务化演进预留空间
项目 SHOULD 保持清晰分层，使后续能够接入服务框架。

#### Scenario: 为服务化预留结构
- **WHEN** 组织项目目录和模块职责
- **THEN** 应能区分配置、模型调用、Prompt、主流程和服务入口
- **AND** 后续可平滑扩展到 Express、Koa、Next.js 或 NestJS 等服务层
