# Day7：进阶与发布，做一个可上线、可评估的 AI Agent 项目

这是第 7 天的练习项目，目标是在 Day6 Web Demo 的基础上，继续保持原生 HTML / CSS / JS + Node + TypeScript 的轻量技术栈，同时补上更像真实产品的 3 个能力：

- 把单条问答链路升级成 `planner + executor + validator` 的多角色协作
- 增加 10 条固定评测集，衡量正确性、格式和幻觉控制
- 增加最基本的登录鉴权与限流，让 Demo 具备最小上线能力

## 目录结构

- `public/index.html`：前端页面骨架，包含登录区、planner 区、聊天区和指标区
- `public/app.js`：登录、登出、聊天请求、SSE 解析、planner 展示和错误处理
- `public/styles.css`：页面样式与多面板布局
- `knowledge/`：Day7 自己的本地知识库文档
- `eval/cases.json`：固定 10 条评测集
- `rag-index.json`：运行时生成的本地索引文件
- `src/index.ts`：程序入口，支持 `start` / `build-index` / `eval`
- `src/config.ts`：读取模型、密码、端口、限流和路径配置
- `src/server.ts`：HTTP 服务、静态文件、登录、登出、聊天和指标接口
- `src/planner.ts`：生成结构化执行计划
- `src/executor.ts`：按计划做检索与回答生成
- `src/validator.ts`：校验回答结构、引用合法性和幻觉风险
- `src/orchestrator.ts`：串起 planner / executor / validator 主流程
- `src/auth.ts`：共享密码登录与内存 session
- `src/rate-limit.ts`：内存版 fixed-window 限流
- `src/eval.ts`：逐条跑评测集并汇总得分
- `src/model.ts`：Qwen 聊天与 embedding 调用
- `src/prompts.ts`：planner prompt 与 executor prompt
- `src/schema.ts`：计划、答案、评测和请求结构校验
- `src/knowledge.ts`：知识库文档读取与切片
- `src/index-store.ts`：本地索引读写
- `src/retrieval.ts`：召回、打分与轻量重排
- `src/metrics.ts`：总耗时、规划耗时、执行耗时、成本和成功率统计
- `src/errors.ts`：统一错误分类

## 1. 安装依赖

```bash
npm install
```

## 2. 配置环境变量

复制 `.env.example` 为 `.env`，并填入你的 key 和登录密码：

```bash
QWEN_API_KEY=你的key
QWEN_MODEL=qwen-plus
QWEN_EMBEDDING_MODEL=text-embedding-v4
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
APP_PASSWORD=change_me
PORT=3000
MODEL_TIMEOUT_MS=30000
RATE_LIMIT_WINDOW_MS=600000
RATE_LIMIT_MAX_REQUESTS=20
LOGIN_RATE_LIMIT_MAX_ATTEMPTS=5
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

## 6. 运行评测

```bash
npm run eval
```

你会看到 10 条 case 的逐条结果，以及：

- 正确性均分
- 格式均分
- 幻觉控制均分
- 总通过率

## 7. 登录与限流说明

Day7 没有接用户系统，而是保持最小实现：

1. 前端先调用 `POST /api/login`，提交共享密码
2. 后端验证 `APP_PASSWORD` 后创建内存 session，并写入 HttpOnly cookie
3. `POST /api/chat` 与 `GET /api/metrics` 都要求已登录
4. `POST /api/logout` 会清掉当前 session
5. 登录接口按 IP 限制尝试次数，聊天接口按 session 做限流
6. 超限时返回 429，并带上 `retryAfterSeconds`

## 8. 调用链

Day7 的调用链是：

`浏览器 -> public/app.js -> server.ts -> auth.ts + rate-limit.ts -> orchestrator.ts -> planner.ts -> executor.ts -> validator.ts -> metrics.ts -> 浏览器页面`

如果需要检索，还会走：

`executor.ts -> index-store.ts + retrieval.ts + prompts.ts + model.ts -> Qwen`

评测链路则是：

`src/index.ts eval -> eval.ts -> orchestrator.ts -> planner.ts + executor.ts + validator.ts -> 生成评测报告`

## 9. 执行流程

你可以把 Day7 理解成这 12 步：

1. `src/index.ts` 解析命令行参数，决定是启动服务、构建索引还是跑评测
2. `src/config.ts` 读取模型、密码、端口、限流和索引路径配置
3. 浏览器先调用 `POST /api/login` 建立登录态
4. `src/server.ts` 在聊天请求进入主流程前先做鉴权和限流
5. `src/planner.ts` 先输出结构化计划，例如是否需要检索、回答模式、子任务和引用要求
6. `src/orchestrator.ts` 记录 plannerLatency，并把计划传给 executor
7. `src/executor.ts` 根据计划决定是否读取索引、做 embedding、召回和轻量重排
8. `src/prompts.ts` 约束模型只能基于检索结果生成 grounded answer，并尽量附 citations
9. `src/validator.ts` 校验引用是否合法、证据不足时是否明确收敛、是否存在明显幻觉风险
10. `src/orchestrator.ts` 汇总 planner / executor / total latency 与 estimatedCost，并写入指标
11. `src/server.ts` 先把 planner 发给前端，再把最终回答按短句切片，通过 SSE 伪流式输出
12. `public/app.js` 实时更新 planner 区、聊天区、引用与元信息区、运行指标区

## 10. 这次新增了什么

相比 Day6，Day7 的升级点主要是：

1. 不再只有单一编排，而是显式拆成 planner / executor / validator
2. 不只支持展示，还能用固定 10 条数据做回归评测
3. 不只考虑回答，还补了登录和限流两个最小上线保护
4. 指标不再只有总耗时，还拆成规划耗时和执行耗时
5. 前端会先展示 planner 输出，再展示最终回答和 citations

## 11. 建议你手动验证

你可以按这个顺序试：

1. 运行 `npm run build-index`
2. 运行 `npm run start`
3. 浏览器打开 `http://127.0.0.1:3000`
4. 不登录直接发送问题，确认出现 401 提示
5. 输入正确密码登录
6. 提问：`Day4 的长期记忆保存了什么？`
7. 观察 planner 区是否先显示 goal、subtasks、mustCite 等信息
8. 观察回答是否逐句流式显示，最后是否附 citations 与总耗时
9. 连续快速发送多次，确认是否出现 429 与重试时间提示
10. 运行 `npm run eval`，确认 10 条 case 都能执行并输出汇总分数

## 12. 下一步

Day7 完成后，你可以继续往更接近真实产品的方向走：

- 把内存 session 和限流升级成 Redis / 数据库版本
- 把伪流式升级成真实 token 流
- 把评测结果接进 CI，做回归检查
- 把部署方式从本地 Node 进程扩展到真实线上环境
