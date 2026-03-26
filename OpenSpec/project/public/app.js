// 前端交互层：负责登录、SSE 聊天流、审计面板渲染和指标刷新。
const authStatusElement = document.getElementById("auth-status");
const statusElement = document.getElementById("status");
const errorBoxElement = document.getElementById("error-box");
const loginFormElement = document.getElementById("login-form");
const passwordInputElement = document.getElementById("password-input");
const loginHintElement = document.getElementById("login-hint");
const logoutButtonElement = document.getElementById("logout-button");
const formElement = document.getElementById("chat-form");
const inputElement = document.getElementById("message-input");
const sendButtonElement = document.getElementById("send-button");
const retryButtonElement = document.getElementById("retry-button");
const planBoxElement = document.getElementById("plan-box");
const metaBoxElement = document.getElementById("meta-box");
const messagesElement = document.getElementById("messages");

const metricTotalElement = document.getElementById("metric-total");
const metricSuccessElement = document.getElementById("metric-success");
const metricLatencyElement = document.getElementById("metric-latency");
const metricPlannerElement = document.getElementById("metric-planner");
const metricExecutorElement = document.getElementById("metric-executor");
const metricCostElement = document.getElementById("metric-cost");
const metricStatusElement = document.getElementById("metric-status");

const STATUS_CLASSES = ["idle", "submitting", "planning", "executing", "retrying", "done", "error"];
const AUDIT_CLASSES = ["pass", "revise", "insufficient_evidence", "conflict"];
const METRIC_CLASSES = ["idle", "success", "error", "unauthorized"];

let lastQuestion = "";
let isAuthenticated = false;

function syncBodyClass(prefix, value, allowedValues) {
  for (const item of allowedValues) {
    document.body.classList.remove(`${prefix}-${item}`);
  }

  if (value && allowedValues.includes(value)) {
    document.body.classList.add(`${prefix}-${value}`);
  }
}

function setStatus(status) {
  statusElement.textContent = status;
  syncBodyClass("status", status, STATUS_CLASSES);
}

function setAuditDecision(decision) {
  syncBodyClass("audit", decision, AUDIT_CLASSES);
}

function setMetricStatus(status) {
  metricStatusElement.textContent = status;
  const semanticStatus = status === "done" ? "success" : status === "error" || status === "unauthorized" ? "error" : "idle";
  syncBodyClass("metric", semanticStatus, METRIC_CLASSES);
}

function setAuthStatus(authenticated, hint = "") {
  isAuthenticated = authenticated;
  authStatusElement.textContent = authenticated ? "已登录" : "未登录";
  document.body.classList.toggle("authenticated", authenticated);
  document.body.classList.toggle("unauthenticated", !authenticated);
  logoutButtonElement.disabled = !authenticated;
  passwordInputElement.disabled = authenticated;
  loginHintElement.textContent = hint || (authenticated ? "已登录，现在可以访问聊天和指标接口。" : "未登录时，聊天与指标请求会返回 401。");
}

function setChatEnabled(enabled) {
  inputElement.disabled = !enabled;
  sendButtonElement.disabled = !enabled;
  retryButtonElement.disabled = !enabled && !lastQuestion;
}

function showError(message) {
  errorBoxElement.textContent = message;
  errorBoxElement.classList.remove("hidden");
}

function clearError() {
  errorBoxElement.textContent = "";
  errorBoxElement.classList.add("hidden");
}

function resetPlanAndMeta() {
  planBoxElement.textContent = "提交问题后，这里会显示执行计划和 evidence policy。";
  planBoxElement.classList.add("muted");
  metaBoxElement.textContent = "回答完成后，这里会显示 citations、claims、decision、notes 和风险提示。";
  metaBoxElement.classList.add("muted");
  setAuditDecision("");
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

function renderPlan(plan, plannerLatencyMs) {
  const subtasks = Array.isArray(plan.subtasks) && plan.subtasks.length > 0 ? plan.subtasks.map((item, index) => `${index + 1}. ${item}`).join("\n") : "- 无";
  const evidencePolicy = plan.evidencePolicy ? JSON.stringify(plan.evidencePolicy, null, 2) : "{}";
  planBoxElement.textContent = [
    `目标\n${plan.goal || "-"}`,
    `执行模式\nneedsRetrieval=${plan.needsRetrieval} | answerMode=${plan.answerMode}`,
    `回答约束\nmustCite=${plan.mustCite} | refuseIfInsufficientEvidence=${plan.refuseIfInsufficientEvidence}`,
    `子任务\n${subtasks}`,
    `Evidence Policy\n${evidencePolicy}`,
    `规划耗时\n${plannerLatencyMs} ms`,
  ].join("\n\n");
  planBoxElement.classList.remove("muted");
}

function renderMeta(payload) {
  const citations = (payload.citations || [])
    .map((item, index) => `${index + 1}. ${item.sourcePath} | ${item.sectionPath} | ${item.snippet}`)
    .join("\n");

  const claims = (payload.claims || [])
    .map((claim, index) => `${index + 1}. [${claim.importance}] ${claim.text}\n   supportSummary: ${claim.supportSummary}`)
    .join("\n\n");

  const claimChecks = (payload.claimChecks || [])
    .map((check, index) => `${index + 1}. ${check.claimId} | supported=${check.supported} | strength=${check.supportStrength} | citations=${check.citationCount} | crossChunk=${check.hasCrossChunkSupport} | conflict=${check.hasConflict}\n   reason: ${check.reason}`)
    .join("\n\n");

  const missingClaims = (payload.missingClaims || []).length > 0 ? payload.missingClaims.join("；") : "无";
  const notes = (payload.notes || []).length > 0 ? payload.notes.join("；") : "无";

  const lines = [
    `决策摘要\ndecision=${payload.decision} | confidence=${payload.confidence} | degraded=${payload.degraded}`,
    `风险信号\ninsufficientEvidence=${payload.insufficientEvidence} | hallucinationRisk=${payload.hallucinationRisk}`,
    `评分\ncoverage=${payload.coverageScore} | sufficiency=${payload.sufficiencyScore} | conflict=${payload.conflictScore}`,
    citations ? `引用\n${citations}` : "引用\n无",
    claims ? `Claims\n${claims}` : "Claims\n无",
    claimChecks ? `Claim Checks\n${claimChecks}` : "Claim Checks\n无",
    `缺失结论\n${missingClaims}`,
    `审计备注\n${notes}`,
    `运行耗时\nplanner=${payload.plannerLatencyMs} ms | executor=${payload.executorLatencyMs} ms | total=${payload.totalLatencyMs} ms`,
    `估算成本\n${payload.estimatedCost}`,
  ];

  metaBoxElement.textContent = lines.join("\n\n");
  metaBoxElement.classList.remove("muted");
  setAuditDecision(payload.decision || "");
}

async function parseJsonSafely(response, fallbackMessage) {
  return response.json().catch(() => ({ message: fallbackMessage }));
}

async function refreshMetrics() {
  const response = await fetch("/api/metrics");

  if (response.status === 401) {
    // 指标接口是前端判断登录态是否失效的最轻量探针。
    setAuthStatus(false, "未登录，暂时无法读取运行指标。请先登录。");
    metricTotalElement.textContent = "0";
    metricSuccessElement.textContent = "0%";
    metricLatencyElement.textContent = "0 ms";
    metricPlannerElement.textContent = "0 ms";
    metricExecutorElement.textContent = "0 ms";
    metricCostElement.textContent = "0";
    setMetricStatus("unauthorized");
    setChatEnabled(false);
    return;
  }

  if (!response.ok) {
    const payload = await parseJsonSafely(response, "读取指标失败");
    throw new Error(payload.message || "读取指标失败");
  }

  const data = await response.json();
  setAuthStatus(true);
  setChatEnabled(true);
  metricTotalElement.textContent = String(data.totalRequests || 0);
  metricSuccessElement.textContent = `${data.successRate || 0}%`;
  metricLatencyElement.textContent = `${data.averageLatencyMs || 0} ms`;
  metricPlannerElement.textContent = `${data.averagePlannerLatencyMs || 0} ms`;
  metricExecutorElement.textContent = `${data.averageExecutorLatencyMs || 0} ms`;
  metricCostElement.textContent = String(data.lastEstimatedCost || 0);
  setMetricStatus(data.lastStatus || "idle");
}

async function login(password) {
  clearError();
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const payload = await parseJsonSafely(response, "登录失败");
    throw new Error(payload.message || "登录失败");
  }

  setAuthStatus(true, "登录成功，现在可以发送问题。");
  setChatEnabled(true);
  passwordInputElement.value = "";
  await refreshMetrics();
}

async function logout() {
  clearError();
  const response = await fetch("/api/logout", { method: "POST" });
  if (!response.ok) {
    const payload = await parseJsonSafely(response, "退出登录失败");
    throw new Error(payload.message || "退出登录失败");
  }

  setAuthStatus(false, "已退出登录。");
  setChatEnabled(false);
  resetPlanAndMeta();
  setMetricStatus("unauthorized");
}

async function sendMessage(question) {
  clearError();
  setStatus("submitting");
  lastQuestion = question;
  retryButtonElement.disabled = false;
  resetPlanAndMeta();

  appendMessage("user", question);
  const assistantMessage = appendMessage("assistant", "");
  let typingIndicator = appendTypingIndicator();
  let hasStartedStreaming = false;
  let latestState = {
    citations: [],
    claims: [],
    claimChecks: [],
    missingClaims: [],
    notes: [],
  };
  let latestMeta = null;

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: question }),
  });

  if (response.status === 401) {
    removeTypingIndicator(typingIndicator);
    setAuthStatus(false, "登录已失效，请重新登录。");
    setChatEnabled(false);
    setMetricStatus("unauthorized");
    throw new Error("未登录，无法调用聊天接口。请先登录。");
  }

  if (response.status === 429) {
    removeTypingIndicator(typingIndicator);
    const payload = await parseJsonSafely(response, "请求过于频繁，请稍后再试。");
    const suffix = payload.retryAfterSeconds ? ` 请在 ${payload.retryAfterSeconds} 秒后重试。` : "";
    throw new Error((payload.message || "请求过于频繁，请稍后再试。") + suffix);
  }

  if (!response.ok || !response.body) {
    removeTypingIndicator(typingIndicator);
    const payload = await parseJsonSafely(response, "请求失败");
    throw new Error(payload.message || "请求失败");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  // SSE 事件在网络层可能被拆包，这里先拼缓冲区，再按空行切分完整事件。
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

      if (eventName === "plan") {
        renderPlan(payload.plan || {}, payload.plannerLatencyMs || 0);
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
        latestState.citations = payload.citations || [];
      }

      if (eventName === "claims") {
        latestState.claims = payload.claims || [];
      }

      if (eventName === "evidence_check") {
        latestState = {
          ...latestState,
          claimChecks: payload.claimChecks || [],
          missingClaims: payload.missingClaims || [],
          notes: payload.notes || [],
          decision: payload.decision,
          coverageScore: payload.coverageScore,
          sufficiencyScore: payload.sufficiencyScore,
          conflictScore: payload.conflictScore,
        };
      }

      if (eventName === "meta") {
        latestMeta = payload;
        renderMeta({ ...payload, ...latestState });

        // 最终 meta 事件补齐耗时、成本和 decision，方便把“生成结果”与“审计结果”同时展示。
        const auditNote = payload.decision ? `\n\ndecision: ${payload.decision}` : "";
        const evidenceNote = payload.insufficientEvidence ? "\n\n提示：当前证据不足。" : "";
        assistantMessage.textContent += `${auditNote}${evidenceNote}\n\n总耗时：${payload.totalLatencyMs} ms | 成本：${payload.estimatedCost}`;
        messagesElement.scrollTop = messagesElement.scrollHeight;
      }

      if (eventName === "error") {
        removeTypingIndicator(typingIndicator);
        typingIndicator = null;
        const suffix = payload.retryAfterSeconds ? ` 请在 ${payload.retryAfterSeconds} 秒后重试。` : "";
        showError((payload.message || "请求失败") + suffix);
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

  if (latestMeta) {
    renderMeta({ ...latestMeta, ...latestState });
  }

  await refreshMetrics();
}

loginFormElement.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = passwordInputElement.value.trim();

  if (!password) {
    showError("请输入密码后再登录。");
    return;
  }

  try {
    await login(password);
  } catch (error) {
    setAuthStatus(false);
    setChatEnabled(false);
    showError(error instanceof Error ? error.message : String(error));
  }
});

logoutButtonElement.addEventListener("click", async () => {
  try {
    await logout();
  } catch (error) {
    showError(error instanceof Error ? error.message : String(error));
  }
});

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
    await refreshMetrics().catch(() => {});
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
    await refreshMetrics().catch(() => {});
  }
});

setStatus("idle");
setMetricStatus("idle");
setAuthStatus(false);
setChatEnabled(false);
resetPlanAndMeta();
refreshMetrics().catch(() => {
  setAuthStatus(false);
  setChatEnabled(false);
  setMetricStatus("unauthorized");
});
