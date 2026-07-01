import React, { useState, useEffect } from 'react';
import { ChatSession, PromptTemplate, LLMPlatform } from '../types';
import { PROMPT_TEMPLATES, compilePortablePrompt } from '../utils/templates';
import { Send, Copy, Check, FileCheck, Sparkles, Sliders, ExternalLink, HelpCircle, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';

interface PromptBuilderProps {
  session: ChatSession | null;
  beamSession: (session: ChatSession, targetRole?: string, note?: string) => boolean;
  connectedCount: number;
}

export default function PromptBuilder({
  session,
  beamSession,
  connectedCount,
}: PromptBuilderProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState('continuity');
  const [compiledPrompt, setCompiledPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [beaming, setBeaming] = useState(false);
  const [beamTarget, setBeamTarget] = useState<string>('neutral');
  const [beamNote, setBeamNote] = useState('');

  // Recompile whenever session or selected template change
  useEffect(() => {
    if (!session) {
      setCompiledPrompt('');
      return;
    }
    const compiled = compilePortablePrompt(session.messages, session.source, selectedTemplateId);
    setCompiledPrompt(compiled);
  }, [session, selectedTemplateId]);

  const handleCopy = () => {
    if (!compiledPrompt) return;
    navigator.clipboard.writeText(compiledPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBeam = () => {
    if (!session) return;
    setBeaming(true);
    
    // Beam using the hook function
    const success = beamSession(session, beamTarget === 'neutral' ? undefined : beamTarget, beamNote);
    
    setTimeout(() => {
      setBeaming(false);
      setBeamNote('');
    }, 1200);
  };

  // Estimate words and approximate tokens
  const wordCount = compiledPrompt ? compiledPrompt.split(/\s+/).filter(Boolean).length : 0;
  const charCount = compiledPrompt ? compiledPrompt.length : 0;
  const estTokens = Math.ceil(charCount / 3.8);

  const selectedTemplate = PROMPT_TEMPLATES.find((t) => t.id === selectedTemplateId);

  return (
    <div id="prompt-builder-container" className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-xs flex flex-col h-full min-h-[480px]">
      <div>
        <h2 className="font-semibold text-neutral-800 tracking-tight text-lg flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-neutral-600" />
          2. Customize & Transport
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          Wrap your parsed conversation and beam it instantly to other tabs or Claude
        </p>
      </div>

      {!session ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-400">
          <Sliders className="w-10 h-10 text-neutral-300 mb-2 stroke-[1.5]" />
          <p className="text-sm font-semibold text-neutral-600">Waiting for parsed chat...</p>
          <p className="text-xs mt-1 max-w-xs">
            Once you paste and extract a conversation in step 1, your portability formatting and tab-beaming controls will activate here.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 mt-5">
          {/* Template presets */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Select Portability Handover Preset
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PROMPT_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedTemplateId === tpl.id
                      ? 'bg-neutral-50/80 border-neutral-800 text-neutral-900 ring-1 ring-neutral-800'
                      : 'bg-white border-neutral-100 hover:border-neutral-200 text-neutral-600'
                  }`}
                >
                  <p className="text-xs font-bold leading-normal truncate">{tpl.name}</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5 line-clamp-1">{tpl.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Compiled text block */}
          <div className="flex-1 flex flex-col min-h-0 bg-neutral-50 rounded-xl border border-neutral-200/60 overflow-hidden relative">
            <div className="bg-white border-b border-neutral-100 px-4 py-2.5 flex items-center justify-between text-xs text-neutral-400 font-bold shrink-0">
              <span className="flex items-center gap-1.5 uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                CONSOLIDATED CONTEXT PROMPT
              </span>
              <div className="flex gap-3 text-[10px] font-mono">
                <span>{charCount.toLocaleString()} chars</span>
                <span>~{estTokens.toLocaleString()} tokens</span>
              </div>
            </div>

            <textarea
              readOnly
              value={compiledPrompt}
              className="flex-1 overflow-y-auto p-4 font-mono text-xs text-neutral-600 focus:outline-hidden resize-none bg-transparent leading-relaxed"
            />

            {/* Quick action floating panel */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <button
                onClick={handleCopy}
                className={`text-xs font-bold px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm border ${
                  copied
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'bg-neutral-900 border-neutral-950 hover:bg-neutral-800 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Consolidated Prompt
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tab Transport Beamer */}
          <div className="mt-5 border-t border-neutral-100 pt-5">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
              Fast Tab Beamer (Zero API Sync)
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1.5">
                  Target Tab Filter
                </label>
                <select
                  value={beamTarget}
                  onChange={(e) => setBeamTarget(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-neutral-200 rounded-lg bg-white text-neutral-600 font-medium"
                >
                  <option value="neutral">All Companion Tabs</option>
                  <option value="gemini_companion">Gemini Companion Tabs only</option>
                  <option value="claude_companion">Claude Companion Tabs only</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1.5">
                  Optional Note/Memo
                </label>
                <input
                  type="text"
                  value={beamNote}
                  onChange={(e) => setBeamNote(e.target.value)}
                  placeholder="e.g. Code fixes, continue summary"
                  className="w-full text-xs px-2.5 py-1.5 border border-neutral-200 rounded-lg text-neutral-600 placeholder-neutral-400 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              disabled={connectedCount === 0 || beaming}
              onClick={handleBeam}
              className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm relative overflow-hidden ${
                connectedCount === 0
                  ? 'bg-neutral-100 border border-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
                  : beaming
                  ? 'bg-emerald-500 border border-emerald-500 text-white'
                  : 'bg-indigo-600 border border-indigo-700 hover:bg-indigo-500 text-white'
              }`}
            >
              {beaming ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Context Beamed Over Browser Wave!
                </motion.div>
              ) : (
                <>
                  <Send className={`w-3.5 h-3.5 ${beaming ? 'animate-bounce' : ''}`} />
                  {connectedCount === 0
                    ? 'No Connected Tabs Available to Beam To'
                    : `Beam Context to ${connectedCount} Active Tab${connectedCount > 1 ? 's' : ''}`}
                </>
              )}
            </button>
            {connectedCount === 0 && (
              <p className="text-[10px] text-neutral-400 mt-1.5 text-center leading-normal">
                To try the zero-API beaming feature, click <b>"Open Second Tab"</b> above, keep them both open side-by-side, then beam!
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
