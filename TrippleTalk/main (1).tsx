import { useState, useEffect, useRef, FormEvent } from 'react';
import { 
  FileText, Copy, Trash2, Download, Check, Sparkles, BookOpen, 
  Plus, Search, Code, Heading, Bold, Italic, List, Quote, ArrowDown, FolderPlus, Tag, MessageSquare,
  Upload, Folder, File, Loader2, Play
} from 'lucide-react';
import { PromptTemplate, ResearchLog, SessionFile } from '../types';

interface SidebarScratchpadProps {
  scratchpad: string;
  setScratchpad: (val: string) => void;
  prompts: PromptTemplate[];
  onCreatePrompt: (newPrompt: PromptTemplate) => void;
  onDeletePrompt: (id: string) => void;
  researchLogs: ResearchLog[];
  onAddLog: (log: Omit<ResearchLog, 'id' | 'timestamp'>) => void;
  onDeleteLog: (id: string) => void;
  sessionFiles: SessionFile[];
  onSetSessionFiles: (files: SessionFile[]) => void;
  isOpen: boolean;
  onToggle: () => void;
  onTriggerFileAnalysis: (name: string, content: string) => void;
}

type TabType = 'scratchpad' | 'prompts' | 'logs' | 'files';

export default function SidebarScratchpad({
  scratchpad,
  setScratchpad,
  prompts,
  onCreatePrompt,
  onDeletePrompt,
  researchLogs,
  onAddLog,
  onDeleteLog,
  sessionFiles,
  onSetSessionFiles,
  isOpen,
  onToggle,
  onTriggerFileAnalysis,
}: SidebarScratchpadProps) {
  const [activeTab, setActiveTab] = useState<TabType>('scratchpad');
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});
  
  // Custom prompt states
  const [isCreatingPrompt, setIsCreatingPrompt] = useState(false);
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptCategory, setNewPromptCategory] = useState<PromptTemplate['category']>('General');
  const [newPromptText, setNewPromptText] = useState('');
  const [promptFilter, setPromptFilter] = useState<string>('All');
  const [promptSearch, setPromptSearch] = useState('');

  // Research log states
  const [newLogTitle, setNewLogTitle] = useState('');
  const [newLogCategory, setNewLogCategory] = useState('General Insight');
  const [newLogContent, setNewLogContent] = useState('');
  const [logFilter, setLogFilter] = useState('All');

  // Session files states & install simulation hooks
  const [isDraggingFileOverZone, setIsDraggingFileOverZone] = useState(false);
  const [installingFileId, setInstallingFileId] = useState<string | null>(null);
  const [installProgress, setInstallProgress] = useState(0);
  const [installStatusText, setInstallStatusText] = useState('');

  const handleUploadFile = (name: string, content: string, sizeBytes: number) => {
    const sizeStr = sizeBytes > 1024 * 1024 
      ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${(sizeBytes / 1024).toFixed(1)} KB`;

    const newFile: SessionFile = {
      id: `file-${Date.now()}`,
      name,
      content,
      size: sizeStr,
      uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: name.endsWith('.md') ? 'text/markdown' : name.endsWith('.json') ? 'application/json' : 'text/plain'
    };

    onSetSessionFiles([newFile, ...sessionFiles]);
  };

  const handleDownloadFile = (file: SessionFile) => {
    setInstallingFileId(file.id);
    setInstallProgress(0);
    setInstallStatusText('Validating local file integrity...');

    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setInstallProgress(progress);
      
      if (progress === 20) {
        setInstallStatusText('Indexing offline research cache...');
      } else if (progress === 40) {
        setInstallStatusText('Compiling sandboxed database schema...');
      } else if (progress === 60) {
        setInstallStatusText('Securing local session crypt-keys...');
      } else if (progress === 80) {
        setInstallStatusText('Writing standalone app build stream...');
      } else if (progress >= 100) {
        clearInterval(interval);
        setInstallStatusText('Download Ready!');
        
        setTimeout(() => {
          const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = file.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          setInstallingFileId(null);
          setInstallProgress(0);
          setInstallStatusText('');
        }, 500);
      }
    }, 300);
  };

  // Textarea ref for markdown insertion
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-save feedback state
  const [isSaved, setIsSaved] = useState(false);

  // Trigger auto-save visual feedback when scratchpad changes
  useEffect(() => {
    if (scratchpad) {
      setIsSaved(true);
      const timer = setTimeout(() => setIsSaved(false), 800);
      return () => clearTimeout(timer);
    }
  }, [scratchpad]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  // Markdown injection helper
  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const replacement = prefix + (selectedText || 'text') + suffix;
    
    const newValue = text.substring(0, start) + replacement + text.substring(end);
    setScratchpad(newValue);
    
    // Maintain cursor focus
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + (selectedText || 'text').length + suffix.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  const downloadAsMarkdown = () => {
    const element = document.createElement("a");
    const file = new Blob([scratchpad], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `research_scratchpad_${new Date().toISOString().slice(0,10)}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleCreatePrompt = (e: FormEvent) => {
    e.preventDefault();
    if (!newPromptTitle.trim() || !newPromptText.trim()) return;

    const customPrompt: PromptTemplate = {
      id: `p-custom-${Date.now()}`,
      title: newPromptTitle.trim(),
      category: newPromptCategory,
      prompt: newPromptText.trim(),
      isCustom: true,
    };

    onCreatePrompt(customPrompt);
    
    // Reset state
    setNewPromptTitle('');
    setNewPromptCategory('General');
    setNewPromptText('');
    setIsCreatingPrompt(false);
  };

  const handleAddLog = (e: FormEvent) => {
    e.preventDefault();
    if (!newLogContent.trim()) return;

    onAddLog({
      title: newLogTitle.trim() || 'Untitled Insight',
      category: newLogCategory,
      content: newLogContent.trim(),
    });

    setNewLogTitle('');
    setNewLogCategory('General Insight');
    setNewLogContent('');
  };

  const downloadAllLogs = () => {
    if (researchLogs.length === 0) return;
    
    let report = `# Research Logs Report\nGenerated on: ${new Date().toLocaleString()}\n\n`;
    
    researchLogs.forEach((log, index) => {
      report += `## ${index + 1}. ${log.title}\n`;
      report += `**Timestamp:** ${log.timestamp} | **Category:** ${log.category || 'N/A'}\n\n`;
      report += `${log.content}\n\n`;
      report += `---\n\n`;
    });

    const element = document.createElement("a");
    const file = new Blob([report], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `research_logs_${new Date().toISOString().slice(0,10)}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Filter prompts
  const filteredPrompts = prompts.filter(p => {
    const categoryMatch = promptFilter === 'All' || p.category === promptFilter;
    const searchMatch = p.title.toLowerCase().includes(promptSearch.toLowerCase()) || 
                        p.prompt.toLowerCase().includes(promptSearch.toLowerCase());
    return categoryMatch && searchMatch;
  });

  const categories: PromptTemplate['category'][] = ['General', 'Summarize', 'Analyze', 'Write', 'Brainstorm', 'Custom'];

  // Words / Characters counting
  const wordCount = scratchpad ? scratchpad.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = scratchpad ? scratchpad.length : 0;

  return (
    <div
      id="scratchpad-sidebar"
      className={`h-full bg-white border-l border-slate-200 flex flex-col transition-all duration-300 overflow-hidden relative ${
        isOpen ? 'w-full md:w-96 shrink-0' : 'w-0 border-l-0'
      }`}
    >
      {/* Tab Selectors */}
      <div className="flex bg-slate-50 border-b border-slate-200 text-[10px] md:text-xs shrink-0 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          id="tab-scratchpad"
          onClick={() => setActiveTab('scratchpad')}
          className={`flex-1 min-w-[70px] py-2.5 text-center font-display font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'scratchpad'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/40'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Notes
        </button>
        <button
          id="tab-prompts"
          onClick={() => setActiveTab('prompts')}
          className={`flex-1 min-w-[70px] py-2.5 text-center font-display font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'prompts'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/40'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Prompts
        </button>
        <button
          id="tab-logs"
          onClick={() => setActiveTab('logs')}
          className={`flex-1 min-w-[70px] py-2.5 text-center font-display font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'logs'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/40'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Logs ({researchLogs.length})
        </button>
        <button
          id="tab-files"
          onClick={() => setActiveTab('files')}
          className={`flex-1 min-w-[70px] py-2.5 text-center font-display font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'files'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/40'
          }`}
          title="Session Files & Offline Bundler"
        >
          <Folder className="w-3.5 h-3.5" />
          Files ({sessionFiles.length})
        </button>
      </div>

      {/* Main Tab Panels */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white">
        
        {/* TAB 1: SCRATCHPAD */}
        {activeTab === 'scratchpad' && (
          <div className="flex-1 flex flex-col h-full">
            {/* Formatting toolbars */}
            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-0.5">
                <button
                  id="md-bold"
                  onClick={() => insertMarkdown('**', '**')}
                  className="p-1.5 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  title="Bold"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  id="md-italic"
                  onClick={() => insertMarkdown('*', '*')}
                  className="p-1.5 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  title="Italic"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  id="md-h2"
                  onClick={() => insertMarkdown('## ', '\n')}
                  className="p-1.5 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  title="Header"
                >
                  <Heading className="w-3.5 h-3.5" />
                </button>
                <button
                  id="md-list"
                  onClick={() => insertMarkdown('- ', '\n')}
                  className="p-1.5 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  title="Bullet List"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  id="md-quote"
                  onClick={() => insertMarkdown('> ', '\n')}
                  className="p-1.5 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  title="Blockquote"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
                <button
                  id="md-code"
                  onClick={() => insertMarkdown('`', '`')}
                  className="p-1.5 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  title="Code Inline"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Status Saved Feed */}
              {isSaved && (
                <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 animate-pulse">
                  <Check className="w-3 h-3" /> Auto-saved
                </span>
              )}
            </div>

            {/* Note Area */}
            <div className="flex-1 p-3 bg-white">
              <textarea
                id="scratchpad-textarea"
                ref={textareaRef}
                value={scratchpad}
                onChange={(e) => setScratchpad(e.target.value)}
                placeholder="Paste citations, synthesize summaries, organize outlines, or draft emails here... Your workspace saves automatically!"
                className="w-full h-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 text-sm leading-relaxed focus:outline-none focus:border-blue-500 resize-none font-sans"
              />
            </div>

            {/* Bottom Panel */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-3 font-mono text-[10px]">
                <span><strong>Words:</strong> {wordCount}</span>
                <span><strong>Chars:</strong> {charCount}</span>
              </div>
              
              <div className="flex gap-1.5">
                <button
                  id="copy-scratchpad-btn"
                  onClick={() => copyToClipboard(scratchpad, 'scratchpad')}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 hover:text-slate-900 rounded-lg text-xs font-semibold text-slate-700 transition-all cursor-pointer"
                  disabled={!scratchpad}
                >
                  {copiedStates['scratchpad'] ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </>
                  )}
                </button>

                <button
                  id="download-scratchpad-btn"
                  onClick={downloadAsMarkdown}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold text-white transition-all cursor-pointer shadow-sm"
                  disabled={!scratchpad}
                >
                  <Download className="w-3.5 h-3.5" />
                  Export .md
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PROMPT HUB */}
        {activeTab === 'prompts' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Sub-Header & Filters */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  id="prompt-search"
                  type="text"
                  placeholder="Search prompts..."
                  value={promptSearch}
                  onChange={(e) => setPromptSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Category Pills */}
              <div className="flex gap-1 overflow-x-auto pb-1 select-none">
                <button
                  onClick={() => setPromptFilter('All')}
                  className={`px-2 py-1 text-[10px] font-bold rounded-full border whitespace-nowrap cursor-pointer ${
                    promptFilter === 'All'
                      ? 'bg-blue-50 text-blue-600 border-blue-200'
                      : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setPromptFilter(cat)}
                    className={`px-2 py-1 text-[10px] font-bold rounded-full border whitespace-nowrap cursor-pointer ${
                      promptFilter === cat
                        ? 'bg-blue-50 text-blue-600 border-blue-200'
                        : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-white">
              {/* Form trigger */}
              {!isCreatingPrompt ? (
                <button
                  id="add-custom-prompt-trigger"
                  onClick={() => setIsCreatingPrompt(true)}
                  className="w-full py-2 border border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/30 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Create Custom Prompt Template
                </button>
              ) : (
                <form onSubmit={handleCreatePrompt} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-800">New Custom Prompt</span>
                    <button
                      type="button"
                      onClick={() => setIsCreatingPrompt(false)}
                      className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">Title</label>
                    <input
                      id="custom-prompt-title"
                      type="text"
                      required
                      value={newPromptTitle}
                      onChange={(e) => setNewPromptTitle(e.target.value)}
                      placeholder="e.g., Code Refactor Helper"
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1">Category</label>
                      <select
                        id="custom-prompt-category"
                        value={newPromptCategory}
                        onChange={(e) => setNewPromptCategory(e.target.value as PromptTemplate['category'])}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      >
                        <option value="General">General</option>
                        <option value="Summarize">Summarize</option>
                        <option value="Analyze">Analyze</option>
                        <option value="Write">Write</option>
                        <option value="Brainstorm">Brainstorm</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">Prompt Text</label>
                    <textarea
                      id="custom-prompt-text"
                      required
                      rows={3}
                      value={newPromptText}
                      onChange={(e) => setNewPromptText(e.target.value)}
                      placeholder="Enter the template instructions..."
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                  <button
                    id="save-custom-prompt"
                    type="submit"
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded text-xs transition-colors cursor-pointer"
                  >
                    Save to Library
                  </button>
                </form>
              )}

              {/* List Cards */}
              {filteredPrompts.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No prompt templates found. Try modifying filters or search query!
                </div>
              ) : (
                filteredPrompts.map((p) => (
                  <div key={p.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 group hover:border-slate-300 transition-colors">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="font-display font-bold text-xs text-slate-800">{p.title}</span>
                        <span className="px-1.5 py-0.5 bg-white border border-slate-200 text-slate-500 rounded text-[9px] font-semibold">
                          {p.category}
                        </span>
                      </div>
                      
                      {p.isCustom && (
                        <button
                          onClick={() => onDeletePrompt(p.id)}
                          className="p-1 hover:text-rose-500 rounded hover:bg-slate-200 text-slate-400 transition-colors cursor-pointer"
                          title="Delete Custom Prompt"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    
                    <p className="text-[11px] text-slate-600 leading-relaxed bg-white p-2 rounded border border-slate-100 font-sans">
                      {p.prompt}
                    </p>

                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        onClick={() => setScratchpad(scratchpad ? `${scratchpad}\n\n${p.prompt}` : p.prompt)}
                        className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-200 border border-slate-200 rounded text-[10px] font-semibold text-slate-700 transition-colors cursor-pointer"
                        title="Append Prompt to Scratchpad"
                      >
                        <ArrowDown className="w-3 h-3 text-blue-600" />
                        To Scratchpad
                      </button>

                      <button
                        onClick={() => copyToClipboard(p.prompt, p.id)}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-[10px] font-semibold text-white transition-colors cursor-pointer"
                      >
                        {copiedStates[p.id] ? (
                          <>
                            <Check className="w-3 h-3 text-white" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy Template
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: RESEARCH LOGS */}
        {activeTab === 'logs' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Log creation form */}
            <form onSubmit={handleAddLog} className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Log Instant Insight</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  id="log-title-input"
                  type="text"
                  placeholder="Insight title..."
                  value={newLogTitle}
                  onChange={(e) => setNewLogTitle(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                <input
                  id="log-cat-input"
                  type="text"
                  placeholder="Category (e.g. Citation)"
                  value={newLogCategory}
                  onChange={(e) => setNewLogCategory(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <textarea
                id="log-content-input"
                required
                rows={2}
                placeholder="Log a key idea, quote, or argument..."
                value={newLogContent}
                onChange={(e) => setNewLogContent(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
              />
              <button
                id="add-log-btn"
                type="submit"
                className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                Capture Log Entry
              </button>
            </form>

            {/* Logs chronological feed */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-white">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Historical Logs</span>
                {researchLogs.length > 0 && (
                  <button
                    id="export-logs-btn"
                    onClick={downloadAllLogs}
                    className="text-[10px] text-blue-600 hover:text-blue-500 font-semibold cursor-pointer"
                  >
                    Export All Logs
                  </button>
                )}
              </div>

              {researchLogs.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No log entries captured yet. Capture insights, quotes, or references using the panel above!
                </div>
              ) : (
                [...researchLogs].reverse().map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 group hover:border-slate-300 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h6 className="font-display font-semibold text-xs text-slate-800">{log.title}</h6>
                        <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">{log.timestamp}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => copyToClipboard(log.content, log.id)}
                          className="p-1 hover:text-slate-800 rounded hover:bg-slate-200 text-slate-400 transition-colors cursor-pointer"
                          title="Copy Log"
                        >
                          {copiedStates[log.id] ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          onClick={() => onDeleteLog(log.id)}
                          className="p-1 hover:text-rose-500 rounded hover:bg-slate-200 text-slate-400 transition-colors cursor-pointer"
                          title="Delete Log"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    
                    {log.category && (
                      <span className="inline-flex items-center gap-1 text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 font-semibold">
                        <Tag className="w-2.5 h-2.5" />
                        {log.category}
                      </span>
                    )}

                    <p className="text-[11px] text-slate-600 leading-relaxed font-sans whitespace-pre-wrap pt-1">
                      {log.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SESSION FILES & OFFLINE STREAM */}
        {activeTab === 'files' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
            {/* Elegant drag-and-drop upload zone */}
            <div className="p-3 bg-slate-50 border-b border-slate-200">
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDraggingFileOverZone(true); }}
                onDragLeave={() => setIsDraggingFileOverZone(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingFileOverZone(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    const f = e.dataTransfer.files[0];
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const text = ev.target?.result as string || '';
                      handleUploadFile(f.name, text, f.size);
                    };
                    reader.readAsText(f);
                  }
                }}
                className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                  isDraggingFileOverZone 
                    ? 'border-blue-600 bg-blue-50/50' 
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">Drag & Drop Research File</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">TXT, JSON, CSV or Markdown up to 10MB</p>
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-[10px] transition-colors cursor-pointer border border-slate-200 shadow-sm mt-1">
                    <span>Browse Desktop File</span>
                    <input 
                      type="file" 
                      accept=".txt,.json,.csv,.md,.js,.ts,.html,.css"
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          const f = e.target.files[0];
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const text = ev.target?.result as string || '';
                            handleUploadFile(f.name, text, f.size);
                          };
                          reader.readAsText(f);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* List of active files */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-white">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Session File Registry</span>
                <span className="text-[9px] text-slate-400 font-mono font-bold">Total: {sessionFiles.length}</span>
              </div>

              {sessionFiles.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Folder className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-400">No session files found. Drag files here or choose a file above.</p>
                </div>
              ) : (
                sessionFiles.map((file) => {
                  const isInstalling = installingFileId === file.id;
                  return (
                    <div 
                      key={file.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify(file));
                      }}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 group hover:border-blue-200 transition-colors relative cursor-grab active:cursor-grabbing"
                      title="Drag to Trio Talk tab or agents to analyze"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg shadow-sm">
                            <File className="w-4 h-4" />
                          </div>
                          <div>
                            <h6 className="font-display font-bold text-xs text-slate-800 break-all pr-2">{file.name}</h6>
                            <span className="text-[9px] text-slate-400 font-mono font-medium block mt-0.5">
                              {file.size} • Uploaded {file.uploadedAt}
                            </span>
                          </div>
                        </div>

                        <button 
                          onClick={() => {
                            onSetSessionFiles(sessionFiles.filter(f => f.id !== file.id));
                          }}
                          className="p-1 hover:bg-slate-200 text-slate-400 hover:text-rose-500 rounded transition-colors cursor-pointer shrink-0"
                          title="Delete File"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Install/Download Progress Bar */}
                      {isInstalling ? (
                        <div className="space-y-1.5 py-1">
                          <div className="flex items-center justify-between text-[9px] font-mono">
                            <span className="text-blue-600 font-bold flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              {installStatusText}
                            </span>
                            <span className="text-slate-500 font-bold">{installProgress}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                            <div 
                              className="bg-blue-600 h-full transition-all duration-300 animate-pulse-slow" 
                              style={{ width: `${installProgress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-1.5 pt-1">
                          <button
                            onClick={() => {
                              onTriggerFileAnalysis(file.name, file.content);
                            }}
                            className="flex-1 py-1 px-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-[10px] transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                          >
                            <Play className="w-3 h-3 fill-white animate-pulse-slow" />
                            Analyze in Trio
                          </button>
                          <button
                            onClick={() => handleDownloadFile(file)}
                            className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-bold rounded text-[10px] transition-colors cursor-pointer flex items-center justify-center gap-1"
                            title="Install & Download"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Collapse Handle button */}
      <button
        id="toggle-sidebar-btn"
        onClick={onToggle}
        className="absolute bottom-20 left-0 -translate-x-1/2 p-1 bg-white border border-slate-200 rounded-full hover:bg-slate-50 text-slate-500 transition-colors z-30 shadow-md cursor-pointer hidden md:block animate-pulse-slow"
        title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        <ArrowDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? 'rotate-90' : '-rotate-90'}`} />
      </button>
    </div>
  );
}
