import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Import custom backend modules
import {
  ensureDirectories,
  listContexts,
  readContextFile,
  createContextFile,
  appendEntryToContext,
  CONTEXTS_DIR
} from "./accounts";

import {
  loadIndex,
  addEntry,
  deleteEntry,
  toggleInNotebook,
  STORAGE_DIR
} from "./session";

import {
  getTransitMessages,
  getFullHistory,
  clearHistory,
  addMessageToTransit,
  confirmMessage,
  purgeMessage,
  TransitMessage
} from "./types";

import {
  getClipboard,
  setClipboard,
  clearClipboard
} from "./Login";

import {
  getSessionStatus,
  startNewSession,
  endCurrentSession,
  updateAgentState,
  setActiveContext
} from "./Agents";

import {
  getAccounts,
  connectAccount,
  disconnectAccount
} from "./Dashboard";

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize local filesystem directories & seeds
ensureDirectories();

// --------------------------------------------------------
// MULTER FILE UPLOAD STORAGE CONFIGURATION
// --------------------------------------------------------
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve("./src/storage/files"));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve("./src/storage/images"));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const uploadFile = multer({ storage: fileStorage });
const uploadImage = multer({ storage: imageStorage });

const attachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve("./src/storage/attachments"));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const uploadAttachment = multer({ storage: attachmentStorage });

// Serve uploaded files, images, and attachments statically for UI viewing
app.use("/storage", express.static(path.resolve("./src/storage")));
app.use("/storage/files", express.static(path.resolve("./src/storage/files")));
app.use("/storage/images", express.static(path.resolve("./src/storage/images")));
app.use("/storage/attachments", express.static(path.resolve("./src/storage/attachments")));

// --------------------------------------------------------
// GEMINI API AGENT INITIALIZATION
// --------------------------------------------------------
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  } catch (err) {
    console.error("Failed to initialize Gemini API SDK client:", err);
  }
}

// --------------------------------------------------------
// BRIDGE ENDPOINTS (Clipboard Message Bus)
// --------------------------------------------------------

app.post("/api/bridge/send", (req, res) => {
  try {
    const { from, to, type, payload, source_tag, sensitive, note } = req.body;
    
    // Create the message log entry and run validation
    const message = addMessageToTransit({
      from,
      to,
      type,
      timestamp: new Date().toISOString(),
      payload,
      source_tag,
      sensitive: !!sensitive,
      note
    });

    // Generate formatted copyable block
    const formattedBlock = `========================================
[FROM: ${message.from}] / [TO: ${message.to}]
Type: ${message.type} | ${message.timestamp}
----------------------------------------
${message.payload.content}
----------------------------------------
Source: ${message.source_tag || "N/A"} | Sensitive: ${message.sensitive ? "YES" : "NO"}
Note: ${message.note || "N/A"}
========================================`;

    // Automatically stage in clipboard buffer for the human bridge
    setClipboard(message.payload.content, getSessionStatus().sessionId || "no-session", message.type, formattedBlock);

    res.json({ success: true, message, formattedBlock });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get("/api/bridge/transit", (req, res) => {
  res.json(getTransitMessages());
});

app.post("/api/bridge/confirm/:id", (req, res) => {
  try {
    const { id } = req.params;
    const confirmedMsg = confirmMessage(id);

    // If it is a proposed context entry, append it to the active context file
    if (confirmedMsg.type === "proposed_entry") {
      const activeFile = getSessionStatus().activeContext;
      const section = confirmedMsg.payload.section || "Community & Oral History";
      
      const today = new Date().toISOString().split("T")[0];
      const entryTitle = confirmedMsg.payload.title || "Proposed Entry";
      const entryMarkdown = `#### ${entryTitle}
- **Date of observation:** ${confirmedMsg.payload.dateOfObservation || today}
- **Date of submission:** ${today}
- **Source type:** ${confirmedMsg.source_tag || "N/A"}
- **Data flow direction:** ${confirmedMsg.payload.dataFlowDirection || "Bottom-up"}
- **Contributor:** ${confirmedMsg.payload.contributor || "Anonymized Contributor"}
- **Content:** ${confirmedMsg.payload.content}
- **Significance:** ${confirmedMsg.payload.significance || "Ecological / Historical"}
- **Linked entries:** ${confirmedMsg.payload.linkedEntries || "None"}`;

      appendEntryToContext(activeFile, section, entryMarkdown);
    }

    res.json({ success: true, message: confirmedMsg });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

app.post("/api/bridge/purge/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const purged = purgeMessage(id, reason || "Rejected by human operator");
    res.json({ success: true, message: purged });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

app.get("/api/bridge/log", (req, res) => {
  res.json(getFullHistory());
});

app.delete("/api/bridge/log", (req, res) => {
  clearHistory();
  res.json({ success: true });
});

app.post("/api/bridge/purge-all", (req, res) => {
  clearHistory();
  res.json({ success: true, message: "All transit history cleared." });
});

app.post("/api/bridge/attach", uploadAttachment.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const response = {
    id: `${Date.now()}-${req.file.filename}`,
    filename: req.file.originalname,
    mimetype: req.file.mimetype,
    url: `/storage/attachments/${req.file.filename}`
  };
  res.json(response);
});

// --------------------------------------------------------
// SESSION ENDPOINTS
// --------------------------------------------------------

app.get("/api/session/status", (req, res) => {
  res.json(getSessionStatus());
});

app.post("/api/session/new", (req, res) => {
  const { contextFilename } = req.body;
  const session = startNewSession(contextFilename || "canumay-east.md");
  res.json(session);
});

app.delete("/api/session/current", (req, res) => {
  endCurrentSession();
  res.json({ success: true, preReset: true });
});

app.get("/api/session/last-prompt", (req, res) => {
  const history = getFullHistory();
  const userMessages = history.filter(m => m.from === "User");
  const lastPrompt = userMessages.length > 0 ? userMessages[userMessages.length - 1].payload.content : null;
  res.json({ lastPrompt });
});

app.post("/api/session/agent-state", (req, res) => {
  const { agent, state } = req.body;
  if (!agent || !state) {
    return res.status(400).json({ error: "Missing agent or state" });
  }
  updateAgentState(agent, state);
  res.json(getSessionStatus());
});

app.get("/api/session/primer/:agent", (req, res) => {
  const { agent } = req.params;
  const session = getSessionStatus();
  const activeContext = session.activeContext || "none";
  let instructions = "";

  if (agent === "Gemini") {
    instructions = `You are Gemini Flash. Receive raw intake from the user, structure it, and prepare it for Claude. Never write directly to context.md. Use the active context file for grounding. Active context: ${activeContext}.`;
  } else if (agent === "Claude") {
    instructions = `You are Claude. Evaluate incoming structured intake, propose entries, and wait for human confirmation before writing to context.md. Use the active context file for grounding. Active context: ${activeContext}.`;
  } else if (agent === "NotebookLM") {
    instructions = `You are NotebookLM. Aggregate corpus references and synthesize findings to support Claude and the human operator. Use the active context file and indexed sources. Active context: ${activeContext}.`;
  } else {
    instructions = `Agent primer for ${agent} is not available. Use the active context file and follow the Ala-Alab bridge protocol.`;
  }

  res.json({ primer: instructions });
});

// --------------------------------------------------------
// CLIPBOARD ENDPOINTS (In-App Buffer)
// --------------------------------------------------------

app.get("/api/clipboard/current", (req, res) => {
  res.json(getClipboard());
});

app.post("/api/clipboard/copy", (req, res) => {
  const { messageId } = req.body;
  const history = getFullHistory();
  const message = history.find(m => m.id === messageId);
  if (!message) {
    return res.status(404).json({ error: "Message not found" });
  }

  const formattedBlock = `========================================
[FROM: ${message.from}] / [TO: ${message.to}]
Type: ${message.type} | ${message.timestamp}
----------------------------------------
${message.payload.content}
----------------------------------------
Source: ${message.source_tag || "N/A"} | Sensitive: ${message.sensitive ? "YES" : "NO"}
Note: ${message.note || "N/A"}
========================================`;

  const clipboard = setClipboard(
    message.payload.content,
    getSessionStatus().sessionId || "no-session",
    message.type,
    formattedBlock
  );
  res.json(clipboard);
});

app.post("/api/clipboard/copy-text", (req, res) => {
  const content = req.body.content ?? req.body.text;
  const type = req.body.type || req.body.label || "custom_text";
  if (!content) {
    return res.status(400).json({ error: "Missing content" });
  }
  const clipboard = setClipboard(
    content,
    getSessionStatus().sessionId || "no-session",
    type,
    content
  );
  res.json(clipboard);
});

app.delete("/api/clipboard/clear", (req, res) => {
  clearClipboard();
  res.json({ success: true });
});

// --------------------------------------------------------
// CONTEXT FILE MANAGER ENDPOINTS
// --------------------------------------------------------

app.get("/api/contexts", (req, res) => {
  res.json(listContexts());
});

app.get("/api/contexts/current", (req, res) => {
  const activeFile = getSessionStatus().activeContext;
  try {
    const markdown = readContextFile(activeFile);
    res.json({ filename: activeFile, markdown, content: markdown });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

app.get("/api/contexts/:name", (req, res) => {
  const { name } = req.params;
  try {
    const markdown = readContextFile(name);
    res.json({ filename: name, markdown, content: markdown });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

app.put("/api/contexts/:name/save", (req, res) => {
  const { name } = req.params;
  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ error: "Missing content" });
  }

  try {
    const filePath = path.join(CONTEXTS_DIR, name);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `Context file ${name} not found` });
    }
    let updatedContent = content;
    const now = new Date().toISOString().split("T")[0];
    if (/\*\*Last updated:\*\*/.test(content)) {
      updatedContent = content.replace(/(\*\*Last updated:\*\*)\s*[^\s|]+/g, `$1 ${now}`);
    }
    fs.writeFileSync(filePath, updatedContent, "utf-8");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/contexts/append-entry", (req, res) => {
  const { content, sourceTag, contributor, dateOfObservation, significance, sensitive, section, note } = req.body;
  const activeFile = getSessionStatus().activeContext;
  if (!activeFile) {
    return res.status(400).json({ error: "No active context file" });
  }
  if (!content) {
    return res.status(400).json({ error: "Missing content" });
  }

  const entryMarkdown = `#### ${sourceTag || "[ORAL]"} Entry\n- **Date of observation:** ${dateOfObservation || new Date().toISOString().split("T")[0]}\n- **Contributor:** ${contributor || "Anonymous"}\n- **Significance:** ${significance || "Community-relevant"}\n- **Sensitive:** ${sensitive ? "Yes" : "No"}\n- **Note:** ${note || "None"}\n\n${content}`;
  try {
    appendEntryToContext(activeFile, section || "Community & Oral History", entryMarkdown);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/contexts/new", (req, res) => {
  const { name, scope, description } = req.body;
  if (!name || !description) {
    return res.status(400).json({ error: "Missing name or description" });
  }

  const sanitized = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
  const filename = sanitized.endsWith(".md") ? sanitized : `${sanitized}.md`;

  try {
    // 1. Run pre-reset sequence to close the current session safely
    endCurrentSession();

    // 2. Create the file with template scaffold
    const mdContent = createContextFile(name, scope || "Barangay", description, filename);

    // 3. Set as active context
    setActiveContext(filename);

    // 4. Start fresh session tied to it
    startNewSession(filename);

    // 5. Add to Corpus Index as ORIGINAL context entry
    addEntry({
      type: "ORIGINAL",
      filename,
      path: `src/contexts/${filename}`,
      addedBy: "System Operator",
      description: `Context Document for ${name} [Scope: ${scope || "Barangay"}]`
    } as any);

    res.json({ filename, markdown: mdContent, session: getSessionStatus() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------
// RAW FILE DOWNLOAD ENDPOINTS
// --------------------------------------------------------

app.get("/api/contexts/download/:name", (req, res) => {
  const name = req.params.name;
  try {
    const filePath = path.join(path.resolve("./src/contexts"), name);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `Context file ${name} not found` });
    }
    res.download(filePath, name);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/session/package/download", (req, res) => {
  try {
    const history = getFullHistory();
    const status = getSessionStatus();
    let packageMarkdown = `# Scribe Transit Package\n`;
    packageMarkdown += `Generated At: ${new Date().toLocaleString()}\n`;
    packageMarkdown += `Session ID: ${status.sessionId || "active"}\n`;
    packageMarkdown += `Active Context: ${status.activeContext || "none"}\n\n`;
    packageMarkdown += `==================================================\n\n`;
    
    if (history.length === 0) {
      packageMarkdown += `*(No active session chat log found. This package is empty.)*\n`;
    } else {
      history.forEach((msg, idx) => {
        packageMarkdown += `### [${idx + 1}] FROM: ${msg.from} → TO: ${msg.to}\n`;
        packageMarkdown += `**Type:** ${msg.type} | **Time:** ${new Date(msg.timestamp).toLocaleTimeString()}\n\n`;
        packageMarkdown += `${msg.payload.content || JSON.stringify(msg.payload, null, 2)}\n\n`;
        packageMarkdown += `--------------------------------------------------\n\n`;
      });
    }
    
    res.setHeader("Content-Disposition", 'attachment; filename="scribe-session-package.md"');
    res.setHeader("Content-Type", "text/markdown");
    res.send(packageMarkdown);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/indexer/download/:id", (req, res) => {
  const { id } = req.params;
  try {
    const entries = loadIndex();
    const entry = entries.find(e => e.id === id);
    if (!entry) {
      return res.status(404).json({ error: "File not found in index" });
    }
    
    if (entry.type === "LINK") {
      const linkPath = path.resolve(`./src/storage/links/${(entry as any).generatedFile || ''}`);
      if (fs.existsSync(linkPath)) {
        return res.download(linkPath, (entry as any).generatedFile || 'link.md');
      }
      return res.status(404).json({ error: "Generated link markdown file not found" });
    }
    
    const filePath = path.resolve(`./${entry.path}`);
    if (fs.existsSync(filePath)) {
      return res.download(filePath, entry.filename);
    }
    return res.status(404).json({ error: "Raw file not found on disk" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------
// INDEXER ENDPOINTS (Archival Storage)
// --------------------------------------------------------

app.get("/api/indexer", (req, res) => {
  const entries = loadIndex();
  const grouped = {
    ORIGINAL: entries.filter(e => e.type === "ORIGINAL"),
    LINK: entries.filter(e => e.type === "LINK"),
    IMAGE: entries.filter(e => e.type === "IMAGE")
  };
  res.json(grouped);
});

app.post("/api/indexer/upload-file", uploadFile.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const { addedBy, description } = req.body;

  const entry = addEntry({
    type: "ORIGINAL",
    filename: req.file.originalname,
    path: `src/storage/files/${req.file.filename}`,
    addedBy: addedBy || "Operator",
    description: description || "Uploaded raw source file"
  } as any);

  res.json(entry);
});

app.post("/api/indexer/upload-image", uploadImage.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }
  const { addedBy, caption, linkedEntry } = req.body;

  const entry = addEntry({
    type: "IMAGE",
    filename: req.file.filename,
    path: `src/storage/images/${req.file.filename}`,
    metadataFile: "", // populated by indexer generator
    addedBy: addedBy || "Operator",
    caption: caption || "No caption provided",
    linkedEntry: linkedEntry || "None"
  } as any);

  res.json(entry);
});

app.post("/api/indexer/add-link", (req, res) => {
  const { url, title, notes, addedBy } = req.body;
  if (!url || !title) {
    return res.status(400).json({ error: "Missing url or title" });
  }

  const entry = addEntry({
    type: "LINK",
    url,
    title,
    dateAccessed: new Date().toISOString().split("T")[0],
    addedBy: addedBy || "Operator",
    notes: notes || "No notes provided",
    generatedFile: "" // populated by indexer generator
  } as any);

  res.json(entry);
});

app.post("/api/indexer/add", (req, res, next) => {
  const type = String(req.query.type || "").toUpperCase();

  if (type === "ORIGINAL") {
    uploadFile.single("file")(req, res, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const { addedBy, description } = req.body;
      const entry = addEntry({
        type: "ORIGINAL",
        filename: req.file.originalname,
        path: `src/storage/files/${req.file.filename}`,
        addedBy: addedBy || "Operator",
        description: description || "Uploaded raw source file"
      } as any);
      res.json(entry);
    });
    return;
  }

  if (type === "IMAGE") {
    uploadImage.single("file")(req, res, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: "No image uploaded" });
      const { addedBy, caption, linkedEntry } = req.body;
      const entry = addEntry({
        type: "IMAGE",
        filename: req.file.filename,
        path: `src/storage/images/${req.file.filename}`,
        metadataFile: "",
        addedBy: addedBy || "Operator",
        caption: caption || "No caption provided",
        linkedEntry: linkedEntry || "None"
      } as any);
      res.json(entry);
    });
    return;
  }

  if (type === "LINK") {
    const { url, title, notes, addedBy } = req.body;
    if (!url || !title) {
      return res.status(400).json({ error: "Missing url or title" });
    }
    const entry = addEntry({
      type: "LINK",
      url,
      title,
      dateAccessed: new Date().toISOString().split("T")[0],
      addedBy: addedBy || "Operator",
      notes: notes || "No notes provided",
      generatedFile: ""
    } as any);
    res.json(entry);
    return;
  }

  res.status(400).json({ error: "Unsupported or missing indexer type" });
});

app.post("/api/indexer/:id", (req, res) => {
  try {
    const { inNotebook } = req.body;
    const entry = toggleInNotebook(req.params.id);
    if (typeof inNotebook === "boolean" && entry.inNotebook !== inNotebook) {
      entry.inNotebook = inNotebook;
      const allEntries = loadIndex();
      const idx = allEntries.findIndex(e => e.id === entry.id);
      if (idx !== -1) {
        allEntries[idx] = entry;
        saveIndex(allEntries);
      }
    }
    res.json(entry);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

app.delete("/api/indexer/:id", (req, res) => {
  try {
    deleteEntry(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/indexer/:id/toggle-notebook", (req, res) => {
  try {
    const entry = toggleInNotebook(req.params.id);
    res.json(entry);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// --------------------------------------------------------
// AGENT ACCOUNTS ENDPOINTS
// --------------------------------------------------------

app.get("/api/accounts", (req, res) => {
  res.json(getAccounts());
});

app.post("/api/accounts/:agent/connect", (req, res) => {
  const { agent } = req.params;
  const { displayName, email } = req.body;
  if (!displayName || !email) {
    return res.status(400).json({ error: "Missing displayName or email" });
  }
  try {
    const acc = connectAccount(agent as any, displayName, email);
    res.json(acc);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/accounts/:agent/disconnect", (req, res) => {
  const { agent } = req.params;
  try {
    const acc = disconnectAccount(agent as any);
    res.json(acc);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/accounts/:agent/disconnect", (req, res) => {
  const { agent } = req.params;
  try {
    const acc = disconnectAccount(agent as any);
    res.json(acc);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --------------------------------------------------------
// SERVER-SIDE GEMINI & CLAUDE SIMULATION AND INTEGRATION
// --------------------------------------------------------

app.post("/api/agents/chat", async (req, res) => {
  const { agent, userMessage, contextMarkdown, notebookFiles, rawMode } = req.body;
  if (!agent || !userMessage) {
    return res.status(400).json({ error: "Missing agent or userMessage" });
  }

  // Construct grounded prompt
  const corpusContext = notebookFiles && notebookFiles.length > 0
    ? `Available Grounded NotebookLM Files:\n${notebookFiles.map((f: any) => `- ${f.filename}: ${f.description || f.notes || ""}`).join("\n")}`
    : "No ground-files loaded in NotebookLM.";

  const systemInstruction = agent === "Gemini"
    ? `# GENERAL INSTRUCTIONS (instruction-v3.0.2)
# Ala-Alab — General Instructions
*Applies to: ALL AGENTS — Gemini Flash · Claude · NotebookLM*
*Read this first. Your agent-specific file is an extension of this — not a replacement.*
*Version: 1.0.0 | Source: instruction-v3.0.2 | Last updated: 2026-06-30*

> Three agents. Defined lanes. All communication between agents passes through the Bridge Script — agents never speak to each other directly.

| Agent | Role | Lane |
|---|---|---|
| **Gemini Flash** | The Communicator (Pathos) | Intake — faces the user, structures raw input, routes to Claude and NotebookLM |

---

# AGENT-SPECIFIC INSTRUCTIONS (instruction-v3.0.2)
# Ala-Alab — Gemini Flash Instructions
*The Communicator (Pathos) — Intake Agent*

You are Gemini Flash — The Communicator. You receive raw input from community contributors and structure it for Claude. You are the intake layer.

**You do:**
- Receive raw input in any form — voice note transcripts, broken sentences, dialect, incomplete memories, poorly scanned documents
- Partially denoise — extract signal, discard noise wrappers
- Identify scope, data flow direction, source type, sensitivity
- Clarify ambiguity with one question at a time
- Structure the intake summary
- Route to Claude via Bridge Script
- Route user-sourced files and corpus queries to NotebookLM via Bridge Script
- Search the web when the user asks for sources

**You do not:**
- Write to \`context.md\` — ever
- Decide what is significant enough to log
- Resolve contradictions
- Speak to Claude directly — everything goes through the Bridge Script

---

# CONTEXT & STATE
Active Context Document:
"""
${contextMarkdown}
"""
${corpusContext}

Analyze the user request and propose an intake summary or systematic response following the instruction-v3.0.2 protocol.`
    : agent === "Claude"
    ? `# GENERAL INSTRUCTIONS (instruction-v3.0.2)
# Ala-Alab — General Instructions
*Applies to: ALL AGENTS — Gemini Flash · Claude · NotebookLM*
*Read this first. Your agent-specific file is an extension of this — not a replacement.*
*Version: 1.0.0 | Source: instruction-v3.0.2 | Last updated: 2026-06-30*

> Three agents. Defined lanes. All communication between agents passes through the Bridge Script — agents never speak to each other directly.

| Agent | Role | Lane |
|---|---|---|
| **Claude** | The Scribe (Logos) | Document maintenance — evaluates, proposes entries, writes after confirmation |

---

# AGENT-SPECIFIC INSTRUCTIONS (instruction-v3.0.2)
# Ala-Alab — Claude Instructions
*The Scribe (Logos) — Document Maintenance Agent*

You are Claude — The Scribe. You receive intake summaries from Gemini and evaluate them. You decide how — and whether — they enter \`context.md\`. You propose entries for human confirmation. You write after confirmation. You never write before it.

**You do:**
- Receive intake summaries from Gemini via the Bridge Script
- Evaluate against the Checkpoint Protocol
- Propose entries — new entry, patch, erratum, or no action
- Write to \`context.md\` after explicit human confirmation
- Send updated context and file updates to NotebookLM via Bridge Script
- Receive corpus reports from NotebookLM and incorporate them
- Maintain the erratum log
- Run the post-save cleanup pass
- Answer queries from the document — not from general knowledge
- Search the web when the user asks for sources

**You do not:**
- Speak directly to community contributors — Gemini handles intake
- Delete entries — ever
- Resolve contradictions unilaterally
- Write to \`context.md\` without human confirmation — no exceptions, no skipping
- Speak to Gemini or NotebookLM directly — everything goes through the Bridge Script
- Fill gaps in the document with general knowledge presented as community fact

---

# CONTEXT & STATE
Active Context Document:
"""
${contextMarkdown}
"""
${corpusContext}

Analyze the user request, evaluate against the Checkpoint Protocol, and propose/perform actions following the instruction-v3.0.2 protocol.`
    : `You are the Gateway Prompting Routing Agent. Identify correct coordination targets.`;

  const finalSystemInstruction = rawMode ? undefined : systemInstruction;

  // Update session state for agent to processing
  updateAgentState(agent, "processing");

  try {
    let resultText = "";

    if (ai) {
      // Direct call to Gemini 2.5 Flash as instructed in gemini_api skill
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userMessage,
        config: finalSystemInstruction ? { systemInstruction: finalSystemInstruction } : undefined
      });
      resultText = response.text || "";
    } else {
      if (rawMode) {
        resultText = `[RAW GEMINI MODEL OUTPUT] (Simulated without roles or system instructions)
This is a raw model response to your query: "${userMessage}". Since Raw Mode is enabled, no role constraints, protocol checks, or system instructions were applied to this response.`;
      } else {
        // Elegant, highly realistic fallback when API key is not yet set
        const isProposingEntry = userMessage.toLowerCase().includes("propose") || userMessage.toLowerCase().includes("entry") || userMessage.toLowerCase().includes("add");
      const sectionTag = agent === "Gemini" ? "Official Records" : "Community & Oral History";
      
      if (isProposingEntry) {
        resultText = `### Ala-Alab Agent Proposal [${agent}]
I have processed the user prompt grounded in the current context.

**PROPOSED ENTRY FOR SECTION:** ${sectionTag}
**Title:** Localized Flooding Event in Canumay East
**Date of observation:** ${new Date().toISOString().split("T")[0]}
**Source type:** ${agent === "Gemini" ? "OFFICIAL" : "ORAL_HISTORY"}
**Data flow direction:** ${agent === "Gemini" ? "Top-down" : "Bottom-up"}
**Contributor:** Community Volunteer via ${agent}
**Content:** ${userMessage}
**Significance:** Ecological impact and flood risk reconstruction.
**Linked entries:** Victoria Village Flood Level 1.2m

Would you like to stage this proposed entry in the Bridge Clipboard Transit? Click "Stage Entry" above to load it into the clipboard!`;
      } else {
        resultText = `### Analysis Report [${agent}]
Grounded in active context "${getSessionStatus().activeContext}".

${agent === "Gemini"
  ? `Based on systemic policy maps and flood mitigation plans:
1. The flood management policies require strict top-down zoning rules.
2. Canumay East serves as a critical low-lying drainage basin.
3. Recommended coordination: verify Barangay records against physical rain measurements.`
  : `Based on bottom-up community narratives and oral testimonies:
1. Long-time residents report water levels rising rapidly within 15 minutes of heavy rain.
2. Informal flood markers (such as marks on Victoria Village gateposts) suggest historic peaks.
3. Recommended action: archive this bottom-up story under the Oral History section.`
}

*Note: Set your GEMINI_API_KEY environment variable to activate live Gemini AI generation.*`;
      }
      }
    }

    updateAgentState(agent, "waiting");
    res.json({ text: resultText });
  } catch (err: any) {
    updateAgentState(agent, "idle");
    console.error("Gemini API generation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------
// VITE DEV SERVER / STATIC PRODUCTION SERVICE
// --------------------------------------------------------

const isProd = process.env.NODE_ENV === "production";

async function start() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} (isProd: ${isProd})`);
  });
}

start();
