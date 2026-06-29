# Ala-Alab — Agent Communication PoC Report
**Generated:** 2026-06-29
**Build Status:** working — core protocol functional, AI accounts pending

---

## Bridge Script
- [x] POST /bridge/send — validate + format + stage
- [x] Copyable formatted block generated per message (full `====` block)
- [x] GET /bridge/transit
- [x] POST /bridge/confirm/:id
- [x] POST /bridge/purge/:id
- [x] GET /bridge/log
- [x] DELETE /bridge/log

## Session Management
- [x] POST /session/new — pre-reset sequence fires first
- [x] DELETE /session/current — pre-reset sequence fires first
- [x] GET /session/status
- [x] Step 1: context saved before reset
- [x] Step 2: last prompt auto-copied to clipboard
- [x] Step 3: frontend notified before clear (toast notification)
- [x] Step 4: transit cleared, states reset
- [x] Startup leftover detection

## Clipboard
- [x] POST /clipboard/copy
- [x] POST /clipboard/copy-text
- [x] GET /clipboard/current
- [x] DELETE /clipboard/clear
- [x] Persistent status bar in frontend
- [x] Clipboard survives session resets
- [x] OS clipboard copy (navigator.clipboard.writeText) on Copy buttons

## Context File Manager
- [x] GET /contexts
- [x] GET /contexts/current
- [x] POST /contexts/new — creates scaffold, fires pre-reset, starts new session
- [x] POST /contexts/update — appends confirmed entry
- [x] GET /contexts/:name
- [x] Seed file canumay-east.md created on startup
- [x] Context switching via dropdown
- [x] Copy Full Context copies to buffer + OS clipboard

## Indexer
- [x] GET /indexer
- [x] POST /indexer/add — all three types (ORIGINAL, LINK, IMAGE)
- [x] DELETE /indexer/:id
- [x] GET /indexer/:type
- [x] POST /indexer/:id — inNotebook toggle
- [x] corpus-index.md kept in sync
- [x] File uploads (multer) for ORIGINAL and IMAGE types
- [x] Generated .md files for LINK entries
- [x] Image thumbnail preview in UI

## Account Management
- [x] GET /accounts
- [x] POST /accounts/:agent/connect
- [x] DELETE /accounts/:agent/disconnect
- [x] GET /accounts/:agent/status
- [x] No passwords/API keys — display name + email only

## Frontend Pages
- [x] Login — two entry buttons, no real auth
- [x] Dashboard — agent report cards, confirmed message log, recent contexts
- [x] Agents — message thread per agent, User→Gemini input, Receive Response panel, Auditing panel with Confirm/Reject/Copy, session controls
- [x] Context — context selector dropdown, new context form, full content display, copy full context
- [x] Indexer — filter tabs, entry cards, inNotebook toggle, file/link/image upload, remove
- [x] Settings — per-agent connect/disconnect, protocol guide, logout

## Design System
- [x] Earth tone palette (warm cream, dark brown, salmon-red)
- [x] Fixed dark sidebar with nav icons
- [x] Salmon-red header — PROJECT ALA-ALAB
- [x] Persistent clipboard status bar (bottom of screen)
- [x] Toast notifications for pre-reset and actions

---

## What Is NOT Yet Done

### AI Authorization / Integration
- [ ] Real Google OAuth (currently cosmetic login only)
- [ ] Gemini API connection (by design — user carries messages manually)
- [ ] Claude API connection (by design — user carries messages manually)
- [ ] NotebookLM API connection (by design — user carries messages manually)
- [ ] Agent accounts registered in Settings (just display name/email slots, waiting to be filled)

### These are intentional absences per the spec:
> "There are no API calls to AI agents. The user has three browser tabs open."
> The app manages the protocol. The user is the Bridge.

---

## Bus Status
The bus is built and running. It drives the full clipboard orchestration protocol end-to-end. It is waiting for passengers (Gemini, Claude, NotebookLM accounts) to be registered in Settings before the full human-in-the-loop flow activates.

### To activate the full flow:
1. Open gemini.google.com, claude.ai, notebooklm.google.com in browser tabs
2. Go to Settings → register each agent (display name only, no API key)
3. Go to Agents → send your first message → copy → paste into Gemini tab
4. Paste Gemini's response back via "+ Receive Response"
5. Confirm → copy → paste into Claude tab
6. Repeat until entries are confirmed and written to context.md

---

## Architecture Notes
- **Backend:** Express on port 3001 (localhost), in-memory transit + clipboard layers
- **Frontend:** React + Vite on port 5000 (0.0.0.0), proxied to backend
- **Storage:** Local filesystem — `backend/contexts/` for .md files, `backend/storage/` for corpus
- **No external dependencies beyond npm packages** — no database, no cloud storage, no AI SDKs
- **Session state:** In-memory. Restart clears transit and session; context files persist on disk.
