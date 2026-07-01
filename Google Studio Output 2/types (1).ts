import React, { useState, useRef } from 'react';
import { ChatMessage, LLMPlatform, ChatSession } from '../types';
import { parseChatTranscript, generateSessionTitle } from '../utils/parser';
import { Clipboard, Sparkles, Trash2, Edit2, Check, User, Bot, AlertCircle, FileText, ToggleLeft, ToggleRight, Plus, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TranscriptParserProps {
  onSessionParsed: (session: ChatSession) => void;
  currentSession: ChatSession | null;
  setCurrentSession: React.Dispatch<React.SetStateAction<ChatSession | null>>;
}

export default function TranscriptParser({
  onSessionParsed,
  currentSession,
  setCurrentSession,
}: TranscriptParserProps) {
  const [rawText, setRawText] = useState('');
  const [manualPlatform, setManualPlatform] = useState<LLMPlatform>('gemini');
  const [showRaw, setShowRaw] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);
  const pasteAreaRef = useRef<HTMLTextAreaElement>(null);

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setRawText(text);
    if (!text.trim()) return;

    try {
      const parsed = parseChatTranscript(text);
      if (parsed.messages.length === 0) {
        setPasteError('Could not identify any conversation turns. We will treat this as a single User message.');
      } else {
        setPasteError(null);
      }

      const platform = parsed.detectedPlatform === 'custom' ? manualPlatform : parsed.detectedPlatform;
      const title = generateSessionTitle(parsed.messages);

      const newSession: ChatSession = {
        id: `session-${Date.now()}`,
        title,
        source: platform,
        messages: parsed.messages,
        createdAt: Date.now(),
      };

      onSessionParsed(newSession);
      setRawText(''); // Clear paste area on success
    } catch (err: any) {
      setPasteError('Failed to parse the transcript. Please try copying a cleaner block.');
    }
  };

  const handleManualPaste = () => {
    if (pasteAreaRef.current) {
      pasteAreaRef.current.focus();
    }
  };

  const handleClearSession = () => {
    setCurrentSession(null);
    setRawText('');
    setPasteError(null);
  };

  const handleUpdateMessage = (id: string) => {
    if (!currentSession) return;
    
    const updatedMessages = currentSession.messages.map((m) =>
      m.id === id ? { ...m, content: editContent } : m
    );

    const updatedSession = {
      ...currentSession,
      title: generateSessionTitle(updatedMessages),
      messages: updatedMessages,
    };

    setCurrentSession(updatedSession);
    setEditingMessageId(null);
  };

  const handleDeleteMessage = (id: string) => {
    if (!currentSession) return;

    const filteredMessages = currentSession.messages.filter((m) => m.id !== id);
    if (filteredMessages.length === 0) {
      setCurrentSession(null);
      return;
    }

    const updatedSession = {
      ...currentSession,
      title: generateSessionTitle(filteredMessages),
      messages: filteredMessages,
    };

    setCurrentSession(updatedSession);
  };

  const handleAddMessage = (sender: 'user' | 'assistant') => {
    if (!currentSession) return;

    const newMessage: ChatMessage = {
      id: `msg-manual-${Date.now()}`,
      sender,
      content: 'New message block...',
    };

    const updatedMessages = [...currentSession.messages, newMessage];
    const updatedSession = {
      ...currentSession,
      messages: updatedMessages,
    };

    setCurrentSession(updatedSession);
    setEditingMessageId(newMessage.id);
    setEditContent(newMessage.content);
  };

  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
  };

  const handlePlatformChange = (platform: LLMPlatform) => {
    if (currentSession) {
      setCurrentSession({
        ...currentSession,
        source: platform,
      });
    } else {
      setManualPlatform(platform);
    }
  };

  return (
    <div id="transcript-parser-container" className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-xs flex flex-col h-full min-h-[480px]">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-semibold text-neutral-800 tracking-tight text-lg flex items-center gap-2">
            <Clipboard className="w-5 h-5 text-neutral-600" />
            1. Paste & Extract Transcript
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Copy conversational threads from Gemini or Claude and paste them below
          </p>
        </div>

        {currentSession && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {showRaw ? (
                <>
                  <Eye className="w-3.5 h-3.5" /> Visual Chat
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5" /> Raw Format
                </>
              )}
            </button>
            <button
              onClick={handleClearSession}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-transparent transition-all flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        )}
      </div>

      {/* Mode Selectors */}
      <div className="flex gap-2 mb-4">
        {(['gemini', 'claude', 'chatgpt', 'custom'] as LLMPlatform[]).map((platform) => (
          <button
            key={platform}
            onClick={() => handlePlatformChange(platform)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all border cursor-pointer capitalize ${
              (currentSession ? currentSession.source : manualPlatform) === platform
                ? 'bg-neutral-900 border-neutral-900 text-white shadow-xs'
                : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            {platform}
          </button>
        ))}
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {!currentSession ? (
          <div className="flex-1 flex flex-col relative rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50/80 transition-all p-5">
            <textarea
              ref={pasteAreaRef}
              value={rawText}
              onChange={handlePasteChange}
              placeholder={`Paste Gemini, Claude, or ChatGPT transcript here...

Example format:
You: Tell me about space.
Gemini: Space is the vast...`}
              className="w-full flex-1 bg-transparent border-0 outline-hidden focus:ring-0 text-sm font-medium text-neutral-600 placeholder-neutral-400 resize-none min-h-[220px]"
            />
            
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-40 select-none px-4 text-center" style={{ display: rawText ? 'none' : 'flex' }}>
              <Sparkles className="w-10 h-10 text-neutral-400 mb-2" />
              <p className="text-sm font-bold text-neutral-700">Paste raw text from another chat</p>
              <p className="text-xs text-neutral-500 mt-1 max-w-xs">
                Ctrl+A and copy Claude or Gemini page, then press Ctrl+V here to instantly extract structured turns.
              </p>
            </div>

            {pasteError && (
              <div className="mt-3 flex items-start gap-2 bg-amber-50 p-2.5 rounded-lg border border-amber-100 text-xs text-amber-700 leading-normal">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{pasteError}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 bg-neutral-50 border border-neutral-200/60 rounded-xl overflow-hidden">
            {/* Title display */}
            <div className="bg-white border-b border-neutral-100 px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                PARSED SESSION
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-neutral-100 rounded-md text-neutral-600">
                {currentSession.messages.length} Turns
              </span>
            </div>

            {showRaw ? (
              <pre className="flex-1 overflow-auto p-4 font-mono text-xs text-neutral-600 bg-neutral-900 text-neutral-200 leading-relaxed rounded-b-xl whitespace-pre-wrap">
                {currentSession.messages
                  .map((msg) => `[${msg.sender.toUpperCase()}]:\n${msg.content}`)
                  .join('\n\n')}
              </pre>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <AnimatePresence initial={false}>
                  {currentSession.messages.map((msg, index) => {
                    const isUser = msg.sender === 'user';
                    const isEditing = editingMessageId === msg.id;

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className={`flex gap-3 items-start group ${
                          isUser ? 'flex-row-reverse' : 'flex-row'
                        }`}
                      >
                        {/* Avatar */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                            isUser
                              ? 'bg-neutral-800 border-neutral-700 text-white'
                              : currentSession.source === 'gemini'
                              ? 'bg-blue-50 border-blue-200 text-blue-600'
                              : currentSession.source === 'claude'
                              ? 'bg-amber-50 border-amber-200 text-amber-700'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                          }`}
                        >
                          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>

                        {/* Speech Bubble */}
                        <div className="max-w-[82%] flex flex-col gap-1">
                          <div className={`flex items-center gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                              {isUser ? 'You' : currentSession.source}
                            </span>
                            
                            {/* Message actions (edit, delete) */}
                            {!isEditing && (
                              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                <button
                                  onClick={() => handleStartEdit(msg)}
                                  className="p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-200 rounded-md transition-colors cursor-pointer"
                                  title="Edit message turn"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                  title="Delete message turn"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          {isEditing ? (
                            <div className="bg-white p-3 rounded-2xl border border-neutral-200 shadow-sm min-w-[280px]">
                              <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full text-sm border-0 focus:ring-0 p-0 text-neutral-700 outline-hidden resize-y min-h-[80px]"
                                autoFocus
                              />
                              <div className="flex justify-end gap-1.5 mt-2 pt-2 border-t border-neutral-100">
                                <button
                                  onClick={() => setEditingMessageId(null)}
                                  className="text-xs font-semibold px-2 py-1 text-neutral-500 hover:bg-neutral-50 rounded-md cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleUpdateMessage(msg.id)}
                                  className="text-xs font-bold px-2 py-1 bg-neutral-900 text-white rounded-md hover:bg-neutral-800 flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3 h-3" /> Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className={`p-3.5 rounded-2xl text-sm font-medium leading-relaxed shadow-2xs whitespace-pre-wrap ${
                                isUser
                                  ? 'bg-neutral-800 text-neutral-100 rounded-tr-none'
                                  : 'bg-white text-neutral-700 border border-neutral-150 rounded-tl-none'
                              }`}
                            >
                              {msg.content}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Insertion row */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => handleAddMessage('user')}
                    className="text-[10px] font-bold text-neutral-500 hover:text-neutral-800 bg-white border border-neutral-200 hover:border-neutral-300 px-3 py-1.5 rounded-full flex items-center gap-1 cursor-pointer transition-all hover:shadow-xs"
                  >
                    <Plus className="w-3 h-3" /> Add User Turn
                  </button>
                  <button
                    onClick={() => handleAddMessage('assistant')}
                    className="text-[10px] font-bold text-neutral-500 hover:text-neutral-800 bg-white border border-neutral-200 hover:border-neutral-300 px-3 py-1.5 rounded-full flex items-center gap-1 cursor-pointer transition-all hover:shadow-xs"
                  >
                    <Plus className="w-3 h-3" /> Add AI Turn
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
