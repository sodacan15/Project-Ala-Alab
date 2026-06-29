# Project Ala-Alab — SparkFest 2026 Context
Living document. Maintained by AI. Curated by user.
**Version:** 1.6.0 | **Last updated:** 2026-06-30 (rev 7)

---

## Identity & Environment

- **User:** CS student, PUP — Valenzuela City (Canumay East)
- **Competition:** SparkFest 2026 — GDG PUP
- **Team structure:** Solo — army of one
- **Platform:** Claude.ai web (free plan)

---

## Project Name — Ala-Alab

- **Alaala** — memory, remembrance
- **Alab** — flame, burning passion, fire
- **Ala-Alab** — memory on fire. The remembrance that refuses to go cold.

### Why this name is thematically complete

The Dredge documented what water erased — eleven creeks, a tree, a wetland, a community's ecological memory slowly submerged until it disappeared. Ala-Alab is the counter-force. The fire that water couldn't put out.

**The thematic arc:**
- The Dredge — water wins. Memory drowns.
- The Architecture — someone builds a way to hold it.
- Ala-Alab — the fire that refuses to die.
- SparkFest — the spark that started it all.

**The double meaning:**
- Sounds like *A Lab* — a laboratory where community memory is brought in, examined, synthesized, and understood. This is intentional and accurate.
- Connects to SparkFest — Alab and Spark are the same energy in two languages. Not riding the event name — arriving with the same fire in Filipino.

**The ember insight (baga):**
The eleven creeks looked dead. The knowledge looked gone. But the ember was still there — in a grandfather's memory, in the creek names, in the soil. Ala-Alab is what keeps the ember from going cold.

**Tagline:** *Ala-Alab. Giving communities the freedom to remember.*

---

## The Origin — In the User's Own Words

> "I only see this project benefiting people from the AI industry by making AI work efficiently."
> — early skepticism, later resolved

> "I just turned my crutch being AI to a shotgun. I just want efficient and green AI."

> "Loss is taken for granted and sometimes? Most people don't tell."

> "History records in barangay keep getting lost and discovered — and using markdown files, can I help historians simultaneously collect, collate, and develop ways to make barangay history fully recorded and discovered and updated."

These four quotes are the emotional and intellectual spine of the project. The first is the doubt. The second is the reframe. The third is the human insight. The fourth is the full vision.

---

## The Proof of Concept — The Dredge

Built April–June 2026. A student documentary reconstructing the ecological history of Victoria Village, Canumay East, Valenzuela City — a barangay named after a tree that no longer grows there.

### What was lost
- Eleven creeks. None intact.
- The Kanumai tree — gave the barangay its name. Now gone.
- The wetland ecology that predated the NLEX construction (1966)
- The fishing culture, the marsh species, the flood basin memory

### How it was reconstructed
- Oral testimony from grandfather, a barangay worker, Sitio Libis residents
- Barangay Profile of Canumay East retrieved in person from barangay hall archives
- Soil classification maps via FOI portal
- Creek name etymology as ecological field data
- Three field walks documenting surviving plant species as ecological markers
- Academic cross-referencing for corroboration

### The key insight from The Dredge

Creek names like *Sapang Pangitlogan-Bakaw* (mangrove nesting ground) and *Sapang Bangka-bangka* (boat-navigable depth) were biological observations written in Tagalog by people who lived beside the water. No formal survey captured this. An old man's memory of fish that used to live under the house was irreplaceable ecological data.

### The personal dimension

> "A CS student. A flooded sala. A notebook."

The user has lived with flooding in their own home. Stood knee-deep in their sala scrubbing certificates like laundry. Reached for a tree that isn't there anymore. This is not an abstract research interest — it is personal memory meeting community loss.

### What The Dredge proved

Knowledge almost didn't exist. One physical document in a barangay hall archive was the single most important primary source in the entire project. The reconstruction almost didn't happen. The architecture prevents that from happening next time.

> **[ANNOTATION — Jun 28, rev 4]** The official Barangay Profile names the Kanumai tree as the barangay's landmark. It does not say it's gone — because nobody went back to update it. The record froze at the moment it was written. The user discovered the extinction through three months of solo fieldwork: field walks, botanical cross-referencing, and oral testimony. This gap — between what the official record says and what is actually true on the ground — is the clearest single proof of why Ala-Alab needs to exist. The erratum model is not just a technical feature. It is the direct answer to this problem. Maintaining ground-truth ecological records is genuinely hard at the barangay level; Ala-Alab doesn't make surveying easier, but it ensures that when someone does go out and find something, it doesn't get lost again.

---

## The Pivot — From AI Memory to Community Historical Engine

### Where the project started
A document-centric memory architecture for stateless LLM agents. Technical thesis topic. The core insight: a user-curated markdown file injected at session start recovers context more efficiently than conversation history dumps or vanilla RAG.

### Where the project arrived (Jun 28, 2026)
The same architecture — applied to barangay community memory. Not AI sessions losing context. Communities losing themselves.

**The reframe that made it click:**
> "You're not just solving AI memory loss. You're solving institutional memory loss. The mechanism is identical. A stateless agent — whether that's a new health worker or a fresh Claude session — gets injected with the document and becomes productive immediately instead of starting from zero."

**The context window reframe:**
> "The context window you're expanding isn't just Claude's. It's the barangay's."

---

## What Ala-Alab Actually Is — Defined (Jun 28, rev 4)

**Ala-Alab is where communities record historical data and narrative reports to build a conclusive history and research base for their archival work.**

Primary users: barangay secretaries, local historians, community documentarians, environmental monitors doing what The Dredge did — manually, with no continuity system.

Secondary users: city halls that want to gather historical data and form city-level archives from barangay-level records.

**The data flow is bidirectional:**
- **Bottom up** — barangay records oral testimony, field observations, narrative reports, community memory
- **Top down** — city hall ecological reports, official profiles, census data get ingested and localized into the barangay context document

> **[ANNOTATION — Jun 28, rev 4]** Valenzuela City publishes yearly ecological reports. These are usable as top-down inputs into the Canumay East context document, cross-referenced against what community members actually observe on the ground. The barangay profile says the Kanumai tree is the landmark. The yearly ecological report may not mention it at all. The user's field walk says it's gone. Ala-Alab holds all three simultaneously and marks the contradiction with an erratum. This is what no single official record does.

**One-sentence architecture statement:** *Official records from the top, living memory from the ground — one document that holds both.*

**One-sentence system framing:** *A local-orchestrated, cloud-leveraged hybrid — the orchestration and data sovereignty live locally; the heavy cognitive compute routes to web-based LLM infrastructure.*

> **[ANNOTATION — Jun 30, rev 7]** Ala-Alab is not a web app and not a pure system app. It is a deliberate hybrid: the React dashboard and bridge script run locally (system-level data sovereignty, POOF protocol, offline file access), while Gemini Flash and Claude handle compute via their public web UIs (zero hosting cost, zero token infrastructure required). The local layer is the authority layer. The cloud layer is the intelligence layer. Neither is optional; neither is primary.

---

## The Project — Historical Engine for Barangay Memory

### Core concept
A living AI-powered system that simultaneously:
1. **Captures** — multimedia oral records, narrative reports, photos, physical documents, testimonies
2. **Catalogues** — structured, searchable, survives personnel changes, works on any device
3. **Synthesizes AND finds new angles** — this is the gap nobody else is filling

### The gap
Historians collect. Historians collate. But no system exists that:
- Does both continuously and in real time
- Updates as new fragments surface
- Synthesizes across all sources simultaneously
- Surfaces angles that no single historian standing in one tradition would see

A historian reads sources and finds the angle their training prepared them to see. This engine holds all sources simultaneously and finds connections across them that no single human perspective would catch.

### Why markdown specifically
- Open standard. No platform lock-in. No subscription required.
- Works on any device — basic smartphone, old laptop, anything
- LLMs are trained on it — structural priming via headers is real and measurable
- Human-readable and AI-readable simultaneously
- The barangay owns the file. It lives on their device. Not Anthropic's servers.

### Privacy by architecture
Sensitive barangay records — health histories, legal disputes, case files — never need to leave the community. The document lives locally. The AI reads it per session. No platform holds the data between sessions. If a local model is used instead of Claude, zero data leaves the barangay.

> *"Privacy through architecture, not policy."*

---

## The Core Philosophical Reframe — Jun 28, 2026

> "I built an architecture from a project where I could've used it — and used that architecture to build that product on top of itself."

This is the project's identity in one sentence. The loop is complete and intentional:
1. The Dredge revealed the problem — knowledge dies without a system to hold it
2. The architecture was built in response — a living document that gives any agent instant memory
3. The architecture is now being turned back on the original problem — barangay memory loss
4. The build process itself runs on the architecture — dogfooding in real time across a 4-day solo sprint

> **[ANNOTATION — Jun 28, rev 4]** The planning process itself is running on this architecture. Three AI instances (Claude, another Claude account, Gemini) are sharing the same context document simultaneously. The feasibility audit happening today is proof-of-concept for the exact use case being built. This is not a future claim. It is happening now.

**The framing that won the internal debate:**
- ~~"History preservation"~~ — sounds academic, sounds like the past, sounds like museums
- → *"Giving people the freedom to remember"* — sounds human, sounds active, sounds like community empowerment

---

## The Human Problem Underneath the Technical One

> "Loss is taken for granted and sometimes? Most people don't tell."

The grandfather didn't think his memory of the fish was worth preserving. The health worker doesn't think her case knowledge is irreplaceable. The lupon member doesn't think the dispute history in his head matters beyond his term. None of them told anyone it was leaving.

The Historical Engine is infrastructure for the things people don't think to say before it's too late.

---

## Mission Statement

> "History gives voice to the forgotten to build the present."

This is why Ala-Alab exists. Not preservation for its own sake — the past as active infrastructure for decisions being made right now.

---

## SDG Alignment

| SDG | How it fits |
|-----|-------------|
| SDG 3 — Good Health and Well-Being | Disease patterns explained by ecological and historical data — dengue clusters, leptospirosis after floods, respiratory illness near industrial corridors, all mapped against land and water history the community already holds |
| SDG 9 — Industry, Innovation & Infrastructure | Accessible AI infrastructure for communities with no budget for enterprise tools |
| SDG 11 — Sustainable Cities & Communities | Community memory that survives personnel changes, disasters, and time |
| SDG 16 — Peace, Justice & Strong Institutions | Institutional records that outlast the individuals who hold them |

Four SDGs. One mechanism. Same document.

> **[ANNOTATION — Jun 28, rev 5]** The mechanism is identical across all four: a barangay health worker tracking dengue cases doesn't know that Sitio Libis sits on an old creek bed that still floods from below — seasonal standing water, vector breeding ground, disease cluster with no apparent source. That ecological fact exists in the historical record. The health survey data exists in the health record. Ala-Alab holds both simultaneously. The connection between where water moves underground and where people get sick becomes visible. That's not archival work. That's public health infrastructure. Same argument applies to leptospirosis after floods, respiratory illness near the old industrial corridor, and LGU disaster risk planning — Log 4 of The Dredge is policy evidence for why ecological memory must be institutionalized before the next calamity, not reconstructed after.

---

## Beneficiary Hierarchy — Who Ala-Alab Serves

> **This order matters. Lead with primary. Close with secondary.**

### Primary — Barangay Community Workers
The community sector for SparkFest purposes. The heart of the pitch. The SDG case.

- Barangay secretaries and record-keepers maintaining archival documents
- Environmental monitors doing ecological field documentation
- Local historians reconstructing community narratives
- Community documentarians capturing oral testimony before it's lost

These are the people who need Ala-Alab most and can afford enterprise tools least. Zero budget. Basic devices. High stakes. The architecture fits exactly.

### Tertiary — Emergency Responders
Not the pitch focus but a powerful Q&A closer and a concrete SDG 9/11 argument.

NDRRMC, BFP, and barangay disaster risk teams entering an area blind don't know the hyperlocal flood geometry — which sitios flood first, where water pools, where old creek beds still direct water underground. That knowledge exists in oral memory and disappears with the people who hold it.

A responder with the context document before entering knows the flood geometry before they arrive. Not because someone briefed them. Because the community wrote it down.

> **[ANNOTATION — Jun 28, rev 4]** Canumay East floods from below, not just from rain — the old water table memory is still there under the concrete. The depression tracing the old creek bed in the empty lot near Victoria Village. The sitios historically cut off first. Sapang Pangitlogan-Bakaw buffering storm surge before the NLEX cut through. None of this is in any emergency response brief. All of it is in The Dredge. Ala-Alab is how it gets there before the next typhoon, not reconstructed after.

**Pitch use:** Surface in Q&A or as a closing escalation after the city hall scale argument.
> "And when the next typhoon hits Canumay East, emergency responders injecting this document know the flood geometry before they arrive. Not because someone briefed them. Because the community wrote it down."

### Secondary — City Halls and Researchers
Not the pitch focus. The scale argument. Surface in Q&A or the "what's next" moment.

> "Every local historian who has spent years reconstructing what communities forgot to write down. Every researcher who has had to file FOI requests and visit physical archives to find one document. Every city hall trying to aggregate barangay-level data that was never structured to be aggregated. Ala-Alab means they don't start from zero anymore either."

**Why they're secondary not primary for SparkFest:** City halls and researchers have more institutional access and existing tools. They are not a community sector in the SDG sense. Judges score community impact — barangay workers score higher on every SDG criterion.

**The correct pitch sequence:**
1. Barangay workers — win the room emotionally and on SDG alignment
2. City halls and researchers — expand the vision, answer the scalability question
3. Never reverse this order

> **[ANNOTATION — Jun 28, rev 4]** Barangay first because it's the easier MVP scope AND because city hall data (yearly ecological reports, official profiles) flows *down into* the barangay context document as input. City hall is both scale destination and data source. The relationship is bidirectional, not just hierarchical.

---

## Ala-Alab vs. NotebookLM

> **NotebookLM reads. Ala-Alab remembers.**

| NotebookLM does | Ala-Alab adds |
|-----------------|---------------|
| Ingests multiple sources | Erratum model — patches knowledge, doesn't just append |
| Synthesizes across sources | Structured schema — formal sections, update rules, provenance |
| Answers queries | Cross-session identity — document injects into fresh sessions as structured memory |
| Stores documents | Human curation layer — community ratifies what enters the canonical record |
| Lives on Google servers | Portability — markdown file lives on the community's device |

**NotebookLM is a tool. Ala-Alab is infrastructure.** Tools require the platform to keep existing. Infrastructure outlasts the tool that built it.

NotebookLM is better at synthesis — it's a polished Google product with a team behind it. Don't claim to beat it at its own game. The one claim that's unambiguously true and unbeatable: **a barangay health worker in a sitio with spotty signal can open a markdown file. She cannot open NotebookLM.**

> **[ANNOTATION — Jun 28, rev 4]** The cold vs. warm demo must show this distinction visibly. Asking Gemini about The Dredge's specifics without the document — creek names, NLEX date (October 2, 1966, Col. Tan, 512th Engineering Construction Battalion), the grandfather's fish — produces hallucination or hedging. These details are hyper-local and unguessable. Nobody trained Gemini on them. With the context document injected, same question answers on turn one. That contrast is the demo.

---

## Competition Constraints — Confirmed (Jun 28, 2026)

### Timeline

| Date | Activity |
|------|----------|
| Jun 28 (today) | Kick-Off — hackathon officially begins |
| Jun 29–Jul 2 | Build period — 4 days |
| Jul 2 | Elimination submission deadline |
| Jul 3–6 | Mentorship (selected teams) |
| Jul 9 | Final Pitching & Awarding |

### Elimination deliverables
- 3-minute video presentation
- One-page project document (PDF)
- Working prototype or MVP
- Public GitHub repository with active commit history

### Final pitch format
5-minute presentation + 7-minute Q&A

### Critical technical requirement
Every project must integrate at least ONE Google Technology.
**Confirmed choice:** Gemini 1.5 Pro via Google AI Studio (free tier, handles multimodal — text + images simultaneously, 1M token context window) + Firebase for document storage and upload handling.

### Fair Play
Previously completed projects are banned. The Dredge codebase cannot be resubmitted. The Dredge content — field notes, photos, oral testimonies, research — is usable as demo dataset. Building a new tool on top of existing research is explicitly allowed.

**GitHub integrity:** Commit history is verified. Regular commits across all 4 days required. Vibe coding and AI-assisted development are permitted — what matters is active development history, not manual typing.

---

## Build Plan — 5-Day Solo Sprint

> **Day boundary convention:** Days are split by sleep, not by midnight. Day 1 = Jun 28 (Kick-Off). Day 2 = Jun 29 (today). This is intentional — sleep is the natural reset, not the clock.

| Day | Date | Focus |
|-----|------|-------|
| Day 1 | Jun 28 (Sun) | Finalize Project.md → push to GitHub. Create GitHub repo. Create necessary accounts. Create Infrastructure and Human-AI Workflow Plan (R&D and Writing / File Creations and Structure / Backend and Frontend). **COMPLETE.** |
| Day 2 | Jun 29 (Mon) | Design agentic interaction of Ala-Alab. Research and design instructions.md. Draft barangay context document schema. Draft Project Brief and One-Page Document (via Canva). Research backing and R&D. Create pitch document (advert). |
| Day 3 | Jun 30 (Tue) | Build data structure and files. Design UI and basic assets (Canva + Figma). Create workable backend and frontend (Replit Agent + VS Code). Test with multiple datasets and AI agents (multiple sessions). Implement Google Auth and Vercel deployment. Refine documents and plan video presentation. |
| Day 4 | Jul 1 (Wed) | Refine and test more datasets. Add assets and design specification. Simulate with AI and user — fix kinks. Finalize documents. Organize repositories and notebooks. Plan and draft 3-minute video presentation. |
| Day 5 | Jul 2 (Thu) | Final simulation and kink fixes. Finalize repository organization. Finalize all documents. Record and submit video. Confirm submission. |

**Video strategy:** AI co-developed. Claude writes the script. Screen recording captured during Day 3 build. CapCut for editing and auto-captions.

**Key insight on Day 3:** Record demo footage while building, not after. Authentic footage of the system working in real time is stronger than a rehearsed screen recording.

---

## Tech Stack — Finalized

| Layer | Tool | Why |
|-------|------|-----|
| Frontend | React | Already built The Dredge in it — fastest stack for solo builder. Desktop web app. No Flutter. Command/display wrapper only — not a full web app layer. Handles Audit Gate UI, staging cards, approval/reject flow. |
| Bridge Script | Local Node.js/Python script | Central orchestrator. Clipboard-based handoff between agents using standardized `[FROM]/[TO]` JSON message format. Decouples agents from each other — neither talks to the other directly. The local customs officer. |
| Transit Layer | `/transit/` volatile JSON folder | Temporary courier between agent output and `context.md`. JSON is never the canonical record — it is the staging state. Atomic commit: approve → write to `context.md` → POOF (delete JSON). Fail-safe: leftover JSON on startup triggers "Pending transaction — resume or purge?" |
| AI / Conversational Interface | Gemini Flash | Friendly intake, talks to the barangay worker uploading a photo or describing what they witnessed. The face of the system. Partially denoise raw human input before passing to Claude. |
| AI / Logic & Document Maintenance | Claude (script-assisted) | Maintains the context document, writes structured narrative reports, erratum logic. Not a live API call — a lightweight script automates the paste-and-copy workflow. Sidesteps free plan rate limits entirely. Cross-references incoming intake against existing erratum log before committing. |
| AI / App Builder | Replit Agent | Scaffolds and builds the app. User directs, agent codes. Handles heavy lifting so solo builder stays in director seat. |
| Storage / Backend | Firebase | Free tier, real-time database, handles uploads, hosting provides live deployment URL |
| Auth | Google Authentication | Login for barangay workers. Low build effort, makes it feel like a real product, additional Google Technology checkbox. |
| Deployment | Vercel | Live URL for judges. Clean deployment from GitHub. |
| Packaging (post-MVP) | Tauri (preferred) or Electron | Wraps React frontend + local backend into a standalone `.exe`. Tauri preferred — lighter, Rust backend, superior file management APIs for POOF protocol. Deferred to finals. |
| Code Editor | VS Code | Review, manual edits, surgical fixes to what Replit Agent produces. |
| Research Synthesis | NotebookLM | Holds The Dredge as a notebook. Source synthesis and research backing. |
| Context format | Markdown | Open standard, human + AI readable, portable, the architecture's native format |
| Version control | GitHub | Required by competition, commit history as development proof |
| Video | CapCut + Claude script | AI co-developed, free, fast |

### Multi-Agent Workflow Map

The agents are lean and non-overlapping. Each has a defined role and a defined handoff. The user is the director — not the bottleneck.

| Input | Agent | Output | Passes To |
|-------|-------|--------|-----------|
| Raw community data (photo, voice note, field note) | Gemini Flash | Structured intake summary | Claude |
| Intake summary | Claude | Formatted context document update + erratum | Markdown file |
| Research sources + Dredge content | NotebookLM | Synthesis + research backing | Claude / user |
| Context doc + instructions.md | Replit Agent | Working app code | VS Code |
| Code review and surgical edits | VS Code | Refined codebase | GitHub → Vercel |
| Everything | Claude | instructions.md, project brief, pitch doc, script | All outputs |

**Why ChatGPT and Perplexity are excluded:** Both overlap with tools already in the stack. ChatGPT overlaps with Claude. Perplexity overlaps with NotebookLM and Claude web search. In a solo sprint, overlap creates context-switching cost without capability gain. The stack is intentionally lean — every agent has a non-overlapping role.

**Confirmed: 5 agents. No additions needed.**

---

## Denoising Law

**The two-stage filtration pipeline:**

Raw human input is never committed directly to `context.md`. It passes through two sequential denoising stages before touching the canonical record:

1. **Stage 1 — Gemini (Partial Denoise):** Receives raw input (messy field notes, voice transcriptions, oral testimony, photo descriptions). Strips conversational noise, restructures into intake summary. Passes *partially* denoised signal to Claude — does not resolve contradictions, does not decide significance.

2. **Stage 2 — Claude (Cross-Reference + Erratum Check):** Receives Gemini's intake summary. Cross-references against existing erratum log and `context.md`. If the incoming entry contradicts a flagged erratum, the AI is structurally blocked from repeating the same error — the correction is hardcoded into the active context. Only after this check does Claude propose the entry for human confirmation.

**Why this matters:** Without the erratum cross-reference in Stage 2, an AI agent starting a fresh session would confidently re-introduce previously corrected errors. The erratum log is the hallucination-loop breaker. It is not just a historical record — it is an active constraint on future writes.

**Industry parallels (for pitch backing):**
- Healthcare: Nuance DAX and Abridge strip 20-minute patient conversations to clean clinical notes
- Legal: e-discovery pipelines denoise deposition transcripts into chronological verified claim timelines
- Enterprise: Master Data Management (MDM) pipelines deduplicate contradictory records into a single source of truth

Ala-Alab differs from all three: those systems discard the noise. Ala-Alab preserves contradictions as errata — the noise becomes evidence.

---

## Offline Intake Mode — Open Gap

**Status: Flagged as missing. Not yet formalized.**

No protocol currently exists for data capture when internet access is unavailable (typhoon, power outage, remote barangay with no signal). This is a real-world failure mode for the communities Ala-Alab serves.

**Proposed approach (unconfirmed):** Cache intake to a local plain-text or markdown file in the `/transit/` folder. Flag entries as `[OFFLINE — PENDING AGENT PROCESSING]`. Re-engage Gemini/Claude agents when connectivity resumes and run normal pipeline from cached entries.

**Needs:** Formalization, erratum-model compliance check, and human annotation protocol for offline-cached entries.

> **[ANNOTATION — Jun 30, rev 7]** This gap was surfaced during Gemini session Jun 29–30. Barangay-level connectivity is unreliable. The system must not fail silently when agents are unreachable — it must degrade gracefully to local capture mode. Formalizing offline intake is a Day 4 task, not a finals deferral.

**Deferred to finals (if advancing):**
- BigQuery — search and research layer across accumulated historical records, disease pattern detection across barangays over time
- Google Maps — visualizing creek geography and flood zones
- Vertex AI — more powerful synthesis if scale demands it

**Google Technologies confirmed for elimination:** Gemini Flash + Firebase + Google Auth (three, only one required)

### The Claude script insight
The context document is maintained by a lightweight script that works with any AI — Claude, Gemini, a local model. The community isn't locked into any provider. They own the file. The AI is just the editor. This is the portability argument made visible in the tooling itself — and it's the architecture dogfooding itself.

### On environmental footprint
At hackathon scale, footprint is negligible. Gemini and Firebase run on Google Cloud — 100% renewable energy commitment. More importantly, the architecture is genuinely efficient by design: the context document reduces token usage versus naive RAG or full conversation replay. Fewer tokens per query. Less compute per useful answer. The erratum model prevents re-synthesizing the same information repeatedly. Markdown-first, portable, works-with-local-models design means zero cloud compute for communities that eventually run local models.

> *"Designed to be efficient by design, not just by accident."* — worth a line in the one-page PDF.

---

## SparkFest MVP

### ~~Initial concept (v1.0.0) — deprecated~~
~~Erratum: Token counter focus and claude.ai-only approach removed. Reason: too complex for 4-day solo build; impact argument doesn't require it; Google Technology requirement means Gemini must be the AI layer, not Claude.~~ Kept here so future sessions don't re-propose the same approach.

### Revised MVP (v1.1.0) — current

**The one flow that proves everything:**
1. Upload a field note or photo from The Dredge — real barangay content, real messy input
2. Gemini 1.5 Pro structures it into a living context document automatically
3. **Cold query** — no document. Show reconstruction effort, lost context, wasted turns. Gemini hallucinates or hedges on hyper-local details it cannot know.
4. **Warm query** — document injected. Answer on turn one.
5. Ask a synthesis question: *"What do we know about the creek system in Victoria Village?"* — watch it pull from field notes AND photos simultaneously, surface a connection neither source showed alone.

Step 5 is the Historical Engine's unique claim made visible. That's the moment that wins the room.

---

## Pitch Architecture

### Opening — The Origin Story
> "There's a tree that gave its name to my barangay. It doesn't grow there anymore. Nobody wrote it down while it was still standing. I spent three months reconstructing it from fragments — creek names, soil data, my grandfather's memory of the fish that used to live under our house. That reconstruction almost didn't exist. So I built something that makes sure it doesn't happen again."

### The Problem
Barangay history is perpetually lost, accidentally discovered, and never fully assembled. It exists in fragments. No single person or institution holds all of it at once.

Official records freeze at the moment they are written. Nobody updates them. The Barangay Profile of Canumay East still names the Kanumai tree as the barangay's landmark. The tree is gone. Nobody wrote that down.

### The Strongest Objection (and the answer)
> "You're feeding sensitive community data to Anthropic — a US company."

**Answer:** The document lives on the community's device. The AI reads it per session. Nothing is retained between sessions. Privacy through architecture, not trust.

Let them raise it. Then answer it. That's the moment you win the room.

### The Differentiator
Not AI replacing historians. AI giving communities the ability to record themselves — continuously, accurately, without needing a historian to show up. The barangay becomes its own archivist.

### Competitive Positioning

vs. UPM and other teams:
- UPM wins on polish and coordinated delivery
- You win on idea originality and personal credibility
- Nobody else is walking in with a completed prior project in the exact problem space
- Nobody else built their proof of concept from their own flooded sala

**The one-sentence contrast:**
> "Every other team is building on top of AI. I'm solving what communities lose when nobody shows up to record them."

---

## The Larger Narrative Arc

| Project | What it is |
|---------|-----------|
| The Dredge | You felt the loss. You reconstructed what was almost gone. Proof the problem is real. |
| The Architecture | You built the system. Not because a professor assigned it — because you already knew the cost of not having it. |
| SparkFest | You apply it where the loss is still happening. |
| The Thesis | You formalize it. Make it rigorous. Prove it works. |

**The throughline:** *"Memory shouldn't die with the person who holds it."*

---

## What This Is Really About

> "You're building the memory of a nation that keeps forgetting itself."

Barangay history is Manila-centric history's blind spot. The eleven creeks of Canumay East. The Kanumai tree. The fish under the house. None of it was significant enough by anyone else's measure. Your engine gives communities the infrastructure to record themselves — on their terms, in their language, owned by nobody but them.

That's SDG 9, 11, and 16. That's a hackathon pitch. That's a thesis. That's a career.

---

## Open Questions / Next Steps

### Day 1 (Jun 28) — COMPLETE
- [x] Create GitHub repo and push initial README
- [x] Get Gemini API key from ai.google.dev
- [x] Set up Firebase project
- [x] Create Infrastructure and Human-AI Workflow Plan

### Day 2 (Jun 29) — IN PROGRESS
- [ ] Design agentic interaction of Ala-Alab
- [ ] Draft barangay context document schema (feeds directly into instructions.md)
- [ ] Research and design instructions.md
- [ ] Draft Project Brief and One-Page Document (via Canva)
- [ ] Research backing and R&D
- [ ] Create pitch document (advert)

### Day 3 (Jun 30)
- [ ] Build data structure and files
- [ ] Design UI and basic assets (Canva + Figma)
- [ ] Create workable backend and frontend (Replit Agent + VS Code)
- [ ] Test with multiple datasets and AI agents (multiple sessions)
- [ ] Implement Google Auth and Vercel deployment
- [ ] Refine documents and plan video presentation

### Day 4 (Jul 1)
- [ ] Refine and test more datasets
- [ ] Add assets and design specifications
- [ ] Simulate with AI and user — fix kinks
- [ ] Finalize all documents
- [ ] Organize repositories and notebooks
- [ ] Plan and draft 3-minute video presentation
- [ ] Formalize offline intake mode protocol

### Day 5 (Jul 2)
- [ ] Final simulation and kink fixes
- [ ] Finalize repository organization for public presentation
- [ ] Finalize all documents
- [ ] Record and submit video
- [ ] Confirm submission received

### Still open
- [ ] Confirm exact submission time on July 2

---

## Errata

### v1.5.0 → v1.6.0 (Jun 30, 2026)
- Added: Hybrid system framing — Ala-Alab is explicitly a local-orchestrated, cloud-leveraged hybrid. Not a web app. Not a pure system app. Annotation added to "What Ala-Alab Actually Is" section.
- Added: Bridge Script row to Tech Stack — local orchestrator, clipboard-based, `[FROM]/[TO]` JSON message format, agent decoupling rationale.
- Added: Transit Layer row to Tech Stack — volatile JSON courier, POOF protocol, atomic commit, fail-safe for crashed commits.
- Updated: React row in Tech Stack — clarified as command/display wrapper only, Audit Gate UI, staging cards.
- Updated: Claude row in Tech Stack — added erratum log cross-reference as Stage 2 denoising function.
- Updated: Gemini Flash row in Tech Stack — added partial denoise role explicit.
- Added: Tauri/Electron row to Tech Stack — post-MVP packaging target, deferred to finals.
- Added: Denoising Law section — two-stage filtration pipeline defined. Erratum log named as active hallucination-loop breaker, not just historical record. Industry parallels included for pitch backing.
- Added: Offline Intake Mode section — flagged as open gap. No protocol yet for connectivity-down data capture. Proposed approach noted. Formalizing moved to Day 4 task list.
- Confirmed: Audit Gate and Checkpoint Protocol are the same mechanism — terminology unified across documents.

### v1.0.0 → v1.1.0 (Jun 28, 2026)
- Added: Core Philosophical Reframe section
- Added: Competition Constraints section from official guidelines PDF
- Added: Build Plan — 4-Day Solo Sprint
- Added: Tech Stack — Confirmed (Gemini 1.5 Pro + Firebase + React)
- Updated: MVP section revised — token counter dropped, synthesis query added as key demo moment. Old MVP preserved with strikethrough per erratum model.
- Updated: History-preservation framing deprecated in favor of freedom-to-remember framing — not deleted.
- Updated: Open Questions restructured as day-by-day action items
- Erratum: Submission deadline confirmed as July 2

**Self-correction within v1.1.0:** Erratum: Old MVP section was initially deleted rather than deprecated. Restored with strikethrough and rationale per the erratum model. You do not erase mistakes — you mark them, explain why they changed, and keep them visible.

### v1.2.0 → v1.3.0 (Jun 28, 2026)
- Added: Beneficiary Hierarchy section
- Added: Project Name section — Ala-Alab locked in
- Updated: Document title changed to "Project Ala-Alab — SparkFest 2026 Context"
- Updated: Tech Stack — NotebookLM added as primary synthesis engine
- Updated: Open Questions — NotebookLM vs Gemini API decision added as Day 1 task

### v1.4.0 → v1.5.0 (Jun 29, 2026)
- Updated: Build plan revised from 4-day to 5-day sprint. Day boundary convention locked — days split by sleep, not midnight. Day 1 = Jun 28 (Kick-Off, complete). Day 2 = Jun 29 (today, in progress).
- Updated: Tech stack expanded — Replit Agent added as app builder, VS Code clarified as code review and surgical edits, Vercel added as deployment target, NotebookLM added as research synthesis agent.
- Added: Multi-Agent Workflow Map — defines input, agent, output, and handoff for each tool in the stack. Explicit non-overlap rationale.
- Added: ChatGPT and Perplexity exclusion rationale — both overlap with existing stack agents. Solo sprint discipline: no additions without non-overlapping role.
- Updated: Open Questions restructured as 5-day action items. Day 1 marked complete.
- Added: Day 2 schema task — barangay context document schema must be drafted before Day 3 build begins. Feeds directly into instructions.md.
- Confirmed: Token usage on free plan is rate-limited by messages, not billed by token count. Context document cost is recovered within the first productive exchange per session. The architecture proves itself in its own use.
- Confirmed: The build process running on this document is live proof-of-concept. Meta by design.
- Added: Mission statement — "History gives voice to the forgotten to build the present."
- Added: SDG 3 — Good Health and Well-Being. Disease pattern detection via ecological + historical cross-reference. Dengue, leptospirosis, respiratory illness mapped against land and water history.
- Added: Log 4 (The Dredge) designated as policy evidence for LGU disaster risk planning and scientific response development — not just personal narrative.
- Added: Environmental footprint argument — efficient by design, not by accident. Fewer tokens, local model compatible, Google renewable energy.
- Added: Definition of Ala-Alab locked — historical data and narrative reports for archival work, barangay first, city hall as both scale destination and top-down data source.
- Added: Kanumai extinction annotation — official record says tree exists, field reality says it's gone. Proof of necessity.
- Added: Bidirectional data flow annotation — bottom up (community memory) + top down (city hall ecological reports).
- Added: Cold vs. warm demo annotation — hyper-local Dredge details Gemini cannot hallucinate.
- Added: Dogfooding annotation — three AI instances running simultaneously on this document during feasibility audit.
- Added: Emergency responder use case — tertiary beneficiary. Hyperlocal flood geometry as life-safety data for NDRRMC/BFP.
- Updated: SDG alignment expanded from 3 to 4 SDGs. Same mechanism, same document.
- Updated: Tech stack finalized — React + Gemini Flash + Firebase + Google Auth. Flutter dropped. BigQuery and Maps deferred to finals.
- Updated: Claude role clarified — script-assisted document maintenance, not live API. Portability argument made visible in tooling.
- Updated: Multi-model architecture defined — Gemini Flash for conversation, Claude for logic and document maintenance.
- Corrected: Final pitch Q&A is 15 minutes not 7.
- Confirmed: Community sector — Barangay Community Workers / LGU Records Officers.
- Confirmed: Demo dataset fair play — Dredge content as uploaded input data, not recycled codebase.
- Confirmed: Feasibility audit complete. Day 1 planning done.

