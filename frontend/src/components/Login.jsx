import React from 'react';

export default function Login({ onLogin }) {
  return (
    <div className="login-layout">
      <div className="login-left">
        <div className="login-logo">ALA-ALAB</div>
        <div className="login-tagline">
          Community Memory Orchestration<br />
          for Philippine Barangays<br />
          <br />
          <span style={{ fontSize: '11px', opacity: 0.5 }}>SparkFest 2026 · Team gitMeFanta</span>
        </div>
      </div>
      <div className="login-right">
        <h2>PROJECT ALA-ALAB</h2>
        <p style={{ fontSize: 13, color: 'rgba(26,15,10,0.55)', textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
          A living memory system connecting Gemini, Claude, and NotebookLM through clipboard orchestration.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          <button className="btn btn-primary login-btn" onClick={() => onLogin('google')}>
            Continue as Google User
          </button>
          <button className="btn btn-primary login-btn" onClick={() => onLogin('guest')}>
            Continue as Guest
          </button>
          <button
            className="btn btn-secondary login-btn"
            style={{ fontSize: 12, padding: '8px' }}
            onClick={() => onLogin('settings')}
          >
            Set Up Accounts →
          </button>
        </div>
      </div>
    </div>
  );
}
