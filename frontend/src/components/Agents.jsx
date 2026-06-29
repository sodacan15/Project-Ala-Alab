import React, { useEffect, useState, useRef } from 'react';

const AGENTS = ['GEMINI', 'CLAUDE', 'NOTEBOOKLM'];

export default function Agents({ showToast }) {
  const [activeAgent, setActiveAgent] = useState('GEMINI');
  const [log, setLog] = useState([]);
  const [transit, setTransit] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [clipboard, setClipboard] = useState(null);
  const threadRef = useRef(null);

  const agentNameMap = { GEMINI: 'Gemini', CLAUDE: 'Claude', NOTEBOOKLM: 'NotebookLM' };
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
    } catch (e) {}
  };

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 2000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [log, activeAgent]);

  const agentMessages = log.filter(m =>
    m.from === currentAgent || m.to === currentAgent
  );

  const handleSend = async () => {
    if (!input.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/bridge/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'User',
          to: 'Gemini',
          type: 'raw_input',
          timestamp: new Date().toISOString(),
          payload: { content: input.trim(), source_tag: '[ORAL]', sensitive: false, requires_confirmation: true }
        })
      });
      const data = await res.json();
      if (data.success) { setInput(''); fetchAll(); showToast('Message staged in transit.'); }
    } catch (e) {}
    setSending(false);
  };

  const handleCopy = async (id) => {
    try {
      await fetch('/clipboard/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: id })
      });
      fetchAll();
      showToast('Copied to clipboard buffer.');
    } catch (e) {}
  };

  const handleConfirm = async (id) => {
    await fetch(`/bridge/confirm/${id}`, { method: 'POST' });
    fetchAll();
    showToast('Message confirmed.');
  };

  const handleReject = async (id) => {
    await fetch(`/bridge/purge/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'User rejected' }) });
    fetchAll();
    showToast('Message rejected.');
  };

  const handleNewSession = async () => {
    const res = await fetch('/session/new', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    const data = await res.json();
    fetchAll();
    showToast('Context saved. Last prompt copied. New session started.');
  };

  const handleEndSession = async () => {
    await fetch('/session/current', { method: 'DELETE' });
    fetchAll();
    showToast('Session ended. Context saved.');
  };

  return (
    <div>
      <div className="sub-tabs">
        {AGENTS.map(a => (
          <button key={a} className={`sub-tab ${activeAgent === a ? 'active' : ''}`} onClick={() => setActiveAgent(a)}>
            {a}
          </button>
        ))}
      </div>

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
                    <span style={{ margin: '0 6px' }}>→</span>
                    <span>[{m.to}]</span>
                    <span className={`badge badge-${m.status === 'confirmed' ? 'green' : m.status === 'purged' ? 'grey' : 'orange'}`} style={{ marginLeft: 8 }}>
                      {m.status}
                    </span>
                  </span>
                  <span>{new Date(m.timestamp).toLocaleTimeString()}</span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(245,240,232,0.5)', marginBottom: 6 }}>
                  <span className="badge badge-blue">{m.type}</span>
                  {m.payload?.source_tag && <span style={{ marginLeft: 8 }}>{m.payload.source_tag}</span>}
                </div>
                <div className="copyable-block">
                  {m.payload?.content}
                </div>
                <div style={{ marginTop: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleCopy(m.id)}>Copy</button>
                </div>
              </div>
            ))}
          </div>

          {/* Input bar (Gemini only) */}
          {activeAgent === 'GEMINI' && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="What do you want to record?"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" onClick={handleSend} disabled={sending}>
                {sending ? '…' : 'Send'}
              </button>
            </div>
          )}
          {activeAgent !== 'GEMINI' && (
            <div style={{ marginTop: 10, fontSize: 11, color: 'rgba(26,15,10,0.4)', textAlign: 'center' }}>
              Read-only — shows agent-to-agent messages only.
            </div>
          )}

          {/* Session controls */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleNewSession}>New Session</button>
            <button className="btn btn-secondary btn-sm" onClick={handleEndSession}>End Session</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(true)}>View Clipboard</button>
          </div>
        </div>

        {/* Auditing panel */}
        <div>
          <div className="audit-panel">
            <div className="audit-title">[AUDITING] — PENDING</div>
            {transit.length === 0 && (
              <div style={{ color: 'rgba(245,240,232,0.3)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                No pending messages.
              </div>
            )}
            {transit.map(m => (
              <div key={m.id} className="audit-card">
                <div style={{ fontSize: 10, color: 'rgba(245,240,232,0.5)', marginBottom: 4 }}>
                  <strong style={{ color: 'var(--color-accent)' }}>[{m.from}]</strong> → [{m.to}]
                  <span className="badge badge-orange" style={{ marginLeft: 8 }}>{m.type}</span>
                </div>
                <div className="copyable-block" style={{ fontSize: 10, maxHeight: 120, overflow: 'hidden' }}>
                  {m.payload?.content?.substring(0, 200)}{(m.payload?.content?.length || 0) > 200 ? '…' : ''}
                </div>
                <div className="audit-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => handleCopy(m.id)}>Copy</button>
                  <button className="btn btn-sm" style={{ background: '#2a6a2a', color: 'white', borderRadius: 4 }} onClick={() => handleConfirm(m.id)}>Confirm</button>
                  <button className="btn btn-sm" style={{ background: '#6a2a2a', color: 'white', borderRadius: 4 }} onClick={() => handleReject(m.id)}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Clipboard modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Clipboard Buffer</h3>
            {!clipboard ? (
              <div className="empty-state">Clipboard is empty.</div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: 'rgba(26,15,10,0.5)', marginBottom: 8 }}>
                  {clipboard.label} · {new Date(clipboard.savedAt).toLocaleString()}
                </div>
                <pre style={{ background: '#f0ebe0', padding: 12, borderRadius: 6, fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 300, overflow: 'auto' }}>
                  {clipboard.content}
                </pre>
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => { navigator.clipboard?.writeText(clipboard.content); showToast('Copied to OS clipboard.'); }}>
                    Copy to OS Clipboard
                  </button>
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
