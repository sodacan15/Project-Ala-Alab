import React, { useState } from "react";
import {
  Activity,
  Cpu,
  BookOpen,
  FolderOpen,
  Settings as SettingsIcon,
  UserCheck,
  Menu,
  X
} from "lucide-react";

// Import custom components
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Agents from "./components/Agents";
import Context from "./components/Context";
import Indexer from "./components/Indexer";
import Settings from "./components/Settings";
import GroundedSidebar from "./components/GroundedSidebar";
import { FlameEmblem } from "./components/BrandAssets";

type ActiveTab = "dashboard" | "agents" | "contexts" | "indexer" | "settings";

interface UserProfile {
  email: string;
  displayName: string;
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dockEnabled, setDockEnabled] = useState(false);

  const handleLoginSuccess = (profile: UserProfile) => {
    setUser(profile);
  };

  const handleLogout = () => {
    if (window.confirm("Disconnect your session profile and deauthorize?")) {
      setUser(null);
      setActiveTab("dashboard");
    }
  };

  // If the user has not logged in yet, render the authorization card
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-sand-100 text-clay-900 flex flex-col md:flex-row font-sans">
      
      {/* LEFT NAVIGATION SIDEBAR (DESKTOP) */}
      <aside className="hidden md:flex flex-col w-64 bg-sand-200 border-r border-loam-300 h-screen sticky top-0 shrink-0">
        {/* Brand */}
        <div className="p-5 border-b border-loam-300 bg-rust-500 text-white flex items-center gap-3">
          <FlameEmblem size={34} className="text-orange-200 pulse-glow shrink-0" />
          <div>
            <h1 className="text-xl font-display font-bold tracking-tight leading-none">ALA-ALAB</h1>
            <span className="text-[9px] font-mono text-orange-100 uppercase tracking-widest block mt-1.5 leading-none">Archivist Bridge</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-rust-500 text-white shadow-md shadow-rust-500/10"
                : "text-silt-600 hover:text-clay-900 hover:bg-sand-100"
            }`}
          >
            <Activity className="w-4 h-4" />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab("agents")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              activeTab === "agents"
                ? "bg-rust-500 text-white shadow-md shadow-rust-500/10"
                : "text-silt-600 hover:text-clay-900 hover:bg-sand-100"
            }`}
          >
            <Cpu className="w-4 h-4" />
            Agents Console
          </button>

          <button
            onClick={() => setActiveTab("contexts")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              activeTab === "contexts"
                ? "bg-rust-500 text-white shadow-md shadow-rust-500/10"
                : "text-silt-600 hover:text-clay-900 hover:bg-sand-100"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Context Manager
          </button>

          <button
            onClick={() => setActiveTab("indexer")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              activeTab === "indexer"
                ? "bg-rust-500 text-white shadow-md shadow-rust-500/10"
                : "text-silt-600 hover:text-clay-900 hover:bg-sand-100"
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            Corpus Indexer
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              activeTab === "settings"
                ? "bg-rust-500 text-white shadow-md shadow-rust-500/10"
                : "text-silt-600 hover:text-clay-900 hover:bg-sand-100"
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            Control & Guides
          </button>
        </nav>

        {/* Dock Toggle & User Info */}
        <div className="sidebar-dock-toggle flex flex-col gap-2">
          <button
            onClick={() => setDockEnabled(!dockEnabled)}
            className={`dock-toggle-btn ${dockEnabled ? "enabled" : ""}`}
            title="Toggle Archivist Bridge Grounded Web Dock"
          >
            <span>🌐</span>
            <span className="truncate">{dockEnabled ? "Web Dock Active" : "Enable Web Dock"}</span>
          </button>
          
          <div className="user-badge flex items-center gap-1.5 justify-center">
            <UserCheck className="w-3.5 h-3.5 text-sage-600" />
            <span className="truncate text-[11px] font-mono font-bold" title={`${user.displayName} (${user.email})`}>
              {user.displayName}
            </span>
          </div>
        </div>
      </aside>

      {/* TOP NAVIGATION HEADER (MOBILE) */}
      <header className="md:hidden bg-sand-200 border-b border-loam-300 p-3.5 sticky top-0 z-40 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <FlameEmblem size={24} className="text-rust-500 shrink-0" />
          <h1 className="text-md font-display font-bold tracking-tight">ALA-ALAB</h1>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 text-clay-900 hover:bg-sand-100 border border-loam-300 rounded-lg cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* MOBILE NAV OVERLAY */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[57px] bg-sand-100/95 z-30 p-4 space-y-3 flex flex-col">
          <button
            onClick={() => { setActiveTab("dashboard"); setMobileMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold border border-loam-300 bg-white cursor-pointer"
          >
            <Activity className="w-4 h-4 text-rust-500" />
            Dashboard
          </button>
          <button
            onClick={() => { setActiveTab("agents"); setMobileMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold border border-loam-300 bg-white cursor-pointer"
          >
            <Cpu className="w-4 h-4 text-rust-500" />
            Agents Console
          </button>
          <button
            onClick={() => { setActiveTab("contexts"); setMobileMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold border border-loam-300 bg-white cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-rust-500" />
            Context Manager
          </button>
          <button
            onClick={() => { setActiveTab("indexer"); setMobileMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold border border-loam-300 bg-white cursor-pointer"
          >
            <FolderOpen className="w-4 h-4 text-rust-500" />
            Corpus Indexer
          </button>
          <button
            onClick={() => { setActiveTab("settings"); setMobileMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold border border-loam-300 bg-white cursor-pointer"
          >
            <SettingsIcon className="w-4 h-4 text-rust-500" />
            Control & Guides
          </button>
        </div>
      )}

      {/* MAIN LAYOUT CANVAS */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {activeTab === "dashboard" && (
          <Dashboard
            operatorName={user.displayName}
            onNavigateToContexts={() => setActiveTab("contexts")}
          />
        )}
        {activeTab === "agents" && (
          <Agents
            operatorName={user.displayName}
            globalDockEnabled={dockEnabled}
            onToggleGlobalDock={setDockEnabled}
          />
        )}
        {activeTab === "contexts" && <Context />}
        {activeTab === "indexer" && <Indexer />}
        {activeTab === "settings" && (
          <Settings
            operatorName={user.displayName}
            operatorEmail={user.email}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* PERSISTENT GROUNDED SIDEBAR PANEL */}
      <GroundedSidebar currentActiveTab={activeTab} />

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-sand-200 border-t border-loam-300 h-16 flex justify-around items-center px-2 z-40">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center justify-center gap-0.5 w-14 h-12 rounded-lg cursor-pointer ${
            activeTab === "dashboard" ? "text-rust-500" : "text-silt-500"
          }`}
        >
          <Activity className="w-5 h-5" />
          <span className="text-[9px] font-mono font-semibold uppercase">Dash</span>
        </button>

        <button
          onClick={() => setActiveTab("agents")}
          className={`flex flex-col items-center justify-center gap-0.5 w-14 h-12 rounded-lg cursor-pointer ${
            activeTab === "agents" ? "text-rust-500" : "text-silt-500"
          }`}
        >
          <Cpu className="w-5 h-5" />
          <span className="text-[9px] font-mono font-semibold uppercase">Agents</span>
        </button>

        <button
          onClick={() => setActiveTab("contexts")}
          className={`flex flex-col items-center justify-center gap-0.5 w-14 h-12 rounded-lg cursor-pointer ${
            activeTab === "contexts" ? "text-rust-500" : "text-silt-500"
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[9px] font-mono font-semibold uppercase">Context</span>
        </button>

        <button
          onClick={() => setActiveTab("indexer")}
          className={`flex flex-col items-center justify-center gap-0.5 w-14 h-12 rounded-lg cursor-pointer ${
            activeTab === "indexer" ? "text-rust-500" : "text-silt-500"
          }`}
        >
          <FolderOpen className="w-5 h-5" />
          <span className="text-[9px] font-mono font-semibold uppercase">Index</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex flex-col items-center justify-center gap-0.5 w-14 h-12 rounded-lg cursor-pointer ${
            activeTab === "settings" ? "text-rust-500" : "text-silt-500"
          }`}
        >
          <SettingsIcon className="w-5 h-5" />
          <span className="text-[9px] font-mono font-semibold uppercase">Setup</span>
        </button>
      </nav>

      {/* MOBILE CANVAS SPACING FOR FIXED BOTTOM DOCK */}
      <div className="md:hidden h-16 shrink-0" />
    </div>
  );
}
