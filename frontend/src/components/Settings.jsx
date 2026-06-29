import React, { useEffect, useState } from 'react';

const AGENTS = ['Gemini', 'Claude', 'NotebookLM'];

export default function Settings({ showToast, onLogout }) {
  const [accounts, setAccounts] = useState({});
  const [forms, setForms] = useState({ Gemini: { name: '', email: '' }, Claude: { name: '', email: '' }, NotebookLM: { name: '', email: '' } });

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/accounts');
      setAccounts(await res.json());
    } catch (e) {}
  };

  useEffect(() => { fetchAccounts(); }, []);

  const handleConnect = async (agent) => {
    const { name, email } = forms[agent];
    if (!name) return;
    await fetch(`/accounts/${agent}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: name, email })
    });
    fetchAccounts();
    showToast(`${agent} connected.`);
  };

  const handleDisconnect = async (agent) => {
    await fetch(`/accounts/${agent}/disconnect`, { method: 'DELETE' });
    fetchAccounts();
    showToast(`${agent} disconnected.`);
  };

  const handleLogout = async () => {
    await fetch('/session/current', { method: 'DELETE' });
    showToast('Session ended. Returning to login…');
    setTimeout(onLogout, 1000);
  };

  const agentDesc = {
    Gemini: 'The Communicator — opens gemini.google.com in Tab A',
    Claude: 'The Scribe — opens claude.ai in Tab B',
    NotebookLM: 'The Archivist — opens notebooklm.google.com in Tab C'
  };

  return (
    <div>
      <div className="section-title">Settings — Agent Accounts</div>

      {AGENTS.map(agent => {
        const info = accounts[agent] || {};
        return (
          <div key={agent} className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justify: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-header)' }}>{agent}</div>
                <div style={{ fontSize: 12, color: 'rgba(26,15,10,0.5)', marginTop: 2 }}>{agentDesc[agent]}</div>
              </div>
              <span className={`badge ${info.connected ? 'badge-green' : 'badge-grey'}`} style={{ float: 'right' }}>
                {info.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 12 }}>
              <tbody>
                <tr>
                  <td style={{ padding: '4px 8px 4px 0', color: 'rgba(26,15,10,0.5)', width: 110 }}>Display Name</td>
                  <td style={{ padding: '4px 0' }}>{info.displayName || '—'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 8px 4px 0', color: 'rgba(26,15,10,0.5)' }}>Email</td>
                  <td style={{ padding: '4px 0' }}>{info.email || '—'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 8px 4px 0', color: 'rgba(26,15,10,0.5)' }}>Model</td>
                  <td style={{ padding: '4px 0', fontFamily: 'monospace' }}>{info.model}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 8px 4px 0', color: 'rgba(26,15,10,0.5)' }}>Tab URL</td>
                  <td style={{ padding: '4px 0', color: 'var(--color-accent)' }}>{info.tab}</td>
                </tr>
              </tbody>
            </table>

            {!info.connected ? (
              <div>
                <div className="input-row" style={{ marginBottom: 8 }}>
                  <input
                    type="text"
                    placeholder="Display Name"
                    value={forms[agent].name}
                    onChange={e => setForms(f => ({ ...f, [agent]: { ...f[agent], name: e.target.value } }))}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={forms[agent].email}
                    onChange={e => setForms(f => ({ ...f, [agent]: { ...f[agent], email: e.target.value } }))}
                  />
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => handleConnect(agent)}>Connect</button>
              </div>
            ) : (
              <button className="btn btn-danger btn-sm" onClick={() => handleDisconnect(agent)}>Disconnect</button>
            )}
          </div>
        );
      })}

      <hr />
      <div style={{ marginTop: 20 }}>
        <button className="btn btn-danger" onClick={handleLogout}>Logout</button>
        <span style={{ fontSize: 12, color: 'rgba(26,15,10,0.4)', marginLeft: 12 }}>
          Ends current session and saves context before returning to login.
        </span>
      </div>
    </div>
  );
}
