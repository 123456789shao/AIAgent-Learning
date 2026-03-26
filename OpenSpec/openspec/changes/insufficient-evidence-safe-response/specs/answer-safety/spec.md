## Requirements

### Requirement: Plan with an explicit evidence policy
系统 MUST 在回答前产出明确的证据策略，而不是只决定“要不要检索”。

该策略 MUST 至少说明：是否必须覆盖所有核心 claim、每个核心 claim 的最小引用要求、comparison 问题是否要求多源证据、是否必须标记冲突证据，以及证据不足时是否必须拒绝给出确定性结论。

#### Scenario: High-risk factual question
- **WHEN** 用户提出的是高风险事实判断问题
- **THEN** planner 必须将本次请求标记为需要严格证据策略，且证据不足时不得输出确定性结论

#### Scenario: Comparison question
- **WHEN** 用户提出比较、区别、优劣类问题
- **THEN** planner 必须要求系统覆盖关键比较对象，且不能只基于单边证据得出完整比较结论

### Requirement: Generate claim-centric grounded answers
系统 MUST 将最终回答中的关键结论显式结构化为 claims，而不是只返回一段附带 citations 的 answer。

每个 core claim MUST 包含对应的 citations，或明确标记当前无法获得足够证据支持；每条 claim SHOULD 给出简短的 support summary，说明现有证据如何支撑或为什么不足。

#### Scenario: Answer contains multiple conclusions
- **WHEN** 一个回答同时包含多个关键结论
- **THEN** executor 必须将这些结论拆分为独立 claims，供后续 validator 逐条检查

#### Scenario: Claim has no supporting evidence
- **WHEN** 某个 core claim 没有可用证据支持
- **THEN** 系统必须将该 claim 视为未被支撑，且不得把它保留为高确定性最终结论

### Requirement: Validate evidence sufficiency for each core claim
系统 MUST 在最终返回前，对每个 core claim 做证据充分性校验，而不只校验 citation 是否存在。

validator MUST 至少检查以下内容：
- claim 是否有证据覆盖
- 引用是否真实来自 retrieved chunks
- 引用是否能够支持该 claim 的关键含义
- 是否存在明显冲突证据
- 当前支持强度是否足以支撑最终表述

#### Scenario: Citation is real but support is weak
- **WHEN** claim 的 citation 真实存在，但只能提供弱相关或间接支持
- **THEN** validator 必须将该 claim 判为 weak 或 none，而不能直接视为已充分支撑

#### Scenario: Retrieved evidence conflicts
- **WHEN** 检索结果中出现对同一结论相互冲突的内容
- **THEN** 系统必须降低确定性，或明确说明存在冲突，而不是输出单边确定结论

### Requirement: Downgrade answers when evidence is insufficient
当任一 core claim 缺乏足够证据支持时，系统 MUST 优先降级回答，而不是维持强确定性输出。

这种降级可以表现为：明确证据不足、缩窄结论边界、说明仅能确认部分事实，或提示当前无法可靠判断。

#### Scenario: Missing support for a core claim
- **WHEN** 任一 core claim 的 supportStrength 为 none
- **THEN** 最终 decision 必须进入 revise、insufficient_evidence 或 conflict，而不能直接 pass

#### Scenario: High-risk binary judgment without direct evidence
- **WHEN** 用户问题是“是否已发布/是否支持/是否存在”这类二值判断，且没有直接证据
- **THEN** 系统必须明确表示无法确认，而不能用猜测补齐答案

### Requirement: Respond safely when evidence is insufficient
当请求被判定为证据不足时，系统 MUST 返回安全、克制、可解释的回应。

这种回应 MUST 明确说明当前依据不足，且 SHOULD 引导用户补充信息、缩小问题范围，或接受“当前无法确认”的结果。

#### Scenario: No evidence retrieved
- **WHEN** 用户提出问题后系统没有检索到任何相关内容
- **THEN** 系统必须将本次请求判定为证据不足，而不能直接生成确定性答案

#### Scenario: Retrieved content is weakly related
- **WHEN** 系统检索到内容，但这些内容无法直接支持用户问题的关键结论
- **THEN** 系统必须将本次请求视为证据不足，或在回答中明确指出当前证据不充分

#### Scenario: Provide bounded next step
- **WHEN** 系统无法可靠回答当前问题
- **THEN** 返回内容应给出有限且合理的下一步建议，例如请用户补充上下文或改问更具体的问题

### Requirement: Do not fabricate claims or citations
当系统证据不足时，系统 MUST NOT 编造结论、引用、出处或看起来像有依据的断言。

#### Scenario: No fabricated citation
- **WHEN** 当前没有足够证据支持某个结论
- **THEN** 系统不得伪造引用来源，也不得把不相关片段包装成直接证据

#### Scenario: No overconfident answer
- **WHEN** 回答无法被现有资料支持
- **THEN** 系统不得输出语气确定、但缺乏依据的最终结论

### Requirement: Evaluate sufficiency behavior as a first-class quality target
系统 MUST 用专门的评测案例验证“证据充分性校验”能力，而不只验证事实命中率。

评测 MUST 覆盖：有充分证据、证据不足、部分证据、冲突证据、comparison 需要多源支撑等情形。

#### Scenario: Insufficient evidence evaluation case
- **WHEN** 评测问题超出知识库范围或只有弱相关片段
- **THEN** 系统应通过“正确拒答/保守回答”获得通过，而不是因为没有正向回答而判失败

#### Scenario: Coverage evaluation case
- **WHEN** 评测问题包含多个核心结论
- **THEN** 评测必须检查这些核心结论是否被覆盖，而不是只检查 answer 中命中了部分关键词

## Constraints

- 该规范约束 planner、executor、validator、safe-response、eval 及其对外输出行为
- 该项目优先在现有 Day7 结构上演化，不重写整套架构
- MVP 采用规则优先、模型辅助的证据充分性校验方式
- 规范同时服务于 CLI、Web Demo 和 eval 流程
- citation 合法性只是底层 guardrail，不等于证据充分

## Acceptance Criteria

- planner 能输出明确的 evidence policy
- executor 输出 answer 的同时，能输出 core claims 与 support summaries
- validator 能为每个 core claim 给出 supportStrength、decision 与原因说明
- 对弱证据或冲突证据，系统不会维持高确定性结论
- 对无检索结果或弱相关检索结果，系统会降级为安全回应
- eval 能覆盖 supported / insufficient / partial / conflict / comparison 这几类关键场景
