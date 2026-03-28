# langchain.js-Demo

一个用于学习 LangChain.js 的最小示例项目。

## 当前阶段目标

当前先完成同事建议路线里的前四步：

- 第一步：`agent`
- 第二步：`memory`
- 第三步：`tool`
- 第四步：`skill`

同时保留 `basic chain` 作为最小 baseline，方便持续对照。

## 当前已完成

### 第零步：basic chain baseline

- 基础环境变量读取与校验
- Ollama 本地模型接入
- basic chain 调用链路打通
- basic 路线可独立运行

### 第一步：agent

- 单 Agent 最小执行入口
- agent 能接收输入
- agent 能调用模型
- agent 能返回结果

### 第二步：memory

- session 级短期 memory
- memory 按 `sessionId` 隔离
- 同一 session 内可记住最近几轮对话
- history 超出上限时自动裁剪

### 第三步：tool

- 接入一个最小 weather tool
- 遇到天气问题时优先走 weather tool
- 未提供城市时返回澄清提示
- tool 当前通过 WeatherAPI 查询天气信息

### 第四步：skill

- 新增显式 skill 调用入口
- skill 当前支持 `weather-brief`
- `weather-brief` 会复用 weather tool
- skill 缺少 `city` 参数时返回明确提示

### 当前整体验证

- basic chain 与 agent 双路径运行验证
- 同 session 多轮对话验证
- 不同 session 隔离验证
- 天气 tool 命中与缺参提示验证
- skill 调用、缺参提示与结果输出验证

## 目录说明

- `src/config`：环境变量读取与校验
- `src/models`：模型工厂
- `src/prompts`：prompt 模板
- `src/chains`：basic chain 执行逻辑
- `src/agents`：agent 类型与执行入口
- `src/memory`：session 级短期记忆存储
- `src/tools`：第三步的工具能力
  - `weatherTool.ts`：WeatherAPI weather tool
- `src/skills`：第四步的高层任务封装
  - `skillRegistry.ts`：skill 注册表
  - `weatherBriefSkill.ts`：weather-brief skill
  - `skillTypes.ts`：skill 类型定义
- `src/services`：对外服务层入口
  - `basicService.ts`：basic 路线入口
  - `agentService.ts`：agent 路线入口
  - `skillService.ts`：skill 路线入口
- `src/index.ts`：demo 启动入口
- `openspec/`：需求变更、任务拆分、规格说明

## 环境要求

- Node.js
- Ollama
- 可用的本地模型
- WeatherAPI 可用 key

## 环境变量

在项目根目录创建 `.env`：

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:8b
WEATHER_API_KEY=your_weatherapi_key
```

如果你使用别的模型，只需要把 `OLLAMA_MODEL` 改成对应名称。

## 安装依赖

```bash
npm install
```

## 运行项目

```bash
npm run dev
```

当前运行后会输出几部分结果：

- Basic Output：来自 `runBasicService -> runBasicChain`
- Session A Round 1 / Round 2：验证 memory
- Weather Output：验证 WeatherAPI weather tool
- Weather Missing City：验证天气查询缺参提示
- Session B Isolation Check：验证 session 隔离
- Skill Output：验证 `weather-brief` skill
- Skill Missing City：验证 skill 缺少 `city` 参数时的提示

## 当前阶段说明

当前实现的是同事建议顺序里的前四步：

`agent -> memory -> tool -> skill -> loop`

### 当前 memory 的边界

- 只做当前进程内短期记忆
- 只做 session 级隔离
- 只保留最近 6 条消息
- 不做长期持久化
- 不做 RAG / 向量检索
- 不做摘要压缩

### 当前 tool 的边界

- 只做一个 weather tool
- 只支持简单城市级查询
- 当前通过 WeatherAPI 做真实联网查询
- 当前解析规则保持最小实现
- 不做多工具协作

### 当前 skill 的边界

- 只做显式 skill 调用入口
- 当前只支持 `weather-brief`
- 当前 skill 直接复用 weather tool
- skill 输入保持最小结构化参数
- 不做多 skill 编排
- 不做 loop

### 还未开始

- 第五步：`loop`

## 命名说明

当前项目按“路线名 + 职责名”理解最清楚：

- basic：最小闭环 baseline
- agent：按同事思路继续演进的 runtime 线

当前对外主干可以这样看：

- basic 线：`basicPrompt` / `basicService` / `runBasicChain`
- agent 线：`agentPrompt` / `agentService` / `runAgent`
- skill 线：`skillService` / `skillRegistry` / `weatherBriefSkill`

## 验证示例

当前 demo 默认验证这几件事：

1. basic chain 仍可正常运行
2. `session-a` 第一轮说“我叫小王，请记住”
3. `session-a` 第二轮追问“我刚刚叫什么？”
4. `session-a` 追问“北京今天天气怎么样？”
5. `session-a` 再问“今天天气怎么样？”，验证缺少城市时的提示
6. `session-b` 直接追问“我刚刚叫什么？”，验证不会串会话
7. `skill-session` 调用 `weather-brief`，参数为 `{ city: "上海" }`
8. `skill-session` 调用 `weather-brief`，参数为空对象，验证缺少 `city` 时的提示

预期现象：

- `session-a` 第二轮能答出“小王”
- 天气问题会命中 weather tool
- 没提供城市时会提示补充城市
- `session-b` 因为没有历史，答不出来
- `weather-brief` 会返回天气简报
- skill 缺少 `city` 时会返回明确提示

## OpenSpec 说明

当前有两个 change：

- `langchain-js-mvp-demo`
  - 对应最早的 basic chain demo
- `langchain-js-agent-runtime-mvp`
  - 对应当前单 Agent Runtime MVP 演进

可以理解为：

- 前者记录“最小 chain demo”
- 后者记录“从 chain 继续演进到 agent runtime”
