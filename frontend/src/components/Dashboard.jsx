import React, { useEffect, useState } from 'react';

const AGENT_ROLES = {
  Gemini: { role: 'The Communicator', desc: 'Intake + partial denoise', tab: 'gemini.google.com', color: '#1e6fa0', icon: '◈' },
  Claude: { role: 'The Scribe', desc: 'Document maintenance', tab: 'claude.ai', color: '#8a4a1e', icon: '✍' },
  NotebookLM: { role: 'The Archivist', desc: 'Corpus + synthesis', tab: 'notebooklm.google.com', color: '#1e6a3a', icon: '◫' }
};

const PROTOCOL_STEPS = [
  { id: 1, label: 'Open tabs', desc: 'Open Gemini, Claude, NotebookLM in browser tabs' },
  { id: 2, label: 'Register agents', desc: 'Go to Settings → connect each agent' },
  { id: 3, label: 'Send input', desc: 'Agents tab → type your intake input → Send' },
  { id: 4, label: 'Copy → paste', desc: 'Copy the formatted block → paste into Gemini tab' },
  { id: 5, label: 'Receive response', desc: '+ Receive Response → paste AI reply → stage it' },
  { id: 6, label: 'Confirm entry', desc: 'Auditing panel → Confirm → writes to context.md' },
];

export default function Dashboard() {
  const [accounts, setAccounts] = useState({});
  const [log, setLog] = useState([]);
  const [contexts, setContexts] = useState([]);
  const [transit, setTransit] = useState([]);
  const [session, setSession] = useState(null);
  const [currentCtx, setCurrentCtx] = useState(null);

  const fetchAll = async () => {
    try {
      const [accRes, logRes, ctxRes, transitRes, sessRes, curCtxRes] = await Promise.all([
        fetch('/accounts'), fetch('/bridge/log'), fetch('/contexts'),
        fetch('/bridge/transit'), fetch('/session/status'), fetch('/contexts/current')
      ]);
      setAccounts(await accRes.json());
      setLog(await logRes.json());
      setContexts(await ctxRes.json());
      setTransit(await transitRes.json());
      const s = await sessRes.json();
      setSession(s?.id ? s : null);
      setCurrentCtx(await curCtxRes.json());
    } catch (e) {}
  };

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 3000);
    return () => clearInterval(t);
  }, []);

  const connectedCount = Object.values(accounts).filter(a => a.connected).length;
  const confirmedLog = log.filter(m => m.status === 'confirmed');
  const pendingCount = transit.length;

  // Determine current protocol step
  const currentStep = connectedCount === 0 ? 2
    : log.length === 0 ? 3
    : pendingCount > 0 ? 6
    : confirmedLog.length === 0 ? 5
    : 6;

  return (
    <div>
      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-num">{connectedCount}<span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(26,15,10,0.4)' }}>/3</span></div>
          <div className="stat-label">Agents Connected</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{confirmedLog.length}</div>
          <div className="stat-label">Confirmed Entries</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: pendingCount > 0 ? '#c87050' : 'inherit' }}>{pendingCount}</div>
          <div className="stat-label">Pending in Transit</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{contexts.length}</div>
          <div className="stat-label">Context Files</div>
        </div>
      </div>

      <div className="two-col-6040" style={{ marginTop: 16 }}>
        {/* Left */}
        <div>
          {/* Agent Report */}
          <div className="section-title">Agent Report</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {Object.entries(accounts).map(([name, info]) => {
              const meta = AGENT_ROLES[name] || {};
              return (
                <div key={name} className="agent-card" style={{ borderLeft: `3px solid ${meta.color}` }}>
                  <div className="agent-card-header">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14 }}>{meta.icon}</span>
                        <span className="agent-name" style={{ color: meta.color }}>{name}</span>
                        <span className={`badge ${info.connected ? 'badge-green' : 'badge-grey'}`}>
                          {info.connected ? 'Active' : 'Disconnected'}
                        </span>
                      </div>
                      <div className="agent-role">{meta.role} — {meta.desc}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div className="agent-model">{info.model}</div>
                      {info.connected && info.displayName && (
                        <div style={{ fontSize: 11, color: 'rgba(26,15,10,0.55)', marginTop: 2 }}>
                          {info.displayName}{info.email ? ` · ${info.email}` : ''}
                        </div>
                      )}
                    </div>
                    <a href={`https://${meta.tab}`} target="_blank" rel="noreferrer"
                      style={{ fontSize: 11, color: 'var(--color-accent)', textDecoration: 'none' }}>
                      ↗ {meta.tab}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active session */}
          {session && (
            <div className="card" style={{ background: '#fdf8f2', borderLeft: '3px solid var(--color-accent)' }}>
              <div className="section-title" style={{ marginBottom: 8 }}>Active Session</div>
              <div style={{ fontSize: 12, color: 'rgba(26,15,10,0.6)', lineHeight: 1.8 }}>
                <strong>ID:</strong> <span style={{ fontFamily: 'monospace' }}>{session.id?.slice(0, 16)}…</span><br />
                <strong>Started:</strong> {new Date(session.startTime).toLocaleString()}<br />
                <strong>Context:</strong> {currentCtx?.filename || session.activeContext || '—'}
              </div>
            </div>
          )}
        </div>

        {/* Right */}
        <div>
          {/* Protocol steps */}
          <div className="section-title">Protocol Progress</div>
          <div className="card" style={{ padding: '14px 16px', marginBottom: 16 }}>
            {PROTOCOL_STEPS.map((step, i) => {
              const done = step.id < currentStep;
              const active = step.id === currentStep;
              return (
                <div key={step.id} style={{ display: 'flex', gap: 10, marginBottom: i < PROTOCOL_STEPS.length - 1 ? 10 : 0, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700,
                    background: done ? '#d4f0dc' : active ? 'var(--color-accent)' : 'rgba(26,15,10,0.08)',
                    color: done ? '#1a7a3a' : active ? 'white' : 'rgba(26,15,10,0.35)'
                  }}>
                    {done ? '✓' : step.id}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? 'var(--color-header)' : done ? 'rgba(26,15,10,0.5)' : 'rgba(26,15,10,0.7)', marginBottom: 1 }}>
                      {step.label}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(26,15,10,0.4)', lineHeight: 1.4 }}>{step.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Confirmed log */}
          <div className="section-title">Confirmed Messages</div>
          <div className="card" style={{ maxHeight: 200, overflowY: 'auto', padding: '12px 14px' }}>
            {confirmedLog.length === 0 ? (
              <div className="empty-state" style={{ padding: '16px 0' }}>No confirmed messages yet.</div>
            ) : (
              confirmedLog.slice().reverse().map(m => (
                <div key={m.id} className="log-entry">
                  <div>
                    <span style={{ fontWeight: 600 }}>[{m.from}] → [{m.to}]</span>
                    <span className="badge badge-blue" style={{ marginLeft: 6 }}>{m.type}</span>
                    {m.payload?.sensitive && <span className="badge badge-orange" style={{ marginLeft: 4 }}>⚠ sensitive</span>}
                  </div>
                  <div className="log-entry-meta">
                    {m.payload?.content?.substring(0, 70)}{m.payload?.content?.length > 70 ? '…' : ''}
                  </div>
                  <div className="log-entry-meta">{new Date(m.timestamp).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>

          {/* Recent contexts */}
          <div className="section-title" style={{ marginTop: 12 }}>Context Files</div>
          <div className="card" style={{ padding: '12px 14px' }}>
            {contexts.length === 0 ? (
              <div className="empty-state" style={{ padding: '10px 0' }}>No context files.</div>
            ) : (
              contexts.map(f => (
                <div key={f} style={{
                  padding: '5px 0', borderBottom: '1px solid rgba(200,97,74,0.1)',
                  fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span>📄 {f}</span>
                  {f === currentCtx?.filename && <span className="badge badge-green">active</span>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
