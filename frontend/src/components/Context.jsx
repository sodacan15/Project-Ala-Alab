import React, { useEffect, useState } from 'react';

const SECTIONS = [
  'Identity & Metadata', 'Active Threads', 'Ecological Records',
  'Community & Oral History', 'Official Records', 'Infrastructure & Policy Friction',
  'Cross-Reference Flags', 'Human Annotations', 'Erratum Log', 'Session History'
];
const SOURCE_TAGS = ['[ORAL]', '[FIELD]', '[OFFICIAL]', '[POLICY]', '[SECONDARY]', '[SYNTHESIS]', '[AGGREGATED]'];
const SCOPES = ['Barangay', 'City Hall', 'LGU'];
const SIGNIFICANCE_OPTS = ['Ecological', 'Historical', 'Policy', 'Health', 'Disaster', 'Community-relevant'];

async function copyToOS(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

export default function Context({ showToast }) {
  const [contexts, setContexts] = useState([]);
  const [activeFile, setActiveFile] = useState('');
  const [current, setCurrent] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showAppendForm, setShowAppendForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newScope, setNewScope] = useState('Barangay');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [log, setLog] = useState([]);

  // Append entry form state
  const [appendContent, setAppendContent] = useState('');
  const [appendTag, setAppendTag] = useState('[ORAL]');
  const [appendContributor, setAppendContributor] = useState('');
  const [appendDate, setAppendDate] = useState(new Date().toISOString().split('T')[0]);
  const [appendSection, setAppendSection] = useState('Community & Oral History');
  const [appendSignificance, setAppendSignificance] = useState('Community-relevant');
  const [appendSensitive, setAppendSensitive] = useState(false);
  const [appendNote, setAppendNote] = useState('');
  const [appending, setAppending] = useState(false);

  const displayRef = React.useRef(null);

  const fetchAll = async () => {
    try {
      const [ctxRes, currentRes, logRes] = await Promise.all([
        fetch('/contexts'), fetch('/contexts/current'), fetch('/bridge/log')
      ]);
      const ctxList = await ctxRes.json();
      const cur = await currentRes.json();
      setContexts(ctxList);
      setCurrent(cur);
      setActiveFile(cur?.filename || '');
      setLog(await logRes.json());
    } catch {}
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSwitchContext = async (filename) => {
    if (!filename) return;
    try {
      const res = await fetch(`/contexts/${filename}`);
      const data = await res.json();
      if (data.content) { setCurrent(data); setActiveFile(filename); }
    } catch {}
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/contexts/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, scope: newScope, description: newDesc })
      });
      const data = await res.json();
      if (data.created) {
        showToast(`✓ Context "${newName}" created. Session reset.`);
        setShowNewForm(false);
        setNewName(''); setNewDesc('');
        fetchAll();
      }
    } catch {}
    setCreating(false);
  };

  const handleCopyFull = async () => {
    if (!current?.content) return;
    const text = current.content;
    await fetch('/clipboard/copy-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, label: `Full Context: ${current.filename}` })
    });
    const ok = await copyToOS(text);
    showToast(ok ? 'Full context copied to OS clipboard & buffer.' : 'Full context copied to buffer.');
  };

  const handleAppendEntry = async () => {
    if (!appendContent.trim()) return;
    setAppending(true);
    try {
      const res = await fetch('/contexts/append-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: appendContent.trim(),
          sourceTag: appendTag,
          contributor: appendContributor,
          dateOfObservation: appendDate,
          significance: appendSignificance,
          sensitive: appendSensitive,
          section: appendSection,
          note: appendNote
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ Entry appended to "${appendSection}".`);
        setAppendContent(''); setAppendContributor(''); setAppendNote('');
        setAppendSensitive(false);
        setShowAppendForm(false);
        fetchAll();
      }
    } catch {}
    setAppending(false);
  };

  const jumpToSection = (section) => {
    if (!displayRef.current) return;
    const text = displayRef.current.innerText || displayRef.current.textContent;
    const idx = (current?.content || '').indexOf(`## ${section}`);
    if (idx === -1) return;
    // Scroll proportionally
    const ratio = idx / (current.content.length || 1);
    displayRef.current.scrollTop = ratio * displayRef.current.scrollHeight;
  };

  const extractVersion = (content) => {
    const match = content?.match(/\*\*Version:\*\* ([^\s|]+)/);
    return match ? match[1] : null;
  };

  const extractLastUpdated = (content) => {
    const match = content?.match(/\*\*Last updated:\*\* ([^\n]+)/);
    return match ? match[1].trim() : null;
  };

  const lastEntry = [...log].reverse().find(m => m.type === 'proposed_entry' && m.status === 'confirmed');
  const version = extractVersion(current?.content);
  const lastUpdated = extractLastUpdated(current?.content);

  return (
    <div>
      <div className="section-title">Context File Manager</div>

      {/* Selector row */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '12px 16px' }}>
        <select style={{ flex: 1, minWidth: 180 }} value={activeFile}
          onChange={e => { setActiveFile(e.target.value); handleSwitchContext(e.target.value); }}>
          {contexts.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        {version && <span className="badge badge-blue">v{version}</span>}
        <button className="btn btn-primary btn-sm" onClick={() => { setShowNewForm(v => !v); setShowAppendForm(false); }}>+ New Context</button>
        <button className="btn btn-secondary btn-sm" onClick={() => { setShowAppendForm(v => !v); setShowNewForm(false); }}>+ Append Entry</button>
        <button className="btn btn-secondary btn-sm" onClick={fetchAll}>↻</button>
        <button className="btn btn-secondary btn-sm" onClick={handleCopyFull}>Copy Full Context</button>
      </div>

      {/* New context form */}
      {showNewForm && (
        <div className="card" style={{ background: '#fdf8f2', border: '1px solid rgba(200,97,74,0.2)', marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>New Context File</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Name</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Canumay East Flood Records" />
            </div>
            <div className="form-group">
              <label>Scope</label>
              <select value={newScope} onChange={e => setNewScope(e.target.value)}>
                {SCOPES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Brief description of this community memory context…" style={{ minHeight: 60 }} />
          </div>
          <div style={{ fontSize: 11, color: 'rgba(26,15,10,0.45)', marginBottom: 10 }}>
            ⚠ Creating a new context saves the current session and starts a fresh one.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? 'Creating…' : 'Create Context'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowNewForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Append entry form */}
      {showAppendForm && (
        <div className="card" style={{ background: '#f0faf0', border: '1px solid rgba(30,106,58,0.2)', marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 12, color: '#1e6a3a' }}>Append Entry to Context</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Target Section</label>
              <select value={appendSection} onChange={e => setAppendSection(e.target.value)}>
                {SECTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Source Type</label>
              <select value={appendTag} onChange={e => setAppendTag(e.target.value)}>
                {SOURCE_TAGS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Significance</label>
              <select value={appendSignificance} onChange={e => setAppendSignificance(e.target.value)}>
                {SIGNIFICANCE_OPTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 10 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Contributor</label>
              <input type="text" value={appendContributor} onChange={e => setAppendContributor(e.target.value)} placeholder="Name or role" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Date of Observation</label>
              <input type="date" value={appendDate} onChange={e => setAppendDate(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Content</label>
            <textarea value={appendContent} onChange={e => setAppendContent(e.target.value)}
              placeholder="Entry content — plain language." style={{ minHeight: 80 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr auto', gap: 8, marginBottom: 10 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Note (optional)</label>
              <input type="text" value={appendNote} onChange={e => setAppendNote(e.target.value)} placeholder="One-line annotation…" />
            </div>
            <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <input type="checkbox" checked={appendSensitive} onChange={e => setAppendSensitive(e.target.checked)} style={{ width: 'auto' }} />
                ⚠ Sensitive
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleAppendEntry} disabled={appending || !appendContent.trim()}
              style={{ background: '#1e6a3a', borderColor: '#1e6a3a' }}>
              {appending ? 'Writing…' : '✓ Write to Context'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAppendForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Section navigator */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {SECTIONS.map(s => (
          <button key={s} className="btn btn-secondary btn-sm"
            style={{ fontSize: 10, padding: '3px 8px' }}
            onClick={() => jumpToSection(s)}>
            {s}
          </button>
        ))}
      </div>

      {/* Context display header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div className="section-title" style={{ marginBottom: 0 }}>{current?.filename || 'No active context'}</div>
        <div style={{ fontSize: 10, color: 'rgba(26,15,10,0.4)', display: 'flex', gap: 10 }}>
          {version && <span>v{version}</span>}
          {lastUpdated && <span>Updated {lastUpdated}</span>}
        </div>
      </div>

      <div className="context-display" ref={displayRef}>
        {current?.content || 'Loading…'}
      </div>

      {/* Last entry metadata */}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="section-title" style={{ marginBottom: 8 }}>Last Confirmed Entry</div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'rgba(26,15,10,0.4)', textTransform: 'uppercase' }}>Preview</div>
            <div style={{ fontSize: 12, marginTop: 4, maxWidth: 300, color: 'rgba(26,15,10,0.7)' }}>
              {lastEntry ? lastEntry.payload?.content?.substring(0, 80) + (lastEntry.payload?.content?.length > 80 ? '…' : '') : 'No confirmed entries yet'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'rgba(26,15,10,0.4)', textTransform: 'uppercase' }}>Last Edited</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>{lastEntry ? new Date(lastEntry.timestamp).toLocaleString() : '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'rgba(26,15,10,0.4)', textTransform: 'uppercase' }}>Source Type</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>{lastEntry?.payload?.source_tag || '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
