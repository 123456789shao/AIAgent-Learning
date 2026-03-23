# Day4：加记忆，做多轮对话

这是第 4 天的练习项目，目标是让聊天助手不只会单轮回答，还能：

- 记住当前会话里的上下文
- 记住用户的长期偏好
- 在历史变长时做裁剪和压缩
- 用交互式聊天方式持续对话

## 目录结构

- `TASKS.md`：当天任务清单
- `src/index.ts`：交互式 CLI 入口
- `src/config.ts`：读取配置与记忆参数
- `src/model.ts`：Qwen 多消息调用封装
- `src/prompts.ts`：主聊天、偏好提取、历史压缩 Prompt
- `src/schema.ts`：聊天消息、偏好和记忆结构校验
- `src/memory.ts`：本地 JSON 记忆读写与裁剪逻辑
- `src/agent.ts`：Day4 单轮对话主编排流程
- `memory.json`：运行时生成的本地记忆文件

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

## 4. 启动聊天

```bash
npm run chat
```

启动后你可以直接连续聊天。

退出命令：

```bash
exit
quit
```

额外命令：

```bash
:memory              # 查看当前记忆
:clear               # 只清空短期记忆
:clear-preferences   # 只清空长期偏好
:clear-all           # 清空全部记忆
```

## 5. 它是怎么记忆的

Day4 把记忆拆成 3 层：

1. **最近对话**
   - 最近几轮消息原样保留
   - 用来支持短期上下文

2. **用户偏好**
   - 单独保存语言、输出风格、技术栈
   - 用来支持跨会话的长期记忆

3. **历史摘要**
   - 更早的对话不会全塞进模型
   - 而是压缩成一段短摘要

一句话：

- Day4 不是“记住所有聊天原文”
- 而是“保留最近上下文 + 结构化偏好 + 压缩旧历史”

## 6. 调用链

Day4 的调用链是：

`index.ts -> config.ts -> agent.ts -> memory.ts + prompts.ts + model.ts -> Qwen -> schema.ts -> memory.json -> 终端输出`

## 7. 执行流程

你可以这样理解：

1. `src/index.ts` 启动交互式聊天循环
2. `src/config.ts` 读取 Qwen 配置和记忆参数
3. `src/agent.ts` 负责单轮对话主流程
4. `src/memory.ts` 读取本地 `memory.json`
5. `src/prompts.ts` 组装主聊天、偏好提取和压缩 Prompt
6. `src/model.ts` 调用 Qwen 完成回复、偏好提取和历史压缩
7. `src/schema.ts` 校验偏好结果和压缩结果是否合法
8. `src/memory.ts` 保存更新后的记忆
9. 最后由 `src/index.ts` 把回复打印到终端

## 8. 当前学习重点

建议你重点观察：

1. 为什么最近历史和长期偏好要分开存
2. 为什么历史不能一直原样堆进上下文
3. 为什么偏好记忆比“保存全部聊天”更实用
4. 为什么历史压缩本身也是一种模型调用

## 8. 建议你手动验证

你可以按这个顺序试：

1. 输入：`:clear-all`
2. 输入：`我叫小王`
3. 输入：`你还记得我叫什么吗？`
4. 输入：`以后默认用中文回答`
5. 输入：`回答尽量简短`
6. 输入：`:memory`
7. 输入：`:clear`
8. 再输入：`:memory`，确认短期记忆已清空但 `preferences` 仍保留
9. 输入：`:clear-preferences`
10. 再输入：`:memory`，确认长期偏好也已清空

## 9. 下一步

Day4 完成后，你可以继续做 Day5：

- 真实工具和记忆结合
- 检索式记忆 / RAG
- 更稳的上下文管理
