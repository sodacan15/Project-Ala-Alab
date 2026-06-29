import React, { useEffect, useState } from 'react';

const AGENT_META = {
  Gemini: { role: 'Communicator & Intake', desc: 'Denoises raw input, structures intake summaries', tab: 'gemini.google.com', color: '#1e6fa0' },
  Claude: { role: 'Scribe & Document Logic', desc: 'Proposes entries, maintains context.md', tab: 'claude.ai', color: '#8a4a1e' },
  NotebookLM: { role: 'Archivist & Synthesis', desc: 'Corpus accumulation, cross-source synthesis', tab: 'notebooklm.google.com', color: '#1e6a3a' }
};

const PROTOCOL_STEPS = [
  { id: 1, label: 'Open agent tabs', desc: 'Open Gemini, Claude, NotebookLM in browser' },
  { id: 2, label: 'Inject primer', desc: 'Dashboard → 📋 Copy Primer per agent → paste into each tab' },
  { id: 3, label: 'Submit intake', desc: 'Agents → fill intake form → Send' },
  { id: 4, label: 'Copy → paste to Gemini', desc: 'Copy the formatted block from Auditing panel' },
  { id: 5, label: 'Receive response', desc: '+ Receive Response → paste AI reply → stage' },
  { id: 6, label: 'Confirm → POOF', desc: 'Auditing → Confirm → written to context.md' },
];

export default function Dashboard({ onNavigate, showToast }) {
  const [accounts, setAccounts] = useState({});
  const [log, setLog] = useState([]);
  const [contexts, setContexts] = useState([]);
  const [transit, setTransit] = useState([]);
  const [session, setSession] = useState(null);
  const [currentCtx, setCurrentCtx] = useState(null);
  const [primerLoading, setPrimerLoading] = useState({});

  const copyPrimer = async (agentName) => {
    setPrimerLoading(l => ({ ...l, [agentName]: true }));
    try {
      const res = await fetch(`/session/primer/${agentName}`);
      const data = await res.json();
      if (data.primer) {
        await fetch('/clipboard/copy-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: data.primer, label: `Session Primer — ${agentName}` })
        });
        try { await navigator.clipboard.writeText(data.primer); } catch {}
        showToast && showToast(`📋 ${agentName} primer copied — paste into the tab to inject instructions + context.`);
      }
    } catch {
      showToast && showToast('Failed to generate primer.');
    }
    setPrimerLoading(l => ({ ...l, [agentName]: false }));
  };

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

  const currentStep = connectedCount === 0 ? 2
    : log.length === 0 ? 3
    : pendingCount > 0 ? 6
    : confirmedLog.length === 0 ? 5
    : 6;

  return (
    <div className="dashboard-root">
      <div className="dashboard-heading">[ DASHBOARD ]</div>

      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-num">{connectedCount}<span className="stat-denom">/3</span></div>
          <div className="stat-label">Agents Connected</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{confirmedLog.length}</div>
          <div className="stat-label">Confirmed Entries</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: pendingCount > 0 ? 'var(--color-accent)' : 'inherit' }}>
            {pendingCount}
          </div>
          <div className="stat-label">Pending in Transit</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{contexts.length}</div>
          <div className="stat-label">Context Files</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-left">
          <div className="section-title">Agent Report</div>

          <div className="agent-report-list">
            {Object.entries(accounts).map(([name, info]) => {
              const meta = AGENT_META[name] || {};
              return (
                <div key={name} className="agent-report-card" style={{ borderLeftColor: meta.color }}>
                  <div className="arc-header">
                    <div className="arc-role">{meta.role}</div>
                    <span className={`badge ${info.connected ? 'badge-green' : 'badge-grey'}`}>
                      {info.connected ? 'Active' : 'Offline'}
                    </span>
                  </div>
                  <div className="arc-name" style={{ color: meta.color }}>{name}</div>
                  {info.connected && info.displayName && (
                    <div className="arc-user">{info.displayName}{info.email ? ` · ${info.email}` : ''}</div>
                  )}
                  <div className="arc-footer">
                    <span className="arc-model">{info.model}</span>
                    <a href={`https://${meta.tab}`} target="_blank" rel="noreferrer" className="arc-link">
                      ↗ {meta.tab}
                    </a>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ marginLeft: 'auto', fontSize: 10, padding: '3px 9px', opacity: primerLoading[name] ? 0.6 : 1 }}
                      onClick={() => copyPrimer(name)}
                      disabled={primerLoading[name]}
                      title={`Copy full primer for ${name} — instructions + context.md`}
                    >
                      {primerLoading[name] ? '…' : '📋 Copy Primer'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {connectedCount === 0 && (
            <div className="onboard-prompt">
              <div className="onboard-prompt-title">Connect your first agent to begin</div>
              <div className="onboard-prompt-desc">Open Gemini in a browser tab, then register it in Settings to activate the protocol.</div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => onNavigate('settings')}>
                Go to Settings →
              </button>
            </div>
          )}

          {session && (
            <div className="card" style={{ borderLeft: '3px solid var(--color-accent)', marginTop: 4 }}>
              <div className="section-title" style={{ marginBottom: 6 }}>Active Session</div>
              <div className="session-meta">
                <div><span className="smeta-label">ID</span><span className="smeta-val mono">{session.id?.slice(0, 16)}…</span></div>
                <div><span className="smeta-label">Started</span><span className="smeta-val">{new Date(session.startTime).toLocaleString()}</span></div>
                <div><span className="smeta-label">Context</span><span className="smeta-val">{currentCtx?.filename || session.activeContext || '—'}</span></div>
              </div>
            </div>
          )}
        </div>

        <div className="dashboard-right">
          <div className="section-title">Logs and Histories</div>
          <div className="card log-card">
            {confirmedLog.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}>No confirmed entries yet.</div>
            ) : (
              confirmedLog.slice().reverse().map(m => (
                <div key={m.id} className="log-entry">
                  <div className="log-entry-header">
                    <span className="log-from">[{m.from}]</span>
                    <span className="log-arrow"> → </span>
                    <span>[{m.to}]</span>
                    <span className="badge badge-blue" style={{ marginLeft: 6 }}>{m.type}</span>
                    {m.payload?.sensitive && <span className="badge badge-orange" style={{ marginLeft: 4 }}>⚠ sensitive</span>}
                  </div>
                  <div className="log-entry-content">
                    {m.payload?.content?.substring(0, 80)}{m.payload?.content?.length > 80 ? '…' : ''}
                  </div>
                  <div className="log-entry-meta">{new Date(m.timestamp).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>

          <div className="section-title" style={{ marginTop: 12 }}>Recent Context Edited and Used</div>
          <div className="card" style={{ padding: '12px 16px' }}>
            {contexts.length === 0 ? (
              <div className="empty-state" style={{ padding: '10px 0' }}>No context files found.</div>
            ) : (
              contexts.map(f => (
                <div key={f} className="ctx-file-row">
                  <span className="ctx-file-name">› {f}</span>
                  {f === currentCtx?.filename && <span className="badge badge-green">active</span>}
                </div>
              ))
            )}
          </div>

          <div className="section-title" style={{ marginTop: 12 }}>Protocol Progress</div>
          <div className="card" style={{ padding: '14px 16px' }}>
            {PROTOCOL_STEPS.map((step, i) => {
              const done = step.id < currentStep;
              const active = step.id === currentStep;
              return (
                <div key={step.id} className="protocol-step-row" style={{ marginBottom: i < PROTOCOL_STEPS.length - 1 ? 10 : 0 }}>
                  <div className="protocol-step-dot" style={{
                    background: done ? '#d4f0dc' : active ? 'var(--color-accent)' : 'rgba(26,15,10,0.08)',
                    color: done ? '#1a7a3a' : active ? 'white' : 'rgba(26,15,10,0.35)'
                  }}>
                    {done ? '✓' : step.id}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? 'var(--color-header)' : done ? 'rgba(26,15,10,0.45)' : 'rgba(26,15,10,0.7)', marginBottom: 1 }}>
                      {step.label}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(26,15,10,0.4)', lineHeight: 1.4 }}>{step.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
