# Day6：前端产品化，做一个真能用的小应用

这是第 6 天的练习项目，目标是把 Day5 的 RAG 问答能力包装成一个可交互的 Web Demo，让你能直接在浏览器里演示：

- 聊天界面支持逐步展示回答
- 页面能显示加载状态、错误提示和重试入口
- 后端会记录耗时、成本估算和成功率
- 回答结束后仍然保留来源引用，尽量避免胡说

## 目录结构

- `public/index.html`：前端页面骨架
- `public/app.js`：聊天交互、状态切换、流式渲染
- `public/styles.css`：页面样式
- `knowledge/`：Day6 自己的本地知识库文档
- `rag-index.json`：运行时生成的本地索引文件
- `src/index.ts`：程序入口，启动 Web 服务或构建索引
- `src/config.ts`：读取 Qwen、端口、超时和检索配置
- `src/server.ts`：HTTP 服务、静态文件和 API 路由
- `src/agent.ts`：Day6 主编排流程
- `src/model.ts`：Qwen 聊天与 embedding 调用
- `src/prompts.ts`：RAG 回答与引用约束 Prompt
- `src/schema.ts`：请求、chunk、索引、回答结构校验
- `src/knowledge.ts`：知识库文档读取与切片
- `src/index-store.ts`：本地索引读写
- `src/retrieval.ts`：召回、打分与轻量重排
- `src/metrics.ts`：耗时、成本、成功率统计
- `src/errors.ts`：统一错误分类

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
PORT=3000
MODEL_TIMEOUT_MS=30000
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

## 5. 启动 Web Demo

```bash
npm run start
```

启动后打开：

```bash
http://127.0.0.1:3000
```

## 6. 你会看到什么

页面会按这条链路执行：

1. 你在浏览器输入问题并点击发送
2. 页面立刻显示当前状态，例如 `submitting`、`retrieving`、`streaming`
3. 后端先读取本地 `rag-index.json`
4. 对问题做 embedding，再做召回和轻量重排
5. 把最相关 chunks 喂给模型生成结构化答案
6. 后端校验 citations 是否真实存在于召回结果中
7. 再把最终答案按片段推给前端，模拟流式展示
8. 页面最后展示来源、耗时、成本和最新指标

## 7. 调用链

Day6 的调用链是：

`浏览器 -> public/app.js -> server.ts -> agent.ts -> index-store.ts + retrieval.ts + prompts.ts + model.ts -> Qwen -> schema.ts + metrics.ts -> 浏览器页面`

## 8. 执行流程

你可以这样理解：

1. `src/index.ts` 解析命令行，决定是 `build-index` 还是启动 Web 服务
2. `src/config.ts` 读取 Qwen、端口、超时、索引和检索参数
3. `src/knowledge.ts` 读取 `knowledge/` 文档并切片
4. `src/model.ts` 给 chunk 生成 embedding，或生成最终回答
5. `src/index-store.ts` 保存或读取 `rag-index.json`
6. `src/retrieval.ts` 对问题做召回和轻量重排
7. `src/prompts.ts` 约束模型只能基于检索片段回答，并且必须给 citations
8. `src/schema.ts` 校验聊天请求、索引和最终 JSON 结构是否合法
9. `src/agent.ts` 把整条 RAG 流程和指标记录串起来
10. `src/server.ts` 把回答按片段流式推给前端
11. `public/app.js` 实时更新消息、状态和指标卡片
12. 最后由浏览器页面展示答案、来源和运行信息

## 9. 当前学习重点

建议你重点观察：

1. 为什么 Web Demo 里也要保留 Day5 的 RAG 检索链路
2. 为什么“流式展示”不一定非要一开始就做成真实 token 流
3. 为什么前端产品化必须补上加载状态和错误提示
4. 为什么调用耗时、成本、成功率能帮助你判断 Agent 是否稳定
5. 为什么页面能演示，不代表回答就一定可靠，还是要看 citations

## 10. 建议你手动验证

你可以按这个顺序试：

1. 运行 `npm run build-index`
2. 运行 `npm run start`
3. 浏览器打开 `http://127.0.0.1:3000`
4. 提问：`Day4 的长期记忆保存了什么？`
5. 观察页面是否逐步显示回答，并展示 citations
6. 提问：`Standard.md 对 README 有什么要求？`
7. 提问：`这个仓库支持图片向量检索吗？`
8. 观察最后一个问题是否会明确说证据不足，而不是编造答案
9. 故意删掉 `.env` 或 `rag-index.json`，确认页面是否显示中文错误
10. 连续提问几次，确认成功率、平均耗时和最近成本会更新

## 11. 下一步

Day6 完成后，你可以继续做 Day7：

- 把当前 Web Demo 接入更真实的外部数据
- 把伪流式升级成真实 token 流
- 增加更完整的多轮会话和产品体验
