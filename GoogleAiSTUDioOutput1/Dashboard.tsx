export interface AgentAccount {
  agent: "Gemini" | "Claude" | "NotebookLM";
  connected: boolean;
  displayName: string;
  email: string;
  connectedAt?: string;
}

let agentAccounts: Record<string, AgentAccount> = {
  Gemini: { agent: "Gemini", connected: false, displayName: "", email: "" },
  Claude: { agent: "Claude", connected: false, displayName: "", email: "" },
  NotebookLM: { agent: "NotebookLM", connected: false, displayName: "", email: "" }
};

export function getAccounts(): AgentAccount[] {
  return Object.values(agentAccounts);
}

export function connectAccount(agent: "Gemini" | "Claude" | "NotebookLM", displayName: string, email: string): AgentAccount {
  if (!agentAccounts[agent]) {
    throw new Error(`Invalid agent: ${agent}`);
  }
  agentAccounts[agent] = {
    agent,
    connected: true,
    displayName,
    email,
    connectedAt: new Date().toISOString()
  };
  return agentAccounts[agent];
}

export function disconnectAccount(agent: "Gemini" | "Claude" | "NotebookLM"): AgentAccount {
  if (!agentAccounts[agent]) {
    throw new Error(`Invalid agent: ${agent}`);
  }
  agentAccounts[agent] = {
    agent,
    connected: false,
    displayName: "",
    email: ""
  };
  return agentAccounts[agent];
}

export function resetAccounts(): void {
  agentAccounts = {
    Gemini: { agent: "Gemini", connected: false, displayName: "", email: "" },
    Claude: { agent: "Claude", connected: false, displayName: "", email: "" },
    NotebookLM: { agent: "NotebookLM", connected: false, displayName: "", email: "" }
  };
}
