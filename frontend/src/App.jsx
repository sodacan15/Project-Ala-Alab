import React, { useEffect, useState } from 'react';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import Agents from './components/Agents.jsx';
import Context from './components/Context.jsx';
import Indexer from './components/Indexer.jsx';
import Settings from './components/Settings.jsx';

const NAV = [
  { id: 'dashboard', icon: '⊞', label: 'Dashboard' },
  { id: 'agents', icon: '◈', label: 'Agents' },
  { id: 'context', icon: '📄', label: 'Context' },
  { id: 'indexer', icon: '◫', label: 'Indexer' },
  { id: 'settings', icon: '⚙', label: 'Settings' }
];

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [session, setSession] = useState(null);
  const [clipboard, setClipboard] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchClipboard();
    const t = setInterval(fetchClipboard, 3000);
    return () => clearInterval(t);
  }, []);

  const checkSession = async () => {
    try {
      const res = await fetch('/session/status');
      const data = await res.json();
      if (data && data.id) {
        setSession(data);
        return true;
      }
    } catch (e) {}
    return false;
  };

  const fetchClipboard = async () => {
    try {
      const res = await fetch('/clipboard/current');
      const data = await res.json();
      setClipboard(data.empty ? null : data);
    } catch (e) {}
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleLogin = async (type) => {
    const res = await fetch('/session/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await res.json();
    if (data.session) setSession(data.session);
    setLoggedIn(true);
    setActivePage(type === 'settings' ? 'settings' : 'dashboard');
  };

  const handleLogout = () => {
    setLoggedIn(false);
    setActivePage('dashboard');
    setSession(null);
  };

  const handleClearClipboard = async () => {
    await fetch('/clipboard/clear', { method: 'DELETE' });
    fetchClipboard();
  };

  if (!loggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'agents': return <Agents showToast={showToast} />;
      case 'context': return <Context showToast={showToast} />;
      case 'indexer': return <Indexer showToast={showToast} />;
      case 'settings': return <Settings showToast={showToast} onLogout={handleLogout} />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <nav className="sidebar">
        <div className="sidebar-logo">ALA<br />ALAB</div>
        <div className="sidebar-nav">
          {NAV.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main area */}
      <div className="main-area">
        {/* Header */}
        <div className="header">
          <div className="header-title">PROJECT ALA-ALAB</div>
          <div className="header-right">
            <span>SparkFest 2026</span>
            {session && (
              <span className="session-badge">
                Session: {session.id?.slice(0, 8)}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="content">
          {renderPage()}
        </div>

        {/* Clipboard status bar */}
        <div className="clipboard-bar">
          <span className="clip-label">[ CLIPBOARD ]</span>
          <span className="clip-content">
            {clipboard
              ? `${clipboard.label} · ${new Date(clipboard.savedAt).toLocaleTimeString()}`
              : 'Empty — nothing in buffer'}
          </span>
          {clipboard && (
            <button onClick={() => {
              setActivePage('agents');
            }}>View</button>
          )}
          <button onClick={handleClearClipboard}>Clear</button>
        </div>
      </div>

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
