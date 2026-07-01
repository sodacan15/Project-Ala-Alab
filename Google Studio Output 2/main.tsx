import React, { useState } from 'react';
import { TabInfo } from '../types';
import { Laptop, Wifi, RefreshCw, PlusCircle, AlertCircle, Copy, Check, ShieldAlert } from 'lucide-react';

interface TabConnectorProps {
  currentTabId: string;
  tabName: string;
  setTabName: (name: string) => void;
  tabRole: 'gemini_companion' | 'claude_companion' | 'neutral';
  setTabRole: (role: 'gemini_companion' | 'claude_companion' | 'neutral') => void;
  connectedTabs: TabInfo[];
  triggerDiscovery: () => void;
}

export default function TabConnector({
  currentTabId,
  tabName,
  setTabName,
  tabRole,
  setTabRole,
  connectedTabs,
  triggerDiscovery,
}: TabConnectorProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(tabName);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleSaveName = () => {
    if (tempName.trim()) {
      setTabName(tempName.trim());
      setIsEditingName(false);
    }
  };

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const copyAppUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const requestNotificationPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  };

  return (
    <div id="tab-connector-container" className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-xs">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <h2 className="font-semibold text-neutral-800 tracking-tight text-lg">Cross-Tab Sync Network</h2>
        </div>
        <button
          onClick={triggerDiscovery}
          className="p-1.5 hover:bg-neutral-50 rounded-lg text-neutral-400 hover:text-neutral-600 transition-colors"
          title="Refresh active connections"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Role Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">
            This Tab Name
          </label>
          {isEditingName ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                autoFocus
                className="w-full text-sm px-3 py-1.5 border border-neutral-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-neutral-500 font-medium"
              />
            </div>
          ) : (
            <div
              onClick={() => {
                setTempName(tabName);
                setIsEditingName(true);
              }}
              className="text-sm font-semibold text-neutral-700 px-3 py-1.5 hover:bg-neutral-50 border border-transparent hover:border-neutral-200 rounded-lg cursor-pointer transition-all truncate"
            >
              {tabName}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">
            This Tab Role & Preset
          </label>
          <select
            value={tabRole}
            onChange={(e) => setTabRole(e.target.value as any)}
            className="w-full text-sm px-3 py-1.5 border border-neutral-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-neutral-500 font-medium bg-white text-neutral-700"
          >
            <option value="neutral">Neutral Hub (Receive All)</option>
            <option value="gemini_companion">Gemini Companion Side</option>
            <option value="claude_companion">Claude Companion Side</option>
          </select>
        </div>
      </div>

      {/* Device Connection Hub */}
      <div className="border-t border-neutral-100 pt-5">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Connected Peers ({connectedTabs.length})
          </span>
          {connectedTabs.length === 0 && (
            <div className="flex gap-2">
              <button
                onClick={copyAppUrl}
                className="text-xs text-neutral-500 hover:text-neutral-800 flex items-center gap-1 cursor-pointer"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                Copy App Link
              </button>
              <span className="text-neutral-200">|</span>
              <button
                onClick={handleOpenNewTab}
                className="text-xs text-neutral-600 font-medium hover:text-neutral-900 flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Open Second Tab
              </button>
            </div>
          )}
        </div>

        {connectedTabs.length === 0 ? (
          <div className="bg-neutral-50 rounded-xl p-4 border border-dashed border-neutral-200 text-center">
            <Laptop className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-neutral-600">No other tabs detected</p>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
              Open another tab, arrange them side-by-side, paste a chat transcript in one, and beam it over instantly!
            </p>
            <button
              onClick={handleOpenNewTab}
              className="mt-3 inline-flex items-center gap-1.5 text-xs bg-neutral-900 text-white font-medium py-1.5 px-3.5 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Open Linked Companion Tab
            </button>
          </div>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {connectedTabs.map((peer) => (
              <div
                key={peer.id}
                className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-100 transition-all hover:bg-white hover:border-neutral-200"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 text-xs font-bold">
                      {peer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-700 truncate">{peer.name}</p>
                    <p className="text-[10px] text-neutral-400 font-medium">
                      {peer.role === 'gemini_companion'
                        ? 'Gemini Companion'
                        : peer.role === 'claude_companion'
                        ? 'Claude Companion'
                        : 'Neutral Hub'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-neutral-200/60 text-neutral-600 px-2 py-0.5 rounded-full font-mono">
                    {peer.id.split('-')[1] || peer.id}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Optional permission reminder */}
      {'Notification' in window && Notification.permission === 'default' && (
        <div className="mt-4 flex items-start gap-2 bg-amber-50/50 p-3 rounded-xl border border-amber-100 text-[11px] text-amber-700 leading-normal">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <div className="flex-1">
            Enable browser notifications to receive soundless desk signals when other tabs beam context to this one.
            <button
              onClick={requestNotificationPermission}
              className="underline font-semibold block mt-1 hover:text-amber-900 cursor-pointer"
            >
              Enable Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
