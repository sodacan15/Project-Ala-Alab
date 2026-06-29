import React, { useEffect, useState } from 'react';

export default function Context({ showToast }) {
  const [contexts, setContexts] = useState([]);
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
      setContexts(await ctxRes.json());
      setCurrent(await currentRes.json());
      setLog(await logRes.json());
    } catch (e) {}
  };

  useEffect(() => { fetchAll(); }, []);

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
        showToast(`Context "${newName}" created. Session reset.`);
        setShowNewForm(false);
        setNewName(''); setNewDesc('');
        fetchAll();
      }
    } catch (e) {}
    setCreating(false);
  };

  const handleRefresh = () => fetchAll();

  const handleCopyFull = async () => {
    if (!current?.content) return;
    await fetch('/clipboard/copy-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: current.content, label: `Full Context: ${current.filename}` })
    });
    showToast('Full context copied to clipboard buffer.');
  };

  const lastEntry = [...log].reverse().find(m => m.type === 'proposed_entry' && m.status === 'confirmed');

  return (
    <div>
      <div className="section-title">Context File Manager</div>

      {/* Top controls */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <select style={{ flex: 1, minWidth: 180 }} value={current?.filename || ''} onChange={() => {}}>
          {contexts.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" onClick={() => setShowNewForm(!showNewForm)}>
          + New Context
        </button>
        <button className="btn btn-secondary btn-sm" onClick={handleRefresh}>Refresh</button>
        <button className="btn btn-secondary btn-sm" onClick={handleCopyFull}>Copy Full Context</button>
      </div>

      {/* New context form */}
      {showNewForm && (
        <div className="card" style={{ background: '#fdf8f2', border: '1px solid rgba(200,97,74,0.2)' }}>
          <div className="section-title" style={{ marginBottom: 12 }}>New Context</div>
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
          <div className="form-group">
            <label>Description</label>
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Brief description of this context…" style={{ minHeight: 60 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowNewForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Context display */}
      <div className="section-title" style={{ marginTop: 4 }}>
        {current?.filename || 'No active context'}
      </div>
      <div className="context-display">
        {current?.content || 'Loading…'}
      </div>

      {/* Entry metadata */}
      <div className="card" style={{ marginTop: 16, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'rgba(26,15,10,0.4)', textTransform: 'uppercase' }}>ENTRY</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            {lastEntry ? lastEntry.payload?.content?.substring(0, 60) + '…' : 'No confirmed entries yet'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'rgba(26,15,10,0.4)', textTransform: 'uppercase' }}>LAST EDITED</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            {lastEntry ? new Date(lastEntry.timestamp).toLocaleString() : '—'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'rgba(26,15,10,0.4)', textTransform: 'uppercase' }}>CATEGORY</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>{lastEntry?.payload?.source_tag || '—'}</div>
        </div>
      </div>
    </div>
  );
}
