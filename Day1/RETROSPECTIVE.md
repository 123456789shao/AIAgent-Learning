# Day1 复盘

## 今天完成了什么

1. 从 0 搭建了一个最小 Node.js + TypeScript + Gemini SDK 项目。
2. 实现了一个可重复调用的 TypeScript CLI 问答脚本：输入问题后，分别跑 Prompt A 和 Prompt B。
3. 给回答加入了基础约束：语气友好、格式清晰、长度受控。
4. 补齐了 `TASKS.md` 和 `README.md`，并把 Day1 整理成了 Gemini 版 TypeScript 结构。

## Prompt 对比结论

- Prompt A 更适合直接给出结论，回答会更干脆。
- Prompt B 更像导师带学，通常会更照顾初学者理解。
- 当约束明确写进 system instruction 后，输出稳定性会明显更好。

## 今天踩坑 / 复盘

1. `npm install` 需要在 `Day1` 目录下执行，否则会因为找不到当前目录 `package.json` 报错。
2. 没有配置 `GEMINI_API_KEY` 时，脚本无法真正调用模型，所以先补了清晰的报错提示。
3. 这次没有重做 Day1 架构，而是保留 CLI 主流程，只替换模型提供方，迁移成本更低。
4. 继续使用 `tsx` 直接跑 `.ts`，能把 Day1 控制在最小可运行范围内，适合先学清楚调用链路。

## 当前状态

已经完成 Day1 的 Gemini 版 TypeScript 代码骨架与本地运行验证准备。

当前还差最后一步：
- 你本地创建 `.env`
- 填入真实 `GEMINI_API_KEY`
- 再执行一次命令，观察两版 Prompt 的真实输出差异

## 明天进入 Day2 前建议

下一步直接做结构化输出：
- 让回答返回固定 JSON
- 做校验
- 校验失败自动重试
