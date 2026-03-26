# OpenSpec 项目工作区

这个目录现在按更严格的 OpenSpec 工作流组织：

- `openspec/changes/insufficient-evidence-safe-response/` 是当前变更的**唯一权威规范来源**
- `project/` 是对应的实现工作区
- 根目录不再维护并行的 `proposal/spec/tasks`，避免双重权威

## 当前项目主题

本项目实现的是一个**带证据充分性校验的问答 Agent**。

重点不是“检索到了内容并附上 citation 就算完成”，而是要求系统显式判断：

- 回答里的核心 claim 是否被足够证据支撑
- 证据不足时是否会降级为保守回答
- 出现弱证据或冲突证据时是否会拒绝维持高确定性结论

## 规范入口

当前活跃变更位于：

- [openspec/changes/insufficient-evidence-safe-response/proposal.md](openspec/changes/insufficient-evidence-safe-response/proposal.md)
- [openspec/changes/insufficient-evidence-safe-response/tasks.md](openspec/changes/insufficient-evidence-safe-response/tasks.md)
- [openspec/changes/insufficient-evidence-safe-response/specs/answer-safety/spec.md](openspec/changes/insufficient-evidence-safe-response/specs/answer-safety/spec.md)

阅读顺序建议：

1. `proposal.md`：为什么要做这项变更
2. `spec.md`：系统必须满足哪些行为约束
3. `tasks.md`：当前实现状态、剩余清理项与验证项

## 实现目录

- [project/](project/)：TypeScript Demo 与运行入口
- [project/src/](project/src/)：planner / executor / validator / safe-response / eval / server 等实现
- [project/eval/](project/eval/)：评测样例
- [project/public/](project/public/)：Web Demo 静态资源

## 运行方式

在 `project/` 目录下可使用：

- `npm run typecheck`
- `npm run eval`
- `npm run start`

## 一句话理解

**这里现在是一个以 OpenSpec change 为唯一规范入口、以 `project/` 为实现工作区的 evidence-sufficiency QA 项目。**
