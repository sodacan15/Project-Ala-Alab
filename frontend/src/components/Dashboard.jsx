import React, { useEffect, useState } from 'react';

export default function Dashboard() {
  const [accounts, setAccounts] = useState({});
  const [log, setLog] = useState([]);
  const [contexts, setContexts] = useState([]);

  const fetchAll = async () => {
    try {
      const [accRes, logRes, ctxRes] = await Promise.all([
        fetch('/accounts'), fetch('/bridge/log'), fetch('/contexts')
      ]);
      setAccounts(await accRes.json());
      setLog(await logRes.json());
      setContexts(await ctxRes.json());
    } catch (e) {}
  };

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 3000);
    return () => clearInterval(t);
  }, []);

  const agentRoles = {
    Gemini: 'The Communicator — intake + partial denoise',
    Claude: 'The Scribe — proposes context entries',
    NotebookLM: 'The Archivist — accumulates & synthesizes'
  };

  const confirmedLog = log.filter(m => m.status === 'confirmed');

  return (
    <div>
      <div className="section-title" style={{ marginBottom: 20 }}>Dashboard</div>

      <div className="two-col-6040">
        {/* Agent Report */}
        <div>
          <div className="section-title">Agent Report</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(accounts).map(([name, info]) => (
              <div key={name} className="agent-card">
                <div className="agent-card-header">
                  <div>
                    <div className="agent-name">{name}</div>
                    <div className="agent-role">{agentRoles[name]}</div>
                  </div>
                  <span className={`badge ${info.connected ? 'badge-green' : 'badge-grey'}`}>
                    {info.connected ? 'Active' : 'Disconnected'}
                  </span>
                </div>
                <div className="agent-model">{info.model}</div>
                <div className="agent-tab">↗ {info.tab}</div>
                {info.connected && info.displayName && (
                  <div style={{ fontSize: 12, color: 'rgba(26,15,10,0.6)' }}>
                    {info.displayName} · {info.email}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Logs + Contexts */}
        <div>
          <div className="section-title">Confirmed Messages</div>
          <div className="card" style={{ maxHeight: 260, overflowY: 'auto' }}>
            {confirmedLog.length === 0 ? (
              <div className="empty-state">No confirmed messages yet.</div>
            ) : (
              confirmedLog.slice().reverse().map(m => (
                <div key={m.id} className="log-entry">
                  <div><strong>[{m.from}] → [{m.to}]</strong> <span className="badge badge-blue">{m.type}</span></div>
                  <div className="log-entry-meta">
                    {m.payload?.content?.substring(0, 80)}{m.payload?.content?.length > 80 ? '…' : ''}
                  </div>
                  <div className="log-entry-meta">{new Date(m.timestamp).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>

          <div className="section-title" style={{ marginTop: 16 }}>Recent Contexts</div>
          <div className="card">
            {contexts.length === 0 ? (
              <div className="empty-state">No context files found.</div>
            ) : (
              contexts.map(f => (
                <div key={f} style={{ padding: '6px 0', borderBottom: '1px solid rgba(200,97,74,0.1)', fontSize: 13 }}>
                  📄 {f}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
