# Day5：RAG 检索增强，做有依据的回答

这是第 5 天的练习项目，目标是让 Agent 不再只靠模型“直接回答”，而是先从私有知识库里检索资料，再基于资料作答，并给出引用来源：

- 准备本地知识库文档
- 对文档做切片和向量化
- 建立本地 JSON 索引
- 先召回、再重排、最后回答
- 强制答案附带来源片段，减少胡说

## 目录结构

- `knowledge/`：本地知识库文档
- `rag-index.json`：运行时生成的本地索引文件
- `src/index.ts`：CLI 入口
- `src/config.ts`：读取配置与检索参数
- `src/model.ts`：Qwen 聊天与 embedding 调用
- `src/prompts.ts`：RAG 回答与引用约束 Prompt
- `src/schema.ts`：chunk、索引、回答结构校验
- `src/knowledge.ts`：知识库文档读取与切片
- `src/index-store.ts`：本地索引读写
- `src/retrieval.ts`：召回、打分与轻量重排
- `src/agent.ts`：Day5 主编排流程

## 1. 安装依赖

```bash
npm install
```

## 2. 配置环境变量

复制 `.env.example` 为 `.env`，并填入你的 key：

```bash
QWEN_API_KEY=你的key
QWEN_MODEL=qwen-plus
QWEN_EMBEDDING_MODEL=text-embedding-v4
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
```

## 3. 类型检查

```bash
npm run typecheck
```

## 4. 构建索引

```bash
npm run build-index
```

构建完成后会生成 `rag-index.json`。

## 5. 提问

```bash
npm run ask -- "Day4 的长期记忆保存了什么？"
npm run ask -- "Day3 的主流程是什么？"
npm run ask -- "Standard.md 对项目结构有什么要求？"
```

## 6. 你会看到什么

终端会按这条链路执行：

1. 先读取本地 `rag-index.json`
2. 对你的问题做 embedding
3. 先做向量召回，拿到最相关 chunks
4. 再做轻量重排，筛出更适合回答的片段
5. 把这些片段喂给模型
6. 模型只能基于这些片段回答
7. 最终返回答案和来源引用

## 7. 调用链

Day5 的调用链是：

`index.ts -> config.ts -> agent.ts -> index-store.ts + model.ts + retrieval.ts + prompts.ts -> Qwen -> schema.ts -> 终端输出`

## 8. 执行流程

你可以这样理解：

1. `src/index.ts` 解析 `build-index` 或 `ask`
2. `src/config.ts` 读取 Qwen、embedding、索引和检索参数
3. `src/knowledge.ts` 读取 `knowledge/` 文档并切片
4. `src/model.ts` 给每个 chunk 生成 embedding
5. `src/index-store.ts` 保存或读取 `rag-index.json`
6. `src/retrieval.ts` 对问题做召回和轻量重排
7. `src/prompts.ts` 约束模型只能基于检索片段回答，并且必须给 citations
8. `src/schema.ts` 校验最终 JSON 结构是否合法
9. `src/agent.ts` 负责把整条 RAG 流程串起来
10. 最后由 `src/index.ts` 打印答案和来源

## 9. 当前学习重点

建议你重点观察：

1. 为什么 RAG 要先检索再回答
2. 为什么 chunk 的切法会直接影响检索效果
3. 为什么“召回”和“重排”是两个阶段
4. 为什么来源引用比“回答像不像对”更重要
5. 为什么资料不足时要明确说证据不足

## 10. 建议你手动验证

你可以按这个顺序试：

1. 运行 `npm run build-index`
2. 提问：`Day4 的长期记忆保存了什么？`
3. 提问：`Day3 的主流程是什么？`
4. 提问：`Standard.md 对项目结构有什么要求？`
5. 提问：`这个仓库支持图片向量检索吗？`
6. 观察最后一个问题是否会明确说证据不足，而不是编造答案

## 11. 下一步

Day5 完成后，你可以继续做 Day6：

- 把 RAG Agent 做成可演示应用
- 增加更好的交互体验
- 接更多真实外部数据
