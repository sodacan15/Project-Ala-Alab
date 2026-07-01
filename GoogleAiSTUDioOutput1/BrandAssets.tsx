import React, { useState, useEffect } from "react";
import {
  Activity,
  Play,
  XCircle,
  Copy,
  Check,
  X,
  History,
  Trash2,
  Clipboard,
  Zap,
  ArrowRight,
  RefreshCw,
  FolderOpen
} from "lucide-react";
import { TransitMessage, SessionStatus, ClipboardBuffer } from "../types";

interface DashboardProps {
  operatorName: string;
  onNavigateToContexts: () => void;
}

export default function Dashboard({ operatorName, onNavigateToContexts }: DashboardProps) {
  const [session, setSession] = useState<SessionStatus | null>(null);
  const [transit, setTransit] = useState<TransitMessage[]>([]);
  const [history, setHistory] = useState<TransitMessage[]>([]);
  const [clipboard, setClipboard] = useState<ClipboardBuffer | null>(null);
  const [selectedContext, setSelectedContext] = useState<string>("canumay-east.md");
  const [availableContexts, setAvailableContexts] = useState<{ filename: string; name: string }[]>([]);

  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [showRejectInput, setShowRejectInput] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load all dashboard states
  const loadData = async () => {
    try {
      // 1. Fetch Session Status
      const sessRes = await fetch("/api/session/status");
      const sessData = await sessRes.json();
      setSession(sessData);

      // 2. Fetch Transit messages
      const transRes = await fetch("/api/bridge/transit");
      const transData = await transRes.json();
      setTransit(transData);

      // 3. Fetch Full History log
      const histRes = await fetch("/api/bridge/log");
      const histData = await histRes.json();
      setHistory(histData.slice().reverse()); // Show newest first

      // 4. Fetch Clipboard Buffer
      const clipRes = await fetch("/api/clipboard/current");
      const clipData = await clipRes.json();
      setClipboard(clipData);

      // 5. Fetch contexts
      const ctxRes = await fetch("/api/contexts");
      const ctxData = await ctxRes.json();
      setAvailableContexts(ctxData);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    }
  };

  useEffect(() => {
    loadData();
    // Poll for updates every 3 seconds to reflect agent transactions immediately
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStartSession = async () => {
    try {
      const res = await fetch("/api/session/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contextFilename: selectedContext })
      });
      const data = await res.json();
      setSession(data);
      loadData();
    } catch (err) {
      console.error("Failed to start session:", err);
    }
  };

  const handleEndSession = async () => {
    if (!window.confirm("Are you sure you want to trigger the Scribe Package & Reset sequence? This will automatically compile and download your full Gemini Scribe session log for Claude, save the session history, and reset the active chat log.")) {
      return;
    }
    try {
      // 1. Force automatic download of the compiled scribe session package
      const link = document.createElement("a");
      link.href = "/api/session/package/download";
      link.setAttribute("download", "scribe-session-package.md");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 2. Clear current active history in the backend
      await fetch("/api/session/current", { method: "DELETE" });
      
      // 3. Dispatch an update event to components (e.g. the sidebar)
      window.dispatchEvent(new CustomEvent("clipboard-updated"));
      window.dispatchEvent(new CustomEvent("corpus-updated"));
      
      loadData();
    } catch (err) {
      console.error("Failed to end session:", err);
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      const res = await fetch(`/api/bridge/confirm/${id}`, { method: "POST" });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error("Error confirming message:", err);
    }
  };

  const handlePurge = async (id: string) => {
    const reason = rejectReason[id] || "Rejected by human bridge operator";
    try {
      const res = await fetch(`/api/bridge/purge/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        // Clear state
        setRejectReason(prev => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
        setShowRejectInput(prev => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
        loadData();
      }
    } catch (err) {
      console.error("Error purging message:", err);
    }
  };

  const handleCopyToClipboard = async (messageId: string) => {
    try {
      const res = await fetch("/api/clipboard/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId })
      });
      const data = await res.json();
      if (res.ok) {
        setClipboard(data);
        setCopiedId(messageId);
        setTimeout(() => setCopiedId(null), 2000);
        
        // Physically write to browser clipboard if API supported
        if (navigator.clipboard && data.formattedBlock) {
          navigator.clipboard.writeText(data.formattedBlock);
        }
      }
    } catch (err) {
      console.error("Error copying message:", err);
    }
  };

  const handleClearClipboard = async () => {
    try {
      await fetch("/api/clipboard/clear", { method: "DELETE" });
      setClipboard(null);
    } catch (err) {
      console.error("Failed to clear clipboard:", err);
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm("Clear full message transaction logs?")) return;
    try {
      await fetch("/api/bridge/log", { method: "DELETE" });
      loadData();
    } catch (err) {
      console.error("Failed to clear logs:", err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-sand-200 border border-loam-300 p-5 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-display font-bold text-clay-900 tracking-tight flex items-center gap-2">
            <Activity className="text-rust-500 w-6 h-6" />
            Human-in-the-Loop Bridge Console
          </h1>
          <p className="text-xs font-sans text-silt-600 mt-1">
            Active operator: <span className="font-mono text-rust-500 font-semibold">{operatorName}</span>. 
            You are the physically-carrying bridge linking Claude, Gemini, and NotebookLM.
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-sand-100 border border-loam-300 rounded-lg text-xs font-mono text-clay-800 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          FORCE SYNC
        </button>
      </div>

      {/* SESSION RUNTIME & CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RUNTIME WIDGET */}
        <div className="bg-white border border-loam-300 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-silt-500 mb-3 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-ochre-600" />
              Active Session Monitor
            </h2>
            {session && session.sessionId ? (
              <div className="space-y-3">
                <div className="flex justify-between text-xs border-b border-sand-200 pb-2">
                  <span className="text-silt-600 font-sans">Session ID</span>
                  <span className="font-mono text-clay-900 font-semibold">{session.sessionId}</span>
                </div>
                <div className="flex justify-between text-xs border-b border-sand-200 pb-2">
                  <span className="text-silt-600 font-sans">Active Context</span>
                  <span className="font-mono text-clay-900 flex items-center gap-1">
                    <FolderOpen className="w-3.5 h-3.5 text-ochre-600" />
                    {session.activeContext}
                  </span>
                </div>
                <div className="flex justify-between text-xs border-b border-sand-200 pb-2">
                  <span className="text-silt-600 font-sans">Uptime Start</span>
                  <span className="font-mono text-clay-900">{new Date(session.startTime!).toLocaleTimeString()}</span>
                </div>

                <div className="mt-4">
                  <span className="block text-xs font-mono uppercase tracking-wider text-silt-500 mb-2">Agent Sync States</span>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(session.agentStates).map(([agent, state]) => (
                      <div key={agent} className="bg-sand-100 border border-loam-300 p-2 rounded-lg text-center">
                        <span className="block text-[10px] font-mono text-silt-600">{agent}</span>
                        <span className={`inline-block text-[10px] font-mono font-bold mt-1 px-1.5 py-0.5 rounded uppercase ${
                          state === "idle" ? "bg-sand-200 text-silt-500" :
                          state === "processing" ? "bg-ochre-600/10 text-ochre-600 pulse-glow" :
                          "bg-sage-600/10 text-sage-600"
                        }`}>
                          {state}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-xs text-silt-500 italic">No active session. Configure context below to load.</p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-loam-300">
            {session && session.sessionId ? (
              <button
                onClick={handleEndSession}
                className="w-full bg-ochre-600 hover:bg-ochre-600/90 text-white py-2 px-4 rounded-lg text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                Trigger Pre-Reset Sequence
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-mono text-silt-600 uppercase mb-1">Target Context File</label>
                  <select
                    value={selectedContext}
                    onChange={(e) => setSelectedContext(e.target.value)}
                    className="w-full p-2 text-xs bg-sand-100 border border-loam-300 rounded-lg text-clay-900 focus:outline-none focus:ring-1 focus:ring-rust-500"
                  >
                    {availableContexts.map(c => (
                      <option key={c.filename} value={c.filename}>{c.name} ({c.filename})</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleStartSession}
                  className="w-full bg-sage-600 hover:bg-sage-600/90 text-white py-2 px-4 rounded-lg text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  Initialize Fresh Session
                </button>
              </div>
            )}
          </div>
        </div>

        {/* IN-APP CLIPBOARD CONTAINER */}
        <div className="lg:col-span-2 bg-white border border-loam-300 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-silt-500 mb-3 flex items-center gap-1.5">
              <Clipboard className="w-4 h-4 text-rust-500" />
              Active Clipboard Buffer
            </h2>
            {clipboard ? (
              <div className="space-y-3 flex-1">
                <div className="flex justify-between items-center bg-sand-100 px-3 py-1.5 border border-loam-300 rounded-lg text-xs font-mono">
                  <span className="text-silt-600">Type: <span className="text-rust-500 font-semibold uppercase">{clipboard.type}</span></span>
                  <span className="text-silt-500 text-[10px]">{new Date(clipboard.savedAt).toLocaleTimeString()}</span>
                </div>
                <div className="bg-sand-100 border border-loam-300 rounded-lg p-3 max-h-44 overflow-y-auto">
                  <pre className="text-xs font-mono text-clay-900 whitespace-pre-wrap leading-relaxed">
                    {clipboard.formattedBlock || clipboard.content}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-loam-300 rounded-xl bg-sand-50">
                <Clipboard className="w-8 h-8 text-loam-300 mx-auto mb-2" />
                <p className="text-xs text-silt-500 italic">Clipboard buffer is currently empty.</p>
                <p className="text-[10px] text-silt-500 mt-1 max-w-xs mx-auto">
                  Stage a message or perform a manual routing action to load data.
                </p>
              </div>
            )}
          </div>

          {clipboard && (
            <div className="mt-4 pt-3 border-t border-loam-300 flex justify-end gap-3">
              <button
                onClick={handleClearClipboard}
                className="px-3 py-1.5 border border-loam-300 text-silt-600 hover:text-clay-900 rounded-lg text-xs font-mono uppercase cursor-pointer"
              >
                Clear Buffer
              </button>
              <button
                onClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(clipboard.formattedBlock || clipboard.content);
                    alert("Copied raw clipboard data to device clipboard!");
                  }
                }}
                className="px-3 py-1.5 bg-rust-500 hover:bg-rust-600 text-white rounded-lg text-xs font-mono uppercase flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                COPY TO CLIPBOARD
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ACTIVE TRANSIT QUEUE */}
      <div className="bg-white border border-loam-300 p-5 rounded-2xl shadow-sm">
        <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-silt-500 mb-4 flex items-center gap-1.5 border-b border-sand-200 pb-2">
          <ArrowRight className="w-4 h-4 text-sage-600" />
          Active Transit Queue ({transit.length} pending)
        </h2>

        {transit.length === 0 ? (
          <div className="text-center py-10 bg-sand-50 rounded-xl border border-dashed border-loam-300">
            <p className="text-xs text-silt-500 italic">No messages staged. All paths clear.</p>
            <p className="text-[10px] text-silt-500 mt-1">
              Ask Gemini or Claude to propose updates to witness human bridging.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {transit.map((msg) => (
              <div key={msg.id} className="border border-loam-300 bg-sand-50 rounded-xl overflow-hidden shadow-sm">
                {/* Message Meta Bar */}
                <div className="bg-sand-200 px-4 py-2 flex flex-wrap justify-between items-center gap-2 border-b border-loam-300">
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="bg-rust-500 text-white font-semibold px-2 py-0.5 rounded">{msg.from}</span>
                    <span className="text-silt-500">→</span>
                    <span className="bg-clay-800 text-white font-semibold px-2 py-0.5 rounded">{msg.to}</span>
                    <span className="text-silt-600 ml-2 font-sans font-semibold">[{msg.type}]</span>
                  </div>
                  <div className="text-[10px] font-mono text-silt-500">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>

                {/* Content Block */}
                <div className="p-4 space-y-3">
                  <div className="bg-white border border-loam-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <pre className="text-xs font-mono text-clay-900 whitespace-pre-wrap font-sans">{msg.payload.content}</pre>
                  </div>

                  {/* Extra Metadata Fields */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] font-mono text-silt-600 bg-sand-100 p-2.5 rounded-lg border border-loam-300/60">
                    <div>
                      <span className="block text-silt-500 uppercase">Source Tag</span>
                      <span className="font-semibold text-clay-900">{msg.source_tag || "N/A"}</span>
                    </div>
                    <div>
                      <span className="block text-silt-500 uppercase">Sensitive Data</span>
                      <span className={`font-semibold ${msg.sensitive ? "text-ochre-600" : "text-sage-600"}`}>
                        {msg.sensitive ? "YES" : "NO"}
                      </span>
                    </div>
                    {msg.payload.section && (
                      <div>
                        <span className="block text-silt-500 uppercase">Proposed Section</span>
                        <span className="font-semibold text-clay-900 truncate block">{msg.payload.section}</span>
                      </div>
                    )}
                    {msg.note && (
                      <div className="col-span-full md:col-span-1">
                        <span className="block text-silt-500 uppercase">Operator Note</span>
                        <span className="italic block truncate text-clay-900">{msg.note}</span>
                      </div>
                    )}
                  </div>

                  {/* Operator Interactions */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pt-2">
                    <div className="flex gap-2 w-full md:w-auto">
                      <button
                        onClick={() => handleCopyToClipboard(msg.id)}
                        className={`flex-1 md:flex-none px-3 py-1.5 border border-loam-300 rounded-lg text-xs font-mono uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          copiedId === msg.id ? "bg-sage-600 text-white" : "bg-white text-clay-800 hover:bg-sand-100"
                        }`}
                      >
                        {copiedId === msg.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-rust-500" />}
                        {copiedId === msg.id ? "STAGED!" : "Stage/Copy Entry"}
                      </button>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto justify-end">
                      {showRejectInput[msg.id] ? (
                        <div className="flex gap-2 w-full md:w-auto">
                          <input
                            type="text"
                            placeholder="Reason for rejection..."
                            value={rejectReason[msg.id] || ""}
                            onChange={(e) => setRejectReason({ ...rejectReason, [msg.id]: e.target.value })}
                            className="p-1.5 text-xs bg-white border border-loam-300 rounded-lg focus:outline-none w-44"
                          />
                          <button
                            onClick={() => handlePurge(msg.id)}
                            className="bg-ochre-600 text-white px-3 py-1.5 rounded-lg text-xs font-mono uppercase cursor-pointer"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => setShowRejectInput({ ...showRejectInput, [msg.id]: false })}
                            className="bg-sand-200 text-clay-900 p-1.5 rounded-lg text-xs cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setShowRejectInput({ ...showRejectInput, [msg.id]: true })}
                            className="px-3 py-1.5 border border-ochre-600 text-ochre-600 hover:bg-ochre-600/10 rounded-lg text-xs font-mono uppercase cursor-pointer"
                          >
                            Purge / Reject
                          </button>
                          <button
                            onClick={() => handleConfirm(msg.id)}
                            className="px-4 py-1.5 bg-sage-600 hover:bg-sage-600/90 text-white rounded-lg text-xs font-mono uppercase flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            Confirm Entry
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* HISTORIC TRANSACTION LOGS */}
      <div className="bg-white border border-loam-300 p-5 rounded-2xl shadow-sm">
        <div className="flex justify-between items-center border-b border-sand-200 pb-3 mb-4">
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-silt-500 flex items-center gap-1.5">
            <History className="w-4 h-4 text-clay-800" />
            Historic Exchange Log
          </h2>
          {history.length > 0 && (
            <button
              onClick={handleClearLogs}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-ochre-600 hover:text-ochre-600/80 border border-loam-300 rounded-md bg-white cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              CLEAR LOGS
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-silt-500 italic">No historical entries available.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-loam-300 text-silt-500 font-mono uppercase tracking-wider bg-sand-100">
                  <th className="p-2.5">ID</th>
                  <th className="p-2.5">Route</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5">Payload Content Snippet</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200 font-mono">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-sand-50 transition-colors">
                    <td className="p-2.5 text-silt-500 font-mono">{h.id.slice(0, 10)}</td>
                    <td className="p-2.5">
                      <span className="font-semibold text-clay-900">{h.from}</span>
                      <span className="text-silt-500 mx-1">→</span>
                      <span className="font-semibold text-clay-900">{h.to}</span>
                    </td>
                    <td className="p-2.5 font-semibold text-rust-500">{h.type}</td>
                    <td className="p-2.5 text-clay-900 max-w-xs truncate font-sans">
                      {h.payload.content}
                    </td>
                    <td className="p-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        h.status === "confirmed" ? "bg-sage-600/10 text-sage-600" :
                        h.status === "purged" ? "bg-ochre-600/10 text-ochre-600" :
                        "bg-ochre-600/10 text-ochre-600"
                      }`}>
                        {h.status}
                      </span>
                      {h.errorReason && (
                        <span className="block text-[10px] text-ochre-600 italic mt-1 truncate max-w-xs">
                          Reason: {h.errorReason}
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-silt-500">{new Date(h.timestamp).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
