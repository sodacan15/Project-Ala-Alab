export interface TransitMessage {
  id: string;
  from: "User" | "Gemini" | "Claude" | "NotebookLM";
  to: "User" | "Gemini" | "Claude" | "NotebookLM";
  type: string;
  timestamp: string;
  payload: {
    content: string;
    section?: string;
    title?: string;
    dateOfObservation?: string;
    dataFlowDirection?: string;
    contributor?: string;
    significance?: string;
    linkedEntries?: string;
    [key: string]: any;
  };
  source_tag?: string;
  sensitive?: boolean;
  note?: string;
  status: "pending" | "confirmed" | "purged";
  errorReason?: string;
}

export interface SessionStatus {
  sessionId: string | null;
  startTime: string | null;
  activeContext: string;
  agentStates: {
    Gemini: "idle" | "processing" | "waiting";
    Claude: "idle" | "processing" | "waiting";
    NotebookLM: "idle" | "processing" | "waiting";
  };
}

export interface OriginalEntry {
  id: string;
  type: "ORIGINAL";
  filename: string;
  path: string;
  dateAdded: string;
  addedBy: string;
  description: string;
  inNotebook: boolean;
}

export interface LinkEntry {
  id: string;
  type: "LINK";
  url: string;
  title: string;
  dateAccessed: string;
  addedBy: string;
  notes: string;
  generatedFile: string;
  inNotebook: boolean;
}

export interface ImageEntry {
  id: string;
  type: "IMAGE";
  filename: string;
  path: string;
  metadataFile: string;
  dateAdded: string;
  addedBy: string;
  caption: string;
  linkedEntry: string;
  inNotebook: boolean;
}

export type IndexEntry = OriginalEntry | LinkEntry | ImageEntry;

export interface AgentAccount {
  agent: "Gemini" | "Claude" | "NotebookLM";
  connected: boolean;
  displayName: string;
  email: string;
  connectedAt?: string;
}

export interface ContextMetadata {
  name: string;
  scope: string;
  description: string;
  filename: string;
  version: string;
  created: string;
  lastUpdated: string;
}

export interface ClipboardBuffer {
  content: string;
  savedAt: string;
  fromSession: string;
  type: string;
  formattedBlock?: string;
}
