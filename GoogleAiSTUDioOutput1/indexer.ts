@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Space Grotesk", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;

  /* Earth-tone color palette */
  --color-sand-50: #fbfbf9;
  --color-sand-100: #fcfbfa;
  --color-sand-200: #f4f1ea;
  --color-clay-800: #3f3935;
  --color-clay-900: #2c2825;
  --color-rust-500: #9d5d36;
  --color-rust-600: #854e2c;
  --color-silt-500: #786d67;
  --color-silt-600: #5e544f;
  --color-loam-200: #ebdcc5;
  --color-loam-300: #e2dcd0;
  --color-sage-600: #4c6a58;
  --color-stone-600: #658d92;
  --color-ochre-600: #b77d48;
}

body {
  background-color: var(--color-sand-100);
  color: var(--color-clay-900);
  font-family: var(--font-sans);
}

.font-display {
  font-family: var(--font-display);
}

.font-mono {
  font-family: var(--font-mono);
}

/* Animations and helper styles */
@keyframes pulseGlow {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.pulse-glow {
  animation: pulseGlow 2s infinite ease-in-out;
}

/* Sidebar Dock Toggle & User Badge Styles */
.sidebar-dock-toggle {
  padding: 12px;
  border-top: 1px solid #d4b5a0;
  margin-top: auto;
}

.dock-toggle-btn {
  width: 100%;
  padding: 10px 12px;
  background: linear-gradient(135deg, #f5e6d3 0%, #ede0d3 100%);
  border: 1px solid #d4b5a0;
  border-radius: 8px;
  color: #3d2817;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.dock-toggle-btn:hover {
  background: linear-gradient(135deg, #faf5ed 0%, #f5ead9 100%);
  border-color: #8fbfb0;
}

.dock-toggle-btn.enabled {
  background: linear-gradient(135deg, #8fbfb0 0%, #6fa89c 100%);
  color: white;
  border-color: #6fa89c;
}

.dock-toggle-btn.enabled:hover {
  background: linear-gradient(135deg, #9eccc0 0%, #7db3a8 100%);
}

.user-badge {
  padding: 6px 12px;
  background: rgba(143, 191, 176, 0.1);
  border: 1px solid #8fbfb0;
  border-radius: 4px;
  font-size: 12px;
  color: #3d2817;
  font-weight: 600;
}

