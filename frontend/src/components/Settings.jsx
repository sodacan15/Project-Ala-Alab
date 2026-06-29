import React, { useEffect, useState } from 'react';

const AGENTS = ['Gemini', 'Claude', 'NotebookLM'];

const AGENT_INFO = {
  Gemini: {
    role: 'The Communicator',
    desc: 'Faces the user, handles intake and partial denoise. Routes summaries to Claude AND NotebookLM.',
    tab: 'gemini.google.com',
    color: '#1e6fa0',
    icon: '◈'
  },
  Claude: {
    role: 'The Scribe',
    desc: 'Receives Gemini summary, proposes context entries, sends structured updates to NotebookLM.',
    tab: 'claude.ai',
    color: '#8a4a1e',
    icon: '✍'
  },
  NotebookLM: {
    role: 'The Archivist',
    desc: 'One notebook, accumulates everything. Synthesizes across all sources and provides corpus reports.',
    tab: 'notebooklm.google.com',
    color: '#1e6a3a',
    icon: '◫'
  }
};

export default function Settings({ showToast, onLogout }) {
  const [accounts, setAccounts] = useState({});
  const [forms, setForms] = useState({
    Gemini: { name: '', email: '' },
    Claude: { name: '', email: '' },
    NotebookLM: { name: '', email: '' }
  });
  const [saving, setSaving] = useState({});

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/accounts');
      setAccounts(await res.json());
    } catch {}
  };

  useEffect(() => { fetchAccounts(); }, []);

  const handleConnect = async (agent) => {
    const { name, email } = forms[agent];
    if (!name.trim()) { showToast('Display name is required.'); return; }
    setSaving(s => ({ ...s, [agent]: true }));
    try {
      await fetch(`/accounts/${agent}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name.trim(), email: email.trim() })
      });
      fetchAccounts();
      setForms(f => ({ ...f, [agent]: { name: '', email: '' } }));
      showToast(`${agent} marked as connected.`);
    } catch {}
    setSaving(s => ({ ...s, [agent]: false }));
  };

  const handleDisconnect = async (agent) => {
    await fetch(`/accounts/${agent}/disconnect`, { method: 'DELETE' });
    fetchAccounts();
    showToast(`${agent} disconnected.`);
  };

  const handleLogout = async () => {
    await fetch('/session/current', { method: 'DELETE' });
    showToast('Session ended. Returning to login…');
    setTimeout(onLogout, 1200);
  };

  const connectedCount = Object.values(accounts).filter(a => a.connected).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div className="section-title" style={{ marginBottom: 4 }}>Agent Account Settings</div>
          <div style={{ fontSize: 12, color: 'rgba(26,15,10,0.5)' }}>
            No passwords or API keys. Enter the display name you use in each browser tab — this tracks connection state only.
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className={`badge ${connectedCount === 3 ? 'badge-green' : connectedCount > 0 ? 'badge-orange' : 'badge-grey'}`} style={{ fontSize: 12, padding: '4px 12px' }}>
            {connectedCount}/3 agents connected
          </div>
        </div>
      </div>

      {/* Bus metaphor notice */}
      <div className="card" style={{ background: '#f5f0e8', border: '1px solid rgba(200,97,74,0.2)', marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: 'rgba(26,15,10,0.6)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--color-header)' }}>How this works:</strong> Ala-Alab is the bus — it drives the protocol. Gemini, Claude, and NotebookLM are the passengers. Open each service in a browser tab, then register your display name below so the dashboard shows accurate status. The app works as a message formatter and validator regardless of whether agents are "connected" here.
        </div>
      </div>

      {AGENTS.map(agent => {
        const info = accounts[agent] || {};
        const meta = AGENT_INFO[agent];
        return (
          <div key={agent} className="card" style={{ marginBottom: 20, borderLeft: `4px solid ${meta.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 18 }}>{meta.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 16, color: meta.color }}>{agent}</span>
                  <span className={`badge ${info.connected ? 'badge-green' : 'badge-grey'}`}>
                    {info.connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(26,15,10,0.6)' }}>{meta.role}</div>
                <div style={{ fontSize: 12, color: 'rgba(26,15,10,0.45)', marginTop: 2, maxWidth: 420 }}>{meta.desc}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12 }}>
                <div style={{ color: 'rgba(26,15,10,0.4)' }}>Open in browser:</div>
                <a href={`https://${meta.tab}`} target="_blank" rel="noreferrer"
                  style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500 }}>
                  ↗ {meta.tab}
                </a>
              </div>
            </div>

            {/* Connected state */}
            {info.connected ? (
              <div style={{ background: '#f0f8f0', borderRadius: 6, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{info.displayName}</div>
                  {info.email && <div style={{ fontSize: 12, color: 'rgba(26,15,10,0.5)' }}>{info.email}</div>}
                  <div style={{ fontSize: 11, color: 'rgba(26,15,10,0.4)', marginTop: 2, fontFamily: 'monospace' }}>{info.model}</div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => handleDisconnect(agent)}>Disconnect</button>
              </div>
            ) : (
              <div style={{ background: '#fdf8f2', borderRadius: 6, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'rgba(26,15,10,0.5)', marginBottom: 8 }}>
                  Enter the name/account you use in your <strong>{meta.tab}</strong> tab:
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      placeholder="Display name (e.g. Juan dela Cruz)"
                      value={forms[agent].name}
                      onChange={e => setForms(f => ({ ...f, [agent]: { ...f[agent], name: e.target.value } }))}
                      onKeyDown={e => e.key === 'Enter' && handleConnect(agent)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="email"
                      placeholder="Email (optional)"
                      value={forms[agent].email}
                      onChange={e => setForms(f => ({ ...f, [agent]: { ...f[agent], email: e.target.value } }))}
                      onKeyDown={e => e.key === 'Enter' && handleConnect(agent)}
                    />
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleConnect(agent)}
                  disabled={saving[agent] || !forms[agent].name.trim()}
                >
                  {saving[agent] ? 'Connecting…' : 'Mark as Connected'}
                </button>
              </div>
            )}
          </div>
        );
      })}

      <hr />

      {/* Protocol instructions */}
      <div className="card" style={{ background: '#fdf8f2', marginBottom: 20 }}>
        <div className="section-title" style={{ marginBottom: 10 }}>Protocol Guide</div>
        <div style={{ fontSize: 12, color: 'rgba(26,15,10,0.65)', lineHeight: 1.8 }}>
          <strong>Step 1</strong> — Open three browser tabs: Gemini, Claude.ai, NotebookLM<br />
          <strong>Step 2</strong> — Come back here and register each account above<br />
          <strong>Step 3</strong> — Go to <strong>Agents</strong> tab → type your input → click Send<br />
          <strong>Step 4</strong> — Click <strong>Copy</strong> on the pending card → paste into the target tab<br />
          <strong>Step 5</strong> — Copy the AI's response → go back to Agents → click <strong>+ Receive Response</strong> → paste and submit<br />
          <strong>Step 6</strong> — Confirm or Reject each message in the Auditing panel<br />
          <strong>Step 7</strong> — Confirmed entries appear in Context → send to NotebookLM manually
        </div>
      </div>

      <button className="btn btn-danger" onClick={handleLogout}>
        Logout &amp; End Session
      </button>
      <span style={{ fontSize: 12, color: 'rgba(26,15,10,0.4)', marginLeft: 12 }}>
        Saves current context before returning to login.
      </span>
    </div>
  );
}
