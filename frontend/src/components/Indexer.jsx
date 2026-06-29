import React, { useEffect, useState, useRef } from 'react';

const FILTERS = ['ALL', 'ORIGINAL', 'LINKS', 'IMAGES'];

export default function Indexer({ showToast }) {
  const [index, setIndex] = useState({ ORIGINAL: [], LINK: [], IMAGE: [] });
  const [filter, setFilter] = useState('ALL');
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkNotes, setLinkNotes] = useState('');
  const fileRef = useRef();
  const imageRef = useRef();

  const fetchIndex = async () => {
    try {
      const res = await fetch('/indexer');
      setIndex(await res.json());
    } catch (e) {}
  };

  useEffect(() => { fetchIndex(); }, []);

  const handleNotebook = async (id, val) => {
    await fetch(`/indexer/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inNotebook: val })
    });
    fetchIndex();
  };

  const handleRemove = async (id) => {
    await fetch(`/indexer/${id}`, { method: 'DELETE' });
    fetchIndex();
    showToast('Entry removed from index.');
  };

  const handleAddLink = async () => {
    if (!linkUrl || !linkTitle) return;
    await fetch('/indexer/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'LINK', url: linkUrl, title: linkTitle, notes: linkNotes, addedBy: 'User' })
    });
    setLinkUrl(''); setLinkTitle(''); setLinkNotes('');
    setShowLinkForm(false);
    fetchIndex();
    showToast('Link added to corpus index.');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('description', '');
    fd.append('addedBy', 'User');
    await fetch('/indexer/add?type=ORIGINAL', { method: 'POST', body: fd });
    fetchIndex();
    showToast('File added to corpus index.');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const caption = prompt('Enter a caption for this image:') || '';
    const fd = new FormData();
    fd.append('file', file);
    fd.append('caption', caption);
    fd.append('addedBy', 'User');
    await fetch('/indexer/add?type=IMAGE', { method: 'POST', body: fd });
    fetchIndex();
    showToast('Image added to corpus index.');
  };

  const handleCopyPath = async (path, url) => {
    const text = url || path;
    await fetch('/clipboard/copy-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, label: 'Path/URL' })
    });
    showToast('Path copied to clipboard buffer.');
  };

  const allEntries = [
    ...index.ORIGINAL.map(e => ({ ...e, _type: 'ORIGINAL' })),
    ...index.LINK.map(e => ({ ...e, _type: 'LINK' })),
    ...index.IMAGE.map(e => ({ ...e, _type: 'IMAGE' }))
  ];

  const filtered = filter === 'ALL' ? allEntries
    : filter === 'ORIGINAL' ? allEntries.filter(e => e._type === 'ORIGINAL')
    : filter === 'LINKS' ? allEntries.filter(e => e._type === 'LINK')
    : allEntries.filter(e => e._type === 'IMAGE');

  return (
    <div>
      <div className="section-title">Corpus Indexer</div>

      <div className="filter-tabs">
        {FILTERS.map(f => (
          <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f} {f === 'ALL' ? `(${allEntries.length})` : f === 'ORIGINAL' ? `(${index.ORIGINAL.length})` : f === 'LINKS' ? `(${index.LINK.length})` : `(${index.IMAGE.length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 && <div className="empty-state">No entries found.</div>}

      {filtered.map(e => (
        <div key={e.id} className="indexer-card">
          <div className="indexer-card-info">
            <div>
              <span className={`type-badge type-${e._type.toLowerCase()}`}>{e._type}</span>
            </div>
            <div className="indexer-card-filename">
              {e._type === 'LINK' ? e.title : e.filename}
            </div>
            {e._type === 'LINK' && (
              <div style={{ fontSize: 11 }}>
                <a href={e.url} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>{e.url}</a>
              </div>
            )}
            <div className="indexer-card-meta">
              {e._type === 'ORIGINAL' || e._type === 'IMAGE'
                ? `Added ${new Date(e.dateAdded).toLocaleDateString()} by ${e.addedBy}`
                : `Accessed ${new Date(e.dateAccessed).toLocaleDateString()} by ${e.addedBy}`}
              {e.description && ` · ${e.description}`}
              {e.caption && ` · ${e.caption}`}
              {e.notes && ` · ${e.notes}`}
            </div>
            {e._type === 'IMAGE' && e.path && (
              <img src={e.path} alt={e.caption} style={{ marginTop: 6, maxHeight: 80, borderRadius: 4 }} onError={ev => ev.target.style.display='none'} />
            )}
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="checkbox" checked={e.inNotebook} onChange={ev => handleNotebook(e.id, ev.target.checked)} style={{ width: 'auto' }} />
                In Notebook
              </label>
            </div>
          </div>
          <div className="indexer-card-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => handleCopyPath(e.path, e.url)}>Copy Path</button>
            <button className="btn btn-danger btn-sm" onClick={() => handleRemove(e.id)}>Remove</button>
          </div>
        </div>
      ))}

      {/* Add panel */}
      <hr />
      <div className="section-title">Add Entry</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <button className="btn btn-primary btn-sm" onClick={() => fileRef.current.click()}>+ File</button>
        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} />

        <button className="btn btn-primary btn-sm" onClick={() => setShowLinkForm(!showLinkForm)}>+ Link</button>

        <button className="btn btn-primary btn-sm" onClick={() => imageRef.current.click()}>+ Image</button>
        <input ref={imageRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
      </div>

      {showLinkForm && (
        <div className="card" style={{ background: '#fdf8f2', border: '1px solid rgba(200,97,74,0.2)' }}>
          <div className="form-group">
            <label>URL</label>
            <input type="text" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://example.com/study" />
          </div>
          <div className="form-group">
            <label>Title</label>
            <input type="text" value={linkTitle} onChange={e => setLinkTitle(e.target.value)} placeholder="Valenzuela Ecological Study 2024" />
          </div>
          <div className="form-group">
            <label>Notes</label>
            <input type="text" value={linkNotes} onChange={e => setLinkNotes(e.target.value)} placeholder="Optional notes…" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleAddLink}>Add Link</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowLinkForm(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
