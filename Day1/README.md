# Day1：最小可运行问答 Agent

这是第 1 天的练习项目，目标是跑通一个最小 AI Agent：

- 输入用户问题
- 调用 Gemini 返回答案
- 用两版 Prompt 对比输出质量
- 给回答加基础约束：语气、格式、长度
- 全面使用 TypeScript 组织 Day1 代码

## 目录结构

- `TASKS.md`：当天任务清单
- `src/index.ts`：CLI 入口
- `src/config.ts`：读取配置
- `src/prompts.ts`：两版 Prompt
- `src/model.ts`：Gemini 模型调用封装
- `tsconfig.json`：TypeScript 配置
- `.env.example`：环境变量示例

## 1. 安装依赖

```bash
npm install
```

## 2. 配置环境变量

复制 `.env.example` 为 `.env`，并填入你的 key：

```bash
GEMINI_API_KEY=你的key
GEMINI_MODEL=gemini-2.5-flash
```

## 3. 类型检查

```bash
npm run typecheck
```

## 4. 运行脚本

```bash
npm run ask -- 什么是 Prompt？
```

## 5. 你会看到什么

脚本会针对同一个问题调用两次模型：

- Prompt A：直接回答型
- Prompt B：导师讲解型

输出时会分段展示，方便你观察：

- 哪版更清晰
- 哪版更适合初学者
- 哪版更符合格式和长度要求

## 6. Day1 学习重点

建议你重点观察：

1. Prompt 改动后，回答风格是否明显变化
2. 约束写清楚后，输出是否更稳定
3. 相同问题下，不同 Prompt 的质量差异
4. TypeScript 是否让配置、Prompt 和模型调用边界更清晰

## 7. 下一步

Day1 完成后，你可以继续做 Day2：

- 让模型输出固定 JSON
- 做结构校验
- 校验失败自动重试
