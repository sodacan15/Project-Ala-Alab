import React, { useEffect, useState } from 'react';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import Agents from './components/Agents.jsx';
import Context from './components/Context.jsx';
import Indexer from './components/Indexer.jsx';
import Settings from './components/Settings.jsx';
import DockManager from './components/DockManager.jsx';

const NAV = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'agents', label: 'Agents' },
  { id: 'context', label: 'Context' },
  { id: 'indexer', label: 'Indexer' },
  { id: 'settings', label: 'Settings' },
];

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [session, setSession] = useState(null);
  const [clipboard, setClipboard] = useState(null);
  const [toast, setToast] = useState(null);
  const [dockEnabled, setDockEnabled] = useState(true);

  useEffect(() => {
    fetchClipboard();
    const t = setInterval(fetchClipboard, 3000);
    return () => clearInterval(t);
  }, []);

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

  const handleLogin = (type) => {
    const profile = { name: 'Guest Archivist', email: 'guest@ala-alab.local' };
    setUser(profile);
    setLoggedIn(true);
    if (type === 'settings') {
      setActivePage('settings');
    }
  };

  const handleLogout = () => {
    setLoggedIn(false);
    setUser(null);
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
      case 'dashboard': return <Dashboard onNavigate={setActivePage} showToast={showToast} />;
      case 'agents': return <Agents showToast={showToast} user={user} />;
      case 'context': return <Context showToast={showToast} />;
      case 'indexer': return <Indexer showToast={showToast} />;
      case 'settings': return <Settings showToast={showToast} onLogout={handleLogout} user={user} />;
      default: return <Dashboard onNavigate={setActivePage} showToast={showToast} />;
    }
  };

  return (
    <div className="app-layout">
      {dockEnabled && <DockManager user={user} />}

      <nav className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark" />
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-project">PROJECT</span>
            <span className="sidebar-brand-name">ALA-ALAB</span>
          </div>
        </div>

        <div className="sidebar-nav">
          {NAV.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="sidebar-dock-toggle">
          <button
            className={`dock-toggle-btn ${dockEnabled ? 'enabled' : 'disabled'}`}
            onClick={() => setDockEnabled(!dockEnabled)}
            title={dockEnabled ? 'Hide Dock' : 'Show Dock'}
          >
            {dockEnabled ? '🔽' : '🔼'} Dock
          </button>
        </div>

        <button className="nav-logout" onClick={handleLogout}>
          Logout
        </button>
      </nav>

      <div className="main-area" style={dockEnabled ? { paddingBottom: '80px' } : {}}>
        <div className="header">
          <div className="header-wordmark">
            <span className="header-project">PROJECT</span>
            <span className="header-name">ALA-ALAB</span>
          </div>
          <div className="header-right">
            {user && (
              <span className="user-badge">
                👤 {user.name || user.email}
              </span>
            )}
            {session && (
              <span className="session-badge">
                Session: {session.id?.slice(0, 8)}
              </span>
            )}
          </div>
        </div>

        <div className="content">
          {renderPage()}
        </div>

        <div className="clipboard-bar">
          <span className="clip-label">CLIPBOARD</span>
          <span className="clip-content">
            {clipboard
              ? `${clipboard.label} · ${new Date(clipboard.savedAt).toLocaleTimeString()}`
              : 'Empty — nothing staged in buffer'}
          </span>
          {clipboard && (
            <button onClick={() => setActivePage('agents')}>View</button>
          )}
          <button onClick={handleClearClipboard}>Clear</button>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
