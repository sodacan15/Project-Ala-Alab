# Replit Build Prompt — Ala-Alab Agent Orchestration PoC
**Version:** 3.0.0 | **Date:** 2026-06-30
**Goal:** Build a working clipboard orchestration system where the user physically carries structured messages between three browser tabs (Claude.ai, Gemini, NotebookLM). The app manages the protocol — formatting, validation, session state, context files, and the corpus index. The user is the Bridge.

---

## The Core Concept

There are no API calls to AI agents. The user has three browser tabs open:
- **Tab A** — Gemini (gemini.google.com)
- **Tab B** — Claude.ai
- **Tab C** — NotebookLM (notebooklm.google.com)

Ala-Alab sits alongside these tabs. It:
1. Tells the user what to copy from which tab
2. Formats the copied content with `[FROM]/[TO]` headers (the Bridge message format)
3. Validates the message structure before passing it forward
4. Tells the user exactly where to paste it next
5. Tracks what is in flight, what has been confirmed, what has been purged
6. Manages session state, context files, and the corpus index
7. Never loses the last user prompt before a reset

**The protocol is the product. The user executing it is the proof.**

---

## Agent Roles

| Agent | Tab | Role |
|---|---|---|
| **Gemini Flash** | Tab A | The Communicator — faces the user, intake + partial denoise, routes to Claude AND NotebookLM |
| **Claude** | Tab B | The Scribe — receives Gemini summary, proposes context entries, sends updates to NotebookLM |
| **NotebookLM** | Tab C | The Archivist — one notebook, accumulates everything, synthesizes across all sources |

---

## Message Format

Every message the user carries between tabs uses this structure. The app generates it — the user copies it whole and pastes it into the target tab.

```json
{
  "id": "uuid",
  "from": "User | Gemini | Claude | NotebookLM",
  "to": "User | Gemini | Claude | NotebookLM",
  "type": "raw_input | intake_summary | corpus_query | proposed_entry | corpus_report | context_update | confirmation | error",
  "timestamp": "ISO 8601",
  "status": "pending | confirmed | purged | delivered",
  "payload": {
    "content": "The actual message content",
    "source_tag": "[ORAL] | [FIELD] | [OFFICIAL] | [SYNTHESIS] | [LINK] | [IMAGE]",
    "sensitive": false,
    "requires_confirmation": true,
    "note": "optional one-line note"
  }
}
```

The app wraps this in a clearly formatted copyable block with the `[FROM]/[TO]` header visible at the top so the user always knows what they're carrying.

---

## File Structure

```
ala-alab-poc/
├── backend/
│   ├── index.js                   # Express server
│   ├── bridge.js                  # Bridge Script — validation, routing, transit
│   ├── transit.js                 # In-memory transit layer
│   ├── session.js                 # Session management
│   ├── clipboard.js               # Clipboard buffer management
│   ├── contextFileManager.js      # Creates, reads, saves context.md files
│   ├── indexer.js                 # Corpus index — tracks files, links, images
│   ├── contexts/                  # All context.md files live here
│   │   └── canumay-east.md        # Seed file
│   └── storage/                   # Simulated Google Drive + Local Folder
│       ├── corpus-index.md        # Master index of all corpus entries
│       ├── files/                 # ORIGINAL files stored as-is
│       ├── links/                 # LINK entries stored as generated .md files
│       └── images/                # IMAGE files stored as-is + metadata .json
├── frontend/
│   └── src/
│       ├── App.jsx                # Root — sidebar nav + tab routing
│       ├── App.css                # All styles — earth tone palette
│       └── components/
│           ├── Login.jsx
│           ├── Dashboard.jsx
│           ├── Agents.jsx
│           ├── Context.jsx
│           ├── Indexer.jsx        # Corpus index viewer
│           └── Settings.jsx
├── .env.example
└── package.json
```

---

## Backend Routes

### Bridge Script (`/bridge`)

```
POST   /bridge/send              — validate + format + stage a message
GET    /bridge/transit           — all pending messages
POST   /bridge/confirm/:id       — human confirms → mark delivered → clear transit
POST   /bridge/purge/:id         — human rejects → error logged → clear transit
GET    /bridge/log               — full message history
DELETE /bridge/log               — clear message log
```

**Validation rules:**
- `from`, `to`, `type`, `timestamp` must be present — reject if missing
- `from` and `to` must be valid agent names
- On rejection: return error JSON, log failure, do NOT pass the message
- On pass: assign `id`, set `status: pending`, push to transit
- On confirm: set `status: confirmed`, log delivery
- On purge: set `status: purged`, log with reason

**On every validated message the app generates a copyable formatted block:**
```
========================================
[FROM: {from}] / [TO: {to}]
Type: {type} | {timestamp}
----------------------------------------
{payload.content}
----------------------------------------
Source: {source_tag} | Sensitive: {sensitive}
Note: {note}
========================================
```
This is what the user physically copies and pastes into the target tab.

---

### Session Management (`/session`)

```
POST   /session/new              — pre-reset sequence then start fresh session
DELETE /session/current          — pre-reset sequence then end session
GET    /session/status           — current session ID, start time, active context, agent states
GET    /session/last-prompt      — return the last user prompt from current session
```

**Pre-reset sequence — fires on BOTH `/session/new` AND `/session/current` DELETE:**

This sequence is non-negotiable. It runs in this exact order before anything clears:

**Step 1 — Save context.**
Call `contextFileManager.save()` — write any pending/unconfirmed state to the current `context.md`. If nothing pending, still write a session-end timestamp to the file header. Log: *"Context saved before reset."*

**Step 2 — Grab last user prompt.**
Find the most recent message in the session log where `from === "User"`. Copy its `payload.content` into the clipboard buffer. Set clipboard metadata: `{ savedAt: now, fromSession: currentSessionId, type: "last_prompt" }`. Log: *"Last prompt saved to clipboard."*

**Step 3 — Notify frontend.**
Return to frontend before clearing: `{ preReset: true, contextSaved: true, lastPromptSaved: true, lastPrompt: <content preview, first 80 chars> }`. Frontend shows notice: *"Context saved. Last prompt copied to clipboard."*

**Step 4 — Then clear.**
Clear transit layer. Reset agent states to `idle`. Generate new session ID (if `/session/new`) or mark ended (if DELETE). Clear message log.

**Step 5 — If `/session/new`:** initialize fresh session with new ID, new start time, same active context unless a new context was specified.

---

### Clipboard (`/clipboard`)

```
POST   /clipboard/copy           — copy a message payload to clipboard buffer
GET    /clipboard/current        — return clipboard buffer contents
DELETE /clipboard/clear          — clear clipboard buffer
POST   /clipboard/copy-text      — copy any arbitrary text string to clipboard buffer
```

- One buffer. In-memory.
- `POST /clipboard/copy` accepts `{ messageId }` → copies that message's full formatted block
- `POST /clipboard/copy-text` accepts `{ text, label }` → stores raw text with a label
- Frontend shows current clipboard contents in a persistent status bar at the bottom of the screen
- Buffer survives session resets — it is the one thing that persists across sessions intentionally

---

### Context File Manager (`/contexts`)

```
GET    /contexts                 — list all context.md files in /contexts/
GET    /contexts/current         — read current active context.md
POST   /contexts/new             — create a new context.md + start new session
POST   /contexts/update          — append a confirmed entry to current context.md
GET    /contexts/:name           — read a specific context file by name
```

**`POST /contexts/new` — New Context Creation:**

Accepts: `{ name, scope, description }`

Does the following in order:
1. Run the **pre-reset sequence** on the current session (save context, grab last prompt, notify)
2. Sanitize the name into a filename: lowercase, hyphens, no spaces → `canumay-east.md`
3. Create the new `context.md` file in `/contexts/` with the full fixed section scaffold:

```markdown
# [name] — Ala-Alab Context Document
**Scope:** [scope]
**Description:** [description]
**Version:** 1.0.0 | **Created:** [ISO date] | **Last updated:** [ISO date]

---

## Identity & Metadata

## Active Threads

## Ecological Records

## Community & Oral History

## Official Records

## Infrastructure & Policy Friction

## Cross-Reference Flags

## Human Annotations

## Erratum Log

## Session History
```

4. Set this new file as the active context
5. Start a new session tied to this context
6. Add an entry to `corpus-index.md` marking this file as `ORIGINAL`
7. Return: `{ created: true, filename, sessionId, contextSaved: <prior context name> }`

**NotebookLM:** A new context does NOT create a new notebook. NotebookLM stays as one notebook that holds everything. The indexer tracks what's in it.

---

### Indexer (`/indexer`)

```
GET    /indexer                  — return full corpus index
POST   /indexer/add              — add a new entry to the corpus index
DELETE /indexer/:id              — remove an entry from the corpus index
GET    /indexer/:type            — filter by type: original | link | image
```

**Three entry types:**

**ORIGINAL — files (markdown, PDF, text):**
```json
{
  "id": "uuid",
  "type": "ORIGINAL",
  "filename": "dredge-field-notes.md",
  "path": "/storage/files/dredge-field-notes.md",
  "dateAdded": "ISO date",
  "addedBy": "User | Claude | Gemini",
  "description": "Field documentation from The Dredge, Apr-Jun 2026",
  "inNotebook": true
}
```
Store the file as-is in `/storage/files/`.

**LINK — internet sources:**
```json
{
  "id": "uuid",
  "type": "LINK",
  "url": "https://example.com/study",
  "title": "Valenzuela Ecological Study 2024",
  "dateAccessed": "ISO date",
  "addedBy": "User | Claude | Gemini",
  "notes": "Cross-reference for creek names section",
  "generatedFile": "/storage/links/valenzuela-eco-study-2024.md",
  "inNotebook": true
}
```
Generate a `.md` file in `/storage/links/` containing: URL, title, date accessed, notes, and a placeholder for pasted content. The generated `.md` is what gets added to NotebookLM — not the raw link.

**IMAGE — image files:**
```json
{
  "id": "uuid",
  "type": "IMAGE",
  "filename": "creek-field-walk-001.jpg",
  "path": "/storage/images/creek-field-walk-001.jpg",
  "metadataFile": "/storage/images/creek-field-walk-001.json",
  "dateAdded": "ISO date",
  "addedBy": "User",
  "caption": "Looking south toward Sapang Bangka-bangka, Jun 2026",
  "linkedEntry": "context entry ID this image supports",
  "inNotebook": true
}
```
Store image as-is in `/storage/images/`. Create a companion `.json` metadata file alongside it.

**`corpus-index.md` format** — auto-generated and kept in sync by the indexer:

```markdown
# Ala-Alab — Corpus Index
**Last updated:** [ISO date] | **Total entries:** [N]

## ORIGINAL Files
| ID | Filename | Date Added | Added By | In Notebook | Description |
|---|---|---|---|---|---|
| uuid | dredge-field-notes.md | 2026-06-28 | User | ✓ | Field documentation... |

## LINKS
| ID | Title | URL | Date Accessed | Added By | In Notebook | Generated File |
|---|---|---|---|---|---|---|
| uuid | Valenzuela Eco Study | https://... | 2026-06-30 | Gemini | ✓ | valenzuela-eco-study.md |

## IMAGES
| ID | Filename | Date Added | Added By | In Notebook | Caption |
|---|---|---|---|---|---|
| uuid | creek-field-walk-001.jpg | 2026-06-29 | User | ✓ | Looking south... |
```

`inNotebook` is a boolean the user manually toggles — the app does not add to NotebookLM automatically (no API). It just tracks whether you've done it.

---

### Account Management (`/accounts`)

```
GET    /accounts                        — list all agent accounts + connection status
POST   /accounts/:agent/connect         — mark agent as connected, store display name + email
DELETE /accounts/:agent/disconnect      — mark agent as disconnected
GET    /accounts/:agent/status          — status for one agent
```

No passwords. No API keys. Just display name, email, and a connected boolean. The user is already logged into these services in their browser tabs — this is just UI state tracking so the Settings tab and Agent Report cards show accurate status.

Default seed state (`accounts.seed.json`):
```json
{
  "Gemini": {
    "connected": false,
    "displayName": null,
    "email": null,
    "model": "Gemini Flash",
    "tab": "gemini.google.com"
  },
  "Claude": {
    "connected": false,
    "displayName": null,
    "email": null,
    "model": "Claude Sonnet 4.6",
    "tab": "claude.ai"
  },
  "NotebookLM": {
    "connected": false,
    "displayName": null,
    "email": null,
    "model": "NotebookLM 1.45.7",
    "tab": "notebooklm.google.com"
  }
}
```

---

## Frontend

### Design System

```css
--color-bg:        #F5F0E8;   /* warm cream */
--color-sidebar:   #3D1F0F;   /* deep dark brown */
--color-header:    #C8614A;   /* salmon-red */
--color-accent:    #E8967A;   /* light salmon — active nav, buttons */
--color-card:      #C4A882;   /* warm tan — cards */
--color-card-dark: #2A1A0E;   /* very dark brown — agent chat area */
--color-text:      #1A0F0A;
--color-text-light:#F5F0E8;

Font: serif for ALA-ALAB title, sans-serif for body
Sidebar: fixed left ~70px, dark brown, icon + label per tab
Header: full width, salmon-red, PROJECT ALA-ALAB left
```

**Persistent Clipboard Status Bar** — fixed at the very bottom of the screen, always visible across all tabs:
```
[ CLIPBOARD ] — Last prompt saved · Session: abc-123 · [View] [Clear]
```
Updates in real time. Shows what's in the buffer and which session it came from.

**Pre-reset Notice** — appears as a non-blocking toast notification (top right) whenever a session reset fires:
```
✓ Context saved.  ✓ Last prompt copied to clipboard.  Starting new session...
```
Disappears after 4 seconds.

---

### Login (`Login.jsx`)
- Left: dark brown gradient panel
- Right: cream panel — PROJECT ALA-ALAB title, two salmon primary buttons (Continue as Google User, Continue as Guest), one secondary smaller button (Set Up Accounts → goes to Settings)
- Any button → Dashboard. No real auth.

---

### Dashboard (`Dashboard.jsx`)

**Left — Agent Report:**
Three cards fetched from `GET /accounts`:
- Role + name + status badge (Active green / Disconnected grey) + model + tab URL

**Right — Logs and Histories:**
- Commit log from `GET /bridge/log` filtered to `status: confirmed` — shows entry title + what changed
- Recent Context Edited — list of context filenames from `GET /contexts`, most recent first
- Auto-refreshes every 3 seconds

---

### Agents (`Agents.jsx`)

**Three sub-tabs: GEMINI | CLAUDE | NOTEBOOKLM**

**Main dark panel — message thread for active agent:**
- Each message bubble: FROM → TO label, type badge, timestamp, full formatted copyable block
- Each bubble has a **Copy** button → `POST /clipboard/copy` with that message's ID
- Gemini tab only: input bar at bottom — *"What do you want to record?"* + Send button
  - Send → `POST /bridge/send` with `{ from: "User", to: "Gemini", type: "raw_input" }`
- Claude + NotebookLM tabs: read-only, show agent-to-agent messages only

**Auditing Panel (right sidebar):**
- Label: `[AUDITING]`
- Shows all `status: pending` from `GET /bridge/transit`, auto-refreshes every 2 seconds
- Each card: FROM label, content preview, formatted copyable block, three buttons:
  - **Copy** → `POST /clipboard/copy`
  - **Confirm** → `POST /bridge/confirm/:id`
  - **Reject** → `POST /bridge/purge/:id`
- Pending from prior session banner: *"Pending transactions from previous session. Resume or Purge All?"*

**Session Controls (bottom of Agents tab):**
- **New Session** → `POST /session/new` (fires pre-reset sequence first)
- **End Session** → `DELETE /session/current` (fires pre-reset sequence first)
- **View Clipboard** → modal showing current clipboard buffer content + Copy to OS clipboard button

---

### Context (`Context.jsx`)

**Top — Context Selector:**
- Dropdown listing all files from `GET /contexts`
- **+ New Context** button → opens inline form: Name field, Scope dropdown (Barangay / City Hall / LGU), Description field, Create button → `POST /contexts/new`
- Creating fires the pre-reset sequence on the current session automatically

**Main area:**
- Scrollable display of current `context.md` content from `GET /contexts/current`
- Two buttons: **Copy Full Context** → `POST /clipboard/copy-text` with full file content | **Refresh** → re-fetch

**Bottom — Entry Metadata:**
- `ENTRY` label, `LAST EDITED`, `Category`
- Shows most recent confirmed `proposed_entry` from `GET /bridge/log`

---

### Indexer (`Indexer.jsx`)

Three filter tabs: **ALL | ORIGINAL | LINKS | IMAGES**

Each entry shows as a card:
- Type badge (ORIGINAL / LINK / IMAGE)
- Filename or title
- Date added, added by
- In Notebook toggle (checkbox) — `POST /indexer/:id` to update `inNotebook`
- For LINKS: URL as clickable link + generated `.md` filename
- For IMAGES: thumbnail preview if file exists in `/storage/images/`
- **Copy Path** button → copies file path or URL to clipboard buffer
- **Remove** button → `DELETE /indexer/:id`

**Add Entry panel (bottom):**
Three add buttons side by side:
- **+ File** → file upload input → on upload: save to `/storage/files/`, `POST /indexer/add` with type ORIGINAL
- **+ Link** → inline form: URL, title, notes → `POST /indexer/add` with type LINK → auto-generates `.md` file
- **+ Image** → image upload input → on upload: save to `/storage/images/`, prompt for caption → `POST /indexer/add` with type IMAGE

---

### Settings (`Settings.jsx`)

One section per agent (GEMINI / CLAUDE / NOTEBOOKLM):
- Account table: Display Name, Email, Status, Tab URL
- **Connect** form (if disconnected): Display Name field + Email field + Connect button → `POST /accounts/:agent/connect`
- **Disconnect** button (if connected): `DELETE /accounts/:agent/disconnect`
- Tab URL shown so user knows which browser tab this agent lives in

**LOGOUT** button at bottom → `DELETE /session/current` (fires pre-reset sequence) → returns to Login

---

## Startup Behavior

**Backend on start:**
1. Check `/contexts/` — if empty, create `canumay-east.md` with scaffold
2. Check `/storage/corpus-index.md` — if missing, create empty index
3. Check transit layer — if pending messages found, log: *"Pending transactions detected. Frontend will prompt user."*
4. Start Express on PORT

**Frontend on start:**
1. `GET /session/status` — if no active session → Login screen
2. If active session → Dashboard
3. `GET /clipboard/current` — populate clipboard status bar
4. `GET /bridge/transit` — if pending messages → show resume/purge banner in Agents tab

---

## Dependencies

```bash
# Backend
npm install express cors dotenv uuid multer

# multer is for file + image uploads to /storage/

# Frontend
npm create vite@latest frontend -- --template react
cd frontend && npm install
```

No AI SDK dependencies. No API keys required.

---

## `.env.example`

```
PORT=3001
FRONTEND_PORT=5173
# No API keys needed — agents run in browser tabs
# User carries messages manually between tabs using the clipboard protocol
```

---

## Demo Flow (What Success Looks Like)

1. App opens → Login → Dashboard shows three agent cards (all disconnected initially)
2. User goes to Settings → fills in display name + email for each agent → cards update to Active
3. User goes to Context → clicks **+ New Context** → fills in "Canumay East Flood Records" / Barangay / description → Create
4. Pre-reset sequence fires on old session (context saved, last prompt copied, notice appears)
5. New `canumay-east-flood-records.md` created, new session started, Context tab reloads
6. User goes to Agents tab → GEMINI sub-tab → types raw input → clicks Send
7. App generates formatted `[FROM: User] / [TO: Gemini]` message block, stages it as pending
8. Audit Panel shows it → User clicks **Copy** → pastes into Gemini tab in browser
9. Gemini responds → User copies Gemini's response → pastes into Audit Panel input (or message feed)
10. App parses it, validates `[FROM: Gemini] / [TO: Claude]` format, stages in transit
11. User confirms → app generates Claude-targeted formatted block → User copies → pastes into Claude.ai tab
12. Claude responds → User copies → app receives, validates, stages `[FROM: Claude] / [TO: User]` proposed entry
13. User confirms in Audit Panel → entry logged as confirmed → Context tab Entry Metadata updates
14. User goes to Indexer → adds the field notes file (+ File) and a cross-reference URL (+ Link) → index updates
15. User clicks **New Session** → pre-reset sequence fires → context saved → last prompt copied → fresh session

---

## Output Required from Replit

Generate `AGENT_COMMUNICATION_REPORT.md` in project root:

```markdown
# Ala-Alab — Agent Communication PoC Report
**Generated:** <timestamp>
**Build Status:** <working | partial | failed>

## Bridge Script
- [x / -] POST /bridge/send — validate + format + stage
- [x / -] Copyable formatted block generated per message
- [x / -] GET /bridge/transit
- [x / -] POST /bridge/confirm/:id
- [x / -] POST /bridge/purge/:id
- [x / -] GET /bridge/log
- [x / -] DELETE /bridge/log

## Session Management
- [x / -] POST /session/new — pre-reset sequence fires first
- [x / -] DELETE /session/current — pre-reset sequence fires first
- [x / -] GET /session/status
- [x / -] Step 1: context saved before reset
- [x / -] Step 2: last prompt auto-copied to clipboard
- [x / -] Step 3: frontend notified before clear
- [x / -] Step 4: transit cleared, states reset
- [x / -] Startup leftover detection

## Clipboard
- [x / -] POST /clipboard/copy
- [x / -] POST /clipboard/copy-text
- [x / -] GET /clipboard/current
- [x / -] DELETE /clipboard/clear
- [x / -] Persistent status bar in frontend
- [x / -] Clipboard survives session resets

## Context File Manager
- [x / -] GET /contexts
- [x / -] GET /contexts/current
- [x / -] POST /contexts/new — scaffold created, pre-reset fires
- [x / -] POST /contexts/update

## Indexer
- [x / -] GET /indexer
- [x / -] POST /indexer/add — ORIGINAL
- [x / -] POST /indexer/add — LINK (generates .md file)
- [x / -] POST /indexer/add — IMAGE (stores file + metadata .json)
- [x / -] DELETE /indexer/:id
- [x / -] corpus-index.md kept in sync
- [x / -] inNotebook toggle works

## Account Management
- [x / -] GET /accounts
- [x / -] POST /accounts/:agent/connect
- [x / -] DELETE /accounts/:agent/disconnect

## Frontend
- [x / -] Login screen
- [x / -] Dashboard — Agent Report cards live from /accounts
- [x / -] Dashboard — Logs and Histories
- [x / -] Agents — GEMINI / CLAUDE / NOTEBOOKLM sub-tabs
- [x / -] Agents — Auditing panel (Copy / Confirm / Reject)
- [x / -] Agents — Session controls
- [x / -] Context — selector + new context form
- [x / -] Context — file viewer + entry metadata
- [x / -] Indexer — ALL / ORIGINAL / LINKS / IMAGES tabs
- [x / -] Indexer — add file, link, image
- [x / -] Settings — connect/disconnect per agent
- [x / -] Persistent clipboard status bar
- [x / -] Pre-reset toast notification
- [x / -] Earth tone palette applied

## Demo Flow
- [x / -] New context creation fires pre-reset sequence
- [x / -] Message formatted + staged + copyable
- [x / -] Audit gate works
- [x / -] Clipboard buffer persists across session reset
- [x / -] Indexer tracks file, link, image entries
- [x / -] corpus-index.md updated on every add

## What Was Deferred
- [ ] Real Google Drive API sync
- [ ] Real NotebookLM API
- [ ] Google Auth
- [ ] Firebase
- [ ] Actual context.md file append on confirm (logged to console only for now)

## Known Issues
<list bugs, failed routes, incomplete behaviors>

## Next Step
Wire confirmed Claude proposed_entry to actual context.md append via contextFileManager.
Then add Google Auth. Then Google Drive sync.
```
