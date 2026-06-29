import React, { useEffect, useState } from 'react';

export default function Context({ showToast }) {
  const [contexts, setContexts] = useState([]);
  const [activeFile, setActiveFile] = useState('');
  const [current, setCurrent] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newScope, setNewScope] = useState('Barangay');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [log, setLog] = useState([]);

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
      if (data.content) {
        setCurrent(data);
        setActiveFile(filename);
      }
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
    try { await navigator.clipboard.writeText(text); showToast('Full context copied to OS clipboard & buffer.'); }
    catch { showToast('Full context copied to buffer (OS clipboard unavailable).'); }
  };

  const lastEntry = [...log].reverse().find(m => m.type === 'proposed_entry' && m.status === 'confirmed');

  return (
    <div>
      <div className="section-title">Context File Manager</div>

      {/* Selector row */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <select
          style={{ flex: 1, minWidth: 200 }}
          value={activeFile}
          onChange={e => { setActiveFile(e.target.value); handleSwitchContext(e.target.value); }}
        >
          {contexts.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" onClick={() => setShowNewForm(v => !v)}>+ New Context</button>
        <button className="btn btn-secondary btn-sm" onClick={fetchAll}>↻ Refresh</button>
        <button className="btn btn-secondary btn-sm" onClick={handleCopyFull}>Copy Full Context</button>
      </div>

      {/* New context form */}
      {showNewForm && (
        <div className="card" style={{ background: '#fdf8f2', border: '1px solid rgba(200,97,74,0.2)', marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>New Context</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Name</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Canumay East Flood Records" />
            </div>
            <div className="form-group">
              <label>Scope</label>
              <select value={newScope} onChange={e => setNewScope(e.target.value)}>
                <option>Barangay</option>
                <option>City Hall</option>
                <option>LGU</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Brief description of this community memory context…" style={{ minHeight: 60 }} />
          </div>
          <div style={{ fontSize: 11, color: 'rgba(26,15,10,0.45)', marginBottom: 10 }}>
            ⚠ Creating a new context will save the current session and start a fresh one.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? 'Creating…' : 'Create Context'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowNewForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Context display */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div className="section-title" style={{ marginBottom: 0 }}>{current?.filename || 'No active context'}</div>
        <span style={{ fontSize: 11, color: 'rgba(26,15,10,0.4)' }}>Scroll to read full document</span>
      </div>
      <div className="context-display">
        {current?.content || 'Loading…'}
      </div>

      {/* Last entry metadata */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title" style={{ marginBottom: 10 }}>Last Confirmed Entry</div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'rgba(26,15,10,0.4)', textTransform: 'uppercase' }}>Entry Preview</div>
            <div style={{ fontSize: 13, marginTop: 4, maxWidth: 300 }}>
              {lastEntry ? lastEntry.payload?.content?.substring(0, 80) + (lastEntry.payload?.content?.length > 80 ? '…' : '') : 'No confirmed entries yet'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'rgba(26,15,10,0.4)', textTransform: 'uppercase' }}>Last Edited</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>{lastEntry ? new Date(lastEntry.timestamp).toLocaleString() : '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'rgba(26,15,10,0.4)', textTransform: 'uppercase' }}>Category</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>{lastEntry?.payload?.source_tag || '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
