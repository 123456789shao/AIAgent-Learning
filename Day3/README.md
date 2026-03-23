# Day3：Tool Calling 入门 Agent

这是第 3 天的练习项目，目标是让 Agent 从“只会回答”升级到“会调用工具做事”：

- 输入用户问题
- 让模型判断是否需要调用工具
- 如果需要，就调用本地 mock 工具
- 把工具结果再喂回模型
- 在终端展示完整执行轨迹

## 目录结构

- `TASKS.md`：当天任务清单
- `src/index.ts`：CLI 入口
- `src/config.ts`：读取配置
- `src/prompts.ts`：工具选择规则与最终回答 Prompt
- `src/model.ts`：Qwen 模型调用封装
- `src/schema.ts`：动作结构与最终结果校验
- `src/tools.ts`：本地 mock 工具定义
- `src/agent.ts`：Tool Calling 主编排流程
- `tsconfig.json`：TypeScript 配置
- `.env.example`：环境变量示例

## 1. 安装依赖

```bash
npm install
```

## 2. 配置环境变量

复制 `.env.example` 为 `.env`，并填入你的 key：

```bash
QWEN_API_KEY=你的key
QWEN_MODEL=qwen-plus
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
```

## 3. 类型检查

```bash
npm run typecheck
```

## 4. 运行脚本

```bash
npm run ask -- 北京今天天气怎么样？
```

你也可以试：

```bash
npm run ask -- 帮我总结一下 https://example.com 这个网页
npm run ask -- 什么是 Prompt？
```

## 5. 你会看到什么

脚本会执行一条最小 Tool Calling 链路：

1. 先让模型输出一个动作 JSON
2. 程序判断这是“直接回答”还是“调用工具”
3. 如果要调用工具，就执行本地 mock 工具
4. 再把工具结果发回模型生成最终答案
5. 在终端打印执行轨迹和最终结果

## 6. 调用链说明

Day3 的调用链是：

`index.ts -> config.ts -> agent.ts -> prompts.ts + model.ts -> Qwen -> schema.ts -> tools.ts -> model.ts -> schema.ts -> 终端输出`

你可以这样理解：

1. `src/index.ts` 读取命令行里的用户问题
2. `src/config.ts` 读取 `.env` 里的 key、模型和 base URL 配置
3. `src/agent.ts` 负责整条 Tool Calling 主流程
4. `src/prompts.ts` 告诉模型有哪些工具、什么时候该调用
5. `src/model.ts` 去调用 Qwen，拿回动作原文
6. `src/schema.ts` 校验这个动作是否合法
7. 如果动作是 `tool_call`，就由 `src/tools.ts` 执行对应工具
8. 再由 `src/model.ts` 基于工具结果生成最终答案
9. 最后由 `src/index.ts` 打印执行轨迹和最终结果

一句话：

- Day3 是“模型负责决定要不要用工具，代码负责真正执行工具”

## 7. 当前工具

目前为了学习 Tool Calling，本项目只放了 2 个 mock 工具：

- `getWeather`：输入城市名，返回模拟天气结果
- `summarizeWebpage`：输入 URL，返回模拟网页摘要结果

它们是假的外部能力，但足够帮你理解 Tool Calling 的本质。

## 8. Day3 学习重点

建议你重点观察：

1. 模型为什么会决定调用某个工具
2. 工具参数为什么必须设计得清晰、具体
3. 为什么工具执行必须由代码接手，而不是交给模型自己做
4. 为什么执行轨迹能明显提升 Agent 的可理解性

## 9. 下一步

Day3 完成后，你可以继续做 Day4：

- 加会话历史
- 保存用户偏好
- 做上下文裁剪
