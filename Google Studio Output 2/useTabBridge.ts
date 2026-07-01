import React, { useState } from 'react';
import { SyncPacket } from '../types';
import { compilePortablePrompt } from '../utils/templates';
import { History, Copy, Check, Calendar, ArrowUpRight, ArrowDownLeft, Trash2, Zap } from 'lucide-react';

interface SyncHistoryPanelProps {
  sentHistory: SyncPacket[];
  receivedHistory: SyncPacket[];
  onSelectPacket: (packet: SyncPacket) => void;
  onClearHistory: () => void;
}

export default function SyncHistoryPanel({
  sentHistory,
  receivedHistory,
  onSelectPacket,
  onClearHistory,
}: SyncHistoryPanelProps) {
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const historyList = activeTab === 'received' ? receivedHistory : sentHistory;

  const handleCopyPrompt = (packet: SyncPacket, e: React.MouseEvent) => {
    e.stopPropagation();
    const compiled = compilePortablePrompt(
      packet.session.messages,
      packet.session.source,
      'continuity'
    );
    navigator.clipboard.writeText(compiled);
    setCopiedId(packet.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div id="sync-history-panel" className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-xs flex flex-col h-full min-h-[300px]">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="font-semibold text-neutral-800 tracking-tight text-base flex items-center gap-1.5">
          <History className="w-4 h-4 text-neutral-500" />
          History Log
        </h2>
        
        {(sentHistory.length > 0 || receivedHistory.length > 0) && (
          <button
            onClick={onClearHistory}
            className="text-[10px] font-bold text-rose-500 hover:text-rose-700 bg-rose-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
          >
            Clear Log
          </button>
        )}
      </div>

      {/* History Tabs */}
      <div className="flex border-b border-neutral-100 mb-3 text-xs font-semibold shrink-0">
        <button
          onClick={() => setActiveTab('received')}
          className={`flex-1 pb-2 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'received'
              ? 'border-neutral-800 text-neutral-900'
              : 'border-transparent text-neutral-400 hover:text-neutral-600'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5" />
          Beamed to Me ({receivedHistory.length})
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`flex-1 pb-2 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'sent'
              ? 'border-neutral-800 text-neutral-900'
              : 'border-transparent text-neutral-400 hover:text-neutral-600'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          Beamed by Me ({sentHistory.length})
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {historyList.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-8 text-center text-neutral-400">
            <Zap className="w-6 h-6 text-neutral-200 mb-1.5" />
            <p className="text-xs font-bold text-neutral-500">No synced history yet</p>
            <p className="text-[10px] text-neutral-400 max-w-[180px] mx-auto mt-0.5 leading-normal">
              Any packets beamed or received through BroadcastChannel will be cached here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {historyList.map((packet) => {
              const isCopied = copiedId === packet.id;
              return (
                <div
                  key={packet.id}
                  onClick={() => onSelectPacket(packet)}
                  className="p-3 bg-neutral-50 hover:bg-neutral-100/75 rounded-xl border border-neutral-100/80 hover:border-neutral-200 cursor-pointer transition-all flex flex-col gap-2 relative group"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-neutral-500 font-mono">
                      {formatTime(packet.timestamp)}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-neutral-200 text-neutral-600 rounded-sm uppercase">
                      {packet.session.source}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-neutral-700 line-clamp-1 pr-6">
                    {packet.session.title}
                  </p>

                  {packet.note && (
                    <p className="text-[10px] italic text-neutral-500 line-clamp-1 bg-white/60 px-1.5 py-0.5 rounded-sm">
                      "{packet.note}"
                    </p>
                  )}

                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[9px] text-neutral-400 font-medium">
                      {activeTab === 'received' ? `From: ${packet.senderTabName}` : `Sent from me`}
                    </span>
                    
                    <button
                      onClick={(e) => handleCopyPrompt(packet, e)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        isCopied
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-500 hover:text-neutral-700'
                      }`}
                      title="Copy compiled prompt directly"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
