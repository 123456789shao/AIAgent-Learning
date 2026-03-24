# Spec Kit Demo

这个 Demo 演示：**怎么按照 spec 驱动实现流程**。

你可以把 Spec Kit 理解成：

> 不是只写“规范文档”，而是把“规范 -> 计划 -> 任务 -> 实现”串起来的一套工作流。

---

## 场景

还是用同一个需求：

> 给聊天页加一个“清空对话”按钮。

---

## 1. Spec

先有一份已经澄清好的规范：

- 按钮放在输入框附近
- 点击后需要二次确认
- 清空消息区 / planner 区 / meta 区
- 不影响登录状态
- 流式输出中不可清空

这一步相当于：**specify**

---

## 2. Plan

然后把规范拆成实现计划：

### 实现计划
1. 修改 `public/index.html`，增加清空按钮。
2. 修改 `public/app.js`，增加清空逻辑与二次确认。
3. 增加“生成中不可清空”的前端状态判断。
4. 重置聊天区、planner 区、meta 区默认内容。
5. 手动验证：普通状态可清空，生成中不可清空。

这一步相当于：**plan**

---

## 3. Tasks

再把计划拆成可执行任务：

- [ ] 在聊天表单里新增 `clear-button`
- [ ] 编写 `resetConversationView()`
- [ ] 在点击事件里调用 `confirm()`
- [ ] 流式生成时禁用清空按钮
- [ ] 补一次手动测试

这一步相当于：**tasks**

---

## 4. Implement

最后才进入代码实现。

例如伪代码：

```js
function resetConversationView() {
  answerElement.textContent = "";
  planBoxElement.textContent = "提交问题后，这里会显示执行计划。";
  metaBoxElement.textContent = "回答完成后，这里会显示 citations、耗时、成本和风险提示。";
  errorElement.textContent = "";
}

clearButtonElement.addEventListener("click", () => {
  if (isStreaming) {
    showError("回答生成中，暂时无法清空对话。");
    return;
  }

  if (!window.confirm("确认清空当前对话吗？")) {
    return;
  }

  resetConversationView();
});
```

这一步相当于：**implement**

---

## 5. 这个 Demo 想表达什么

Spec Kit 的重点不是“文档写得漂亮”。

而是：

**让实现过程严格跟着 spec 走，而不是想到哪写到哪。**

它强调的是链路：

```text
需求 -> 规范 -> 计划 -> 任务 -> 实现
```

---

## 6. 对应到你当前仓库

它和你现在的学习仓库非常像：

- `Standard.md`：约束规范
- 每个 Day 的目标：spec
- plan mode：plan
- `TASKS.md`：tasks
- 实际改代码：implement
- `RETROSPECTIVE.md`：回顾结果

一句话总结：

**Spec Kit Demo = 演示怎么让“写规范”真正落到“做实现”。**
