## 1. Consolidate the spec authority

- [x] 1.1 将当前活跃规范统一收敛到 `openspec/changes/insufficient-evidence-safe-response/`
- [x] 1.2 将项目目标、scope 与 expected outcome 合并进当前 change `proposal.md`
- [x] 1.3 将 claim-centric / evidence-policy / downgrade / eval 要求合并进当前 change `spec.md`

## 2. Tighten the repository entrypoint

- [x] 2.1 重写根目录 `README.md`，只作为导航入口
- [x] 2.2 明确 `openspec/changes/insufficient-evidence-safe-response/` 是唯一权威规范来源
- [x] 2.3 移除 README 中把当前 change 当作“学习示例”的表述

## 3. Remove duplicate root-level spec documents

- [x] 3.1 删除根目录 `proposal.md`
- [x] 3.2 删除根目录 `spec.md`
- [x] 3.3 删除根目录 `tasks.md`

## 4. Align tasks with actual implementation

- [x] 4.1 确认 planner evidence policy 已由 `project/src/planner.ts`、`project/src/prompts.ts`、`project/src/schema.ts` 支撑
- [x] 4.2 确认 executor claim-centric 输出已由 `project/src/executor.ts`、`project/src/schema.ts` 支撑
- [x] 4.3 确认 validator sufficiency / conflict 检查已由 `project/src/validator.ts` 支撑
- [x] 4.4 确认 insufficient-evidence downgrade 已由 `project/src/safe-response.ts` 支撑
- [x] 4.5 确认 eval 流程已由 `project/src/eval.ts` 支撑
- [x] 4.6 确认 Web evidence audit 展示已由 `project/src/server.ts` 支撑

## 5. Align project metadata and naming

- [x] 5.1 将 `project/package.json` 中遗留的 Day7 包名收口到当前项目主题
- [x] 5.2 检查 CLI / 页面标题是否需要额外命名同步

## 6. Verify strictness and consistency

- [x] 6.1 运行 `npm run typecheck`
- [x] 6.2 检查 README 是否只指向 canonical change docs
- [x] 6.3 检查仓库根目录是否不再保留并行的正式 `proposal/spec/tasks`
- [x] 6.4 检查规范、任务与当前实现命名是否一致
