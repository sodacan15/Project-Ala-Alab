import { useState, useEffect } from 'react';
import { 
  Sparkles, Layers, HelpCircle, Sidebar, AlertCircle, Info, MessageSquare, BookOpen, Bot, FileText
} from 'lucide-react';
import { DEFAULT_PROMPTS } from './data/defaults';
import { PromptTemplate, ResearchLog, SessionFile } from './types';
import TrioTalkPanel from './components/TrioTalkPanel';
import SidebarScratchpad from './components/SidebarScratchpad';

const DEFAULT_FILES: SessionFile[] = [
  {
    id: 'f1',
    name: 'quantum_grid_protocols.txt',
    size: '1.2 KB',
    content: `CRITICAL TECHNICAL MATRIX - QUANTUM ENERGY GRIDS:

1. Quantum Entanglement Channels: Used for secure, instant state matching across remote nodes.
2. Decentralized Entropy Buffers: Resolves grid latency spikes during high solar/wind feed-in cycles.
3. Dynamic Sharding Protocols: Autonomously group regional substations into isolated security rings to mitigate cascade failure loops.`,
    uploadedAt: new Date().toLocaleDateString(),
    type: 'text/plain'
  },
  {
    id: 'f2',
    name: 'chen_consensus_limits_2025.md',
    size: '2.4 KB',
    content: `# Empirical Evaluation of Consensus Protocols at Scale
*Author: Prof. Chen et al. (2025)*

### Abstract:
Distributed networks using smart contracts face structural throughput degradation once the active node count exceeds 10,000 parallel entities. This study proves that a hybrid federated hierarchy is the only model that achieves linear scaling with zero degradation.

### Key Findings & Metrics:
- Decentralized Mesh Latency: 240ms baseline.
- Peak Consensus Load: 45,000 TPS under simulated high-entropy traffic.
- Adaptive Protocol Overlap: 82.4% success rating under continuous node dropout stress testing.`,
    uploadedAt: new Date().toLocaleDateString(),
    type: 'text/markdown'
  }
];

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('research_sidebar_open');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Scratchpad & Data States
  const [scratchpad, setScratchpad] = useState(() => {
    return localStorage.getItem('research_scratchpad_content') || '';
  });
  const [customPrompts, setCustomPrompts] = useState<PromptTemplate[]>(() => {
    const saved = localStorage.getItem('research_custom_prompts');
    return saved ? JSON.parse(saved) : [];
  });
  const [researchLogs, setResearchLogs] = useState<ResearchLog[]>(() => {
    const saved = localStorage.getItem('research_logs');
    return saved ? JSON.parse(saved) : [];
  });
  const [sessionFiles, setSessionFiles] = useState<SessionFile[]>(() => {
    const saved = localStorage.getItem('research_session_files');
    return saved ? JSON.parse(saved) : DEFAULT_FILES;
  });

  // Active file triggered for Trio analysis centerpiece
  const [activeAgentTriggerFile, setActiveAgentTriggerFile] = useState<{ name: string; content: string } | null>(null);

  // Modals & Banners
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'info' | 'success' | 'warning'>('info');

  // Trigger Local Storage Persistance
  useEffect(() => {
    localStorage.setItem('research_session_files', JSON.stringify(sessionFiles));
  }, [sessionFiles]);

  useEffect(() => {
    localStorage.setItem('research_scratchpad_content', scratchpad);
  }, [scratchpad]);

  useEffect(() => {
    localStorage.setItem('research_custom_prompts', JSON.stringify(customPrompts));
  }, [customPrompts]);

  useEffect(() => {
    localStorage.setItem('research_logs', JSON.stringify(researchLogs));
  }, [researchLogs]);

  useEffect(() => {
    localStorage.setItem('research_sidebar_open', JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  // Combine default prompts and custom prompts
  const allPrompts = [...DEFAULT_PROMPTS, ...customPrompts];

  // Helper trigger to display toasts
  const triggerToast = (msg: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Handler functions for Custom Prompts
  const handleCreatePrompt = (newPrompt: PromptTemplate) => {
    setCustomPrompts(prev => [...prev, newPrompt]);
    triggerToast("Custom prompt added to your Library!", "success");
  };

  const handleDeletePrompt = (id: string) => {
    setCustomPrompts(prev => prev.filter(p => p.id !== id));
    triggerToast("Custom prompt deleted", "info");
  };

  // Handler functions for Research Logs
  const handleAddLog = (newLog: Omit<ResearchLog, 'id' | 'timestamp'>) => {
    const log: ResearchLog = {
      ...newLog,
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
    };
    setResearchLogs(prev => [...prev, log]);
    triggerToast("Insight captured in Research Logs!", "success");
  };

  const handleDeleteLog = (id: string) => {
    setResearchLogs(prev => prev.filter(l => l.id !== id));
    triggerToast("Log entry deleted", "info");
  };

  const handleTriggerFileAnalysis = (name: string, content: string) => {
    setActiveAgentTriggerFile({ name, content });
    triggerToast(`Sent "${name}" to Trio Talk Hub!`, "success");
  };

  return (
    <div id="app-root-container" className="flex flex-col h-screen w-screen bg-slate-100 text-slate-800 overflow-hidden font-sans">
      
      {/* Top Banner Message Toast */}
      {toastMessage && (
        <div id="toast-banner" className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md bg-white border-slate-200 text-slate-800 text-sm font-semibold max-w-lg">
          <AlertCircle className={`w-4.5 h-4.5 ${
            toastType === 'success' ? 'text-emerald-500' : toastType === 'warning' ? 'text-amber-500' : 'text-blue-600'
          }`} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header Toolbar */}
      <header id="main-app-header" className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
            <Layers className="w-5 h-5 animate-pulse-slow" />
          </div>
          <div>
            <h1 className="font-display text-base font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
              TrioTalk Studio <span className="text-slate-400 font-normal text-xs">v1.5</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">Gemini, NotebookLM & Claude Joint Research Arena</p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Help/HelpGuide button */}
          <button
            id="header-help-guide"
            onClick={() => setIsHelpOpen(!isHelpOpen)}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              isHelpOpen 
                ? 'bg-blue-50 text-blue-600 border-blue-200' 
                : 'bg-slate-100 text-slate-500 hover:text-slate-800 border-slate-200 hover:bg-slate-200'
            }`}
            title="Open Arena Setup Guide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Sidebar Toggle */}
          <button
            id="header-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-1.5 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
              sidebarOpen 
                ? 'bg-blue-50 text-blue-600 border-blue-200 font-medium' 
                : 'bg-slate-100 text-slate-500 hover:text-slate-800 border-slate-200 hover:bg-slate-200'
            }`}
            title="Toggle Copilot Workspace"
          >
            <Sidebar className="w-4 h-4" />
            <span className="text-xs font-semibold hidden sm:inline">Copilot Workspace</span>
          </button>
        </div>
      </header>

      {/* Arena Setup Instructions (Collapsible Quick Help Banner) */}
      {isHelpOpen && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-6 py-3.5 flex items-start gap-3.5 shrink-0 select-none animate-slide-down">
          <div className="p-2 bg-blue-500 text-white rounded-lg shadow-sm shrink-0">
            <Info className="w-4.5 h-4.5" />
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="font-display font-bold text-xs text-blue-900">Trio Talk & File Drag Arena Guide</h4>
            <p className="text-[11px] text-blue-700 leading-relaxed max-w-4xl">
              Welcome to the upgraded single-window **TrioTalk Arena**! Since you have the recommended extension, we have stripped the heavy iframe grids to provide a gorgeous, hyper-focused collaborative environment.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1.5 text-[10px] text-blue-800 font-medium">
              <div className="bg-white/60 p-2 rounded-lg border border-blue-100/40">
                <span className="font-bold text-blue-600">1. Instant Analysis</span>: Go to the **Files** tab in Copilot, drag any research document, and click **"Analyze in Trio"** to instantly spark a structured discuss-simulation.
              </div>
              <div className="bg-white/60 p-2 rounded-lg border border-blue-100/40">
                <span className="font-bold text-blue-600">2. Agent Targeted Drops</span>: Drag any document from your computer or the Session Registry and drop it **specifically** onto any of the three Agent Cards above the conversation feed to start the simulation with that specific agent's prompt angle!
              </div>
              <div className="bg-white/60 p-2 rounded-lg border border-blue-100/40">
                <span className="font-bold text-blue-600">3. Copilot Synchronization</span>: Click the **Bookmark** or **Append** buttons on any message in the discussion feed to seamlessly log them into your markdown scratchpad or capture them in your Research Logs.
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsHelpOpen(false)}
            className="text-[10px] bg-white hover:bg-slate-50 border border-blue-200 text-slate-600 font-bold px-2 py-1 rounded-md shadow-sm transition-colors cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Workspace Core Area */}
      <div id="workspace-grid" className="flex-1 flex overflow-hidden w-full relative">
        
        {/* Left Side: Trio Talk Simulator Panel (Core Centerpiece) */}
        <div className="flex-1 flex flex-col h-full overflow-hidden p-4 bg-slate-100/50">
          <div className="flex-1 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col overflow-hidden">
            <TrioTalkPanel
              onAppendToScratchpad={(text) => setScratchpad(scratchpad ? `${scratchpad}\n\n${text}` : text)}
              onAddLog={(log) => handleAddLog(log)}
              initialTopic={activeAgentTriggerFile ? `Analysis of ${activeAgentTriggerFile.name}` : undefined}
              initialContent={activeAgentTriggerFile ? activeAgentTriggerFile.content : undefined}
              onClearInitial={() => setActiveAgentTriggerFile(null)}
            />
          </div>
        </div>

        {/* Right Side: Copilot Sidebar Workspace */}
        <SidebarScratchpad
          scratchpad={scratchpad}
          setScratchpad={setScratchpad}
          prompts={allPrompts}
          onCreatePrompt={handleCreatePrompt}
          onDeletePrompt={handleDeletePrompt}
          researchLogs={researchLogs}
          onAddLog={handleAddLog}
          onDeleteLog={handleDeleteLog}
          sessionFiles={sessionFiles}
          onSetSessionFiles={setSessionFiles}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onTriggerFileAnalysis={handleTriggerFileAnalysis}
        />
      </div>

      {/* Sleek Status Footer */}
      <footer className="h-8 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between px-4 shrink-0 text-[10px] text-slate-500 font-medium select-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Gemini Intellect: Connected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Notebook Corpus: Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Claude Refiner: Ready</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span>Active Session Files: {sessionFiles.length}</span>
          <span>|</span>
          <span>Arena Mode: Collaborative Trio</span>
        </div>
      </footer>
    </div>
  );
}
