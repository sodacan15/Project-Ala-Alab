import React, { useState } from 'react';
import { useTabBridge } from './hooks/useTabBridge';
import TabConnector from './components/TabConnector';
import TranscriptParser from './components/TranscriptParser';
import PromptBuilder from './components/PromptBuilder';
import SyncedPacketReceiver from './components/SyncedPacketReceiver';
import SyncHistoryPanel from './components/SyncHistoryPanel';
import LinkManager from './components/LinkManager';
import { ChatSession, SyncPacket } from './types';
import { compilePortablePrompt } from './utils/templates';
import { Sparkles, ArrowRightLeft, HelpCircle, BookOpen, AlertCircle, Laptop, Settings, ArrowRight, Clipboard } from 'lucide-react';

export default function App() {
  const {
    tabId,
    tabName,
    setTabName,
    tabRole,
    setTabRole,
    connectedTabs,
    incomingPacket,
    setIncomingPacket,
    beamSession,
    sentHistory,
    receivedHistory,
    clearHistory,
    triggerDiscovery,
  } = useTabBridge();

  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [showHowTo, setShowHowTo] = useState(true);

  // Handle accepting a beamed packet
  const handleAcceptPacket = (packet: SyncPacket) => {
    setCurrentSession(packet.session);
    setIncomingPacket(null);
  };

  // Handle selecting a history packet
  const handleSelectHistoryPacket = (packet: SyncPacket) => {
    setCurrentSession(packet.session);
  };

  return (
    <div className="min-h-screen bg-neutral-50/50 flex flex-col selection:bg-neutral-800 selection:text-white">
      {/* Header */}
      <header className="bg-white border-b border-neutral-100 shrink-0 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center text-white font-black tracking-tighter text-lg shadow-sm">
              ⇄
            </div>
            <div>
              <h1 className="text-lg font-black text-neutral-900 tracking-tight flex items-center gap-2">
                LLM Chat Bridge
                <span className="text-[10px] font-bold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
                  v1.2 client-only
                </span>
              </h1>
              <p className="text-xs text-neutral-400 font-medium">
                Seamless prompt portability and zero-API cross-tab synchronizer
              </p>
            </div>
          </div>

          {/* Network Banner */}
          <div className="flex items-center gap-3">
            <div className="bg-neutral-50 rounded-lg px-3 py-1.5 border border-neutral-200/60 flex items-center gap-2 text-xs font-semibold text-neutral-600">
              <Laptop className="w-4 h-4 text-neutral-400" />
              <span>
                Tabs Connected:{' '}
                <b className="text-neutral-900 font-bold">{connectedTabs.length + 1}</b>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Onboarding walkthrough */}
        {showHowTo && (
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setShowHowTo(false)}
                className="text-xs text-neutral-400 hover:text-neutral-600 font-semibold cursor-pointer"
              >
                Dismiss Guide
              </button>
            </div>
            <div className="flex gap-4 items-start max-w-3xl">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-neutral-800 text-sm tracking-tight">
                  Seamless Conversational Portability
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Have you ever started a deep conversation in Gemini, only to reach its context limit, and want to continue it directly in Claude (or vice versa) without copy-pasting individual messages manually? 
                </p>
                
                {/* Visual Steps */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 text-xs">
                  <div className="space-y-1">
                    <p className="font-bold text-neutral-700 flex items-center gap-1">
                      <span className="w-4 h-4 rounded-full bg-neutral-900 text-white text-[9px] font-mono flex items-center justify-center">1</span>
                      Copy & Extract
                    </p>
                    <p className="text-neutral-400 leading-normal text-[11px]">
                      Press <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-[9px] font-mono">Ctrl+A</kbd> then <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-[9px] font-mono">Ctrl+C</kbd> on your Gemini page and paste it into the <b>Parser</b>. We'll strip out all the UI fluff, buttons, and ratings automatically!
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-neutral-700 flex items-center gap-1">
                      <span className="w-4 h-4 rounded-full bg-neutral-900 text-white text-[9px] font-mono flex items-center justify-center">2</span>
                      Arrange Tabs
                    </p>
                    <p className="text-neutral-400 leading-normal text-[11px]">
                      Click <b>"Open Second Tab"</b> and position the two tabs side-by-side. Make one the <b>Gemini Companion</b> and the other the <b>Claude Companion</b>.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-neutral-700 flex items-center gap-1">
                      <span className="w-4 h-4 rounded-full bg-neutral-900 text-white text-[9px] font-mono flex items-center justify-center">3</span>
                      Beam Context
                    </p>
                    <p className="text-neutral-400 leading-normal text-[11px]">
                      Press <b>"Beam"</b> on Tab A. Your formatted, ready-to-paste context flies instantly over to Tab B. One-click copy, paste it in Claude, and pick up right where you left off!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Network & History Settings (3 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <TabConnector
              currentTabId={tabId}
              tabName={tabName}
              setTabName={setTabName}
              tabRole={tabRole}
              setTabRole={setTabRole}
              connectedTabs={connectedTabs}
              triggerDiscovery={triggerDiscovery}
            />

            <LinkManager
              currentSession={currentSession}
              onSessionParsed={(session) => {
                setCurrentSession(session);
              }}
              onCopyPrompt={(templateId = 'continuity') => {
                if (!currentSession) return;
                const compiled = compilePortablePrompt(
                  currentSession.messages,
                  currentSession.source,
                  templateId
                );
                navigator.clipboard.writeText(compiled);
              }}
            />

            <SyncHistoryPanel
              sentHistory={sentHistory}
              receivedHistory={receivedHistory}
              onSelectPacket={handleSelectHistoryPacket}
              onClearHistory={clearHistory}
            />

            {/* Zero API Architecture Guide */}
            <div className="bg-neutral-50/50 rounded-2xl border border-neutral-200/50 p-5 space-y-3">
              <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5" />
                Security & Specs
              </h4>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                This utility operates entirely on <b>client-side sandbox protocols</b> using the HTML5 <b>BroadcastChannel API</b>.
              </p>
              <ul className="text-[10px] text-neutral-400 space-y-1.5 list-disc list-inside leading-normal">
                <li>No server-side data collection or storage</li>
                <li>No docker orchestrators, API keys, or databases needed</li>
                <li>Your raw prompts and conversations remain completely local</li>
                <li>Works offline under standard browser origins</li>
              </ul>
            </div>
          </div>

          {/* Right Columns: Parser & Prompt Compiler Workspace (8 cols) */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 1: Parser */}
            <div className="md:col-span-1 h-full">
              <TranscriptParser
                onSessionParsed={setCurrentSession}
                currentSession={currentSession}
                setCurrentSession={setCurrentSession}
              />
            </div>

            {/* Step 2: Customizer & Beamer */}
            <div className="md:col-span-1 h-full">
              <PromptBuilder
                session={currentSession}
                beamSession={beamSession}
                connectedCount={connectedTabs.length}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Floating Synced packet handler */}
      <SyncedPacketReceiver
        packet={incomingPacket}
        onAccept={handleAcceptPacket}
        onDismiss={() => setIncomingPacket(null)}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-neutral-100 py-6 mt-auto shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-neutral-400">
          <p>© 2026 LLM Chat Bridge. Made securely with zero external APIs.</p>
          <div className="flex gap-4">
            <button
              onClick={() => setShowHowTo(true)}
              className="hover:text-neutral-600 flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" /> Instructions
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

