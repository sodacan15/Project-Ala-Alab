# Ala-Alab

> *"The context window you're expanding isn't just Claude's. It's the barangay's."*

**SparkFest 2026 — Team gitMeFanta**
A clipboard orchestration system for preserving Philippine barangay community memory.

---

## What Is Ala-Alab?

Barangay history dies quietly. Records freeze when written. Personnel change. Oral knowledge leaves with the person holding it. Official records and ground truth diverge with no mechanism to flag the gap.

**Ala-Alab is the counter-system.**

It is a community memory orchestration platform — a structured web app that helps local government units (barangays, city halls, LGUs) capture, validate, and preserve ground-truth knowledge as a living document. The output is `context.md`: a versioned, provenance-tagged markdown file that any future person or AI session can be injected with to become productive immediately.

**The core claim:** Any stateless agent — a new health worker, a fresh AI session, an emergency responder — injected with `context.md` becomes productive immediately. The agent is not the memory. The document is.

### The Community We Serve

| Level | Sector |
|---|---|
| **Primary** | Barangay secretaries, local historians, environmental monitors, community documentarians |
| **Secondary** | City halls aggregating barangay-level data |
| **Tertiary** | LGU disaster risk units, NDRRMC/BFP emergency responders |

---

## How It Works — The POOF Protocol

Ala-Alab runs a human-mediated three-agent relay. No API keys. No direct integrations. The user is the Bridge.

```
User types → [Ala-Alab formats + stages] → User copies → pastes into Gemini tab
Gemini responds → User copies → [Ala-Alab validates + stages] → User copies → pastes into Claude tab
Claude responds → User copies → [Ala-Alab validates + stages] → User copies → pastes into NotebookLM
Confirmed entries → written to context.md (the living community memory document)
```

**Why human-mediated?** Privacy, auditability, and intentional control. Each message is human-visible before it travels. Nothing is auto-posted. The community retains agency over every record.

### TripleTalk

| Agent | Role | Lane |
|---|---|---|
| **Gemini** (Google AI Studio) | The Communicator — receives raw community input, structures it | Intake only |
| **Claude** | The Scribe — evaluates intake, proposes entries, writes to context.md | Document maintenance |
| **NotebookLM** | The Archivist — holds the accumulated corpus; surfaces synthesis on request | Corpus & synthesis |

Agents never speak to each other directly. All handoffs route through Ala-Alab's Bridge layer.

### The Transit Layer (POOF)

Pending messages land in a volatile in-memory queue. On human approval: the entry is written to `context.md` and the pending record is cleared — **POOF**. On startup, leftover pending records trigger a resume-or-purge prompt. No silent state.

---

## Google Technology Integration

Ala-Alab's primary AI intake agent is **Gemini** (Google AI Studio / Gemini Flash), used as the structured community intake layer. Users open Gemini in a browser tab alongside Ala-Alab, copy formatted intake blocks from the app, paste them into Gemini, and relay Gemini's structured response back through the Bridge.

The protocol is specifically designed around Gemini's multilingual, warm conversational style for community-facing intake — accepting voice notes, dialect, broken sentences, and incomplete oral histories without judgment.

**Google tech in the stack:**
- **Gemini (Google AI Studio)** — primary intake agent; structured community data ingestion
- **Google Authentication** — login screen integration (OAuth flow, cosmetic during hackathon period; any button enters the workspace)

---

## SDG Alignment

| SDG | Relevance |
|---|---|
| **SDG 11** — Sustainable Cities & Communities | Barangay-level memory infrastructure for underserved urban and rural communities |
| **SDG 16** — Peace, Justice & Strong Institutions | Provenance-tagged records that hold institutions accountable to ground truth |
| **SDG 9** — Industry, Innovation & Infrastructure | Protocol-based innovation that works without internet APIs or cloud lock-in |

---

## Features

### Core Flow
- **Message staging** — type a prompt; Ala-Alab formats it as a structured POOF block ready for Gemini
- **Receive Response panel** — paste any AI reply; the app validates format and stages it in transit
- **Auditing panel** — unified conversation thread; pending messages show Copy / Confirm / Reject inline
- **Session management** — pre-reset sequence saves context, copies last prompt, clears transit

### Context File System
- Multiple `context.md` files for different barangays or topics
- **◉ View mode** — fully rendered markdown with styled headings, tables, blockquotes
- **✏ Edit mode** — dark monospace editor with char/line count and unsaved-change indicator
- Section navigator — jumps to any of the 10 fixed document sections in both modes
- Save writes to disk and auto-updates the `**Last updated:**` timestamp

### Corpus Indexer
- **ORIGINAL** — upload field documents, photos, scanned records
- **LINK** — register external URLs; app generates a `.md` summary file
- **IMAGE** — upload images with metadata; `inNotebook` toggle tracks manual addition to NotebookLM corpus

### Clipboard System
- Persistent clipboard status bar across all screens
- All copies land in the app's clipboard buffer AND the OS clipboard
- Buffer survives session resets; last-copied block always accessible

### Agent Accounts
- Register display names and emails for Gemini, Claude, and NotebookLM slots
- Dashboard shows real-time status of which agents are "connected" (tabs open)
- No passwords, no API keys — accounts are identity markers, not auth gates

---

## Installation & Setup

### Prerequisites
- Node.js 18+
- pnpm (or npm)

### Clone and Install

```bash
git clone https://github.com/<your-org>/ala-alab.git
cd ala-alab

# Install backend dependencies
cd GoogleAiSTUDioOutput1 && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### Run

```bash
bash start.sh
```

This starts both services in one command:

| Service | Address |
|---|---|
| GoogleAiSTUDioOutput1 server (Express + Vite middleware) | `localhost:3000` |
| Frontend (Vite/React) | `localhost:5000` |

Open `localhost:5000` in your browser.

### What Persists

| Data | Storage |
|---|---|
| `context.md` files | `GoogleAiSTUDioOutput1/src/contexts/` (disk) |
| Uploaded files | `GoogleAiSTUDioOutput1/src/storage/files/`, `images/`, `links/`, `attachments/` (disk) |
| Pending transit messages | In-memory — clears on restart |
| Clipboard buffer | In-memory — clears on restart |

---

## Project Structure

```
backend/
  index.js              # Express server + all API routes
  bridge.js             # Message validation and routing logic
  transit.js            # In-memory pending message queue
  session.js            # Session lifecycle + pre-reset sequence
  clipboard.js          # Clipboard buffer (persists across session resets)
  contextFileManager.js # Read/write/create context.md files
  indexer.js            # Corpus index — tracks ORIGINAL/LINK/IMAGE entries
  accounts.js           # Agent account state (no passwords)
  contexts/             # All context.md files (disk-persisted)
  storage/
    corpus-index.md     # Auto-generated master index
    files/              # Uploaded ORIGINAL documents
    links/              # Generated .md files for LINK entries
    images/             # Uploaded images + metadata .json
    attachments/        # Message-attached files

frontend/
  src/
    App.jsx             # Root — sidebar nav, login gate, clipboard bar, toast
    App.css             # All styles — earth-tone palette (cream/brown/salmon)
    components/
      Login.jsx         # Entry screen
      Dashboard.jsx     # Agent report cards + full message log
      Agents.jsx        # Message thread, intake form, receive panel, auditing
      Context.jsx       # Context file viewer/editor with markdown toggle
      Indexer.jsx       # Corpus index — ORIGINAL/LINK/IMAGE management
      Settings.jsx      # Agent account registration + protocol guide

docs/protocol/
  instruction-v3.0.2.md # Full agent protocol — Gemini, Claude, NotebookLM lanes
```

---

## Usage Guide

### Step 1 — Open Your Tabs
Open three browser tabs alongside Ala-Alab:
- **Tab 1:** Google AI Studio (Gemini Flash)
- **Tab 2:** Claude.ai
- **Tab 3:** NotebookLM

### Step 2 — Register Agent Accounts
Go to **Settings** → register display names for each agent slot. This activates their dashboard cards.

### Step 3 — Select or Create a Context
Go to **Context** → select an existing `context.md` or create a new one for your barangay or topic.

### Step 4 — Run the Protocol
1. Go to **Agents** → type your community prompt in the input panel
2. Click **Stage** — Ala-Alab formats a structured POOF block
3. Click **Copy** — paste into your Gemini tab
4. Copy Gemini's response → paste into the **Receive Response** panel in Ala-Alab
5. The response is validated and staged in the conversation thread
6. In the **Auditing** panel: **Copy** to relay to Claude, then **Confirm** or **Reject**
7. Confirmed entries write to `context.md`

### Step 5 — Build the Corpus
Go to **Indexer** → upload field documents, photos, and links. Toggle `inNotebook` after manually adding files to your NotebookLM corpus.

---

## The `context.md` Format

Every context file follows the v3.0.2 schema — ten fixed sections, provenance-tagged entries, versioned header.

```markdown
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

Every entry carries: date of observation, date of submission, source type tag (`[ORAL]`, `[FIELD]`, `[OFFICIAL]`, `[POLICY]`, `[SECONDARY]`, `[SYNTHESIS]`), data flow direction, contributor, content, and significance level.

Nothing is deleted — deprecated entries are struck with `~~strikethrough~~` + rationale. The document reflects current truth, not a pile of everything ever said.

---

## Key Design Decisions

| Decision | Reason |
|---|---|
| No AI SDKs | Privacy and intentional human control — every message is visible before it travels |
| Human-mediated relay | The community retains agency over what enters the record |
| In-memory transit | Volatile by design — pending ≠ confirmed; restart forces a resume-or-purge decision |
| Context files on disk | Memory outlasts the session, the personnel, and the app instance |
| Source type tags | Provenance is what makes the document trustworthy across time |
| No anonymous entries | Every entry has a contributor — the record is accountable |

---

## Team

**Team gitMeFanta** — SparkFest 2026

*Ala-Alab. Giving communities the freedom to remember.*

---

## License

MIT
