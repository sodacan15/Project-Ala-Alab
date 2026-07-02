import React from "react";
import { 
  Flame, MessageSquare, Layers, Shield, AlertTriangle, Check, HelpCircle, 
  CheckCircle2, Database, Clipboard, RefreshCw, Plus 
} from "lucide-react";

interface BarangayContext {
  id: string;
  name: string;
  contextMarkdown: string;
  errataLog: Array<{
    id: string;
    officialClaim: string;
    groundTruth: string;
    source: string;
    status: 'active' | 'resolved';
  }>;
}

interface AgentsUnifiedWorkspaceProps {
  currentResearchContext: BarangayContext;
  researchContexts?: BarangayContext[];
  setSelectedBarangayId?: (id: string) => void;
  localFiles: any[];
  workspaceViewMode: 'chat' | 'panels';
  setWorkspaceViewMode: (mode: 'chat' | 'panels') => void;
  rawIntakeInput: string;
  setRawIntakeInput: (val: string) => void;
  stage1Result: string | null;
  isDenoisingStage1: boolean;
  handleStage1Denoise: (overrideText?: string) => Promise<any>;
  archivistSynthesis: string | null;
  isQueryingArchivist: boolean;
  handleQueryArchivist: (overrideSummary?: string | null) => Promise<any>;
  stage2Result: any;
  isDenoisingStage2: boolean;
  handleStage2CrossReference: (overrideSummary?: string | null, overrideSynth?: string | null) => Promise<any>;
  handleCommitCheckpoint: () => void;
  handlePurgeTransit: () => void;
  roundtableMessages: any[];
  isRoundtableProcessing: boolean;
  roundtableInput: string;
  setRoundtableInput: (val: string) => void;
  handleSendRoundtableMessage: (overrideText?: string) => void;
  auditQueue: any[];
  setAuditQueue: (val: any[]) => void;
  activeQueueId: string;
  setActiveQueueId: (val: string) => void;
  handleRunQueueItem: (item: any) => Promise<void>;
  auditMode: 'queue' | 'chatbot';
  setAuditMode: (mode: 'queue' | 'chatbot') => void;
  auditChatResponse: string | null;
  isAuditChatLoading: boolean;
  auditChatQuery: string;
  setAuditChatQuery: (val: string) => void;
  handleTriggerAuditChat: () => void;
  setShowQuickAddModal: (val: boolean) => void;
  setStage1Result?: (val: string | null) => void;
  setArchivistSynthesis?: (val: string | null) => void;
  setStage2Result?: (val: any | null) => void;
  handleSelectQueueItem?: (item: any) => void;
  handleQueueAndStartNew?: () => void;
  handleClearQueue?: () => void;

  
  // Extra states we had in App.tsx
  tokensSaved?: number;
  cacheHits?: number;

  // Multi-agent injection instructions (from Settings)
  communicatorInjection?: string;
  archivistInjection?: string;
  scribeInjection?: string;
}

export const AgentsUnifiedWorkspace: React.FC<AgentsUnifiedWorkspaceProps> = ({
  currentResearchContext,
  researchContexts,
  setSelectedBarangayId,
  localFiles,
  workspaceViewMode,
  setWorkspaceViewMode,
  rawIntakeInput,
  setRawIntakeInput,
  stage1Result,
  isDenoisingStage1,
  handleStage1Denoise,
  archivistSynthesis,
  isQueryingArchivist,
  handleQueryArchivist,
  stage2Result,
  isDenoisingStage2,
  handleStage2CrossReference,
  handleCommitCheckpoint,
  handlePurgeTransit,
  roundtableMessages,
  isRoundtableProcessing,
  roundtableInput,
  setRoundtableInput,
  handleSendRoundtableMessage,
  auditQueue,
  setAuditQueue,
  activeQueueId,
  setActiveQueueId,
  handleRunQueueItem,
  auditMode,
  setAuditMode,
  auditChatResponse,
  isAuditChatLoading,
  auditChatQuery,
  setAuditChatQuery,
  handleTriggerAuditChat,
  setShowQuickAddModal,
  setStage1Result,
  setArchivistSynthesis,
  setStage2Result,
  handleSelectQueueItem,
  handleQueueAndStartNew,
  handleClearQueue,
  tokensSaved = 42,
  cacheHits = 8,
  communicatorInjection = "",
  archivistInjection = "",
  scribeInjection = ""
}) => {
  const parseMarkdownHeadings = (content: string) => {
    return content.split("\n")
      .filter(line => line.trim().startsWith("#"))
      .map(line => {
        const level = line.match(/^#+/)?.[0].length || 1;
        const text = line.replace(/^#+\s*/, "").trim();
        return { level, text };
      });
  };

  const [localShowQuickAdd, setLocalShowQuickAdd] = React.useState(false);
  const [qaTitle, setQaTitle] = React.useState("");
  const [qaText, setQaText] = React.useState("");
  const [qaCategory, setQaCategory] = React.useState("Oral Testimony");
  const [qaContributor, setQaContributor] = React.useState("");
  return (
    <div className="flex flex-col gap-6" id="agents-unified-workspace">
      
      {/* TOP BADGE/BAR: CONTEXT STATUS */}
      <div className="bg-[#f0e6cf] border-2 border-[#3c2921]/30 p-4 rounded-sm shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-terracotta text-white p-2 rounded-full">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold text-[#251611] uppercase tracking-wider">
                &gt; CONTEXT REGISTRY METADATA
              </h3>
              <p className="text-[10px] text-[#7c6356] font-medium">
                Active Research Context: <strong className="text-terracotta">{currentResearchContext.name}</strong> • {localFiles.length} Records Mapped • {currentResearchContext.errataLog.length} Errata Rules
              </p>
            </div>
          </div>
          {researchContexts && setSelectedBarangayId && (
            <div className="flex items-center gap-2 border-l-0 sm:border-l border-[#3c2921]/25 sm:pl-4">
              <span className="text-[10px] font-bold text-[#7c6356] uppercase tracking-tight">Active Context:</span>
              <select
                value={currentResearchContext.id}
                onChange={(e) => setSelectedBarangayId(e.target.value)}
                className="bg-[#dfd4bd]/50 hover:bg-[#dfd4bd] border border-[#3c2921]/20 font-mono text-[10px] px-2 py-0.5 focus:outline-none text-[#251611] font-bold uppercase transition-all rounded-sm cursor-pointer"
              >
                {researchContexts.map(b => (
                  <option key={b.id} value={b.id}>{b.name.toUpperCase()}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-wider font-bold text-terracotta/70">METHOD:</span>
          <div className="flex bg-[#dfd4bd] border-2 border-[#3c2921]/20 p-0.5 rounded-sm">
            <button
              onClick={() => setWorkspaceViewMode('panels')}
              className={`px-3 py-1 font-mono font-bold transition-all uppercase tracking-tight text-[10px] rounded-sm ${
                workspaceViewMode === 'panels'
                  ? 'bg-terracotta text-white'
                  : 'text-[#3c2921]/70 hover:bg-[#cfc2a8]'
              }`}
            >
              🗂️ Bento Grid
            </button>
            <button
              onClick={() => setWorkspaceViewMode('chat')}
              className={`px-3 py-1 font-mono font-bold transition-all uppercase tracking-tight text-[10px] rounded-sm ${
                workspaceViewMode === 'chat'
                  ? 'bg-terracotta text-white'
                  : 'text-[#3c2921]/70 hover:bg-[#cfc2a8]'
              }`}
            >
              🗣️ Roundtable Chat
            </button>
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: THE AGENTS */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          {workspaceViewMode === 'panels' ? (
            /* --- 3-AGENT BENTO GRID (SCHEMATIC 1) --- */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* 1. COMMUNICATOR BOX (Top Left) */}
              <div className="md:col-span-6 bg-[#e9e0cb] border-2 border-[#3c2921]/30 p-5 rounded-sm shadow-sm flex flex-col justify-between min-h-[380px]">
                <div>
                  <div className="flex items-center justify-between border-b border-[#3c2921]/15 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-terracotta" />
                      <span className="font-serif text-sm font-bold text-[#251611] tracking-tight uppercase">
                        COMMUNICATOR
                      </span>
                    </div>
                    <span className="font-mono text-[9px] text-terracotta font-bold uppercase tracking-wider bg-terracotta/10 px-2 py-0.5 rounded">
                      Stage 1 • Gemini Flash
                    </span>
                  </div>

                  <p className="font-mono text-[10px] text-[#7c6356] leading-relaxed mb-3">
                    Oral history input / raw transcripts:
                  </p>

                  <textarea
                    value={rawIntakeInput}
                    onChange={(e) => setRawIntakeInput(e.target.value)}
                    placeholder="Paste community transcripts, oral statements, or parish ledger notes here..."
                    className="w-full h-32 bg-white/80 border border-[#3c2921]/20 p-2 font-mono text-[11px] text-[#3c2921] focus:outline-none focus:ring-1 focus:ring-terracotta resize-none"
                  />

                  {/* Active Role + Merged Context Injection */}
                  <div className="mt-3 flex items-center justify-between gap-2 bg-white/50 border border-[#3c2921]/10 px-2.5 py-1.5 rounded-sm">
                    <span
                      className="text-[9px] font-mono text-[#7c6356] uppercase font-bold truncate max-w-[65%]"
                      title={communicatorInjection}
                    >
                      🎭 Role: {communicatorInjection
                        ? communicatorInjection.slice(0, 40) + (communicatorInjection.length > 40 ? '...' : '')
                        : 'No custom instruction set'}
                    </span>
                    <button
                      onClick={() => {
                        if (rawIntakeInput.includes('[ROLE INSTRUCTION]')) {
                          alert("Context already injected into this intake. Clear the injected block first if you want to re-inject.");
                          return;
                        }
                        if (!communicatorInjection.trim() && !currentResearchContext.contextMarkdown.trim()) {
                          alert("No role instruction or context.md content available to inject yet.");
                          return;
                        }
                        const contextSnippet = currentResearchContext.contextMarkdown
                          ? currentResearchContext.contextMarkdown.slice(0, 800)
                          : '(no context.md content available)';
                        const truncatedNote = currentResearchContext.contextMarkdown.length > 800 ? '\n...(truncated)' : '';
                        const roleLine = communicatorInjection.trim() || '(no custom role instruction set)';
                        const injectedBlock = `[ROLE INSTRUCTION]\n${roleLine}\n\n[CONTEXT REFERENCE: ${currentResearchContext.name} context.md]\n${contextSnippet}${truncatedNote}\n\n---\n\n`;
                        setRawIntakeInput(injectedBlock + rawIntakeInput);
                      }}
                      className="text-[9px] font-mono font-bold bg-terracotta hover:bg-[#b0553c] text-white px-2.5 py-1 rounded-sm shrink-0 shadow-sm"
                      title="Inject active role instruction + context.md reference into the intake"
                    >
                      💉 Inject Context
                    </button>
                  </div>

                  {/* Preset inject dropdown */}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[9px] font-mono text-[#7c6356] uppercase font-bold">Sample Presets:</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setRawIntakeInput("Elder Jacinto: 'In October 1966, NLEX builders filled the Sapang Bakaw estuary with mountain silt, causing seasonal flooding.'")}
                        className="text-[9px] font-mono bg-white hover:bg-[#dfd4bd] px-2 py-1 border border-[#3c2921]/10 rounded-sm"
                      >
                        Estuary Testimony
                      </button>
                      <button
                        onClick={() => setRawIntakeInput("Spanish tax tariff records (1782) for Canumay state that a 20-real tax fee was paid, rather than a lost soldier's 20-coin coin purse.")}
                        className="text-[9px] font-mono bg-white hover:bg-[#dfd4bd] px-2 py-1 border border-[#3c2921]/10 rounded-sm"
                      >
                        Tax Ledger
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#3c2921]/10 flex flex-col gap-3">
                  {stage1Result && (
                    <div className="bg-white/70 border border-[#3c2921]/10 p-2.5 max-h-36 overflow-y-auto rounded-sm">
                      <span className="text-[9px] font-mono text-terracotta font-bold uppercase block mb-1">Denoised Summary Output:</span>
                      <p className="font-mono text-[10px] text-[#3c2921] whitespace-pre-wrap leading-relaxed">{stage1Result}</p>
                    </div>
                  )}

                  <button
                    onClick={() => handleStage1Denoise()}
                    disabled={isDenoisingStage1 || !rawIntakeInput.trim()}
                    className="w-full py-2 bg-terracotta hover:bg-[#b0553c] text-white font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                  >
                    {isDenoisingStage1 ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        COMPILING INTAKE...
                      </>
                    ) : (
                      "Run Gemini Intake (Stage 1)"
                    )}
                  </button>
                </div>
              </div>

              {/* 2. ARCHIVIST BOX (Bottom Left) */}
              <div className="md:col-span-6 bg-[#e9e0cb] border-2 border-[#3c2921]/30 p-5 rounded-sm shadow-sm flex flex-col justify-between min-h-[380px]">
                <div>
                  <div className="flex items-center justify-between border-b border-[#3c2921]/15 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-800" />
                      <span className="font-serif text-sm font-bold text-[#251611] tracking-tight uppercase">
                        ARCHIVIST
                      </span>
                    </div>
                    <span className="font-mono text-[9px] text-emerald-800 font-bold uppercase tracking-wider bg-emerald-800/10 px-2 py-0.5 rounded">
                      Stage 2 • Local Corpus + NotebookLLM
                    </span>
                  </div>

                  <p className="font-mono text-[10px] text-[#7c6356] leading-relaxed mb-3">
                    Sovereign corpus lookup cross-references and annotations:
                  </p>

                  <div className="w-full h-32 bg-white/80 border border-[#3c2921]/20 p-2 font-mono text-[10px] text-[#3c2921] overflow-y-auto rounded-sm leading-relaxed whitespace-pre-wrap">
                    {archivistSynthesis ? archivistSynthesis : (
                      <span className="text-gray-400 italic">No corpus query run yet. Compile Stage 1 first, or run a direct query.</span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 bg-white/50 border border-[#3c2921]/10 px-2.5 py-1.5 rounded-sm">
                    <span
                      className="text-[9px] font-mono text-[#7c6356] uppercase font-bold truncate max-w-[60%]"
                      title={archivistInjection}
                    >
                      🎭 Role: {archivistInjection
                        ? archivistInjection.slice(0, 35) + (archivistInjection.length > 35 ? '...' : '')
                        : 'No custom instruction set'}
                    </span>
                    <button
                      onClick={() => {
                        const roleLine = archivistInjection.trim() || '(no custom role instruction set)';
                        const contextSnippet = currentResearchContext.contextMarkdown
                          ? currentResearchContext.contextMarkdown.slice(0, 2000)
                          : '(no context.md content available)';
                        const truncatedNote = currentResearchContext.contextMarkdown.length > 2000 ? '\n...(truncated)' : '';
                        const intakeBlock = stage1Result ? stage1Result : '(no Stage 1 intake summary yet)';
                        const copyBlock = `[ROLE INSTRUCTION]\n${roleLine}\n\n[STAGE 1 INTAKE SUMMARY]\n${intakeBlock}\n\n[CONTEXT REFERENCE: ${currentResearchContext.name} context.md]\n${contextSnippet}${truncatedNote}`;
                        navigator.clipboard.writeText(copyBlock);
                        alert("Copied role + intake summary + context.md to clipboard! Paste into any external AI agent.");
                      }}
                      className="text-[9px] font-mono font-bold bg-[#3c2921] hover:bg-[#1d100c] text-white px-2.5 py-1 rounded-sm shrink-0 shadow-sm"
                      title="Copy role instruction + intake summary + context.md to clipboard"
                    >
                      📋 Copy for External
                    </button>
                  </div>


                  <div className="mt-2 flex items-center justify-between gap-2 text-[9px] font-mono text-[#7c6356]">
                    <span>Corpus references loaded: {localFiles.length} files</span>
                    <span className="text-emerald-800 font-bold">🟢 Corpus Synced</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#3c2921]/10 flex flex-col gap-2">
                  <button
                    onClick={() => handleQueryArchivist()}
                    disabled={isQueryingArchivist || !stage1Result}
                    className="w-full py-2 bg-emerald-800 hover:bg-emerald-950 text-white font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                  >
                    {isQueryingArchivist ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        QUERYING CORPUS...
                      </>
                    ) : (
                      "Query Local Corpus + NotebookLLM (Stage 2)"
                    )}
                  </button>
                </div>
              </div>

              {/* 3. SCRIBE BOX (Right Column, Tall) */}
              <div className="md:col-span-12 bg-[#e9e0cb] border-2 border-[#3c2921]/30 p-6 rounded-sm shadow-sm flex flex-col justify-between min-h-[460px]">
                <div>
                  <div className="flex items-center justify-between border-b border-[#3c2921]/15 pb-2.5 mb-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-[#3c2921]" />
                      <span className="font-serif text-base font-bold text-[#251611] tracking-tight uppercase">
                        SCRIBE (Logical Audit & Verification)
                      </span>
                    </div>
                   <span className="font-mono text-[9px] text-[#3c2921] font-bold uppercase tracking-wider bg-[#3c2921]/10 px-2.5 py-1 rounded">
                      Stage 3 • Scribe
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 bg-white/50 border border-[#3c2921]/10 px-2.5 py-1.5 rounded-sm mb-4">
                    <span
                      className="text-[9px] font-mono text-[#7c6356] uppercase font-bold truncate max-w-[60%]"
                      title={scribeInjection}
                    >
                      🎭 Role: {scribeInjection
                        ? scribeInjection.slice(0, 35) + (scribeInjection.length > 35 ? '...' : '')
                        : 'No custom instruction set'}
                    </span>
                    <button
                      onClick={() => {
                        const roleLine = scribeInjection.trim() || '(no custom role instruction set)';
                        const contextSnippet = currentResearchContext.contextMarkdown
                          ? currentResearchContext.contextMarkdown.slice(0, 2000)
                          : '(no context.md content available)';
                        const truncatedNote = currentResearchContext.contextMarkdown.length > 2000 ? '\n...(truncated)' : '';
                        const intakeBlock = stage1Result ? stage1Result : '(no Stage 1 intake summary yet)';
                        const archivistBlock = archivistSynthesis ? archivistSynthesis : '(no Stage 2 archivist synthesis yet)';
                        const copyBlock = `[ROLE INSTRUCTION]\n${roleLine}\n\n[STAGE 1 INTAKE SUMMARY]\n${intakeBlock}\n\n[STAGE 2 ARCHIVIST SYNTHESIS]\n${archivistBlock}\n\n[CONTEXT REFERENCE: ${currentResearchContext.name} context.md]\n${contextSnippet}${truncatedNote}`;
                        navigator.clipboard.writeText(copyBlock);
                        alert("Copied role + intake + archivist synthesis + context.md to clipboard! Paste into any external AI agent.");
                      }}
                      className="text-[9px] font-mono font-bold bg-[#3c2921] hover:bg-[#1d100c] text-white px-2.5 py-1 rounded-sm shrink-0 shadow-sm"
                      title="Copy role instruction + full pipeline context to clipboard"
                    >
                      📋 Copy for External
                    </button>
                  </div>

                  {stage2Result ? (
                    <div className="flex flex-col gap-4">
                      {/* Contradiction Alert banner */}
                      <div className={`p-3 border-2 font-mono text-xs ${
                        stage2Result.contradictionDetected 
                          ? 'bg-rose-50 border-rose-400 text-rose-900' 
                          : 'bg-emerald-50 border-emerald-400 text-emerald-950'
                      }`}>
                        <div className="flex items-center gap-2 font-bold uppercase">
                          {stage2Result.contradictionDetected ? (
                            <>
                              <AlertTriangle className="w-4.5 h-4.5 text-rose-700 animate-pulse" />
                              CONTRADICTION DETECTED IN LGU RECORD
                            </>
                          ) : (
                            <>
                              <Check className="w-4.5 h-4.5 text-emerald-800" />
                              RECORD VERIFIED CONSISTENT WITH GROUND TRUTH
                            </>
                          )}
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed">{stage2Result.contradictionDetails}</p>
                      </div>

                      {/* Proposed context code patch */}
                      <div>
                        <span className="text-[10px] font-mono font-bold text-[#7c6356] uppercase tracking-wide block mb-1">Proposed Context Patch (Markdown Append):</span>
                        <pre className="bg-[#1d100c] text-emerald-400 p-3.5 border border-terracotta/20 font-mono text-[11px] rounded-sm max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                          {stage2Result.proposedDiff}
                        </pre>
                      </div>

                      {/* Erratum Rule detail */}
                      {stage2Result.newErratumRule && (
                        <div className="bg-[#dfd4bd]/40 p-3 border border-[#3c2921]/15 font-mono text-xs rounded-sm">
                          <span className="text-[9px] text-terracotta font-bold uppercase block mb-1">PROPOSED ERRATUM RULE:</span>
                          <div className="flex flex-col gap-1.5 text-[11px]">
                            <span><strong>Official Claim:</strong> {stage2Result.newErratumRule.officialClaim}</span>
                            <span><strong>Ground Truth:</strong> {stage2Result.newErratumRule.groundTruth}</span>
                            <span><strong>Source Proof:</strong> {stage2Result.newErratumRule.source}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center font-mono text-xs text-[#7c6356]/70 italic border border-dashed border-[#3c2921]/20 rounded-sm bg-white/20">
                      <HelpCircle className="w-8 h-8 text-[#7c6356]/40 mb-2" />
                      <span>Compile Stages 1 and 2, or run a single-click Queue processing to generate the verification audit report.</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-[#3c2921]/10 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => handleStage2CrossReference()}
                    disabled={isDenoisingStage2 || !stage1Result}
                    className="flex-1 py-2.5 bg-[#3c2921] hover:bg-[#1d100c] text-[#dfd4bd] font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
                  >
                    {isDenoisingStage2 ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-[#dfd4bd] border-t-transparent rounded-full animate-spin" />
                        RUNNING SCRIBE VERIFICATION...
                      </>
                    ) : (
                      "Run Scribe Verification (Stage 3)"
                    )}
                  </button>

                  {stage2Result && (
                    <>
                      <button
                        onClick={handleCommitCheckpoint}
                        className="py-2.5 px-4 bg-emerald-800 hover:bg-emerald-950 text-white font-mono text-xs font-bold uppercase shadow-md flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        DIRECT COMMIT
                      </button>
                      <button
                        onClick={() => {
                          const newItem = {
                            id: `AI-PATCH-${Date.now().toString().slice(-4)}`,
                            title: `AI Patch: ${stage2Result.newErratumRule ? stage2Result.newErratumRule.groundTruth : 'Staged Context Patch'}`,
                            text: rawIntakeInput,
                            category: 'AI Staged Patch',
                            date: new Date().toISOString().substring(0, 10),
                            contributor: 'Sovereign Scribe',
                            stage1Result: stage1Result,
                            archivistSynthesis: archivistSynthesis,
                            stage2Result: stage2Result,
                            processed: true,
                            status: 'completed'
                          };
                          setAuditQueue([...auditQueue, newItem]);
                          alert("Success! Staged current AI session as a Git-style Proposed Patch in the Audit Queue.");
                        }}
                        className="py-2.5 px-4 bg-[#bf664d] hover:bg-terracotta text-white font-mono text-xs font-bold uppercase shadow-md flex items-center justify-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        STAGE PATCH TO QUEUE
                      </button>
                      <button
                        onClick={handlePurgeTransit}
                        className="py-2.5 px-3 bg-rose-900/10 hover:bg-rose-900/25 text-rose-900 font-mono text-xs font-bold uppercase rounded-sm"
                      >
                        DISCARD AUDIT
                      </button>
                    </>
                  )}
                </div>
              </div>

            </div>
          ) : (
            /* --- INTERACTIVE ROUNDTABLE VIEW (PREV CHAT VIEW) --- */
            <div className="bg-[#e9e0cb] border-2 border-[#3c2921]/30 p-6 shadow-[4px_4px_0px_0px_rgba(37,22,17,0.15)] flex flex-col justify-between min-h-[640px]">
              <div>
                <div className="flex items-center justify-between border-b border-[#3c2921]/20 pb-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="w-5 h-5 text-terracotta" />
                    <h3 className="font-serif text-base font-bold text-[#251611] uppercase tracking-wide">
                      [ INTERACTIVE AGENT ROUNDTABLE ]
                    </h3>
                  </div>
                  <span className="font-mono text-[9px] text-[#7c6356] font-bold uppercase tracking-wider">
                    Multi-Agent Roundtable Room
                  </span>
                </div>

                {/* Roundtable conversation */}
                <div className="bg-[#dfd4bd] p-4 border border-[#3c2921]/15 h-[380px] overflow-y-auto font-mono text-xs text-[#3c2921] space-y-4 rounded-sm">
                  {roundtableMessages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col gap-1 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase">
                        {msg.sender === 'user' ? (
                          <span className="text-[#3c2921]">YOU (AUDITOR)</span>
                        ) : msg.sender === 'communicator' ? (
                          <span className="text-terracotta">COMMUNICATOR (Gemini)</span>
                        ) : msg.sender === 'archivist' ? (
                          <span className="text-emerald-800">ARCHIVIST (Local Corpus + NotebookLLM)</span>
                        ) : (
                          <span className="text-indigo-900">SCRIBE (Logical Scribe)</span>
                        )}
                        <span className="text-[8px] font-normal text-gray-500">[{msg.timestamp}]</span>
                      </div>
                      <div className={`p-3 max-w-[85%] rounded-sm border leading-relaxed ${
                        msg.sender === 'user' 
                          ? 'bg-[#f4efe4] border-[#3c2921]/20 text-[#3c2921]' 
                          : msg.sender === 'communicator'
                            ? 'bg-orange-50 border-orange-200 text-orange-950'
                            : msg.sender === 'archivist'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                              : 'bg-indigo-50 border-indigo-200 text-indigo-950'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isRoundtableProcessing && (
                    <p className="text-amber-600 animate-pulse font-bold">// ROUNDTABLE DISCUSSION IN PROGRESS...</p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#3c2921]/10 flex gap-2">
                <input
                  type="text"
                  value={roundtableInput}
                  onChange={(e) => setRoundtableInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSendRoundtableMessage(roundtableInput);
                    }
                  }}
                  placeholder="Instruct the roundtable room (e.g. 'Scribe, analyze Jacinto's overfill statement against the spanish ledgers')"
                  className="flex-1 bg-white border border-[#3c2921]/20 px-3.5 py-2 text-xs font-mono text-[#3c2921] focus:outline-none"
                />
                <button
                  onClick={() => handleSendRoundtableMessage(roundtableInput)}
                  className="px-5 bg-terracotta text-white font-mono font-bold text-xs uppercase hover:bg-[#b0553c]"
                >
                  Send Instruction
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: QUEUE & CHATBOT PANEL */}
        <div className="xl:col-span-4 bg-[#e9e0cb] border-2 border-[#3c2921]/30 p-5 rounded-sm shadow-sm min-h-[580px] flex flex-col justify-between">
          <div>
            {/* Sub-header */}
            <div className="flex items-center justify-between border-b border-[#3c2921]/20 pb-2 mb-4">
              <h4 className="font-serif text-sm font-bold text-[#251611] uppercase tracking-wider">
                {auditMode === 'queue' ? '[ AUDIT QUEUE ]' : '[ COGNITIVE CHATBOT ]'}
              </h4>
              <span className="font-mono text-[9px] text-[#7c6356] font-bold uppercase">
                {auditMode === 'queue' ? `${auditQueue.length} items staged` : 'offline-first query'}
              </span>
            </div>

            {auditMode === 'queue' ? (
              /* --- QUEUE LIST (SCHEMATIC 1 RIGHT COLUMN) --- */
              <div className="flex flex-col gap-3 max-h-[440px] overflow-y-auto pr-1">
                <div className="flex gap-1.5 mb-1">
                  {handleQueueAndStartNew && (
                    <button
                      onClick={handleQueueAndStartNew}
                      className="flex-1 py-2.5 bg-[#bf664d] hover:bg-terracotta text-[#fcf8ef] font-mono font-bold text-[10px] uppercase transition-all rounded-sm flex items-center justify-center gap-2 border border-[#3c2921]/15 shadow-sm cursor-pointer"
                      title="Queue up current session and prepare a clean slate for new observations"
                    >
                      📥 Queue &amp; Start Fresh
                    </button>
                  )}
                  {handleClearQueue && (
                    <button
                      onClick={handleClearQueue}
                      className="py-2.5 px-3 bg-rose-900/10 hover:bg-rose-900/25 text-rose-900 font-mono font-bold text-[10px] uppercase transition-all rounded-sm border border-rose-900/15 shadow-sm cursor-pointer shrink-0"
                      title="Clear all staged items from the audit queue"
                    >
                      🗑️
                    </button>
                  )}
                </div>
                {auditQueue.length === 0 ? (
                  <div className="text-center py-10 font-mono text-xs text-[#7c6356] italic">
                    Queue is empty. Click '+' to add historical testimonies.
                  </div>
                ) : (
                  auditQueue.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => {
                        if (handleSelectQueueItem) {
                          handleSelectQueueItem(item);
                        } else {
                          setActiveQueueId(item.id);
                          setRawIntakeInput(item.text);
                          if (setStage1Result) setStage1Result(item.stage1Result || null);
                          if (setArchivistSynthesis) setArchivistSynthesis(item.archivistSynthesis || null);
                          if (setStage2Result) setStage2Result(item.stage2Result || null);
                        }
                      }}
                      className={`p-3 border-2 transition-all cursor-pointer flex flex-col gap-2 rounded-sm ${
                        activeQueueId === item.id 
                          ? 'bg-[#dfd4bd] border-terracotta ring-1 ring-terracotta/20' 
                          : 'bg-[#f4efe4] border-transparent hover:border-[#3c2921]/15'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-serif text-xs font-bold text-[#251611] truncate">
                          {item.id}: {item.title}
                        </div>
                        <span className="text-[9px] font-mono font-bold bg-[#bf664d]/15 text-terracotta px-1.5 py-0.5 rounded uppercase shrink-0">
                          {item.category}
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-[#3c2921]/80 line-clamp-2 leading-relaxed">
                        {item.text}
                      </p>

                      {/* Active status indicator */}
                      <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold mt-0.5">
                        {item.status === 'gemini' && (
                          <span className="text-amber-600 animate-pulse flex items-center gap-1">🔄 Stage 1 (Gemini Intake)...</span>
                        )}
                        {item.status === 'notebooklm' && (
                          <span className="text-indigo-600 animate-pulse flex items-center gap-1">🔄 Stage 2 (Local Corpus + NotebookLLM references)...</span>
                        )}
                        {item.status === 'scribe' && (
                          <span className="text-emerald-600 animate-pulse flex items-center gap-1">🔄 Stage 3 (Logical Scribe Audit)...</span>
                        )}
                        {item.status === 'completed' && (
                          <span className="text-emerald-700 flex items-center gap-0.5">✅ Verified (Commit-Ready)</span>
                        )}
                        {item.status === 'failed' && (
                          <span className="text-rose-700">❌ Pipeline Blocked</span>
                        )}
                        {(!item.status && item.stage2Result) && (
                          <span className="text-orange-700 flex items-center gap-0.5">📦 AI Staged Commit (Merge-Ready)</span>
                        )}
                        {(!item.status && !item.stage2Result) && (
                          <span className="text-gray-500">⏳ Staged Raw Entry</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-[#3c2921]/5 text-[9px] font-mono text-[#7c6356]/80">
                        <span>By: {item.contributor}</span>
                        <div className="flex gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRunQueueItem(item);
                            }}
                            className={`px-2 py-0.5 text-white font-bold rounded-sm text-[9px] ${
                              (item.stage2Result || item.status === 'completed') 
                                ? 'bg-emerald-700 hover:bg-emerald-800' 
                                : 'bg-[#bf664d] hover:bg-terracotta'
                            }`}
                          >
                            {(item.stage2Result || item.status === 'completed') ? 'Merge Commit' : 'Push'}
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Remove this entry from the audit queue?")) {
                                setAuditQueue(auditQueue.filter(q => q.id !== item.id));
                                if (activeQueueId === item.id && auditQueue.length > 1) {
                                  setActiveQueueId(auditQueue.find(q => q.id !== item.id)?.id || '');
                                }
                              }
                            }}
                            className="px-1.5 py-0.5 bg-rose-900/10 hover:bg-rose-950/20 text-rose-900 font-bold rounded-sm text-[9px]"
                          >
                            Del
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Quick add circular plus button */}
                <div className="flex justify-center mt-3">
                  <button
                    onClick={() => {
                      setLocalShowQuickAdd(true);
                      setShowQuickAddModal(true);
                    }}
                    className="w-10 h-10 rounded-full bg-terracotta hover:bg-[#b0553c] text-white flex items-center justify-center font-bold text-xl shadow-md transition-all animate-bounce animate-pulse"
                    title="Add Item to Queue"
                  >
                    +
                  </button>
                </div>

                {/* MODAL DIALOG OVERLAY: Git-style Quick Add Research Commit */}
                {localShowQuickAdd && (
                  <div className="fixed inset-0 bg-[#1d100c]/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-[#f4efe4] border-4 border-[#3c2921] p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 relative">
                      <button
                        onClick={() => setLocalShowQuickAdd(false)}
                        className="absolute top-2.5 right-3 text-lg text-[#3c2921] hover:text-terracotta font-bold font-mono"
                      >
                        [X]
                      </button>

                      <div className="border-b border-[#3c2921]/20 pb-2">
                        <h3 className="font-serif text-md font-bold text-emerald-900 uppercase">
                          📂 Stage New Research Entry
                        </h3>
                        <p className="font-mono text-[9px] text-[#7c6356] leading-normal uppercase">
                          Pre-staging area before logical verification pipeline
                        </p>
                      </div>

                      <div className="flex flex-col gap-3.5 font-mono text-xs">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-terracotta uppercase">Entry Title / Commit Message:</label>
                          <input
                            type="text"
                            value={qaTitle}
                            onChange={(e) => setQaTitle(e.target.value)}
                            placeholder="e.g. Spanish Parish Land Dispute"
                            className="w-full bg-white border border-[#3c2921]/30 p-2 text-[#3c2921] focus:outline-none focus:border-terracotta text-xs"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-terracotta uppercase">Contributor (Author):</label>
                          <input
                            type="text"
                            value={qaContributor}
                            onChange={(e) => setQaContributor(e.target.value)}
                            placeholder="e.g. Researcher Rein"
                            className="w-full bg-white border border-[#3c2921]/30 p-2 text-[#3c2921] focus:outline-none focus:border-terracotta text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-terracotta uppercase">Category:</label>
                            <select
                              value={qaCategory}
                              onChange={(e) => setQaCategory(e.target.value)}
                              className="w-full bg-white border border-[#3c2921]/30 p-2 text-[#3c2921] focus:outline-none text-xs"
                            >
                              <option value="Oral Testimony">Oral Testimony</option>
                              <option value="Field Observation">Field Observation</option>
                              <option value="Agrarian Record">Agrarian Record</option>
                              <option value="Ecological Study">Ecological Study</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-terracotta uppercase">Date:</label>
                            <input
                              type="text"
                              value={new Date().toISOString().substring(0, 10)}
                              disabled
                              className="w-full bg-gray-100 border border-[#3c2921]/20 p-2 text-[#3c2921]/60 text-xs cursor-not-allowed"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-terracotta uppercase">Source Testimony / Text Content:</label>
                          <textarea
                            value={qaText}
                            onChange={(e) => setQaText(e.target.value)}
                            placeholder="Type or paste testimonies or evidence records here..."
                            rows={4}
                            className="w-full bg-white border border-[#3c2921]/30 p-2 text-[#3c2921] focus:outline-none focus:border-terracotta text-xs leading-relaxed"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => setLocalShowQuickAdd(false)}
                          className="flex-1 py-2 border border-[#3c2921]/30 text-[#3c2921] hover:bg-gray-100 font-mono text-xs uppercase"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (!qaTitle.trim() || !qaText.trim()) {
                              alert("Title and Text content are required.");
                              return;
                            }
                            const newItem = {
                              id: `ENTRY-${Date.now().toString().slice(-4)}`,
                              title: qaTitle,
                              text: qaText,
                              category: qaCategory,
                              date: new Date().toISOString().substring(0, 10),
                              contributor: qaContributor || 'Anonymous Researcher',
                              processed: false
                            };
                            setAuditQueue([...auditQueue, newItem]);
                            setLocalShowQuickAdd(false);
                            // Reset fields
                            setQaTitle("");
                            setQaText("");
                            setQaContributor("");
                          }}
                          className="flex-1 py-2 bg-emerald-800 hover:bg-emerald-950 text-white font-mono text-xs uppercase font-bold"
                        >
                          Add to Stage Queue
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* --- CHATBOT MINI TERMINAL --- */
              <div className="flex flex-col gap-3">
                <div className="bg-[#1d100c] text-emerald-400 p-3 font-mono text-[10px] h-[340px] overflow-y-auto rounded-sm border border-terracotta/20 flex flex-col gap-2">
                  <p className="text-[#dfd4bd]/60 italic">// Secure Sovereign Chatbot Terminal initialized.</p>
                  <p className="text-[#dfd4bd]/60 italic">// Ready to query {currentResearchContext.name} records.</p>
                  
                  {auditChatResponse && (
                    <div className="mt-2 pt-2 border-t border-terracotta/10 text-[#dfd4bd]">
                      <span className="text-terracotta font-bold">[RESPONSE]:</span>
                      <p className="mt-1 leading-relaxed text-[#dfd4bd]/95 whitespace-pre-wrap">
                        {auditChatResponse}
                      </p>
                    </div>
                  )}
                  
                  {isAuditChatLoading && (
                    <p className="text-amber-500 animate-pulse mt-2 font-bold">// AGENT DEEP SEARCH IN PROGRESS...</p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={auditChatQuery}
                    onChange={(e) => setAuditChatQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleTriggerAuditChat();
                      }
                    }}
                    placeholder="Type historical question..."
                    className="flex-1 bg-white border border-[#3c2921]/20 px-2.5 py-1.5 text-xs font-mono text-[#3c2921] focus:outline-none"
                  />
                  <button 
                    onClick={handleTriggerAuditChat}
                    disabled={isAuditChatLoading || !auditChatQuery.trim()}
                    className="px-3 bg-[#3c2921] text-white font-mono font-bold text-xs hover:bg-[#1d100c] disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* FOOTER TAB SELECTORS FOR QUEUE / CHATBOT */}
          <div className="flex gap-2 border-t border-[#3c2921]/15 pt-3 mt-4">
            <button 
              onClick={() => setAuditMode('queue')}
              className={`flex-1 py-1.5 font-mono text-[10px] font-bold border transition-all rounded-sm ${
                auditMode === 'queue'
                  ? 'bg-terracotta text-white border-terracotta shadow-sm'
                  : 'bg-[#f4efe4] text-[#7c6356] border-[#3c2921]/10 hover:bg-[#dfd4bd]'
              }`}
            >
              QUEUE
            </button>
            <button 
              onClick={() => setAuditMode('chatbot')}
              className={`flex-1 py-1.5 font-mono text-[10px] font-bold border transition-all rounded-sm ${
                auditMode === 'chatbot'
                  ? 'bg-terracotta text-white border-terracotta shadow-sm'
                  : 'bg-[#f4efe4] text-[#7c6356] border-[#3c2921]/10 hover:bg-[#dfd4bd]'
              }`}
            >
              CHATBOT
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
