# GUI Agent MVP

这是一个第一阶段的 GUI 提示助手最小实现。

当前版本只做：
- 主屏截图
- OCR 文本提取
- 基于本地 YAML 规则的页面识别
- `no_action / remind / suggest_next_step` 三类决策
- Tkinter 窗口展示识别结果、提示和原因
- 固定间隔轮询形成状态循环
- JSONL trace 落盘，便于调试每轮识别结果
- 扫描失败时记录 error trace，并在界面显示失败状态

当前版本不做：
- 自动点击、自动输入、自动滚动
- 多 Agent / skill 调度
- Web API / 前后端分离
- 向量库 / RAG / 长期 memory
- 复杂多模态 GUI 理解

## 目录结构

- `main.py`：程序入口
- `config/settings.yaml`：全局配置
- `rules/scene_rules.yaml`：页面规则
- `src/perceptor.py`：截图与 OCR
- `src/knowledge.py`：配置与规则加载
- `src/decision.py`：规则匹配与决策
- `src/operator.py`：Tkinter 界面
- `src/loop.py`：状态循环与 trace 落盘

## 安装依赖

```bash
pip install -r requirements.txt
```

## 启动

```bash
python main.py
```

## 规则示例

当前内置了几类更贴近业务页面的示例规则：
- 登录页面
- 订单审核页
- 正式提交确认框
- 缺少手机号提示场景

规则采用“`keywords_all + keywords_any + exclude_keywords`”组合，优先保证可解释和易调试。

## 最小验证

1. 启动后能看到 Tkinter 窗口。
2. 点击“立即扫描”后，界面能显示 OCR 摘要。
3. 打开一个包含规则关键词的页面后，界面能显示页面名、提示和下一步建议。
4. 未命中规则时，界面显示“未识别到已配置页面”，且“命中状态”为“未命中规则”。
5. 扫描完成后，能在 `logs/gui_agent_trace.jsonl` 看到每轮 JSON 结果。
6. 如果 OCR 或截图报错，trace 中会写入 `status=error`，界面会显示“扫描失败”。

## 说明

规则识别第一版只使用“OCR 文本 + 关键词规则匹配”，优先保证简单、可解释、可调试。
