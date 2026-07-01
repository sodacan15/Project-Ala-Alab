@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
}

body {
  font-family: var(--font-sans);
  background-color: #fafafa;
  color: #171717;
  overflow-x: hidden;
}

/* Custom scrollbar styling for a cleaner look */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #e5e5e5;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #d4d4d4;
}
