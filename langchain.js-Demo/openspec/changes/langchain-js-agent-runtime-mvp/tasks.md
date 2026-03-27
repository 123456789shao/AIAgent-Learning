# Tasks

## 1. Agent Runtime 基线
- [ ] 明确单 Agent MVP 的输入输出边界
- [ ] 新增 agent 统一执行入口
- [ ] 让 agent 先复用现有最小 chain 能力
- [ ] 保留 basic chain 作为基线验证路径

## 2. Session Memory
- [ ] 定义 memory 的基础数据结构
- [ ] 实现会话内短期 memory
- [ ] 支持按 session 读取最近上下文
- [ ] 将 memory 注入 agent 执行流程
- [ ] 验证同一 session 能连续对话

## 3. Tool 能力
- [ ] 定义 tool 输入输出协议
- [ ] 建立最小 tool registry
- [ ] 接入少量低副作用本地工具
- [ ] 打通 agent 调用 tool 的主流程
- [ ] 验证 tool 结果可以正确回流给 agent

## 4. Skill 抽象
- [ ] 定义 skill 的输入输出协议
- [ ] 建立最小 skill registry
- [ ] 封装少量固定任务型 skill
- [ ] 让 skill 可以复用 agent / prompt / tool
- [ ] 验证 skill 能稳定完成预期任务

## 5. Loop 执行
- [ ] 定义 loop 的停止条件
- [ ] 定义最大执行步数
- [ ] 实现有限步 loop 执行流程
- [ ] 支持每步结果可观察
- [ ] 验证 loop 可正确完成或正确终止

## 6. 结构与验证
- [ ] 保持配置、模型、Prompt、chain、agent、service 职责清晰
- [ ] 避免把 memory、tool、skill、loop 混入单一文件
- [ ] 保留 basic chain 回归验证能力
- [ ] 验证 agent runtime 和 basic chain 可并存运行
- [ ] 确认整体结构仍符合 MVP 风格
