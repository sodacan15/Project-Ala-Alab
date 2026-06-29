import React, { useEffect, useState, useRef, useMemo } from 'react';
import { marked } from 'marked';

marked.setOptions({ breaks: true, gfm: true });

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
  const [viewMode, setViewMode] = useState('rendered');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [showNewForm, setShowNewForm] = useState(false);
  const [showAppendForm, setShowAppendForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newScope, setNewScope] = useState('Barangay');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [log, setLog] = useState([]);

  const [appendContent, setAppendContent] = useState('');
  const [appendTag, setAppendTag] = useState('[ORAL]');
  const [appendContributor, setAppendContributor] = useState('');
  const [appendDate, setAppendDate] = useState(new Date().toISOString().split('T')[0]);
  const [appendSection, setAppendSection] = useState('Community & Oral History');
  const [appendSignificance, setAppendSignificance] = useState('Community-relevant');
  const [appendSensitive, setAppendSensitive] = useState(false);
  const [appendNote, setAppendNote] = useState('');
  const [appending, setAppending] = useState(false);

  const renderedRef = useRef(null);
  const textareaRef = useRef(null);

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
      if (!dirty) setEditContent(cur?.content || '');
    } catch {}
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (current?.content && !dirty) setEditContent(current.content);
  }, [current]);

  const renderedHtml = useMemo(() => {
    try { return marked(editContent || ''); } catch { return ''; }
  }, [editContent]);

  const handleSwitchContext = async (filename) => {
    if (!filename) return;
    if (dirty) {
      const ok = window.confirm('You have unsaved edits. Discard and switch?');
      if (!ok) return;
    }
    try {
      const res = await fetch(`/contexts/${filename}`);
      const data = await res.json();
      if (data.content) {
        setCurrent(data);
        setActiveFile(filename);
        setEditContent(data.content);
        setDirty(false);
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
        setDirty(false);
        fetchAll();
      }
    } catch {}
    setCreating(false);
  };

  const handleCopyFull = async () => {
    const text = editContent;
    if (!text) return;
    await fetch('/clipboard/copy-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, label: `Full Context: ${activeFile}` })
    });
    const ok = await copyToOS(text);
    showToast(ok ? 'Full context copied to OS clipboard & buffer.' : 'Full context copied to buffer.');
  };

  const handleSave = async () => {
    if (!activeFile || !editContent) return;
    setSaving(true);
    try {
      const res = await fetch(`/contexts/${activeFile}/save`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent })
      });
      const data = await res.json();
      if (data.success) {
        setDirty(false);
        setCurrent(c => ({ ...c, content: editContent }));
        showToast('✓ Saved to disk.');
      } else {
        showToast('Save failed: ' + (data.error || 'Unknown error'));
      }
    } catch {
      showToast('Save failed.');
    }
    setSaving(false);
  };

  const handleEditChange = (val) => {
    setEditContent(val);
    setDirty(val !== (current?.content || ''));
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
        setDirty(false);
        fetchAll();
      }
    } catch {}
    setAppending(false);
  };

  const jumpToSection = (section) => {
    const marker = `## ${section}`;
    if (viewMode === 'edit' && textareaRef.current) {
      const idx = editContent.indexOf(marker);
      if (idx === -1) return;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(idx, idx + marker.length);
      const ratio = idx / (editContent.length || 1);
      textareaRef.current.scrollTop = ratio * textareaRef.current.scrollHeight;
    } else if (renderedRef.current) {
      const headings = renderedRef.current.querySelectorAll('h2');
      for (const h of headings) {
        if (h.textContent.includes(section)) {
          h.scrollIntoView({ behavior: 'smooth', block: 'start' });
          break;
        }
      }
    }
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
  const version = extractVersion(editContent);
  const lastUpdated = extractLastUpdated(editContent);

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
        <button className="btn btn-secondary btn-sm" onClick={handleCopyFull}>Copy Full</button>
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
              style={{ background: '#1e6a3a' }}>
              {appending ? 'Writing…' : '✓ Write to Context'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAppendForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Section navigator */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
        {SECTIONS.map(s => (
          <button key={s} className="btn btn-secondary btn-sm"
            style={{ fontSize: 10, padding: '3px 8px' }}
            onClick={() => jumpToSection(s)}>
            {s}
          </button>
        ))}
      </div>

      {/* Viewer header + toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="section-title" style={{ marginBottom: 0 }}>{activeFile || 'No active context'}</span>
          {version && <span className="badge badge-blue" style={{ fontSize: 10 }}>v{version}</span>}
          {lastUpdated && <span style={{ fontSize: 10, color: 'rgba(26,15,10,0.4)' }}>· Updated {lastUpdated}</span>}
          {dirty && <span style={{ fontSize: 10, color: 'var(--color-accent)', fontWeight: 700 }}>● unsaved</span>}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* View / Edit toggle */}
          <div style={{ display: 'flex', background: 'rgba(200,97,74,0.1)', borderRadius: 6, padding: 2, gap: 2 }}>
            {[
              { id: 'rendered', label: '◉ View' },
              { id: 'edit', label: '✏ Edit' }
            ].map(mode => (
              <button key={mode.id} onClick={() => setViewMode(mode.id)}
                style={{
                  background: viewMode === mode.id ? 'var(--color-accent)' : 'transparent',
                  color: viewMode === mode.id ? 'white' : 'rgba(26,15,10,0.5)',
                  border: 'none', borderRadius: 4,
                  padding: '4px 14px', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s'
                }}>
                {mode.label}
              </button>
            ))}
          </div>

          {/* Save button — only in edit mode */}
          {viewMode === 'edit' && (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              disabled={saving || !dirty}
              style={{ opacity: !dirty ? 0.4 : 1 }}
            >
              {saving ? 'Saving…' : '💾 Save'}
            </button>
          )}
        </div>
      </div>

      {/* Rendered view */}
      {viewMode === 'rendered' && (
        <div
          ref={renderedRef}
          className="md-rendered"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      )}

      {/* Edit view */}
      {viewMode === 'edit' && (
        <div style={{ position: 'relative' }}>
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={e => handleEditChange(e.target.value)}
            className="md-editor"
            spellCheck={false}
          />
          <div style={{
            position: 'absolute', bottom: 10, right: 14,
            fontSize: 10, color: 'rgba(26,15,10,0.3)',
            pointerEvents: 'none'
          }}>
            {editContent.length.toLocaleString()} chars · {editContent.split('\n').length} lines
          </div>
        </div>
      )}

      {/* Last entry card */}
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
