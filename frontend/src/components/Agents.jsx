import React, { useEffect, useState, useRef } from 'react';

const AGENTS = ['GEMINI', 'CLAUDE', 'NOTEBOOKLM'];
const agentNameMap = { GEMINI: 'Gemini', CLAUDE: 'Claude', NOTEBOOKLM: 'NotebookLM' };

const AGENT_ROUTES = {
  Gemini: { defaultTo: 'Claude', types: ['intake_summary', 'corpus_query', 'context_update', 'error'] },
  Claude: { defaultTo: 'NotebookLM', types: ['proposed_entry', 'context_update', 'corpus_query', 'error'] },
  NotebookLM: { defaultTo: 'User', types: ['corpus_report', 'synthesis', 'error'] }
};

const ALL_TYPES = ['raw_input', 'intake_summary', 'corpus_query', 'proposed_entry', 'corpus_report', 'context_update', 'confirmation', 'error'];
const SOURCE_TAGS = ['[ORAL]', '[FIELD]', '[OFFICIAL]', '[POLICY]', '[SECONDARY]', '[SYNTHESIS]', '[AGGREGATED]'];
const SCOPES = ['Barangay', 'City Hall', 'LGU'];
const DATA_FLOWS = ['Bottom-up', 'Top-down', 'Lateral'];

const AGENT_COLORS = {
  User: '#5a3a1a',
  Gemini: '#1e6fa0',
  Claude: '#8a4a1e',
  NotebookLM: '#1e6a3a'
};

const AGENT_LABELS = {
  User: '👤 User',
  Gemini: '✦ Gemini',
  Claude: '◆ Claude',
  NotebookLM: '◉ NotebookLM'
};

function isImage(filename) {
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(filename || '');
}

function formatBlock(m) {
  const p = m.payload || {};
  const lines = [
    '========================================',
    `[FROM: ${m.from}] / [TO: ${m.to}]`,
    `Type: ${m.type} | ${m.timestamp}`,
    '----------------------------------------',
  ];
  if (p.scope) lines.push(`Scope: ${p.scope}`);
  if (p.dataFlow) lines.push(`Data flow: ${p.dataFlow}`);
  if (p.contributor) lines.push(`Contributor: ${p.contributor}`);
  if (p.dateOfObservation) lines.push(`Date of observation: ${p.dateOfObservation}`);
  lines.push('');
  lines.push(p.content || '');
  lines.push('');
  lines.push('----------------------------------------');
  lines.push(`Source: ${p.source_tag || 'N/A'} | Sensitive: ${p.sensitive || false}`);
  if (p.significance) lines.push(`Significance: ${p.significance}`);
  if (p.note) lines.push(`Note: ${p.note}`);
  if (p.attachments?.length > 0) {
    lines.push('');
    lines.push(`Attachments (${p.attachments.length}):`);
    p.attachments.forEach(a => lines.push(`  - ${a.filename} [${a.mimetype}]`));
  }
  lines.push('========================================');
  return lines.join('\n');
}

async function copyToOS(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

export default function Agents({ showToast }) {
  const [activeAgent, setActiveAgent] = useState('GEMINI');
  const [log, setLog] = useState([]);
  const [transit, setTransit] = useState([]);
  const [clipboard, setClipboard] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [auditView, setAuditView] = useState('conversation');
  const threadRef = useRef(null);
  const fileInputRef = useRef(null);

  const [intakeContent, setIntakeContent] = useState('');
  const [intakeScope, setIntakeScope] = useState('Barangay');
  const [intakeFlow, setIntakeFlow] = useState('Bottom-up');
  const [intakeTag, setIntakeTag] = useState('[ORAL]');
  const [intakeContributor, setIntakeContributor] = useState('');
  const [intakeDate, setIntakeDate] = useState(new Date().toISOString().split('T')[0]);
  const [intakeSensitive, setIntakeSensitive] = useState(false);
  const [intakeNote, setIntakeNote] = useState('');
  const [intakeSending, setIntakeSending] = useState(false);
  const [showIntakeForm, setShowIntakeForm] = useState(true);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [showReceive, setShowReceive] = useState(false);
  const [rxFrom, setRxFrom] = useState('Gemini');
  const [rxTo, setRxTo] = useState('Claude');
  const [rxType, setRxType] = useState('intake_summary');
  const [rxTag, setRxTag] = useState('[SYNTHESIS]');
  const [rxContent, setRxContent] = useState('');
  const [rxNote, setRxNote] = useState('');
  const [rxContributor, setRxContributor] = useState('');
  const [rxSensitive, setRxSensitive] = useState(false);
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

  useEffect(() => {
    setRxTo(AGENT_ROUTES[rxFrom]?.defaultTo || 'User');
    setRxType(AGENT_ROUTES[rxFrom]?.types[0] || 'intake_summary');
  }, [rxFrom]);

  const agentMessages = log.filter(m => m.from === currentAgent || m.to === currentAgent);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      const form = new FormData();
      form.append('file', file);
      try {
        const res = await fetch('/bridge/attach', { method: 'POST', body: form });
        const data = await res.json();
        if (data.id) uploaded.push(data);
      } catch {}
    }
    setAttachments(a => [...a, ...uploaded]);
    setUploading(false);
    if (uploaded.length) showToast(`${uploaded.length} file(s) attached.`);
    e.target.value = '';
  };

  const removeAttachment = (id) => setAttachments(a => a.filter(f => f.id !== id));

  const buildIntakeContent = () => {
    return [
      `Scope: ${intakeScope}`,
      `Data flow direction: ${intakeFlow}`,
      `Source type: ${intakeTag}`,
      `Contributor: ${intakeContributor || 'Anonymous'}`,
      `Date of observation: ${intakeDate}`,
      `Date of submission: ${new Date().toISOString().split('T')[0]}`,
      `Content: ${intakeContent}`,
      `Sensitive: ${intakeSensitive ? 'Yes — PENDING REVIEW' : 'No'}`,
      intakeNote ? `Note: ${intakeNote}` : null
    ].filter(Boolean).join('\n');
  };

  const handleUserSend = async () => {
    if (!intakeContent.trim()) return;
    setIntakeSending(true);
    try {
      const res = await fetch('/bridge/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'User', to: 'Gemini', type: 'raw_input',
          timestamp: new Date().toISOString(),
          payload: {
            content: buildIntakeContent(),
            source_tag: intakeTag,
            sensitive: intakeSensitive,
            requires_confirmation: true,
            scope: intakeScope,
            dataFlow: intakeFlow,
            contributor: intakeContributor,
            dateOfObservation: intakeDate,
            note: intakeNote,
            attachments: attachments.map(a => ({ id: a.id, filename: a.filename, mimetype: a.mimetype, url: a.url }))
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setIntakeContent(''); setIntakeNote(''); setIntakeContributor('');
        setIntakeSensitive(false); setAttachments([]);
        fetchAll();
        showToast('Intake staged → copy from Auditing panel and paste into Gemini tab.');
      } else {
        showToast('Error: ' + (data.errors?.join(', ') || 'Unknown error'));
      }
    } catch {}
    setIntakeSending(false);
  };

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
          payload: {
            content: rxContent.trim(), source_tag: rxTag,
            sensitive: rxSensitive, requires_confirmation: true,
            contributor: rxContributor, note: rxNote.trim()
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setRxContent(''); setRxNote(''); setRxContributor(''); setRxSensitive(false);
        setShowReceive(false);
        fetchAll();
        showToast(`Response from ${rxFrom} staged → Auditing panel.`);
      } else {
        showToast('Validation error: ' + (data.errors?.join(', ') || 'Unknown'));
      }
    } catch {}
    setRxSending(false);
  };

  const handleCopy = async (msg) => {
    const block = formatBlock(msg);
    await fetch('/clipboard/copy', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: msg.id })
    });
    const copied = await copyToOS(block);
    fetchAll();
    showToast(copied ? `Copied → paste into your ${msg.to} tab.` : 'Copied to buffer (OS clipboard unavailable).');
  };

  const handleConfirm = async (id) => {
    await fetch(`/bridge/confirm/${id}`, { method: 'POST' });
    fetchAll();
    showToast('✓ Confirmed — entry written to context.md.');
  };

  const handleReject = async (id) => {
    await fetch(`/bridge/purge/${id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'User rejected' })
    });
    fetchAll();
    showToast('Rejected and purged.');
  };

  const handlePurgeAll = async () => {
    await fetch('/bridge/purge-all', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Purge all' })
    });
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
    await fetch('/session/current', { method: 'DELETE' });
    fetchAll();
    showToast('✓ Session ended. Context saved.');
  };

  const transitIds = new Set(transit.map(m => m.id));
  const allMessages = [
    ...log.filter(m => !transitIds.has(m.id)),
    ...transit
  ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return (
    <div>
      <div style={{ background: 'var(--color-card-dark)', color: 'rgba(245,240,232,0.75)', borderRadius: 8, padding: '8px 14px', marginBottom: 14, fontSize: 11, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>PROTOCOL</span>
        <span>Type input → Send → Copy from Auditing → paste into Gemini → Receive response → Confirm → written to context</span>
      </div>

      <div className="sub-tabs">
        {AGENTS.map(a => (
          <button key={a} className={`sub-tab ${activeAgent === a ? 'active' : ''}`}
            onClick={() => setActiveAgent(a)}>
            {a}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary btn-sm" onClick={() => setShowReceive(v => !v)}>
          {showReceive ? '↑ Hide' : '+ Receive Response'}
        </button>
      </div>

      {showReceive && (
        <div className="card" style={{ background: '#fdf6ee', border: '1px solid rgba(200,97,74,0.25)', marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 10 }}>Paste Agent Response</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>From</label>
              <select value={rxFrom} onChange={e => setRxFrom(e.target.value)}>
                <option>Gemini</option><option>Claude</option><option>NotebookLM</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>To</label>
              <select value={rxTo} onChange={e => setRxTo(e.target.value)}>
                <option>User</option><option>Gemini</option><option>Claude</option><option>NotebookLM</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Type</label>
              <select value={rxType} onChange={e => setRxType(e.target.value)}>
                {ALL_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Source Tag</label>
              <select value={rxTag} onChange={e => setRxTag(e.target.value)}>
                {SOURCE_TAGS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Contributor</label>
              <input type="text" value={rxContributor} onChange={e => setRxContributor(e.target.value)} placeholder="Name or role" />
            </div>
            <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <input type="checkbox" checked={rxSensitive} onChange={e => setRxSensitive(e.target.checked)} style={{ width: 'auto', marginBottom: 0 }} />
                ⚠ Sensitive
              </label>
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
        {/* Message thread */}
        <div>
          <div className="agent-thread" ref={threadRef}>
            {agentMessages.length === 0 && (
              <div style={{ color: 'rgba(245,240,232,0.3)', fontSize: 12, textAlign: 'center', marginTop: 40 }}>
                No messages for {currentAgent} yet.<br />
                <span style={{ fontSize: 10, opacity: 0.6 }}>
                  {activeAgent === 'GEMINI' ? 'Type an intake below to start.' : 'Use + Receive Response above.'}
                </span>
              </div>
            )}
            {agentMessages.map(m => (
              <div key={m.id} className="message-bubble"
                style={{ borderLeftColor: AGENT_COLORS[m.from] || 'var(--color-accent)' }}>
                <div className="bubble-header">
                  <span>
                    <span className="bubble-from" style={{ color: AGENT_COLORS[m.from] }}>
                      {AGENT_LABELS[m.from] || m.from}
                    </span>
                    <span style={{ margin: '0 6px', opacity: 0.4 }}>→</span>
                    <span style={{ color: AGENT_COLORS[m.to], opacity: 0.8 }}>
                      {AGENT_LABELS[m.to] || m.to}
                    </span>
                    <span className={`badge badge-${m.status === 'confirmed' ? 'green' : m.status === 'purged' ? 'grey' : 'orange'}`} style={{ marginLeft: 8 }}>
                      {m.status}
                    </span>
                    {m.payload?.sensitive && <span className="badge badge-orange" style={{ marginLeft: 4 }}>⚠ sensitive</span>}
                  </span>
                  <span style={{ fontSize: 10, opacity: 0.5 }}>{new Date(m.timestamp).toLocaleTimeString()}</span>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(245,240,232,0.45)', marginBottom: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="badge badge-blue">{m.type}</span>
                  {m.payload?.source_tag && <span>{m.payload.source_tag}</span>}
                  {m.payload?.scope && <span style={{ opacity: 0.7 }}>· {m.payload.scope}</span>}
                  {m.payload?.attachments?.length > 0 && (
                    <span style={{ color: 'rgba(232,150,122,0.8)' }}>📎 {m.payload.attachments.length} file(s)</span>
                  )}
                </div>
                {m.payload?.attachments?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {m.payload.attachments.map(a => (
                      <AttachmentChip key={a.id} attachment={a} />
                    ))}
                  </div>
                )}
                <div className="copyable-block">{formatBlock(m)}</div>
                <div style={{ marginTop: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleCopy(m)}>
                    📋 Copy & Paste into {m.to} tab
                  </button>
                </div>
              </div>
            ))}
          </div>

          {activeAgent === 'GEMINI' && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: 'rgba(26,15,10,0.5)', fontWeight: 600 }}>INTAKE — [User] → [Gemini]</div>
                <button className="btn btn-secondary btn-sm" style={{ fontSize: 10 }}
                  onClick={() => setShowIntakeForm(v => !v)}>
                  {showIntakeForm ? '↑ Collapse' : '↓ Expand Form'}
                </button>
              </div>

              {showIntakeForm ? (
                <div className="card" style={{ background: '#fdf8f2', border: '1px solid rgba(200,97,74,0.2)', padding: '14px 16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Scope</label>
                      <select value={intakeScope} onChange={e => setIntakeScope(e.target.value)}>
                        {SCOPES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Data Flow</label>
                      <select value={intakeFlow} onChange={e => setIntakeFlow(e.target.value)}>
                        {DATA_FLOWS.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Source Type</label>
                      <select value={intakeTag} onChange={e => setIntakeTag(e.target.value)}>
                        {SOURCE_TAGS.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 10 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Contributor</label>
                      <input type="text" value={intakeContributor} onChange={e => setIntakeContributor(e.target.value)} placeholder="e.g. Barangay worker, Elder, Sitio Libis resident" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Date of Observation</label>
                      <input type="date" value={intakeDate} onChange={e => setIntakeDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Content — what do you want to record?</label>
                    <textarea
                      value={intakeContent}
                      onChange={e => setIntakeContent(e.target.value)}
                      placeholder="Describe what was observed, said, or found. Raw input is valid — voice notes, broken sentences, dialect, incomplete memories."
                      style={{ minHeight: 80 }}
                    />
                  </div>

                  {/* File attachment */}
                  <div className="form-group">
                    <label>Attachments</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        {uploading ? '⏳ Uploading…' : '📎 Attach file'}
                      </button>
                      <span style={{ fontSize: 10, color: 'rgba(26,15,10,0.4)' }}>Images, PDFs, docs — max 20MB each</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.txt,.csv,.md,.json"
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                      />
                    </div>
                    {attachments.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        {attachments.map(a => (
                          <div key={a.id} style={{
                            background: 'white', border: '1px solid rgba(200,97,74,0.25)',
                            borderRadius: 6, padding: '5px 10px',
                            display: 'flex', alignItems: 'center', gap: 6, fontSize: 11
                          }}>
                            {isImage(a.filename) ? (
                              <img src={a.url} alt={a.filename} style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 3 }} />
                            ) : (
                              <span style={{ fontSize: 14 }}>📄</span>
                            )}
                            <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.filename}</span>
                            <button onClick={() => removeAttachment(a.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(26,15,10,0.4)', fontSize: 13, lineHeight: 1, padding: 0 }}>
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr auto', gap: 8, marginBottom: 10 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Note (optional)</label>
                      <input type="text" value={intakeNote} onChange={e => setIntakeNote(e.target.value)} placeholder="One-line annotation…" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'flex-end' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, whiteSpace: 'nowrap', marginBottom: 0 }}>
                        <input type="checkbox" checked={intakeSensitive} onChange={e => setIntakeSensitive(e.target.checked)} style={{ width: 'auto' }} />
                        ⚠ Sensitive
                      </label>
                    </div>
                  </div>
                  {intakeSensitive && (
                    <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 6, padding: '8px 12px', marginBottom: 10, fontSize: 11, color: '#856404' }}>
                      ⚠ Sensitive flag set. Entry will be staged as PENDING REVIEW and requires human authorization.
                    </div>
                  )}
                  <button className="btn btn-primary" onClick={handleUserSend} disabled={intakeSending || !intakeContent.trim()}>
                    {intakeSending ? 'Staging…' : `Send Intake → Gemini${attachments.length > 0 ? ` (+ ${attachments.length} file${attachments.length > 1 ? 's' : ''})` : ''}`}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <textarea
                    value={intakeContent}
                    onChange={e => setIntakeContent(e.target.value)}
                    placeholder="Quick intake…"
                    style={{ flex: 1, minHeight: 60, resize: 'none' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button className="btn btn-primary" onClick={handleUserSend} disabled={intakeSending || !intakeContent.trim()}>
                      {intakeSending ? '…' : 'Send'}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()} title="Attach file">
                      📎
                    </button>
                    <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv,.md,.json" style={{ display: 'none' }} onChange={handleFileSelect} />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeAgent !== 'GEMINI' && (
            <div style={{ marginTop: 10, fontSize: 11, color: 'rgba(26,15,10,0.45)', padding: '8px 0', textAlign: 'center' }}>
              Use <strong>+ Receive Response</strong> above to paste a response from {currentAgent}.
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', borderTop: '1px solid rgba(200,97,74,0.15)', paddingTop: 12 }}>
            <button className="btn btn-secondary btn-sm" onClick={handleNewSession}>↺ New Session</button>
            <button className="btn btn-secondary btn-sm" onClick={handleEndSession}>⏹ End Session</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(true)}>📋 View Clipboard</button>
          </div>
        </div>

        {/* Auditing panel */}
        <div>
          <div className="audit-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="audit-title" style={{ marginBottom: 0 }}>[AUDITING]</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  {['conversation', 'pending'].map(v => (
                    <button key={v} onClick={() => setAuditView(v)}
                      style={{
                        background: auditView === v ? 'var(--color-accent)' : 'rgba(255,255,255,0.06)',
                        color: auditView === v ? 'white' : 'rgba(245,240,232,0.5)',
                        border: 'none', borderRadius: 4, padding: '3px 9px', fontSize: 9,
                        fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', cursor: 'pointer'
                      }}>
                      {v === 'conversation' ? 'Full Thread' : `Pending${transit.length > 0 ? ` (${transit.length})` : ''}`}
                    </button>
                  ))}
                </div>
                {transit.length > 0 && (
                  <button className="btn btn-sm" style={{ background: '#6a2a2a', color: 'white', borderRadius: 4, fontSize: 9 }}
                    onClick={handlePurgeAll}>Purge All</button>
                )}
              </div>
            </div>

            {auditView === 'conversation' ? (
              <ConversationThread
                messages={allMessages}
                transitIds={transitIds}
                onCopy={handleCopy}
                onConfirm={handleConfirm}
                onReject={handleReject}
              />
            ) : (
              <PendingList
                transit={transit}
                onCopy={handleCopy}
                onConfirm={handleConfirm}
                onReject={handleReject}
              />
            )}
          </div>
        </div>
      </div>

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
                  <button className="btn btn-primary btn-sm" onClick={async () => { await copyToOS(clipboard.content); showToast('Copied to OS clipboard.'); }}>
                    Copy to OS
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={async () => { await fetch('/clipboard/clear', { method: 'DELETE' }); showToast('Cleared.'); }}>Clear</button>
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

function AttachmentChip({ attachment }) {
  const img = isImage(attachment.filename);
  return (
    <a href={attachment.url} target="_blank" rel="noreferrer"
      style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 5, padding: '4px 8px', textDecoration: 'none', fontSize: 10, color: 'rgba(245,240,232,0.7)', border: '1px solid rgba(232,150,122,0.2)' }}>
      {img ? (
        <img src={attachment.url} alt={attachment.filename} style={{ width: 20, height: 20, objectFit: 'cover', borderRadius: 2 }} />
      ) : (
        <span>📄</span>
      )}
      <span style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachment.filename}</span>
    </a>
  );
}

function ConversationThread({ messages, transitIds, onCopy, onConfirm, onReject }) {
  if (messages.length === 0) {
    return (
      <div style={{ color: 'rgba(245,240,232,0.28)', fontSize: 12, textAlign: 'center', padding: '28px 0' }}>
        No messages yet.<br />
        <span style={{ fontSize: 10, opacity: 0.5 }}>Send an intake to start the conversation.</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 580, overflowY: 'auto' }}>
      {messages.map((m, i) => {
        const isPending = transitIds.has(m.id);
        const fromColor = AGENT_COLORS[m.from] || '#888';
        const toColor = AGENT_COLORS[m.to] || '#888';
        const isFirst = i === 0;

        return (
          <div key={m.id}>
            {/* Flow connector line */}
            {!isFirst && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
                <div style={{ width: 1, height: 12, background: 'rgba(232,150,122,0.2)' }} />
              </div>
            )}

            <div style={{
              background: isPending ? 'rgba(232,150,122,0.07)' : 'rgba(255,255,255,0.03)',
              borderRadius: 8,
              padding: '10px 12px',
              border: `1px solid ${isPending ? 'rgba(232,150,122,0.3)' : 'rgba(255,255,255,0.05)'}`,
              borderLeft: `3px solid ${fromColor}`,
            }}>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                  <span style={{ fontWeight: 700, color: fromColor, fontSize: 11 }}>
                    {AGENT_LABELS[m.from] || m.from}
                  </span>
                  <span style={{ color: 'rgba(245,240,232,0.25)', fontSize: 10 }}>→</span>
                  <span style={{ color: toColor, fontSize: 10, opacity: 0.8 }}>
                    {AGENT_LABELS[m.to] || m.to}
                  </span>
                  <span style={{
                    background: `${fromColor}22`,
                    color: fromColor,
                    fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, letterSpacing: 0.5
                  }}>
                    {m.type}
                  </span>
                  {m.payload?.sensitive && (
                    <span style={{ background: 'rgba(255,180,50,0.15)', color: '#e8b050', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3 }}>
                      ⚠ SENSITIVE
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 9, color: 'rgba(245,240,232,0.3)' }}>
                    {new Date(m.timestamp).toLocaleTimeString()}
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 3,
                    background: m.status === 'confirmed' ? 'rgba(40,160,80,0.2)' : m.status === 'purged' ? 'rgba(120,120,120,0.2)' : 'rgba(232,150,122,0.2)',
                    color: m.status === 'confirmed' ? '#60d090' : m.status === 'purged' ? '#aaa' : '#e8966a'
                  }}>
                    {m.status === 'confirmed' ? '✓ CONFIRMED' : m.status === 'purged' ? '✗ PURGED' : '● PENDING'}
                  </span>
                </div>
              </div>

              {/* Source/scope tags */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
                {m.payload?.source_tag && (
                  <span style={{ fontFamily: 'monospace', fontSize: 9, background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3, color: 'rgba(245,240,232,0.5)' }}>
                    {m.payload.source_tag}
                  </span>
                )}
                {m.payload?.scope && (
                  <span style={{ fontSize: 9, color: 'rgba(245,240,232,0.35)' }}>{m.payload.scope}</span>
                )}
                {m.payload?.attachments?.length > 0 && (
                  <span style={{ fontSize: 9, color: 'rgba(232,150,122,0.7)' }}>📎 {m.payload.attachments.length} file(s)</span>
                )}
              </div>

              {/* Attachments if any */}
              {m.payload?.attachments?.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                  {m.payload.attachments.map(a => <AttachmentChip key={a.id} attachment={a} />)}
                </div>
              )}

              {/* Content preview */}
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 4, padding: '7px 9px',
                fontFamily: 'monospace', fontSize: 10,
                color: 'rgba(245,240,232,0.65)',
                lineHeight: 1.5,
                maxHeight: isPending ? 120 : 80,
                overflowY: 'auto',
                marginBottom: 6
              }}>
                {m.payload?.content?.substring(0, isPending ? 400 : 200)}{m.payload?.content?.length > (isPending ? 400 : 200) ? '…' : ''}
              </div>

              {m.payload?.note && (
                <div style={{ fontSize: 9, color: 'rgba(245,240,232,0.35)', marginBottom: 6, fontStyle: 'italic' }}>
                  Note: {m.payload.note}
                </div>
              )}

              {/* Pending actions */}
              {isPending && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }} onClick={() => onCopy(m)}>
                    📋 Copy
                  </button>
                  <button style={{ background: '#1e5a1e', color: 'white', border: 'none', borderRadius: 4, padding: '3px 9px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                    onClick={() => onConfirm(m.id)}>
                    ✓ Confirm
                  </button>
                  <button style={{ background: '#5a1e1e', color: 'white', border: 'none', borderRadius: 4, padding: '3px 9px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                    onClick={() => onReject(m.id)}>
                    ✗ Reject
                  </button>
                  {(m.type === 'proposed_entry' || m.type === 'context_update') && (
                    <span style={{ fontSize: 9, color: 'rgba(232,150,122,0.5)', alignSelf: 'center' }}>
                      Confirm → writes to context.md
                    </span>
                  )}
                </div>
              )}

              {m.status === 'confirmed' && (
                <div style={{ fontSize: 9, color: '#60d090', marginTop: 4 }}>
                  ✓ Written to context.md
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PendingList({ transit, onCopy, onConfirm, onReject }) {
  if (transit.length === 0) {
    return (
      <div style={{ color: 'rgba(245,240,232,0.3)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
        No pending messages.<br />
        <span style={{ fontSize: 10, opacity: 0.5 }}>Send intake or paste a response above.</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {transit.map(m => {
        const block = formatBlock(m);
        const fromColor = AGENT_COLORS[m.from] || '#888';
        return (
          <div key={m.id} className="audit-card"
            style={{ borderColor: m.payload?.sensitive ? 'rgba(255,180,50,0.4)' : `${fromColor}40` }}>
            <div style={{ fontSize: 10, color: 'rgba(245,240,232,0.55)', marginBottom: 6, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <strong style={{ color: fromColor }}>{AGENT_LABELS[m.from] || m.from}</strong>
              <span style={{ opacity: 0.4 }}>→</span>
              <span style={{ color: AGENT_COLORS[m.to], opacity: 0.8 }}>{AGENT_LABELS[m.to] || m.to}</span>
              <span style={{ background: `${fromColor}22`, color: fromColor, fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3 }}>{m.type}</span>
              {m.payload?.source_tag && <span style={{ opacity: 0.6 }}>{m.payload.source_tag}</span>}
              {m.payload?.sensitive && <span style={{ color: '#ffc107', fontWeight: 700 }}>⚠ SENSITIVE</span>}
            </div>

            {m.payload?.sensitive && (
              <div style={{ background: 'rgba(255,180,50,0.12)', border: '1px solid rgba(255,180,50,0.3)', borderRadius: 4, padding: '4px 8px', fontSize: 10, color: '#ffc107', marginBottom: 6 }}>
                ⚠ Sensitive data — staged for human review. Confirm only after authorization.
              </div>
            )}

            {m.payload?.attachments?.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                {m.payload.attachments.map(a => <AttachmentChip key={a.id} attachment={a} />)}
              </div>
            )}

            <div className="copyable-block" style={{ fontSize: 10, maxHeight: 120, overflowY: 'auto', lineHeight: 1.5 }}>
              {block}
            </div>

            {m.payload?.note && (
              <div style={{ fontSize: 10, color: 'rgba(245,240,232,0.4)', marginTop: 4 }}>Note: {m.payload.note}</div>
            )}

            <div className="audit-actions" style={{ marginTop: 10 }}>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => onCopy(m)}>📋 Copy</button>
              <button style={{ background: '#1e5a1e', color: 'white', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                onClick={() => onConfirm(m.id)}>✓ Confirm</button>
              <button style={{ background: '#5a1e1e', color: 'white', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                onClick={() => onReject(m.id)}>✗ Reject</button>
            </div>

            {(m.type === 'proposed_entry' || m.type === 'context_update') && (
              <div style={{ fontSize: 9, color: 'rgba(232,150,122,0.6)', marginTop: 6 }}>
                ✓ Confirm → writes to context.md (POOF protocol)
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
