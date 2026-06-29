import React from 'react';

const SDG_BADGES = [
  { num: 3, label: 'Good Health', color: '#4C9A2A' },
  { num: 9, label: 'Innovation', color: '#F36E24' },
  { num: 11, label: 'Sustainable Cities', color: '#F99D26' },
  { num: 16, label: 'Strong Institutions', color: '#02558B' },
];

export default function Login({ onLogin }) {
  return (
    <div className="login-layout">
      <div className="login-left">
        <div className="login-logo">ALA-ALAB</div>
        <div className="login-tagline">
          <em style={{ fontSize: 13, opacity: 0.75, fontStyle: 'italic', display: 'block', marginBottom: 14 }}>
            Alaala · Alab
          </em>
          Memory on Fire.<br />
          The remembrance that refuses to go cold.
          <br /><br />
          <span style={{ fontSize: 12, opacity: 0.55, lineHeight: 1.7 }}>
            A living memory system for Philippine barangays.<br />
            Community history — captured, structured, preserved.
          </span>
          <br /><br />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {SDG_BADGES.map(s => (
              <div key={s.num} style={{
                background: s.color, color: 'white', borderRadius: 6,
                padding: '4px 8px', fontSize: 9, fontWeight: 700, textAlign: 'center',
                minWidth: 52, lineHeight: 1.3
              }}>
                SDG {s.num}<br />{s.label}
              </div>
            ))}
          </div>
          <br />
          <span style={{ fontSize: 10, opacity: 0.4 }}>SparkFest 2026 · Team gitMeFanta</span>
        </div>
      </div>

      <div className="login-right">
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: 'var(--color-header)', letterSpacing: 1, marginBottom: 6 }}>
            PROJECT ALA-ALAB
          </div>
          <div style={{ fontSize: 12, color: 'rgba(26,15,10,0.5)', fontStyle: 'italic' }}>
            "History gives voice to the forgotten to build the present."
          </div>
        </div>

        <div style={{ fontSize: 13, color: 'rgba(26,15,10,0.55)', textAlign: 'center', maxWidth: 300, lineHeight: 1.7, marginBottom: 8 }}>
          A clipboard orchestration system — connecting Gemini, Claude, and NotebookLM through a human-mediated protocol. No API keys. You are the Bridge.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4, width: 260 }}>
          <button className="btn btn-primary login-btn" onClick={() => onLogin('google')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
          <button className="btn btn-secondary login-btn" onClick={() => onLogin('guest')}>
            Continue as Guest
          </button>
          <button
            className="btn login-btn"
            style={{ fontSize: 12, padding: '8px', background: 'transparent', border: '1px solid rgba(200,97,74,0.2)', color: 'rgba(26,15,10,0.5)' }}
            onClick={() => onLogin('settings')}
          >
            Set Up Agent Accounts →
          </button>
        </div>

        <div style={{ marginTop: 20, fontSize: 10, color: 'rgba(26,15,10,0.3)', textAlign: 'center', maxWidth: 280 }}>
          Google OAuth coming soon. Any button enters the app while auth is pending.
        </div>
      </div>
    </div>
  );
}
