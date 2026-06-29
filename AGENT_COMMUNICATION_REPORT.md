# AGENT COMMUNICATION REPORT
**Project:** Ala-Alab — Community Memory Orchestration System  
**Event:** SparkFest 2026 · Team gitMeFanta  
**Date:** 2026-06-29  
**Status:** MVP Complete

---

## System Overview

Ala-Alab is a clipboard orchestration system for Philippine barangay community memory. The user physically carries structured JSON messages between three AI browser tabs (Gemini, Claude, NotebookLM). No AI API keys. No direct integrations. The user is the Bridge.

```
User types → [Ala-Alab formats + stages] → User copies → pastes into Gemini tab
Gemini responds → User copies → [Ala-Alab validates + stages] → User copies → pastes into Claude tab
Claude responds → [Ala-Alab validates + stages] → Confirm → written to context.md (POOF)
```

---

## Feature Checklist

### Backend

| Feature | Status | Notes |
|---------|--------|-------|
| Express server (port 3001) | ✅ | `backend/index.js` |
| In-memory transit queue | ✅ | `backend/transit.js` — restart clears |
| Bridge send / confirm / purge | ✅ | `backend/bridge.js` |
| **POOF protocol** — confirm → context.md | ✅ | `bridge.confirm()` calls `appendFormattedEntry()` for `proposed_entry` / `context_update` |
| Sensitive keyword detection | ✅ | Auto-flags on bridge.send() |
| Purge All route | ✅ | `POST /bridge/purge-all` |
| Context file creation (scaffold) | ✅ | Full v3 schema sections |
| Context file append entry | ✅ | Structured: sourceTag, contributor, date, significance, sensitive, section, note |
| Section-targeted insertion | ✅ | Finds `## Section` heading, inserts before next heading |
| Session lifecycle | ✅ | `backend/session.js` — new/end session, context save |
| Pre-reset sequence | ✅ | Saves context + last prompt to clipboard buffer before new session |
| Corpus indexer | ✅ | ORIGINAL / LINK / IMAGE entries, inNotebook toggle |
| File & image uploads | ✅ | Multer, `storage/files/` and `storage/images/` |
| Clipboard buffer | ✅ | Persists across session resets |
| Agent accounts | ✅ | No passwords — display name + email, connected state only |
| Seed context auto-create | ✅ | `canumay-east.md` — empty scaffold on first run |

### Frontend

| Feature | Status | Notes |
|---------|--------|-------|
| Login screen | ✅ | SDG badges, etymology "Alaala · Alab — Memory on Fire", tagline |
| Dashboard — stats bar | ✅ | Connected agents / confirmed entries / pending / context files |
| Dashboard — agent report cards | ✅ | Role, status, model, browser tab link per agent |
| Dashboard — protocol progress steps | ✅ | 6-step visual, highlights current step |
| Dashboard — confirmed message log | ✅ | Real-time, reverse-chronological |
| Dashboard — active session card | ✅ | Session ID, start time, active context |
| Agents — Gemini structured intake | ✅ | scope / dataFlow / sourceTag / contributor / date / sensitive / note |
| Agents — Receive Response panel | ✅ | from / to / type / tag / contributor / sensitive / content / note |
| Agents — message thread per agent | ✅ | Filtered by active tab (Gemini / Claude / NotebookLM) |
| Agents — formatted copy block | ✅ | Full protocol block with all metadata |
| Agents — Auditing panel | ✅ | Copy / Confirm / Reject / Purge All |
| Agents — sensitive badge + warning | ✅ | ⚠ orange badge, yellow warning box, POOF label |
| Context — file selector | ✅ | Switch between context files |
| Context — section navigator | ✅ | Jump-to buttons for all 10 v3 sections |
| Context — version + last-updated | ✅ | Extracted from file header |
| Context — Append Entry form | ✅ | All schema fields: section / tag / significance / contributor / date / sensitive / note |
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
User fills intake form → Ala-Alab formats structured block → staged in transit → user copies → pastes into Gemini tab.

### 2 · Receive Gemini Response
User copies Gemini reply → + Receive Response → `from=Gemini, to=Claude, type=intake_summary` → staged in transit.

### 3 · Claude Processes
User copies → pastes into Claude tab → Claude proposes entry → user copies → Receive Response → `from=Claude, to=NotebookLM, type=proposed_entry`.

### 4 · POOF — Confirm to context.md
Auditing panel → **Confirm** → `bridge.confirm()` → `appendFormattedEntry()` writes under the correct section heading. Message log updated to `confirmed`. Transit entry removed.

### 5 · NotebookLM Sync (manual)
Context tab → **Copy Full Context** → paste into NotebookLM notebook → toggle `inNotebook` on Indexer entries.

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
| Gemini | The Communicator | Denoises raw input, produces intake summaries |
| Claude | The Scribe | Proposes structured context entries |
| NotebookLM | The Archivist | One notebook, accumulates everything, synthesizes |

---

## Key Design Decisions

- **No AI SDKs** — privacy and manual control are the point
- **In-memory transit** — restart clears queue; context files persist on disk
- **One NotebookLM notebook** — new context ≠ new notebook
- **`inNotebook` is manual** — user toggles after physically adding to NotebookLM
- **Google OAuth is cosmetic** — any button enters the app; real OAuth pending
- **Empty seed context** — canumay-east.md starts blank; users build their own corpus

---

*SparkFest 2026 · Team gitMeFanta · Ala-Alab v1.0 MVP*
