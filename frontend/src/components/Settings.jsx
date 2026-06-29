import React, { useEffect, useState } from 'react';

const AGENTS = ['Gemini', 'Claude', 'NotebookLM'];

const AGENT_INFO = {
  Gemini: {
    role: 'The Communicator',
    desc: 'Faces the user. Handles raw intake, partial denoise, and produces structured summaries. Routes to Claude AND NotebookLM.',
    tab: 'gemini.google.com',
    color: '#1e6fa0',
    icon: '◈',
    model: 'Gemini 2.0 Flash'
  },
  Claude: {
    role: 'The Scribe',
    desc: 'Receives Gemini summary. Proposes context entries. Sends structured updates to NotebookLM.',
    tab: 'claude.ai',
    color: '#8a4a1e',
    icon: '✍',
    model: 'Claude 3.5 Sonnet'
  },
  NotebookLM: {
    role: 'The Archivist',
    desc: 'One notebook, accumulates everything. Synthesizes across all sources and provides corpus reports.',
    tab: 'notebooklm.google.com',
    color: '#1e6a3a',
    icon: '◫',
    model: 'NotebookLM Plus'
  }
};

const PROTOCOL_STEPS = [
  {
    label: 'Open three browser tabs',
    desc: 'Open gemini.google.com, claude.ai, and notebooklm.google.com in separate tabs. Keep them open throughout the session.',
    tag: null
  },
  {
    label: 'Register agents below',
    desc: 'Enter your display name for each service. This tracks connection state — no passwords, no API keys.',
    tag: null
  },
  {
    label: 'Go to Agents tab → type your intake',
    desc: 'Fill the structured intake form: scope, source type, contributor, date, content, sensitive flag. Click Send.',
    tag: '[User→Gemini]'
  },
  {
    label: 'Copy the formatted block → paste into Gemini',
    desc: 'Click Copy on the Auditing card. Switch to your Gemini tab. Paste. Wait for Gemini\'s response.',
    tag: null
  },
  {
    label: 'Copy Gemini\'s response → Receive Response',
    desc: 'Copy the AI reply. Return to Ala-Alab → Agents → + Receive Response. Set from=Gemini, to=Claude, type=intake_summary. Paste and stage.',
    tag: '[Gemini→Claude]'
  },
  {
    label: 'Repeat: paste into Claude → receive → stage',
    desc: 'Copy the staged block → paste into Claude tab. Copy Claude\'s proposed entry. Receive Response: from=Claude, type=proposed_entry.',
    tag: '[Claude→NotebookLM]'
  },
  {
    label: 'Confirm in Auditing panel → POOF → context.md',
    desc: 'Review the proposed entry. Click Confirm. The entry is written to context.md under the correct section. This is the POOF protocol.',
    tag: 'POOF'
  }
];

const SOURCE_TAGS = [
  { tag: '[ORAL]', meaning: 'Oral testimony, elder memory, interview' },
  { tag: '[FIELD]', meaning: 'On-the-ground observation, field walk' },
  { tag: '[OFFICIAL]', meaning: 'Government documents, barangay records' },
  { tag: '[POLICY]', meaning: 'Policy documents, ordinances' },
  { tag: '[SECONDARY]', meaning: 'Academic, media, third-party sources' },
  { tag: '[SYNTHESIS]', meaning: 'Cross-referenced, derived from multiple sources' },
  { tag: '[AGGREGATED]', meaning: 'Compiled from multiple entries' },
];

export default function Settings({ showToast, onLogout }) {
  const [accounts, setAccounts] = useState({});
  const [forms, setForms] = useState({
    Gemini: { name: '', email: '' },
    Claude: { name: '', email: '' },
    NotebookLM: { name: '', email: '' }
  });
  const [saving, setSaving] = useState({});
  const [showGuide, setShowGuide] = useState(true);
  const [showTags, setShowTags] = useState(false);

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
      showToast(`✓ ${agent} marked as connected.`);
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
    showToast('Session ended. Context saved. Returning to login…');
    setTimeout(onLogout, 1400);
  };

  const connectedCount = Object.values(accounts).filter(a => a.connected).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div className="section-title" style={{ marginBottom: 4 }}>Agent Account Settings</div>
          <div style={{ fontSize: 12, color: 'rgba(26,15,10,0.5)', maxWidth: 480, lineHeight: 1.6 }}>
            No passwords. No API keys. Register the display name you use in each browser tab — this tracks connection state for the dashboard only.
          </div>
        </div>
        <div>
          <div className={`badge ${connectedCount === 3 ? 'badge-green' : connectedCount > 0 ? 'badge-orange' : 'badge-grey'}`}
            style={{ fontSize: 12, padding: '5px 14px' }}>
            {connectedCount}/3 agents connected
          </div>
        </div>
      </div>

      {/* Bus metaphor */}
      <div className="card" style={{ background: 'var(--color-card-dark)', color: 'rgba(245,240,232,0.8)', marginBottom: 20 }}>
        <div style={{ fontSize: 12, lineHeight: 1.8 }}>
          <strong style={{ color: 'var(--color-accent)', fontSize: 13 }}>Ala-Alab is the bus. Gemini, Claude, and NotebookLM are the passengers.</strong>
          <br />
          The app drives the protocol — formatting, validating, staging, and writing to context.md. The AI services do the thinking. You are the Bridge: the human who carries messages between tabs. Open each service in a browser tab, register below, and the dashboard shows live status.
        </div>
      </div>

      {/* Agent cards */}
      {AGENTS.map(agent => {
        const info = accounts[agent] || {};
        const meta = AGENT_INFO[agent];
        return (
          <div key={agent} className="card" style={{ marginBottom: 16, borderLeft: `4px solid ${meta.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 18 }}>{meta.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 15, color: meta.color }}>{agent}</span>
                  <span className={`badge ${info.connected ? 'badge-green' : 'badge-grey'}`}>
                    {info.connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(26,15,10,0.6)' }}>{meta.role}</div>
                <div style={{ fontSize: 11, color: 'rgba(26,15,10,0.45)', marginTop: 2, maxWidth: 400, lineHeight: 1.5 }}>{meta.desc}</div>
                <div style={{ fontSize: 10, color: 'rgba(26,15,10,0.35)', marginTop: 4, fontFamily: 'monospace' }}>{meta.model}</div>
              </div>
              <a href={`https://${meta.tab}`} target="_blank" rel="noreferrer"
                style={{ color: 'var(--color-accent)', textDecoration: 'none', fontSize: 12, fontWeight: 500, flexShrink: 0 }}>
                ↗ Open {meta.tab}
              </a>
            </div>

            {info.connected ? (
              <div style={{ background: '#f0f8f0', borderRadius: 6, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-header)' }}>{info.displayName}</div>
                  {info.email && <div style={{ fontSize: 11, color: 'rgba(26,15,10,0.5)', marginTop: 2 }}>{info.email}</div>}
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => handleDisconnect(agent)}>Disconnect</button>
              </div>
            ) : (
              <div style={{ background: '#fdf8f2', borderRadius: 6, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'rgba(26,15,10,0.5)', marginBottom: 8 }}>
                  Enter the name/account you use in your <strong>{meta.tab}</strong> tab:
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    style={{ flex: 1 }}
                    placeholder="Display name (e.g. Juan dela Cruz)"
                    value={forms[agent].name}
                    onChange={e => setForms(f => ({ ...f, [agent]: { ...f[agent], name: e.target.value } }))}
                    onKeyDown={e => e.key === 'Enter' && handleConnect(agent)}
                  />
                  <input
                    type="email"
                    style={{ flex: 1 }}
                    placeholder="Email (optional)"
                    value={forms[agent].email}
                    onChange={e => setForms(f => ({ ...f, [agent]: { ...f[agent], email: e.target.value } }))}
                    onKeyDown={e => e.key === 'Enter' && handleConnect(agent)}
                  />
                  <button className="btn btn-primary btn-sm"
                    onClick={() => handleConnect(agent)}
                    disabled={saving[agent] || !forms[agent].name.trim()}>
                    {saving[agent] ? 'Connecting…' : 'Connect'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <hr style={{ margin: '24px 0', borderColor: 'rgba(200,97,74,0.15)' }} />

      {/* Protocol Guide */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="section-title" style={{ marginBottom: 0 }}>Protocol Guide</div>
        <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => setShowGuide(v => !v)}>
          {showGuide ? 'Hide' : 'Show'}
        </button>
      </div>

      {showGuide && (
        <div className="card" style={{ background: '#fdf8f2', marginBottom: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {PROTOCOL_STEPS.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--color-accent)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700
                }}>{i + 1}</div>
                <div style={{ flex: 1, paddingTop: 3 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-header)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {step.label}
                    {step.tag && (
                      <span style={{
                        background: step.tag === 'POOF' ? 'var(--color-accent)' : 'rgba(200,97,74,0.1)',
                        color: step.tag === 'POOF' ? 'white' : 'var(--color-header)',
                        fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
                        fontFamily: 'monospace', letterSpacing: 0.5
                      }}>{step.tag}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(26,15,10,0.55)', lineHeight: 1.6 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Source tags reference */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div className="section-title" style={{ marginBottom: 0 }}>Source Tag Reference</div>
        <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => setShowTags(v => !v)}>
          {showTags ? 'Hide' : 'Show'}
        </button>
      </div>

      {showTags && (
        <div className="card" style={{ background: '#fdf8f2', marginBottom: 20 }}>
          {SOURCE_TAGS.map(({ tag, meaning }) => (
            <div key={tag} style={{ display: 'flex', gap: 12, padding: '5px 0', borderBottom: '1px solid rgba(200,97,74,0.08)', alignItems: 'center' }}>
              <span style={{
                fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
                background: 'rgba(200,97,74,0.1)', color: 'var(--color-header)',
                padding: '2px 8px', borderRadius: 3, minWidth: 110, textAlign: 'center', flexShrink: 0
              }}>{tag}</span>
              <span style={{ fontSize: 12, color: 'rgba(26,15,10,0.6)' }}>{meaning}</span>
            </div>
          ))}
          <div style={{ marginTop: 10, padding: '8px 0', borderTop: '1px solid rgba(200,97,74,0.1)', fontSize: 11, color: 'rgba(26,15,10,0.45)' }}>
            <strong>On Confirm:</strong> [FIELD] → Ecological Records · [OFFICIAL]/[POLICY] → Official Records · [SYNTHESIS] → Cross-Reference Flags · All others → Community & Oral History
          </div>
        </div>
      )}

      <hr style={{ margin: '24px 0', borderColor: 'rgba(200,97,74,0.15)' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button className="btn btn-danger" onClick={handleLogout}>
          Logout &amp; End Session
        </button>
        <span style={{ fontSize: 11, color: 'rgba(26,15,10,0.4)' }}>
          Saves current context before returning to login screen.
        </span>
      </div>
    </div>
  );
}
