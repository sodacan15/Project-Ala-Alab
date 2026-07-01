import React, { useState, useEffect } from "react";
import {
  Cpu,
  Send,
  User,
  Shield,
  FileCheck,
  Check,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Copy,
  Clipboard,
  Globe,
  CheckCheck,
  FileText,
  CheckCircle
} from "lucide-react";
import { AgentAccount, IndexEntry, SessionStatus } from "../types";
import { FlameEmblem, GitMeFantaIcon } from "./BrandAssets";

interface AgentsProps {
  operatorName: string;
  globalDockEnabled?: boolean;
  onToggleGlobalDock?: (enabled: boolean) => void;
}

export default function Agents({
  operatorName,
  globalDockEnabled = false,
  onToggleGlobalDock
}: AgentsProps) {
  const [activeTab, setActiveTab] = useState<"Gemini" | "Claude" | "NotebookLM" | "Safeguards">("Gemini");
  const [accounts, setAccounts] = useState<AgentAccount[]>([]);
  const [notebookFiles, setNotebookFiles] = useState<IndexEntry[]>([]);
  const [session, setSession] = useState<SessionStatus | null>(null);
  
  // Chat States
  const [geminiMessages, setGeminiMessages] = useState<{ role: "user" | "model"; text: string }[]>([
    { role: "model", text: "Ala-Alab Gemini Flash is online. Grounded in top-down master planning files, ecological records, and state frameworks. Ready to process systemic structural queries." }
  ]);
  const [claudeMessages, setClaudeMessages] = useState<{ role: "user" | "model"; text: string }[]>([
    { role: "model", text: "Ala-Alab Claude is online. Ready to synthesize bottom-up oral histories, raw community stories, resident notes, and localized hazard accounts." }
  ]);
  const [geminiInput, setGeminiInput] = useState("");
  const [claudeInput, setClaudeInput] = useState("");
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [rawMode, setRawMode] = useState(false);

  // Web Portal Dock States
  const [chatMode, setChatMode] = useState<Record<string, "api" | "web" | "nano">>({ Gemini: "api", Claude: "api" });
  
  // Synchronize from globalDockEnabled prop
  useEffect(() => {
    if (globalDockEnabled) {
      setChatMode(prev => ({
        ...prev,
        Gemini: "web",
        Claude: "web"
      }));
    } else {
      setChatMode(prev => {
        const next = { ...prev };
        if (next.Gemini === "web") next.Gemini = "api";
        if (next.Claude === "web") next.Claude = "api";
        return next;
      });
    }
  }, [globalDockEnabled]);

  const [pastedWebResponse, setPastedWebResponse] = useState("");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [contextMarkdown, setContextMarkdown] = useState("No active context loaded.");

  // Account inputs
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");

  const loadData = async () => {
    try {
      // 1. Load accounts
      const accRes = await fetch("/api/accounts");
      const accData = await accRes.json();
      setAccounts(accData);

      // 2. Load index entries and filter those marked "inNotebook"
      const indRes = await fetch("/api/indexer");
      const indData = await indRes.json();
      setNotebookFiles(indData.filter((e: IndexEntry) => e.inNotebook));

      // 3. Load active session status
      const sessRes = await fetch("/api/session/status");
      const sessData = await sessRes.json();
      setSession(sessData);

      // 4. Load current context markdown
      const ctxRes = await fetch("/api/contexts/current");
      const ctxData = await ctxRes.json();
      setContextMarkdown(ctxData.markdown || "No active context loaded.");
    } catch (err) {
      console.error("Error loading agent data:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleImportEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ agent: "Gemini" | "Claude"; text: string; query: string }>;
      if (!customEvent.detail) return;
      const { agent, text, query } = customEvent.detail;

      // Add user query if provided
      if (query && query.trim()) {
        if (agent === "Gemini") {
          setGeminiMessages(prev => [...prev, { role: "user", text: query }]);
          setGeminiInput("");
        } else {
          setClaudeMessages(prev => [...prev, { role: "user", text: query }]);
          setClaudeInput("");
        }
      }

      // Add model's response
      if (agent === "Gemini") {
        setGeminiMessages(prev => [...prev, { role: "model", text: text }]);
      } else {
        setClaudeMessages(prev => [...prev, { role: "model", text: text }]);
      }
    };

    window.addEventListener("import-agent-response", handleImportEvent);
    return () => {
      window.removeEventListener("import-agent-response", handleImportEvent);
    };
  }, []);

  const handleConnect = async (agentName: "Gemini" | "Claude" | "NotebookLM") => {
    if (!displayName || !email) {
      alert("Please fill in Display Name and Email.");
      return;
    }
    try {
      const res = await fetch(`/api/accounts/${agentName}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email })
      });
      if (res.ok) {
        setDisplayName("");
        setEmail("");
        loadData();
      }
    } catch (err) {
      console.error("Error connecting agent:", err);
    }
  };

  const handleDisconnect = async (agentName: "Gemini" | "Claude" | "NotebookLM") => {
    try {
      const res = await fetch(`/api/accounts/${agentName}/disconnect`, { method: "POST" });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error("Error disconnecting agent:", err);
    }
  };

  const handleSendMessage = async (agentName: "Gemini" | "Claude") => {
    const input = agentName === "Gemini" ? geminiInput : claudeInput;
    if (!input.trim()) return;

    // Add user message locally
    if (agentName === "Gemini") {
      setGeminiMessages(prev => [...prev, { role: "user", text: input }]);
      setGeminiInput("");
    } else {
      setClaudeMessages(prev => [...prev, { role: "user", text: input }]);
      setClaudeInput("");
    }

    setLoading(prev => ({ ...prev, [agentName]: true }));

    // 1. Handled by Gemini Nano client-side local model
    if (chatMode[agentName] === "nano") {
      try {
        const aiObj = (window as any).ai;
        if (!aiObj) {
          throw new Error("window.ai is not available in this browser. Please use Chrome Dev or Canary with required flags enabled.");
        }

        const capabilities = await (aiObj.languageModel || aiObj.assistant)?.capabilities();
        if (!capabilities || capabilities.available === "no") {
          throw new Error("Local Gemini Nano languageModel is not active or available in this browser. Please ensure the model is downloaded.");
        }

        // Setup role instructions unless in Raw Mode
        const systemPrompt = rawMode ? "" : (agentName === "Gemini"
          ? "You are Gemini Flash, the intake communicator agent for Ala-Alab. Be system-focused, analytical, and structured."
          : "You are Claude, the scribe agent for Ala-Alab. Warm, narrative-driven, and meticulous about checking protocols.");

        const corpusText = notebookFiles.length > 0
          ? `\nActive files:\n` + notebookFiles.map((file, idx) => `=== [FILE ${idx + 1}] ${file.filename} ===\n${file.content || "Empty content"}`).join("\n\n")
          : "";

        const promptPayload = `Active Context document (context.md):\n"""\n${contextMarkdown}\n"""\n${corpusText}\n\nUser Question:\n"${input}"`;

        const sessionObj = await (aiObj.languageModel || aiObj.assistant).create({
          systemPrompt: systemPrompt || undefined,
        });

        const responseText = await sessionObj.prompt(promptPayload);
        try {
          sessionObj.destroy(); // free up GPU / memory
        } catch (e) {
          // Ignore if destroy doesn't exist
        }

        if (agentName === "Gemini") {
          setGeminiMessages(prev => [...prev, { role: "model", text: responseText }]);
        } else {
          setClaudeMessages(prev => [...prev, { role: "model", text: responseText }]);
        }
      } catch (err: any) {
        console.error("Local Gemini Nano Error:", err);
        const fallbackMsg = `[LOCAL GEMINI NANO ERROR] ${err.message || "Execution failed."}
        
💡 HOW TO SETUP GEMINI NANO IN CHROME (M127+):
1. Navigate to: chrome://flags/#optimization-guide-on-device-model -> Set to "Enabled BypassPerfRequirement".
2. Navigate to: chrome://flags/#prompt-api-for-gemini-nano -> Set to "Enabled".
3. Relaunch your Chrome browser.
4. Navigate to: chrome://components -> Look for "Optimization Guide On Device Model" and click "Check for update" to ensure it's fully downloaded.`;
        if (agentName === "Gemini") {
          setGeminiMessages(prev => [...prev, { role: "model", text: fallbackMsg }]);
        } else {
          setClaudeMessages(prev => [...prev, { role: "model", text: fallbackMsg }]);
        }
      } finally {
        setLoading(prev => ({ ...prev, [agentName]: false }));
      }
      return;
    }

    // 2. Standard Server-side API Generation (fallback / default)
    try {
      // Fetch current context markdown
      const ctxRes = await fetch("/api/contexts/current");
      const ctxData = await ctxRes.json();
      const contextMarkdown = ctxData.markdown || "No active context loaded.";

      // Call Express Gemini/Claude simulation & generation API
      const response = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent: agentName,
          userMessage: input,
          contextMarkdown,
          notebookFiles,
          rawMode: rawMode
        })
      });

      const data = await response.json();
      if (response.ok) {
        if (agentName === "Gemini") {
          setGeminiMessages(prev => [...prev, { role: "model", text: data.text }]);
        } else {
          setClaudeMessages(prev => [...prev, { role: "model", text: data.text }]);
        }
      } else {
        const errMsg = data.error || "Generation error. Please check backend.";
        if (agentName === "Gemini") {
          setGeminiMessages(prev => [...prev, { role: "model", text: `[SYSTEM ERROR] ${errMsg}` }]);
        } else {
          setClaudeMessages(prev => [...prev, { role: "model", text: `[SYSTEM ERROR] ${errMsg}` }]);
        }
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || "Fetch failed.";
      if (agentName === "Gemini") {
        setGeminiMessages(prev => [...prev, { role: "model", text: `[SYSTEM ERROR] ${errMsg}` }]);
      } else {
        setClaudeMessages(prev => [...prev, { role: "model", text: `[SYSTEM ERROR] ${errMsg}` }]);
      }
    } finally {
      setLoading(prev => ({ ...prev, [agentName]: false }));
    }
  };

  const handleCopyPromptForWeb = () => {
    const input = activeTab === "Gemini" ? geminiInput : claudeInput;
    
    // Compile grounding files
    const corpusText = notebookFiles.length > 0
      ? `\nActive NotebookLM Grounding Corpus:\n` + notebookFiles.map((file, idx) => `=== [FILE ${idx + 1}] ${file.type === "LINK" ? (file as any).title : file.filename} ===\n${file.content || "Empty content."}`).join("\n\n")
      : "\nNo ground-files loaded in NotebookLM.";

    // Determine standard system instruction based on agent mode
    const systemInstruction = activeTab === "Gemini"
      ? `# GENERAL INSTRUCTIONS (instruction-v3.0.2)
# Ala-Alab — General Instructions
*Applies to: ALL AGENTS — Gemini Flash · Claude · NotebookLM*
*Read this first. Your agent-specific file is an extension of this — not a replacement.*

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
- Speak to Claude directly — everything goes through the Bridge Script`
      : `# GENERAL INSTRUCTIONS (instruction-v3.0.2)
# Ala-Alab — General Instructions
*Applies to: ALL AGENTS — Gemini Flash · Claude · NotebookLM*
*Read this first. Your agent-specific file is an extension of this — not a replacement.*

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

**You do not:**
- Speak directly to community contributors — Gemini handles intake
- Delete entries — ever
- Resolve contradictions unilaterally
- Write to \`context.md\` without human confirmation — no exceptions, no skipping`;

    const fullPrompt = rawMode 
      ? `=== USER CONTEXT & QUERY ===
User Message: "${input || "(Enter a query in the input bar below)"}"

(Raw mode enabled: bypass all agent instructions.)`
      : `${systemInstruction}

---

# ACTIVE ARCHIVE STATE (context.md)
Active Context Document:
"""
${contextMarkdown}
"""
${corpusText}

---

# USER CONTEXT & QUERY
User Message: "${input || "Propose a new flood record from Victoria Village"}"

Please evaluate and output your response following the instruction-v3.0.2 protocol. Wrap any proposed new entry block inside a clear "PROPOSED" section so that the human operator can review and stage it.`;

    navigator.clipboard.writeText(fullPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleImportWebResponse = (agentName: "Gemini" | "Claude") => {
    if (!pastedWebResponse.trim()) {
      alert("Please paste the response first!");
      return;
    }
    const input = agentName === "Gemini" ? geminiInput : claudeInput;
    
    // Add user message to log if there is pending query input
    if (input.trim()) {
      if (agentName === "Gemini") {
        setGeminiMessages(prev => [...prev, { role: "user", text: input }]);
        setGeminiInput("");
      } else {
        setClaudeMessages(prev => [...prev, { role: "user", text: input }]);
        setClaudeInput("");
      }
    }

    // Add model message
    if (agentName === "Gemini") {
      setGeminiMessages(prev => [...prev, { role: "model", text: pastedWebResponse }]);
    } else {
      setClaudeMessages(prev => [...prev, { role: "model", text: pastedWebResponse }]);
    }

    setPastedWebResponse("");
    alert("Response successfully imported! Scroll down in the operator dialogue chat stream to review it, and click 'STAGE THIS PROPOSAL' to push it directly into the clipboard bridge queue.");
  };

  const handleStageProposal = async (agentName: "Gemini" | "Claude", content: string) => {
    try {
      // Parse content to simulate extracting structured data if possible
      const lines = content.split("\n");
      let extractedTitle = `${agentName} Proposed Entry`;
      let extractedSection = agentName === "Gemini" ? "Official Records" : "Community & Oral History";
      let extractedTag = agentName === "Gemini" ? "OFFICIAL" : "ORAL_HISTORY";
      let cleanContent = content;

      // Simple markdown extraction heuristic
      for (const line of lines) {
        if (line.includes("**Title:**") || line.includes("####")) {
          extractedTitle = line.replace(/\*\*Title:\*\*/g, "").replace(/####/g, "").trim();
        }
        if (line.includes("Section:") || line.includes("**PROPOSED ENTRY FOR SECTION:**")) {
          extractedSection = line.replace(/\*\*PROPOSED ENTRY FOR SECTION:\*\*/g, "").replace(/Section:/g, "").trim();
        }
      }

      const res = await fetch("/api/bridge/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: agentName,
          to: "User",
          type: "proposed_entry",
          payload: {
            title: extractedTitle,
            section: extractedSection,
            content: cleanContent,
            contributor: `Agent ${agentName} (Ala-Alab Orchestration)`,
            significance: "Ecological / Local Community Memory Restoration",
            dateOfObservation: new Date().toISOString().split("T")[0]
          },
          source_tag: extractedTag,
          sensitive: content.toLowerCase().includes("confidential") || content.toLowerCase().includes("sensitive"),
          note: `Auto-staged from ${agentName} dialogue panel.`
        })
      });

      if (res.ok) {
        alert("Success! Message staged in the Bridge Transit Queue. Head to the 'Dashboard' to review and confirm entry!");
      }
    } catch (err) {
      console.error("Error staging proposal:", err);
    }
  };

  const getAgentAccount = (name: string) => accounts.find(a => a.agent === name);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* AGENTS SUB-TAB NAVIGATION */}
      <div className="flex border-b border-loam-300 gap-1 overflow-x-auto">
        {(["Gemini", "Claude", "NotebookLM", "Safeguards"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-xs font-mono uppercase tracking-wider font-semibold border-t-2 border-x transition-all duration-150 shrink-0 cursor-pointer ${
              activeTab === tab
                ? "bg-white border-t-rust-500 border-x-loam-300 text-clay-900 border-b-transparent relative z-10"
                : "border-transparent text-silt-500 hover:text-clay-900 hover:bg-sand-200/50"
            }`}
          >
            <span className="flex items-center gap-1.5 justify-center">
              {tab === "Gemini" && (
                <>
                  <FlameEmblem size={14} className="text-rust-500" />
                  Gemini Flash
                </>
              )}
              {tab === "Claude" && (
                <>
                  <GitMeFantaIcon size={18} className="text-rust-500 -mt-0.5" />
                  Claude Agent
                </>
              )}
              {tab === "NotebookLM" && (
                <>
                  <span>📚</span>
                  NotebookLM Grounding
                </>
              )}
              {tab === "Safeguards" && (
                <>
                  <span>🛡️</span>
                  Safeguards & Routing
                </>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* RENDER ACTIVE TAB */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT COLUMN: GUIDELINES & CONNECT STATE */}
        <div className="bg-white border border-loam-300 p-5 rounded-2xl shadow-sm space-y-5 lg:col-span-1">
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-silt-500 mb-2">
              Sync Status
            </h3>
            {getAgentAccount(activeTab === "Safeguards" ? "Gemini" : activeTab) && getAgentAccount(activeTab === "Safeguards" ? "Gemini" : activeTab)!.connected ? (
              <div className="bg-sage-600/10 border border-sage-600 text-sage-600 p-3 rounded-lg text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold uppercase font-mono">
                  <Check className="w-4 h-4" /> Connected
                </div>
                <div className="font-mono text-[10px] break-all">
                  Name: {getAgentAccount(activeTab === "Safeguards" ? "Gemini" : activeTab)!.displayName}<br />
                  Mail: {getAgentAccount(activeTab === "Safeguards" ? "Gemini" : activeTab)!.email}
                </div>
                <button
                  onClick={() => handleDisconnect(activeTab === "Safeguards" ? "Gemini" : activeTab as any)}
                  className="text-[10px] underline font-mono text-rust-500 block hover:text-rust-600 pt-1 cursor-pointer"
                >
                  Disconnect Profile
                </button>
              </div>
            ) : (
              <div className="bg-sand-100 border border-loam-300 p-3 rounded-lg text-xs space-y-3">
                <span className="text-silt-500 italic block font-sans">No profile synced for {activeTab}. Verify identity below:</span>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Display Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full p-1.5 bg-white border border-loam-300 rounded text-xs focus:outline-none"
                  />
                  <input
                    type="email"
                    placeholder="operator@valenzuela.gov"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-1.5 bg-white border border-loam-300 rounded text-xs focus:outline-none"
                  />
                  <button
                    onClick={() => handleConnect(activeTab === "Safeguards" ? "Gemini" : activeTab as any)}
                    className="w-full bg-rust-500 hover:bg-rust-600 text-white p-1.5 rounded text-xs font-mono uppercase cursor-pointer"
                  >
                    Sync Operator
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-loam-300 pt-4 space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-silt-500 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-ochre-600" />
              Routing Directives
            </h3>
            <ul className="text-xs font-sans text-silt-600 space-y-2 list-disc pl-4">
              {activeTab === "Gemini" && (
                <>
                  <li>Validate formal structural parameters of flooding entries.</li>
                  <li>Compare community claims with top-down planning maps.</li>
                  <li>Incorporate historical rain metrics and drainage scope.</li>
                </>
              )}
              {activeTab === "Claude" && (
                <>
                  <li>Prioritize bottom-up resident testimonies.</li>
                  <li>Document localized landmarks and specific elevations.</li>
                  <li>Maintain human-eccentric oral narratives.</li>
                </>
              )}
              {activeTab === "NotebookLM" && (
                <>
                  <li>Persistently grounds responses using selected files.</li>
                  <li>Locks context scope to prevent hallucinated data.</li>
                  <li>Generates reliable markdown wrapping layers.</li>
                </>
              )}
              {activeTab === "Safeguards" && (
                <>
                  <li>Prevent direct raw edits of context files.</li>
                  <li>Reject entries failing standard tag validations.</li>
                  <li>Mitigate sensitive disclosures with human confirmation.</li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* RIGHT COLUMN: MAIN PANEL CHAT OR WORKFLOWS */}
        <div className="lg:col-span-3 space-y-4">
          {/* CHAT TAB (GEMINI / CLAUDE) */}
          {(activeTab === "Gemini" || activeTab === "Claude") && (
            <div className="bg-white border border-loam-300 rounded-2xl shadow-sm h-[650px] flex flex-col justify-between overflow-hidden">
              {/* Chat Title bar */}
              <div className="bg-sand-200 px-5 py-3 border-b border-loam-300 flex flex-wrap gap-3 justify-between items-center">
                <span className="font-display font-bold text-clay-900 text-sm flex items-center gap-1.5">
                  <Cpu className="text-rust-500 w-4 h-4" />
                  Operator dialogue with {activeTab}
                </span>

                <div className="flex items-center gap-3">
                  {/* Segmented Control for Chat Mode selection */}
                  <div className="bg-sand-100 p-0.5 rounded-lg border border-loam-300 flex gap-0.5 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => {
                        setChatMode(prev => ({ ...prev, [activeTab]: "api" }));
                        if (onToggleGlobalDock) onToggleGlobalDock(false);
                      }}
                      className={`px-2 py-1 rounded-md transition-colors font-semibold cursor-pointer ${
                        chatMode[activeTab] === "api"
                          ? "bg-rust-500 text-white shadow-xs font-bold"
                          : "text-silt-600 hover:text-clay-900"
                      }`}
                    >
                      🔌 Live API
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setChatMode(prev => ({ ...prev, [activeTab]: "nano" }));
                        if (onToggleGlobalDock) onToggleGlobalDock(false);
                      }}
                      className={`px-2 py-1 rounded-md transition-colors font-semibold cursor-pointer flex items-center gap-1 ${
                        chatMode[activeTab] === "nano"
                          ? "bg-rust-500 text-white shadow-xs font-bold"
                          : "text-silt-600 hover:text-clay-900"
                      }`}
                    >
                      🧠 Gemini Nano
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setChatMode(prev => ({ ...prev, [activeTab]: "web" }));
                        if (onToggleGlobalDock) onToggleGlobalDock(true);
                      }}
                      className={`px-2 py-1 rounded-md transition-colors font-semibold cursor-pointer flex items-center gap-1 ${
                        chatMode[activeTab] === "web"
                          ? "bg-rust-500 text-white shadow-xs font-bold"
                          : "text-silt-600 hover:text-clay-900"
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      🌐 Web Dock
                    </button>
                  </div>

                  <span className="font-mono text-[10px] text-silt-600 bg-sand-100 px-2 py-1 rounded border border-loam-300 shrink-0">
                    Active Grounding: {notebookFiles.length} file(s)
                  </span>
                </div>
              </div>

              {chatMode[activeTab] !== "web" ? (
                <>
                  {/* If in nano mode, show setup status and informative banner */}
                  {chatMode[activeTab] === "nano" && (
                    <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 text-[11px] text-amber-800 flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0">
                      <span className="flex items-center gap-1.5 font-sans">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          <strong>On-Device Local AI:</strong> Running directly inside Chrome using Gemini Nano. Perfect for fully offline/private operations.
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5 font-mono text-[10px] bg-amber-200/50 text-amber-900 px-2 py-0.5 rounded font-bold self-start md:self-auto shrink-0">
                        {typeof window !== "undefined" && (window as any).ai ? "🟢 Chrome Prompt API Active" : "⚠️ Web AI Flags Required"}
                      </span>
                    </div>
                  )}

                  {/* Chat messages stream */}
                  <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-sand-50/30">
                    {(activeTab === "Gemini" ? geminiMessages : claudeMessages).map((msg, i) => (
                      <div key={i} className={`flex gap-3 max-w-3xl ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}>
                        {/* Icon */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                          msg.role === "user" ? "bg-rust-500 border-rust-600 text-white" : "bg-clay-800 border-clay-900 text-white"
                        }`}>
                          {msg.role === "user" ? (
                            <User className="w-4 h-4" />
                          ) : activeTab === "Gemini" ? (
                            <FlameEmblem size={20} className="text-white" />
                          ) : activeTab === "Claude" ? (
                            <GitMeFantaIcon size={24} className="text-white -mt-0.5" />
                          ) : (
                            <FlameEmblem size={20} className="text-white" />
                          )}
                        </div>

                        {/* Speech box */}
                        <div className="space-y-2">
                          <div className={`p-4 rounded-2xl text-xs leading-relaxed border ${
                            msg.role === "user"
                              ? "bg-rust-500 text-white border-rust-600 rounded-tr-none"
                              : "bg-white text-clay-900 border-loam-300 rounded-tl-none shadow-sm"
                          }`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                          </div>

                          {/* Stage Proposal interaction button for Agent outputs */}
                          {msg.role === "model" && (i > 0 || msg.text.includes("PROPOSED")) && (
                            <button
                              onClick={() => handleStageProposal(activeTab, msg.text)}
                              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono text-rust-500 hover:text-rust-600 border border-loam-300 bg-white rounded-lg transition-colors cursor-pointer"
                            >
                              <FlameEmblem size={14} className="text-rust-500 shrink-0" />
                              STAGE THIS PROPOSAL
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {loading[activeTab] && (
                      <div className="flex gap-3 items-center text-xs font-mono text-silt-500 bg-white p-3 border border-loam-300 rounded-xl w-48">
                        <span className="pulse-glow">Generating analysis...</span>
                      </div>
                    )}
                  </div>

                  {/* Chat Input Bar */}
                  <div className="p-4 bg-sand-100 border-t border-loam-300 space-y-2">
                    <div className="flex items-center gap-1.5 px-1">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-[10px] font-mono text-silt-600 select-none">
                        <input
                          type="checkbox"
                          checked={rawMode}
                          onChange={(e) => setRawMode(e.target.checked)}
                          className="rounded border-loam-300 text-rust-500 focus:ring-rust-500 w-3 h-3 cursor-pointer"
                        />
                        Raw Mode (Bypass Agent Role / System Instructions)
                      </label>
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage(activeTab);
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={activeTab === "Gemini" ? geminiInput : claudeInput}
                        onChange={(e) => activeTab === "Gemini" ? setGeminiInput(e.target.value) : setClaudeInput(e.target.value)}
                        placeholder={`Query ${activeTab}... e.g. "Propose a new flood record from Victoria Village"`}
                        disabled={loading[activeTab]}
                        className="flex-1 p-2.5 text-xs bg-white border border-loam-300 rounded-lg text-clay-900 placeholder-silt-500 focus:outline-none focus:ring-1 focus:ring-rust-500"
                      />
                      <button
                        type="submit"
                        disabled={loading[activeTab]}
                        className="bg-rust-500 hover:bg-rust-600 text-white px-4 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                /* WEB MODE WORKFLOW PROTOCOL */
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-sand-50/40">
                  <div className="max-w-lg p-6 bg-white border border-loam-300 rounded-2xl shadow-sm space-y-5">
                    <div className="w-12 h-12 rounded-full bg-rust-500/10 text-rust-500 flex items-center justify-center mx-auto">
                      <Globe className="w-6 h-6" />
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-display font-bold text-clay-900 text-base uppercase tracking-tight">
                        Air-Gapped Scribe Protocol (Web Portal)
                      </h3>
                      <p className="text-xs text-silt-600 leading-relaxed font-sans">
                        You are running in <strong>Web Portal Scribe Mode</strong>. Because modern AI websites (Gemini, Claude) block direct in-app embedding via <code>X-Frame-Options</code>, we use the air-gapped clipboard routing protocol.
                      </p>
                    </div>

                    <div className="bg-sand-100 border border-loam-300 rounded-xl p-4 text-left space-y-3">
                      <h4 className="text-[11px] font-mono font-bold text-clay-900 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-rust-500" />
                        How to proceed:
                      </h4>
                      <ol className="text-[11px] text-silt-700 space-y-2 list-decimal pl-4 font-sans leading-relaxed">
                        <li>
                          Use the persistent <strong>Grounded Transit Bridge</strong> sidebar on the right side of your screen.
                        </li>
                        <li>
                          Type your query in the <strong>Write Manual Query</strong> input.
                        </li>
                        <li>
                          Click <strong>COPY GROUNDED SYSTEM PROMPT</strong> to copy the fully compiled system role instructions + active archive (<code>context.md</code>) + all grounded source files.
                        </li>
                        <li>
                          Launch the official portal by clicking the link below, paste your prompt, and let the model generate scribe entries.
                        </li>
                        <li>
                          Copy the model's response, paste it into the <strong>Web Portal Response Importer</strong> on the right sidebar, and click <strong>IMPORT TO LOG</strong>.
                        </li>
                      </ol>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
                      <a
                        href="https://gemini.google.com"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 bg-rust-500 hover:bg-rust-600 text-white font-mono text-xs px-4 py-2 rounded-lg transition-colors font-bold cursor-pointer"
                      >
                        Launch Gemini Flash
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <a
                        href="https://claude.ai"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 border border-loam-300 bg-white hover:bg-sand-100 text-clay-800 font-mono text-xs px-4 py-2 rounded-lg transition-colors font-bold cursor-pointer"
                      >
                        Launch Claude AI
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RETRIEVAL TAB (NOTEBOOKLM GROUNDING) */}
          {activeTab === "NotebookLM" && (
            <div className="bg-white border border-loam-300 p-6 rounded-2xl shadow-sm space-y-4">
              <div className="border-b border-sand-200 pb-2">
                <h3 className="font-display font-semibold text-clay-900 text-sm flex items-center gap-1.5">
                  <FileCheck className="text-sage-600 w-5 h-5" />
                  NotebookLM Corpus Grounding Status
                </h3>
                <p className="text-xs text-silt-600 mt-1">
                  List of uploaded index files currently marked as active grounding sources. Only marked files feed into agent contexts.
                </p>
              </div>

              {notebookFiles.length === 0 ? (
                <div className="text-center py-10 bg-sand-50 border border-dashed border-loam-300 rounded-xl">
                  <p className="text-xs text-silt-500 italic">No files loaded in NotebookLM grounding.</p>
                  <p className="text-[10px] text-silt-500 mt-1">
                    Head to the "Indexer" tab and toggle "Add to Notebook" to ground agent responses!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notebookFiles.map(file => (
                    <div key={file.id} className="flex justify-between items-center p-3 border border-loam-300 rounded-xl bg-sand-50/50">
                      <div className="space-y-0.5">
                        <span className="text-xs font-mono font-semibold text-clay-900 block">
                          {file.type === "LINK" ? (file as any).title : file.filename}
                        </span>
                        <span className="text-[10px] font-mono text-silt-500 block">
                          Type: {file.type} | Added By: {file.addedBy}
                        </span>
                      </div>
                      <span className="bg-sage-600/10 text-sage-600 border border-sage-600 text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> GROUNDED
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SAFEGUARDS TAB */}
          {activeTab === "Safeguards" && (
            <div className="bg-white border border-loam-300 p-6 rounded-2xl shadow-sm space-y-5">
              <div className="border-b border-sand-200 pb-2">
                <h3 className="font-display font-semibold text-clay-900 text-sm flex items-center gap-1.5">
                  <Shield className="text-ochre-600 w-5 h-5" />
                  Archival Safeguards & Routing Protocols
                </h3>
                <p className="text-xs text-silt-600 mt-1">
                  System locks enforcing correct human bridge execution, safeguarding private community testimonies and formal government entries.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-loam-300 p-4 rounded-xl space-y-2 bg-sand-50/40">
                  <span className="text-xs font-mono font-semibold text-ochre-600 block uppercase">
                    🔒 Write Lock Safeguard
                  </span>
                  <p className="text-[11px] text-silt-600 leading-relaxed">
                    Direct writing to any active `context.md` is strictly blocked for API models. Models must route structured data via `proposed_entry` transactions inside the human clipboard bridge for operator evaluation.
                  </p>
                </div>

                <div className="border border-loam-300 p-4 rounded-xl space-y-2 bg-sand-50/40">
                  <span className="text-xs font-mono font-semibold text-sage-600 block uppercase">
                    🛡️ Content Sanitization Gate
                  </span>
                  <p className="text-[11px] text-silt-600 leading-relaxed">
                    All staged clipboard blocks have automated validation matching `from`, `to`, and `type` fields. Rejections are logged directly into the transaction table and fail-safe block transit.
                  </p>
                </div>
              </div>

              {/* DEMO SAFEGUARD INTERACTIVE TRIGGER */}
              <div className="border border-ochre-600/40 bg-ochre-600/5 p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-mono font-semibold text-ochre-600 uppercase flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Test Safeguard Violation (Simulate Malicious Routing)
                </h4>
                <p className="text-xs text-silt-600">
                  Simulate an automated script attempting to pass a message without the mandatory sender/recipient headers. Check the error log feedback:
                </p>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/bridge/send", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          from: "InvalidBot",
                          to: "User",
                          type: "illegal_push",
                          payload: { content: "Direct memory bypass attempt" }
                        })
                      });
                      const data = await res.json();
                      if (!res.ok) {
                        alert(`Safeguard trigger blocked attempt!\nError log: ${data.error}`);
                        loadData();
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="bg-ochre-600 text-white text-xs font-mono px-3 py-1.5 rounded-lg hover:bg-ochre-600/95 flex items-center gap-1.5 cursor-pointer"
                >
                  Trigger Invalid Send
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
