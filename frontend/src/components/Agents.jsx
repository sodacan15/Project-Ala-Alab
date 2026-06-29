import React, { useEffect, useState, useRef } from 'react';

const AGENTS = ['GEMINI', 'CLAUDE', 'NOTEBOOKLM'];

const agentNameMap = { GEMINI: 'Gemini', CLAUDE: 'Claude', NOTEBOOKLM: 'NotebookLM' };

const AGENT_ROUTES = {
  Gemini: { defaultTo: 'Claude', types: ['intake_summary', 'corpus_query', 'context_update', 'error'] },
  Claude: { defaultTo: 'NotebookLM', types: ['proposed_entry', 'context_update', 'corpus_query', 'error'] },
  NotebookLM: { defaultTo: 'User', types: ['corpus_report', 'synthesis', 'error'] }
};

const ALL_TYPES = ['raw_input', 'intake_summary', 'corpus_query', 'proposed_entry', 'corpus_report', 'context_update', 'confirmation', 'error'];
const SOURCE_TAGS = ['[ORAL]', '[FIELD]', '[OFFICIAL]', '[SYNTHESIS]', '[LINK]', '[IMAGE]'];

function formatBlock(m) {
  const p = m.payload || {};
  return [
    '========================================',
    `[FROM: ${m.from}] / [TO: ${m.to}]`,
    `Type: ${m.type} | ${m.timestamp}`,
    '----------------------------------------',
    p.content || '',
    '----------------------------------------',
    `Source: ${p.source_tag || 'N/A'} | Sensitive: ${p.sensitive || false}`,
    `Note: ${p.note || ''}`,
    '========================================'
  ].join('\n');
}

async function copyToOS(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

export default function Agents({ showToast }) {
  const [activeAgent, setActiveAgent] = useState('GEMINI');
  const [log, setLog] = useState([]);
  const [transit, setTransit] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [clipboard, setClipboard] = useState(null);
  const threadRef = useRef(null);

  // User → Gemini input
  const [userInput, setUserInput] = useState('');
  const [userSending, setUserSending] = useState(false);

  // Receive Response panel
  const [showReceive, setShowReceive] = useState(false);
  const [rxFrom, setRxFrom] = useState('Gemini');
  const [rxTo, setRxTo] = useState('Claude');
  const [rxType, setRxType] = useState('intake_summary');
  const [rxTag, setRxTag] = useState('[SYNTHESIS]');
  const [rxContent, setRxContent] = useState('');
  const [rxNote, setRxNote] = useState('');
  const [rxSending, setRxSending] = useState(false);

  const currentAgent = agentNameMap[activeAgent];

  const fetchAll = async () => {
    try {
      const [logRes, transitRes, clipRes] = await Promise.all([
        fetch('/bridge/log'), fetch('/bridge/transit'), fetch('/clipboard/current')
      ]);
      setLog(await logRes.json());
      setTransit(await transitRes.json());
      const clipData = await clipRes.json();
      setClipboard(clipData.empty ? null : clipData);
    } catch {}
  };

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 2000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [log, activeAgent]);

  // Keep rxTo in sync when rxFrom changes
  useEffect(() => {
    setRxTo(AGENT_ROUTES[rxFrom]?.defaultTo || 'User');
    setRxType(AGENT_ROUTES[rxFrom]?.types[0] || 'intake_summary');
  }, [rxFrom]);

  const agentMessages = log.filter(m => m.from === currentAgent || m.to === currentAgent);

  // ── Send: User → Gemini ─────────────────────────────────────────────────────
  const handleUserSend = async () => {
    if (!userInput.trim()) return;
    setUserSending(true);
    try {
      const res = await fetch('/bridge/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'User', to: 'Gemini', type: 'raw_input',
          timestamp: new Date().toISOString(),
          payload: { content: userInput.trim(), source_tag: '[ORAL]', sensitive: false, requires_confirmation: true, note: '' }
        })
      });
      const data = await res.json();
      if (data.success) {
        setUserInput('');
        fetchAll();
        showToast('Staged → copy from Auditing panel and paste into Gemini.');
      } else {
        showToast('Error: ' + (data.errors?.join(', ') || 'Unknown error'));
      }
    } catch {}
    setUserSending(false);
  };

  // ── Receive: paste AI response ───────────────────────────────────────────────
  const handleReceiveSubmit = async () => {
    if (!rxContent.trim()) return;
    setRxSending(true);
    try {
      const res = await fetch('/bridge/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: rxFrom, to: rxTo, type: rxType,
          timestamp: new Date().toISOString(),
          payload: { content: rxContent.trim(), source_tag: rxTag, sensitive: false, requires_confirmation: true, note: rxNote.trim() }
        })
      });
      const data = await res.json();
      if (data.success) {
        setRxContent(''); setRxNote('');
        setShowReceive(false);
        fetchAll();
        showToast(`Response from ${rxFrom} staged → Auditing panel.`);
      } else {
        showToast('Validation error: ' + (data.errors?.join(', ') || 'Unknown'));
      }
    } catch {}
    setRxSending(false);
  };

  // ── Copy: buffer + OS clipboard ──────────────────────────────────────────────
  const handleCopy = async (msg) => {
    const block = formatBlock(msg);
    await fetch('/clipboard/copy', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: msg.id })
    });
    const copied = await copyToOS(block);
    fetchAll();
    showToast(copied ? 'Copied to OS clipboard — paste into target tab.' : 'Copied to buffer (OS clipboard unavailable).');
  };

  const handleConfirm = async (id) => {
    await fetch(`/bridge/confirm/${id}`, { method: 'POST' });
    fetchAll();
    showToast('Confirmed — message logged.');
  };

  const handleReject = async (id) => {
    await fetch(`/bridge/purge/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'User rejected' }) });
    fetchAll();
    showToast('Rejected and purged.');
  };

  const handlePurgeAll = async () => {
    await Promise.all(transit.map(m =>
      fetch(`/bridge/purge/${m.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'Purged all' }) })
    ));
    fetchAll();
    showToast('All pending messages purged.');
  };

  const handleNewSession = async () => {
    const res = await fetch('/session/new', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    const data = await res.json();
    fetchAll();
    const pre = data.preReset || {};
    showToast(`✓ Context saved. ${pre.lastPromptSaved ? '✓ Last prompt in clipboard.' : ''} New session started.`);
  };

  const handleEndSession = async () => {
    const res = await fetch('/session/current', { method: 'DELETE' });
    const data = await res.json();
    fetchAll();
    showToast('✓ Session ended. Context saved.');
  };

  return (
    <div>
      {/* Sub-tabs */}
      <div className="sub-tabs">
        {AGENTS.map(a => (
          <button key={a} className={`sub-tab ${activeAgent === a ? 'active' : ''}`} onClick={() => setActiveAgent(a)}>
            {a}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          className="btn btn-secondary btn-sm"
          style={{ fontSize: 11, padding: '4px 12px' }}
          onClick={() => setShowReceive(v => !v)}
        >
          {showReceive ? '↑ Hide' : '+ Receive Response'}
        </button>
      </div>

      {/* Receive Response Panel */}
      {showReceive && (
        <div className="card" style={{ background: '#fdf6ee', border: '1px solid rgba(200,97,74,0.25)', marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>Paste Agent Response</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>From</label>
              <select value={rxFrom} onChange={e => setRxFrom(e.target.value)}>
                <option>Gemini</option>
                <option>Claude</option>
                <option>NotebookLM</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>To</label>
              <select value={rxTo} onChange={e => setRxTo(e.target.value)}>
                <option>User</option>
                <option>Gemini</option>
                <option>Claude</option>
                <option>NotebookLM</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Type</label>
              <select value={rxType} onChange={e => setRxType(e.target.value)}>
                {ALL_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Source Tag</label>
              <select value={rxTag} onChange={e => setRxTag(e.target.value)}>
                {SOURCE_TAGS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Response Content — paste what the agent said</label>
            <textarea
              value={rxContent}
              onChange={e => setRxContent(e.target.value)}
              placeholder={`Paste the response from ${rxFrom} here…`}
              style={{ minHeight: 100, fontFamily: 'monospace', fontSize: 12 }}
            />
          </div>
          <div className="form-group">
            <label>Note (optional)</label>
            <input type="text" value={rxNote} onChange={e => setRxNote(e.target.value)} placeholder="One-line annotation…" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleReceiveSubmit} disabled={rxSending || !rxContent.trim()}>
              {rxSending ? 'Staging…' : `Stage [${rxFrom}] → [${rxTo}]`}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => { setShowReceive(false); setRxContent(''); }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="two-col-6040">
        {/* Main thread */}
        <div>
          <div className="agent-thread" ref={threadRef}>
            {agentMessages.length === 0 && (
              <div style={{ color: 'rgba(245,240,232,0.35)', fontSize: 12, textAlign: 'center', marginTop: 40 }}>
                No messages for {currentAgent} yet.
              </div>
            )}
            {agentMessages.map(m => (
              <div key={m.id} className="message-bubble">
                <div className="bubble-header">
                  <span>
                    <span className="bubble-from">[{m.from}]</span>
                    <span style={{ margin: '0 6px', color: 'rgba(245,240,232,0.4)' }}>→</span>
                    <span>[{m.to}]</span>
                    <span
                      className={`badge badge-${m.status === 'confirmed' ? 'green' : m.status === 'purged' ? 'grey' : 'orange'}`}
                      style={{ marginLeft: 8 }}
                    >
                      {m.status}
                    </span>
                  </span>
                  <span style={{ fontSize: 10, opacity: 0.5 }}>{new Date(m.timestamp).toLocaleTimeString()}</span>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(245,240,232,0.45)', marginBottom: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className="badge badge-blue">{m.type}</span>
                  {m.payload?.source_tag && <span>{m.payload.source_tag}</span>}
                  {m.payload?.note && <span style={{ opacity: 0.7 }}>· {m.payload.note}</span>}
                </div>
                <div className="copyable-block">{formatBlock(m)}</div>
                <div style={{ marginTop: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleCopy(m)}>
                    Copy & Paste into tab
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* User → Gemini input (Gemini tab only) */}
          {activeAgent === 'GEMINI' ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: 'rgba(26,15,10,0.5)', marginBottom: 6 }}>
                Type your recording input → staged as [User] → [Gemini]
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="What do you want to record?"
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !userSending && handleUserSend()}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary" onClick={handleUserSend} disabled={userSending || !userInput.trim()}>
                  {userSending ? '…' : 'Send'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 10, fontSize: 11, color: 'rgba(26,15,10,0.45)', padding: '8px 0', textAlign: 'center' }}>
              Use <strong>+ Receive Response</strong> above to paste a response from {currentAgent}.
            </div>
          )}

          {/* Session controls */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', borderTop: '1px solid rgba(200,97,74,0.15)', paddingTop: 12 }}>
            <button className="btn btn-secondary btn-sm" onClick={handleNewSession}>New Session</button>
            <button className="btn btn-secondary btn-sm" onClick={handleEndSession}>End Session</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(true)}>View Clipboard</button>
          </div>
        </div>

        {/* Auditing panel */}
        <div>
          <div className="audit-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="audit-title" style={{ marginBottom: 0 }}>[AUDITING] — PENDING</div>
              {transit.length > 0 && (
                <button
                  className="btn btn-sm"
                  style={{ background: '#6a2a2a', color: 'white', borderRadius: 4, fontSize: 10 }}
                  onClick={handlePurgeAll}
                >
                  Purge All
                </button>
              )}
            </div>

            {transit.length === 0 && (
              <div style={{ color: 'rgba(245,240,232,0.3)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
                No pending messages.<br />
                <span style={{ fontSize: 10, opacity: 0.5 }}>Send a message or paste a response above.</span>
              </div>
            )}

            {transit.map(m => {
              const block = formatBlock(m);
              return (
                <div key={m.id} className="audit-card">
                  <div style={{ fontSize: 10, color: 'rgba(245,240,232,0.55)', marginBottom: 6, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong style={{ color: 'var(--color-accent)' }}>[{m.from}]</strong>
                    <span>→</span>
                    <span>[{m.to}]</span>
                    <span className="badge badge-orange">{m.type}</span>
                    {m.payload?.source_tag && <span style={{ opacity: 0.6 }}>{m.payload.source_tag}</span>}
                  </div>

                  <div className="copyable-block" style={{ fontSize: 10, maxHeight: 140, overflowY: 'auto', lineHeight: 1.5 }}>
                    {block}
                  </div>

                  {m.payload?.note && (
                    <div style={{ fontSize: 10, color: 'rgba(245,240,232,0.4)', marginTop: 4 }}>Note: {m.payload.note}</div>
                  )}

                  <div className="audit-actions" style={{ marginTop: 10 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11 }}
                      onClick={() => handleCopy(m)}
                    >
                      📋 Copy
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ background: '#1e5a1e', color: 'white', borderRadius: 4, fontSize: 11 }}
                      onClick={() => handleConfirm(m.id)}
                    >
                      ✓ Confirm
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ background: '#5a1e1e', color: 'white', borderRadius: 4, fontSize: 11 }}
                      onClick={() => handleReject(m.id)}
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Clipboard modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Clipboard Buffer</h3>
            {!clipboard ? (
              <div className="empty-state">Clipboard buffer is empty.</div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: 'rgba(26,15,10,0.5)', marginBottom: 10 }}>
                  <strong>{clipboard.label}</strong><br />
                  {new Date(clipboard.savedAt).toLocaleString()}
                </div>
                <pre style={{ background: '#f0ebe0', padding: 12, borderRadius: 6, fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 300, overflow: 'auto', border: '1px solid rgba(200,97,74,0.2)' }}>
                  {clipboard.content}
                </pre>
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={async () => {
                    await copyToOS(clipboard.content);
                    showToast('Copied to OS clipboard.');
                  }}>
                    Copy to OS Clipboard
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={async () => {
                    await fetch('/clipboard/clear', { method: 'DELETE' });
                    fetchAll();
                    showToast('Clipboard cleared.');
                  }}>Clear</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
