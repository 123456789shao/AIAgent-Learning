const messagesElement = document.getElementById("messages");
const statusElement = document.getElementById("status");
const errorBoxElement = document.getElementById("error-box");
const formElement = document.getElementById("chat-form");
const inputElement = document.getElementById("message-input");
const retryButtonElement = document.getElementById("retry-button");

const metricTotalElement = document.getElementById("metric-total");
const metricSuccessElement = document.getElementById("metric-success");
const metricLatencyElement = document.getElementById("metric-latency");
const metricCostElement = document.getElementById("metric-cost");
const metricStatusElement = document.getElementById("metric-status");

let lastQuestion = "";

function setStatus(status) {
  statusElement.textContent = `当前状态：${status}`;
}

function showError(message) {
  errorBoxElement.textContent = message;
  errorBoxElement.classList.remove("hidden");
}

function clearError() {
  errorBoxElement.textContent = "";
  errorBoxElement.classList.add("hidden");
}

function appendMessage(role, text) {
  const item = document.createElement("div");
  item.className = `message ${role}`;
  item.textContent = text;
  messagesElement.appendChild(item);
  messagesElement.scrollTop = messagesElement.scrollHeight;
  return item;
}

function appendTypingIndicator() {
  const item = document.createElement("div");
  item.className = "message assistant typing";
  item.textContent = "正在输入...";
  messagesElement.appendChild(item);
  messagesElement.scrollTop = messagesElement.scrollHeight;
  return item;
}

function removeTypingIndicator(element) {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

async function refreshMetrics() {
  const response = await fetch("/api/metrics");
  const data = await response.json();

  metricTotalElement.textContent = String(data.totalRequests || 0);
  metricSuccessElement.textContent = `${data.successRate || 0}%`;
  metricLatencyElement.textContent = `${data.averageLatencyMs || 0} ms`;
  metricCostElement.textContent = String(data.lastEstimatedCost || 0);
  metricStatusElement.textContent = data.lastStatus || "idle";
}

async function sendMessage(question) {
  clearError();
  setStatus("submitting");
  lastQuestion = question;

  appendMessage("user", question);
  const assistantMessage = appendMessage("assistant", "");
  let typingIndicator = appendTypingIndicator();
  let hasStartedStreaming = false;

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: question }),
  });

  if (!response.ok || !response.body) {
    removeTypingIndicator(typingIndicator);
    const payload = await response.json().catch(() => ({ message: "请求失败" }));
    throw new Error(payload.message || "请求失败");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const eventBlock of events) {
      if (!eventBlock.trim()) {
        continue;
      }

      const lines = eventBlock.split("\n");
      const eventName = lines[0].replace("event: ", "").trim();
      const dataLine = lines.find((line) => line.startsWith("data: ")) || "data: {}";
      const payload = JSON.parse(dataLine.replace("data: ", ""));

      if (eventName === "status") {
        setStatus(payload.stage || "working");
      }

      if (eventName === "token") {
        if (!hasStartedStreaming) {
          removeTypingIndicator(typingIndicator);
          typingIndicator = null;
          hasStartedStreaming = true;
        }

        assistantMessage.textContent += payload.text || "";
        messagesElement.scrollTop = messagesElement.scrollHeight;
      }

      if (eventName === "citations") {
        const citationsText = (payload.citations || [])
          .map((item, index) => `${index + 1}. ${item.sourcePath} | ${item.sectionPath}`)
          .join("\n");

        if (citationsText) {
          assistantMessage.textContent += `\n\n来源：\n${citationsText}`;
          messagesElement.scrollTop = messagesElement.scrollHeight;
        }
      }

      if (eventName === "meta") {
        const badge = payload.insufficientEvidence ? "\n\n提示：当前证据不足。" : "";
        assistantMessage.textContent += `${badge}\n\n耗时：${payload.latencyMs} ms | 成本：${payload.estimatedCost}`;
        messagesElement.scrollTop = messagesElement.scrollHeight;
      }

      if (eventName === "error") {
        removeTypingIndicator(typingIndicator);
        typingIndicator = null;
        showError(payload.message || "请求失败");
        setStatus("error");
      }

      if (eventName === "done") {
        removeTypingIndicator(typingIndicator);
        typingIndicator = null;
        setStatus("done");
      }
    }
  }

  removeTypingIndicator(typingIndicator);
  await refreshMetrics();
}

formElement.addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = inputElement.value.trim();

  if (!question) {
    showError("请输入问题后再发送。");
    return;
  }

  inputElement.value = "";

  try {
    await sendMessage(question);
  } catch (error) {
    showError(error instanceof Error ? error.message : String(error));
    setStatus("error");
    await refreshMetrics();
  }
});

retryButtonElement.addEventListener("click", async () => {
  if (!lastQuestion) {
    showError("还没有可重试的问题。");
    return;
  }

  try {
    setStatus("retrying");
    await sendMessage(lastQuestion);
  } catch (error) {
    showError(error instanceof Error ? error.message : String(error));
    setStatus("error");
    await refreshMetrics();
  }
});

refreshMetrics().catch(() => {
  // 忽略首次刷新指标失败。
});
