import { v4 as uuidv4 } from "uuid";
import { getTransitMessages, getFullHistory, clearTransit, clearHistory } from "./types";
import { setClipboard } from "./Login";
import { appendSessionHistory } from "./accounts";
import { resetAccounts } from "./Dashboard";

export interface SessionStatus {
  sessionId: string | null;
  startTime: string | null;
  activeContext: string; // e.g. "canumay-east.md"
  agentStates: {
    Gemini: "idle" | "processing" | "waiting";
    Claude: "idle" | "processing" | "waiting";
    NotebookLM: "idle" | "processing" | "waiting";
  };
}

let sessionState: SessionStatus = {
  sessionId: null,
  startTime: null,
  activeContext: "canumay-east.md",
  agentStates: {
    Gemini: "idle",
    Claude: "idle",
    NotebookLM: "idle"
  }
};

export function getSessionStatus(): SessionStatus {
  if (!sessionState.sessionId) {
    // Auto-start a default session if none exists
    startNewSession(sessionState.activeContext);
  }
  return sessionState;
}

export function setActiveContext(filename: string): void {
  sessionState.activeContext = filename;
}

export function startNewSession(contextFilename: string): SessionStatus {
  // If there's an active session, run pre-reset sequence first
  if (sessionState.sessionId) {
    runPreResetSequence();
  }

  sessionState.sessionId = `sess-${uuidv4().slice(0, 8)}`;
  sessionState.startTime = new Date().toISOString();
  sessionState.activeContext = contextFilename;
  sessionState.agentStates = {
    Gemini: "idle",
    Claude: "idle",
    NotebookLM: "idle"
  };

  return sessionState;
}

export function runPreResetSequence(): {
  preReset: boolean;
  contextSaved: boolean;
  lastPromptSaved: boolean;
  lastPrompt: string | null;
} {
  const currentSessionId = sessionState.sessionId || "unknown-session";
  const activeContextFile = sessionState.activeContext;
  
  // Step 1: Save context summary to Session History
  const history = getFullHistory();
  const confirmedMsgs = history.filter(m => m.status === "confirmed");
  
  let contextSaved = false;
  if (sessionState.sessionId && history.length > 0) {
    const summaryMd = `#### Session ${currentSessionId}
- **Date:** ${new Date().toISOString().split("T")[0]}
- **Start Time:** ${sessionState.startTime}
- **End Time:** ${new Date().toISOString()}
- **Messages Processed:** ${history.length}
- **Confirmed Updates:** ${confirmedMsgs.length}
- **Key Exchanges:** ${confirmedMsgs.map(m => `${m.from}→${m.to} (${m.type})`).join(", ") || "None"}
`;
    try {
      appendSessionHistory(activeContextFile, summaryMd);
      contextSaved = true;
    } catch (err) {
      console.error("Error saving session history to context file:", err);
    }
  }

  // Step 2: Grab last user prompt and copy to clipboard buffer
  let lastPrompt: string | null = null;
  // Find the last message from User (or any message if no User message exists)
  const userMessages = history.filter(m => m.from === "User");
  if (userMessages.length > 0) {
    lastPrompt = userMessages[userMessages.length - 1].payload.content;
  } else if (history.length > 0) {
    lastPrompt = history[history.length - 1].payload.content;
  }

  let lastPromptSaved = false;
  if (lastPrompt) {
    setClipboard(
      lastPrompt,
      currentSessionId,
      "last_prompt",
      `========================================
[SAVED LAST PROMPT]
Session: ${currentSessionId}
Content: ${lastPrompt}
========================================`
    );
    lastPromptSaved = true;
  }

  // Step 4: Clear transit, reset history, reset agent states, reset connected states
  clearTransit();
  clearHistory();
  resetAccounts();
  
  sessionState.agentStates = {
    Gemini: "idle",
    Claude: "idle",
    NotebookLM: "idle"
  };

  return {
    preReset: true,
    contextSaved,
    lastPromptSaved,
    lastPrompt
  };
}

export function endCurrentSession(): void {
  runPreResetSequence();
  sessionState.sessionId = null;
  sessionState.startTime = null;
}

export function updateAgentState(agent: "Gemini" | "Claude" | "NotebookLM", state: "idle" | "processing" | "waiting"): void {
  sessionState.agentStates[agent] = state;
}
