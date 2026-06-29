import React, { useEffect, useState } from 'react';

const AGENTS = ['Gemini', 'Claude', 'NotebookLM'];

const AGENT_INFO = {
  Gemini: {
    role: 'The Communicator',
    desc: 'Faces the community. Receives raw input — voice notes, broken sentences, dialect — and produces structured intake summaries routed to Claude.',
    tab: 'gemini.google.com',
    color: '#1e6fa0',
    model: 'Gemini 2.0 Flash',
    hint: 'Open gemini.google.com and enter your display name here.'
  },
  Claude: {
    role: 'The Scribe',
    desc: 'Receives Gemini summaries. Evaluates them. Proposes context entries for human confirmation. Writes to context.md after you confirm.',
    tab: 'claude.ai',
    color: '#8a4a1e',
    model: 'Claude 3.5 Sonnet',
    hint: 'Open claude.ai and enter your display name here.'
  },
  NotebookLM: {
    role: 'The Archivist',
    desc: 'One notebook, accumulates everything. Synthesizes across all corpus sources. Returns findings to Claude or you via the Bridge.',
    tab: 'notebooklm.google.com',
    color: '#1e6a3a',
    model: 'NotebookLM Plus',
    hint: 'Open notebooklm.google.com and enter your display name here.'
  }
};

const SOURCE_TAGS = [
  { tag: '[ORAL]', meaning: 'Oral testimony, elder memory, interview' },
  { tag: '[FIELD]', meaning: 'On-the-ground observation, field walk, site visit' },
  { tag: '[OFFICIAL]', meaning: 'Government documents, barangay records, city reports' },
  { tag: '[POLICY]', meaning: 'Policy documents, ordinances, administrative orders' },
  { tag: '[SECONDARY]', meaning: 'Academic, media, third-party sources' },
  { tag: '[SYNTHESIS]', meaning: 'Cross-referenced, derived from multiple sources' },
  { tag: '[AGGREGATED]', meaning: 'Compiled from multiple barangay-level entries' },
];

export default function Settings({ showToast, onLogout }) {
  const [accounts, setAccounts] = useState({});
  const [forms, setForms] = useState({
    Gemini: { name: '', email: '' },
    Claude: { name: '', email: '' },
    NotebookLM: { name: '', email: '' }
  });
  const [saving, setSaving] = useState({});
  const [showGuide, setShowGuide] = useState(false);
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
      showToast(`✓ ${agent} connected.`);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div className="section-title" style={{ marginBottom: 4 }}>Agent Accounts</div>
          <div style={{ fontSize: 12, color: 'rgba(26,15,10,0.5)', maxWidth: 460, lineHeight: 1.6 }}>
            Open each AI service in a browser tab. Enter the display name you use for that account below.
            No passwords. No API keys. This tracks connection state for the dashboard only.
          </div>
        </div>
        <span className={`badge ${connectedCount === 3 ? 'badge-green' : connectedCount > 0 ? 'badge-orange' : 'badge-grey'}`}
          style={{ fontSize: 12, padding: '5px 14px', flexShrink: 0 }}>
          {connectedCount}/3 connected
        </span>
      </div>

      {connectedCount === 0 && (
        <div className="card" style={{ background: 'var(--color-card-dark)', color: 'rgba(245,240,232,0.85)', marginBottom: 20 }}>
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            <strong style={{ color: 'var(--color-accent)' }}>Start here: connect Gemini first.</strong>
            <br />
            Open <a href="https://gemini.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>gemini.google.com</a> in a new tab, then enter your name in the Gemini card below. That's it — the protocol is ready.
          </div>
        </div>
      )}

      {AGENTS.map((agent, idx) => {
        const info = accounts[agent] || {};
        const meta = AGENT_INFO[agent];
        const isFirst = idx === 0;
        return (
          <div key={agent} className="card" style={{
            marginBottom: 14,
            borderLeft: `4px solid ${meta.color}`,
            background: isFirst && !info.connected ? '#fdf8f2' : 'white'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: meta.color }}>{agent}</span>
                  <span className={`badge ${info.connected ? 'badge-green' : 'badge-grey'}`}>
                    {info.connected ? 'Connected' : 'Offline'}
                  </span>
                  {isFirst && !info.connected && (
                    <span className="badge badge-orange" style={{ fontSize: 9 }}>START HERE</span>
                  )}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(26,15,10,0.55)', marginBottom: 2 }}>{meta.role}</div>
                <div style={{ fontSize: 11, color: 'rgba(26,15,10,0.45)', maxWidth: 420, lineHeight: 1.5 }}>{meta.desc}</div>
                <div style={{ fontSize: 10, color: 'rgba(26,15,10,0.3)', marginTop: 3, fontFamily: 'monospace' }}>{meta.model}</div>
              </div>
              <a href={`https://${meta.tab}`} target="_blank" rel="noreferrer"
                style={{ color: 'var(--color-accent)', textDecoration: 'none', fontSize: 12, fontWeight: 500, flexShrink: 0 }}>
                ↗ Open tab
              </a>
            </div>

            {info.connected ? (
              <div style={{ background: '#f0f8f0', borderRadius: 6, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: meta.color }}>{info.displayName}</div>
                  {info.email && <div style={{ fontSize: 11, color: 'rgba(26,15,10,0.5)', marginTop: 2 }}>{info.email}</div>}
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => handleDisconnect(agent)}>Disconnect</button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 11, color: 'rgba(26,15,10,0.45)', marginBottom: 8 }}>{meta.hint}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    style={{ flex: 2 }}
                    placeholder={`Your name in ${meta.tab}`}
                    value={forms[agent].name}
                    onChange={e => setForms(f => ({ ...f, [agent]: { ...f[agent], name: e.target.value } }))}
                    onKeyDown={e => e.key === 'Enter' && handleConnect(agent)}
                  />
                  <input
                    type="email"
                    style={{ flex: 2 }}
                    placeholder="Email (optional)"
                    value={forms[agent].email}
                    onChange={e => setForms(f => ({ ...f, [agent]: { ...f[agent], email: e.target.value } }))}
                    onKeyDown={e => e.key === 'Enter' && handleConnect(agent)}
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ background: meta.color, flexShrink: 0 }}
                    onClick={() => handleConnect(agent)}
                    disabled={saving[agent] || !forms[agent].name.trim()}
                  >
                    {saving[agent] ? 'Connecting…' : 'Connect'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <hr />

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowGuide(v => !v)}>
          {showGuide ? 'Hide' : 'Show'} Protocol Guide
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowTags(v => !v)}>
          {showTags ? 'Hide' : 'Show'} Source Tag Reference
        </button>
      </div>

      {showGuide && (
        <div className="card" style={{ background: '#fdf8f2', marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 14 }}>Protocol Guide — 7 Steps</div>
          {[
            { label: 'Open three browser tabs', desc: 'Open gemini.google.com, claude.ai, and notebooklm.google.com. Keep them open throughout the session.', tag: null },
            { label: 'Register agents above', desc: 'Enter your display name for each service. No passwords, no API keys.', tag: null },
            { label: 'Submit intake', desc: 'Agents tab → fill the intake form: scope, source type, contributor, date, content. Click Send.', tag: '[User → Gemini]' },
            { label: 'Copy block → paste into Gemini', desc: 'Click Copy on the Auditing card. Switch to your Gemini tab. Paste. Wait for the response.', tag: null },
            { label: 'Receive Gemini response', desc: '+ Receive Response → set from=Gemini, to=Claude, type=intake_summary. Paste and stage.', tag: '[Gemini → Claude]' },
            { label: 'Copy → paste into Claude → receive', desc: 'Copy the staged block → paste into Claude tab. Copy Claude\'s proposed entry. Receive Response: from=Claude, type=proposed_entry.', tag: '[Claude → NotebookLM]' },
            { label: 'Confirm → written to context.md', desc: 'Auditing panel → Confirm. Entry is written under the correct section heading. Transit purged.', tag: 'POOF' }
          ].map((step, i) => (
            <div key={i} className="guide-step">
              <div className="guide-step-num">{i + 1}</div>
              <div className="guide-step-body">
                <strong>{step.label}{step.tag && <span style={{ marginLeft: 8, fontFamily: 'monospace', fontSize: 10, background: step.tag === 'POOF' ? 'var(--color-accent)' : 'rgba(200,97,74,0.1)', color: step.tag === 'POOF' ? 'white' : 'var(--color-header)', padding: '1px 6px', borderRadius: 3 }}>{step.tag}</span>}</strong>
                <span>{step.desc}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showTags && (
        <div className="card" style={{ background: '#fdf8f2', marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>Source Tag Reference</div>
          {SOURCE_TAGS.map(({ tag, meaning }) => (
            <div key={tag} style={{ display: 'flex', gap: 12, padding: '5px 0', borderBottom: '1px solid rgba(200,97,74,0.08)', alignItems: 'center' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, background: 'rgba(200,97,74,0.1)', color: 'var(--color-header)', padding: '2px 8px', borderRadius: 3, minWidth: 110, textAlign: 'center', flexShrink: 0 }}>{tag}</span>
              <span style={{ fontSize: 12, color: 'rgba(26,15,10,0.6)' }}>{meaning}</span>
            </div>
          ))}
          <div style={{ marginTop: 10, padding: '8px 0', borderTop: '1px solid rgba(200,97,74,0.1)', fontSize: 11, color: 'rgba(26,15,10,0.45)' }}>
            <strong>On Confirm:</strong> [FIELD] → Ecological Records · [OFFICIAL]/[POLICY] → Official Records · [SYNTHESIS] → Cross-Reference Flags · Others → Community &amp; Oral History
          </div>
        </div>
      )}

      <hr />

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button className="btn btn-danger" onClick={handleLogout}>
          Logout &amp; End Session
        </button>
        <span style={{ fontSize: 11, color: 'rgba(26,15,10,0.4)' }}>
          Saves current context before returning to login.
        </span>
      </div>
    </div>
  );
}
