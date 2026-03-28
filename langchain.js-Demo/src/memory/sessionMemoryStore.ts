import type { AgentHistory, AgentMessage, MessageRole } from "../agents/agentTypes.js";

const MAX_HISTORY_LENGTH = 6;
const sessionStore = new Map<string, AgentHistory>();

function trimHistory(history: AgentHistory) {
  return history.slice(-MAX_HISTORY_LENGTH);
}

function appendMessage(sessionId: string, role: MessageRole, content: string) {
  const history = getSessionHistory(sessionId);
  const nextMessage: AgentMessage = {
    role,
    content,
  };

  sessionStore.set(sessionId, trimHistory([...history, nextMessage]));
}

export function getSessionHistory(sessionId: string): AgentHistory {
  return sessionStore.get(sessionId) ?? [];
}

export function appendUserMessage(sessionId: string, content: string) {
  appendMessage(sessionId, "user", content);
}

export function appendAssistantMessage(sessionId: string, content: string) {
  appendMessage(sessionId, "assistant", content);
}

export function clearSessionHistory(sessionId: string) {
  sessionStore.delete(sessionId);
}
