# Project Ala-Alab

**SparkFest 2026 entry by Team gitMeFanta**

A clipboard orchestration system for capturing and preserving community memory — specifically designed for Philippine barangays. The app manages a protocol where a human user physically carries structured JSON messages between three browser tabs (Gemini, Claude, NotebookLM). No AI API keys. No direct integrations. The user is the Bridge.

---

## How It Works

```
User types → [Ala-Alab formats + stages] → User copies → pastes into Gemini tab
Gemini responds → User copies → [Ala-Alab validates + stages] → User copies → pastes into Claude tab
Claude responds → User copies → [Ala-Alab validates + stages] → User copies → pastes into NotebookLM
Confirmed entries → written to context.md (the living community memory document)
```

---

## Running the App

One workflow handles both backend and frontend:

```bash
bash start.sh
```

- **Backend:** Express on `localhost:3001`
- **Frontend:** Vite/React on `0.0.0.0:5000`

---

## Project Structure

```
backend/
  index.js              # Express server + all routes
  bridge.js             # Message validation and routing
  transit.js            # In-memory pending message queue
  session.js            # Session lifecycle + pre-reset sequence
  clipboard.js          # Clipboard buffer (persists across session resets)
  contextFileManager.js # Read/write/create context.md files
  indexer.js            # Corpus index — tracks ORIGINAL/LINK/IMAGE entries
  accounts.js           # Agent account state (no passwords)
  contexts/             # All context.md files live here
  storage/
    corpus-index.md     # Auto-generated master index
    files/              # Uploaded ORIGINAL documents
    links/              # Generated .md files for LINK entries
    images/             # Uploaded images + metadata .json

frontend/
  src/
    App.jsx             # Root — sidebar nav, login gate, clipboard bar, toast
    App.css             # All styles — earth tone palette
    components/
      Login.jsx         # Entry screen — no real auth
      Dashboard.jsx     # Agent report cards + message log
      Agents.jsx        # Message thread, User→Gemini input, Receive Response panel, Auditing panel
      Context.jsx       # Context file viewer + new context form
      Indexer.jsx       # Corpus index — ORIGINAL/LINK/IMAGE entries
      Settings.jsx      # Agent account registration + protocol guide
```

---

## Current Status (as of 2026-06-29)

**What works:**
- Full login → Dashboard → all five tabs navigation
- User → Gemini message flow (type, stage, copy formatted block)
- Receive Response panel (paste AI reply → validates → stages in transit)
- Auditing panel: Copy (to OS clipboard + buffer) / Confirm / Reject / Purge All
- Session management with pre-reset sequence (saves context, copies last prompt)
- Context file creation, switching, and display
- Corpus indexer: file uploads, link entries with generated .md, image uploads
- Persistent clipboard status bar
- Agent account registration in Settings (display name + email, no API keys)

**What's waiting (intentional):**
- Real Google OAuth on login (currently cosmetic — any button enters the app)
- AI agent accounts are placeholder slots — open Gemini/Claude/NotebookLM in browser tabs and register your display name in Settings to activate dashboard status

See `AGENT_COMMUNICATION_REPORT.md` for full feature checklist.

---

## Key Design Decisions

- **No AI SDKs:** By design. Privacy and manual control are the point.
- **In-memory transit:** Restart clears the queue. Context files persist on disk.
- **One NotebookLM notebook:** A new context does not create a new notebook. The indexer tracks what's been added manually.
- **`inNotebook` is manual:** The user toggles it after physically adding a file to NotebookLM. The app tracks the state, not the action.

---

## User Preferences

- Keep the earth-tone design system (cream/dark brown/salmon-red palette)
- No AI SDK dependencies — the protocol is intentionally human-mediated
- App should work as a standalone tool ("the bus") even before AI accounts are connected ("the passengers")
