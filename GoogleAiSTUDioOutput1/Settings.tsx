import React, { useState } from "react";
import { Key, Mail, ShieldAlert } from "lucide-react";
import { FlameEmblem, ProjectAlaAlabLogo } from "./BrandAssets";

interface LoginProps {
  onLoginSuccess: (user: { email: string; displayName: string }) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password) {
      setError("Please fill out all fields.");
      setLoading(false);
      return;
    }

    // Elegant, fast simulation matching user auth context
    setTimeout(() => {
      setLoading(false);
      const displayName = email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1);
      onLoginSuccess({ email, displayName });
    }, 800);
  };

  const handleOAuthLogin = (provider: string) => {
    setError(null);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess({
        email: `operator@${provider.toLowerCase()}.com`,
        displayName: `${provider} Operator`
      });
    }, 600);
  };

  const handleGuestBypass = () => {
    onLoginSuccess({
      email: "guest.operator@ala-alab.org",
      displayName: "Guest archivist"
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand-100 p-6 font-sans">
      <div className="w-full max-w-md bg-sand-200 border border-loam-300 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Decorative Top Banner with Custom Branding */}
        <div className="bg-rust-500 p-8 text-center text-white relative flex flex-col items-center">
          <div className="absolute top-4 right-4 text-xs font-mono tracking-widest text-orange-200 uppercase pulse-glow">
            Archival POC
          </div>
          
          {/* Custom double-diamond flame emblem */}
          <div className="bg-sand-200 p-2.5 rounded-full text-rust-500 border-2 border-orange-300 shadow-md mb-4 flex items-center justify-center">
            <FlameEmblem size={44} className="text-rust-500" />
          </div>

          {/* Custom Editorial typography masthead */}
          <ProjectAlaAlabLogo className="text-orange-100 [&>h1]:text-white mb-2" />
          
          <p className="text-xs font-sans text-orange-100 max-w-xs mx-auto leading-relaxed mt-1">
            A Living Archive System & Clipboard Orchestration PoC for Victoria Village Memory
          </p>
        </div>

        {/* Auth Body */}
        <div className="p-8 flex-1 flex flex-col justify-between">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-display font-semibold text-clay-900 border-b border-loam-300 pb-2">
              {isSignUp ? "Create Operator Profile" : "Archivist Authorization"}
            </h2>

            {error && (
              <div className="bg-orange-50 border border-ochre-600 text-ochre-600 rounded-lg p-3 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono text-silt-600 uppercase mb-1">Email address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-silt-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@ala-alab.org"
                    className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-loam-300 rounded-lg text-clay-900 focus:outline-none focus:ring-2 focus:ring-rust-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-silt-600 uppercase mb-1">Security key / Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-silt-500">
                    <Key className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-loam-300 rounded-lg text-clay-900 focus:outline-none focus:ring-2 focus:ring-rust-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rust-500 hover:bg-rust-600 text-white font-sans text-sm py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? "Authenticating..." : isSignUp ? "Register Archivist" : "Authorize Session"}
            </button>
          </form>

          {/* Social Auth & Guest Bypass */}
          <div className="mt-6 pt-6 border-t border-loam-300 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleOAuthLogin("Google")}
                disabled={loading}
                className="flex items-center justify-center gap-2 border border-loam-300 bg-white hover:bg-sand-100 text-xs font-medium text-clay-800 py-2 rounded-lg transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Google Sign-In
              </button>
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                disabled={loading}
                className="text-center text-xs text-silt-600 hover:text-rust-500 font-medium py-2 rounded-lg cursor-pointer"
              >
                {isSignUp ? "Already registered?" : "Register account"}
              </button>
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-loam-300"></div>
              <span className="flex-shrink mx-4 text-xs font-mono text-silt-500 uppercase">Or</span>
              <div className="flex-grow border-t border-loam-300"></div>
            </div>

            <button
              onClick={handleGuestBypass}
              className="w-full bg-silt-600 hover:bg-silt-500 text-white font-mono text-xs py-2 rounded-lg transition-colors cursor-pointer"
            >
              🚀 Bypass Gate (Offline Sandbox Mode)
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-loam-300/40 p-4 border-t border-loam-300 text-center">
          <p className="text-[10px] font-mono text-silt-600 uppercase tracking-wider">
            Secured Living Archive Environment
          </p>
        </div>
      </div>
    </div>
  );
}
