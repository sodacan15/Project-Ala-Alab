# AGENT COMMUNICATION REPORT
**Project:** Ala-Alab — Community Memory Orchestration System  
**Event:** SparkFest 2026 · Team gitMeFanta  
**Date:** 2026-06-29  
**Status:** MVP Complete — v1.2

---

## System Overview

Ala-Alab is a clipboard orchestration system for Philippine barangay community memory. The user physically carries structured messages between three AI browser tabs (Gemini, Claude, NotebookLM). No AI API keys. No direct integrations. The user is the Bridge.

```
User types → [Ala-Alab formats + stages] → User copies → pastes into Gemini tab
Gemini responds → User copies → [Ala-Alab validates + stages] → User copies → pastes into Claude tab
Claude responds → [Ala-Alab validates + stages] → Confirm → written to context.md (POOF)
```

---

## How to Connect Your Agent Accounts

You do not need API keys. You need three browser tabs.

### Step 1 — Open Your AI Tabs

Open these three URLs in separate browser tabs, side by side with Ala-Alab:

| Agent | Where to go |
|---|---|
| **Gemini** | [aistudio.google.com](https://aistudio.google.com) — use Gemini Flash, start a new chat |
| **Claude** | [claude.ai](https://claude.ai) — start a new conversation |
| **NotebookLM** | [notebooklm.google.com](https://notebooklm.google.com) — create one notebook per community topic |

### Step 2 — Register Display Names in Settings

1. In Ala-Alab, go to **Settings** (⚙ in the sidebar)
2. Under **Agent Accounts**, find the three agent slots: Gemini, Claude, NotebookLM
3. For each one, enter:
   - **Display name** — your name, role, or the account label you use (e.g. "Maria — Barangay Secretary")
   - **Email** — the Google/Anthropic account email you're signed into that tab with
4. Click **Connect** for each slot

This tells the Dashboard that the agent is "active." The dashboard card will show a green connected status and a direct link to that agent's tab.

### Step 3 — Load the Context Document into Each Agent

Before your first session, paste the full `context.md` into each AI tab as a system primer:

1. In Ala-Alab, go to **Context**
2. Click **Copy Full** — the entire context document is copied to your clipboard
3. Switch to your **Claude tab** → paste it at the top of the conversation with the message:
   > *"This is the community memory document. You are the Scribe. Your lane is document maintenance. Do not write to this document until I confirm. Read the instruction header for your full protocol."*
4. Switch to your **Gemini tab** → paste it with:
   > *"This is the community memory document. You are the Communicator. Your role is structured intake only. When I send you community input, structure it and return a clean intake summary."*
5. Switch to your **NotebookLM tab** → add the context file as a source document (upload the `.md` file or paste the content into a new source)

### Step 4 — Run the Protocol

You are now ready. Return to **Agents** in Ala-Alab and begin the session.

---

## Feature Checklist

### Backend

| Feature | Status | Notes |
|---------|--------|-------|
| Express server (port 3001) | ✅ | `backend/index.js` |
| In-memory transit queue | ✅ | `backend/transit.js` — restart clears |
| Bridge send / confirm / purge | ✅ | `backend/bridge.js` |
| POOF protocol — confirm → context.md | ✅ | `bridge.confirm()` → `appendFormattedEntry()` |
| Sensitive keyword detection | ✅ | Auto-flags on `bridge.send()` |
| Purge All route | ✅ | `POST /bridge/purge-all` |
| Context file creation (scaffold) | ✅ | Full v3.0.2 schema — 10 fixed sections |
| Context file append entry | ✅ | sourceTag / contributor / date / significance / sensitive / section / note |
| **Context file save to disk** | ✅ | `PUT /contexts/:name/save` → `writeContext()` — auto-updates Last updated timestamp |
| Section-targeted insertion | ✅ | Finds `## Section` heading, inserts before next heading |
| Session lifecycle | ✅ | `backend/session.js` — new/end session, context save |
| Pre-reset sequence | ✅ | Saves context + last prompt to clipboard buffer before new session |
| Corpus indexer | ✅ | ORIGINAL / LINK / IMAGE entries, inNotebook toggle |
| File & image uploads | ✅ | Multer, `storage/files/` and `storage/images/` |
| **File attachments on messages** | ✅ | `POST /bridge/attach` — files embedded in formatted blocks |
| Clipboard buffer | ✅ | Persists across session resets |
| Agent accounts | ✅ | No passwords — display name + email, connected state |
| Seed context auto-create | ✅ | `canumay-east.md` scaffold on first run |

### Frontend

| Feature | Status | Notes |
|---------|--------|-------|
| Login screen | ✅ | SDG badges, etymology, Google OAuth cosmetic gate |
| Dashboard — stats bar | ✅ | Connected agents / confirmed entries / pending / context files |
| Dashboard — agent report cards | ✅ | Role, status, model, browser tab link per agent |
| Dashboard — protocol progress steps | ✅ | 6-step visual, highlights current step |
| Dashboard — confirmed message log | ✅ | Real-time, reverse-chronological |
| Dashboard — active session card | ✅ | Session ID, start time, active context |
| Agents — Gemini structured intake | ✅ | scope / dataFlow / sourceTag / contributor / date / sensitive / note |
| **Agents — file attachment picker** | ✅ | 📎 icon on intake form — thumbnail for images, 📄 for docs |
| **Agents — attachment previews** | ✅ | Previews shown in form; embedded in formatted block on copy |
| Agents — Receive Response panel | ✅ | from / to / type / tag / contributor / sensitive / content / note |
| **Agents — unified Auditing thread** | ✅ | Single conversation view — pending shows Copy/Confirm/Reject inline; settled shows confirmed (green) or rejected (dim) |
| Agents — sensitive badge + warning | ✅ | ⚠ orange badge, yellow warning box |
| **Context — ◉ View / ✏ Edit toggle** | ✅ | Rendered markdown view + dark monospace editor |
| **Context — markdown rendering** | ✅ | `marked` — styled headings, lists, blockquotes, code, tables in earth-tone palette |
| **Context — edit mode** | ✅ | Full-height textarea, char/line count, unsaved-change indicator |
| **Context — 💾 Save to disk** | ✅ | PUT request to backend; button only active when dirty; auto-updates timestamp |
| Context — file selector | ✅ | Switch between context files |
| Context — section navigator | ✅ | Jump-to buttons for all 10 v3 sections — works in both view and edit mode |
| Context — version + last-updated | ✅ | Extracted from file header, shown in viewer bar |
| Context — Append Entry form | ✅ | section / tag / significance / contributor / date / sensitive / note |
| Context — Copy Full Context | ✅ | OS clipboard + buffer for NotebookLM injection |
| Context — New Context form | ✅ | Name / scope / description — triggers session reset |
| Indexer — ORIGINAL / LINK / IMAGE | ✅ | Upload, link with .md generation, image with metadata |
| Indexer — inNotebook toggle | ✅ | Manual toggle — app tracks state, not the action |
| Settings — agent registration | ✅ | Display name + email, connect / disconnect |
| Settings — protocol guide | ✅ | 7-step walkthrough |
| Settings — logout | ✅ | Saves context before returning to login |
| Clipboard status bar | ✅ | Persistent, shows last copy timestamp |
| Toast notifications | ✅ | Feedback on every action |
| Earth-tone design system | ✅ | Cream / dark brown / salmon-red |

---

## Protocol Flow

### 1 · User Input  [User → Gemini]
User fills intake form (+ optional file attachments) → Ala-Alab formats structured block → staged in transit → user copies → pastes into Gemini tab.

### 2 · Receive Gemini Response
User copies Gemini reply → Receive Response panel → `from=Gemini, to=Claude, type=intake_summary` → staged in transit.

### 3 · Claude Processes  [Claude → Auditing]
Auditing panel shows the staged Gemini summary → user copies → pastes into Claude tab → Claude proposes entry → user copies → Receive Response → `from=Claude, to=NotebookLM, type=proposed_entry`.

### 4 · POOF — Confirm to context.md
Auditing panel → **Confirm** → `bridge.confirm()` → `appendFormattedEntry()` writes under the correct section heading. Message log updated to `confirmed`. Transit entry cleared.

### 5 · Edit & Save in Context Tab
Go to **Context** → switch to **✏ Edit mode** → make any manual corrections → **💾 Save** → written to disk, timestamp updated.

### 6 · NotebookLM Sync (manual)
Context tab → **Copy Full Context** → paste into NotebookLM source → toggle `inNotebook` on Indexer entries that have been added.

---

## Source Tag → Section Mapping (on POOF confirm)

| Source Tag | Written to Section |
|-----------|-------------------|
| `[FIELD]` | Ecological Records |
| `[OFFICIAL]` | Official Records |
| `[POLICY]` | Official Records |
| `[SYNTHESIS]` | Cross-Reference Flags |
| All others | Community & Oral History |

---

## Agent Roles

| Agent | Role | Responsibility |
|-------|------|----------------|
| **Gemini** (Google AI Studio) | The Communicator | Denoises raw input, structures intake summaries |
| **Claude** | The Scribe | Proposes structured context entries for human confirmation |
| **NotebookLM** | The Archivist | Holds accumulated corpus; surfaces synthesis and citations on request |

---

## Key Design Decisions

| Decision | Reason |
|---|---|
| No AI SDKs | Privacy and intentional human control — every message is visible before it travels |
| Human-mediated relay | Community retains agency over what enters the record |
| In-memory transit | Volatile by design — pending ≠ confirmed; restart forces a resume-or-purge decision |
| Context files on disk | Memory outlasts the session, the personnel, and the app instance |
| Edit-mode save is explicit | Autosave would silently alter canonical community records — the Save button is the audit gate |
| One NotebookLM notebook | New context ≠ new notebook; the indexer tracks what's been added manually |
| `inNotebook` is manual | The app tracks state, not the physical action of uploading to NotebookLM |
| Google OAuth is cosmetic | Any button enters the app; real OAuth integration is the next gate |

---

*SparkFest 2026 · Team gitMeFanta · Ala-Alab v1.2*
