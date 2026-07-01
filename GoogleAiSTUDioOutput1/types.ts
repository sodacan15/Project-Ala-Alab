export interface TransitMessage {
  id: string;
  from: "User" | "Gemini" | "Claude" | "NotebookLM";
  to: "User" | "Gemini" | "Claude" | "NotebookLM";
  type: string;
  timestamp: string;
  payload: {
    content: string;
    [key: string]: any;
  };
  source_tag?: string;
  sensitive?: boolean;
  note?: string;
  status: "pending" | "confirmed" | "purged";
  errorReason?: string;
}

// In-memory states
let transitMessages: TransitMessage[] = [];
let messageHistory: TransitMessage[] = [];

export function getTransitMessages(): TransitMessage[] {
  return transitMessages.filter(m => m.status === "pending");
}

export function getFullHistory(): TransitMessage[] {
  return messageHistory;
}

export function clearHistory(): void {
  messageHistory = [];
}

export function clearTransit(): void {
  transitMessages = [];
}

export const VALID_AGENTS = ["User", "Gemini", "Claude", "NotebookLM"] as const;
export type ValidAgent = typeof VALID_AGENTS[number];

export function validateMessage(msg: Partial<TransitMessage>): { isValid: boolean; error?: string } {
  if (!msg.from || !msg.to || !msg.type || !msg.payload || !msg.payload.content) {
    return { isValid: false, error: "Missing required fields: from, to, type, payload.content" };
  }

  if (!VALID_AGENTS.includes(msg.from as ValidAgent)) {
    return { isValid: false, error: `Invalid sender: "${msg.from}". Must be one of ${VALID_AGENTS.join(", ")}` };
  }

  if (!VALID_AGENTS.includes(msg.to as ValidAgent)) {
    return { isValid: false, error: `Invalid recipient: "${msg.to}". Must be one of ${VALID_AGENTS.join(", ")}` };
  }

  return { isValid: true };
}

export function addMessageToTransit(msg: Omit<TransitMessage, "id" | "status">): TransitMessage {
  const { isValid, error } = validateMessage(msg);
  if (!isValid) {
    // Log failure in history
    const failedMsg: TransitMessage = {
      ...msg,
      id: `err-${Date.now()}`,
      status: "purged",
      errorReason: error || "Validation failed"
    } as TransitMessage;
    messageHistory.push(failedMsg);
    throw new Error(error || "Validation failed");
  }

  const newMsg: TransitMessage = {
    ...msg,
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    status: "pending"
  } as TransitMessage;

  transitMessages.push(newMsg);
  messageHistory.push(newMsg);
  return newMsg;
}

export function confirmMessage(id: string): TransitMessage {
  const msgIndex = transitMessages.findIndex(m => m.id === id);
  if (msgIndex === -1) {
    throw new Error(`Message ${id} not found in transit`);
  }

  const msg = transitMessages[msgIndex];
  msg.status = "confirmed";
  
  // Update in history as well
  const histIndex = messageHistory.findIndex(m => m.id === id);
  if (histIndex !== -1) {
    messageHistory[histIndex].status = "confirmed";
  }

  // Remove from active transit
  transitMessages.splice(msgIndex, 1);
  return msg;
}

export function purgeMessage(id: string, reason: string): TransitMessage {
  const msgIndex = transitMessages.findIndex(m => m.id === id);
  if (msgIndex === -1) {
    throw new Error(`Message ${id} not found in transit`);
  }

  const msg = transitMessages[msgIndex];
  msg.status = "purged";
  msg.errorReason = reason;

  // Update in history
  const histIndex = messageHistory.findIndex(m => m.id === id);
  if (histIndex !== -1) {
    messageHistory[histIndex].status = "purged";
    messageHistory[histIndex].errorReason = reason;
  }

  // Remove from active transit
  transitMessages.splice(msgIndex, 1);
  return msg;
}
