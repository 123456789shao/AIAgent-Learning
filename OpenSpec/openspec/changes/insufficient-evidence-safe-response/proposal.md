## Why

当前这类基于知识库的 AI 问答系统，常见问题不只是“有没有 citation”，而是**答案里的关键结论是否真的被足够证据支撑**。仅靠召回命中和引用存在性，仍然可能出现“引用是真的，但结论撑不住”的情况。

这次变更要把“证据充分性校验”从隐含经验收紧成 OpenSpec 下的明确行为契约：系统在回答前后都要判断，当前证据是否足以支撑答案中的核心 claim；如果不够，就必须降级为保守回答，而不是继续硬答。

同时，这个目录不再把根目录 `proposal/spec/tasks` 与 `openspec/changes/...` 并行维护，而是明确以当前 change 目录作为唯一权威规范来源，避免双重权威和任务状态漂移。

## What Changes

- 将当前 evidence-sufficiency QA 项目的权威规范统一收敛到本 change 目录
- 定义系统不只要做 grounded answer，还要做 claim-level evidence validation
- 明确 planner、executor、validator、safe-response、eval、Web/CLI 的职责边界
- 明确证据不足、弱证据、冲突证据时的降级要求
- 将实现清理、命名收口和验证要求纳入同一条变更链路

## Scope

### In Scope
- 定义 evidence-sufficient QA Agent 的目标和边界
- 定义 claim、claim check、decision、evidence policy 等核心数据契约
- 定义证据充分性校验规则和拒答/降级策略
- 统一当前项目的规范入口、任务跟踪和实现映射
- 约束 CLI、Web Demo 和 eval 的一致行为

### Out of Scope
- 不重做底层检索架构
- 不接入新的外部向量数据库
- 不做跨会话记忆
- 不让 LLM 单独充当最终裁判
- 不为了目录形式而重写现有实现架构

## Expected Outcome

完成后，这个目录会具备清晰分工：

- `openspec/changes/insufficient-evidence-safe-response/` 作为当前活跃变更与唯一规范来源
- `project/` 作为与该规范对应的实现工作区
- 根目录 README 只承担导航职责，不再并行承载正式 proposal/spec/tasks

团队可以据此统一：

- 什么叫“证据充分”
- 什么情况下答案必须降级
- validator 到底要检查什么
- eval 应该如何验证系统没有过度推断
- 当前实现与规范之间还差哪些收尾工作
