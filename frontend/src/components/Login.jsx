import React from 'react';

export default function Login({ onLogin }) {
  return (
    <div className="login-layout">
      <div className="login-left">
        <div className="login-left-inner">
          <div className="login-wordmark">
            <span className="login-wordmark-project">PROJECT</span>
            <span className="login-wordmark-name">ALA-ALAB</span>
          </div>
          <div className="login-tagline">
            Community Memory Orchestration System
          </div>
          <div className="login-sub">
            A structured records platform for local government units — capturing oral testimony, field observations, and official records into a living, AI-ready community document.
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <div className="login-card-header">
            <div className="login-card-wordmark">
              <span className="login-card-project">PROJECT</span>
              <span className="login-card-name">ALA-ALAB</span>
            </div>
            <p className="login-card-desc">
              Sign in to access your community memory workspace.
            </p>
          </div>

          <div className="login-actions">
            <button
              className="btn-login-google"
              onClick={() => onLogin('google')}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <button
              className="btn-login-guest"
              onClick={() => onLogin('guest')}
            >
              Continue as Guest
            </button>

            <button
              className="btn-login-setup"
              onClick={() => onLogin('settings')}
            >
              Set Up Agent Accounts →
            </button>
          </div>

          <p className="login-note">
            Google OAuth integration pending. Any option enters the workspace.
          </p>
        </div>
      </div>
    </div>
  );
}
