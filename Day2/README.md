# Day2：结构化输出 Agent

这是第 2 天的练习项目，目标是把 Day1 的自由文本回答，升级成前端更容易消费的固定 JSON 输出：

- 输入用户问题
- 调用 Gemini 返回结果
- 约束模型只输出固定 JSON
- 本地做结构校验
- 校验失败自动重试

## 目录结构

- `TASKS.md`：当天任务清单
- `src/index.ts`：CLI 入口
- `src/config.ts`：读取配置
- `src/prompts.ts`：JSON 输出约束
- `src/model.ts`：Gemini 模型调用封装
- `src/schema.ts`：结构定义与校验
- `src/retry.ts`：自动重试逻辑
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

脚本会对同一个问题执行一条结构化输出链路：

1. 要求模型只返回 JSON
2. 本地解析并校验字段
3. 如果格式不对，就自动重试
4. 最终打印合法 JSON 结果

默认返回结构：

```json
{
  "answer": "...",
  "confidence": 0.92,
  "keyPoints": ["...", "..."]
}
```

## 6. 调用链说明

Day2 的调用链是：

`index.ts -> config.ts -> retry.ts -> prompts.ts + model.ts -> Gemini -> schema.ts -> retry.ts -> 终端输出`

你可以这样理解：

1. `src/index.ts` 读取命令行里的用户问题
2. `src/config.ts` 读取 `.env` 里的 key 和模型配置
3. `src/retry.ts` 负责整条“生成 -> 校验 -> 重试”的主流程
4. `src/prompts.ts` 给模型加上严格 JSON 输出约束
5. `src/model.ts` 去调用 Gemini，拿回原始文本
6. `src/schema.ts` 把原始文本解析成 JSON，并校验字段结构
7. 如果解析或校验失败，就回到 `src/retry.ts` 再试一次
8. 最后由 `src/index.ts` 打印合法的结构化结果

一句话：

- Day2 是“让模型先按 JSON 回答，再由程序检查，不合格就重来”

## 7. Day2 学习重点

建议你重点观察：

1. 为什么自由文本不适合直接给前端消费
2. 为什么模型输出要先 parse 再 validate
3. 为什么重试应该基于错误原因来修正输出
4. TypeScript + Zod 是否让输出边界更清晰

## 7. 下一步

Day2 完成后，你可以继续做 Day3：

- 给模型接入工具调用
- 让模型决定什么时候调用工具
- 把工具执行步骤展示出来
