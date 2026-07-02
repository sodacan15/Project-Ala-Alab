# Project Ala-Alab Instructions & Rules
*Autonomous archival and verification engine for local history and ecological justice.*

## 👥 Who This Serves
| User Class | Primary Purpose | Scope & Access |
| :--- | :--- | :--- |
| **Thesis/Capstone Researchers** | **Primary**: Working alone to compile, clean, and cross-reference oral and official histories for field research. | Full Write/Read |
| **Research Context Officials** | **Secondary / Flagship Case Study**: Reference and maintain verified community context records. | Read-Only |
| **Local Community Elders** | **Contributors**: Share oral histories via transcripts. | Entry Submission |

---

## 🏗️ Structure Rules
1. Every historical context repository must maintain the following fixed sections in its markdown profile:
   - `## Research Context Overview` / `## Overview`
   - `## Historical Errata` / `## Erratum Log`
   - `## Pivot Log` *(New fixed section, sits alongside Erratum Log)*
   - `## Lost Creek Register` / `## Geographic Landmarks`
   - `## Oral Testimony Records`
   - `## Hyperlocal Disaster Geometry`

2. **Image Filename Integrity Rule**:
   Any entry, log, or agent output referencing an image or visual asset must state the exact filename inline (not just describe the image content)—e.g., `canal-aratilis-may2026.jpg` or `water-height-gauge.png`, not "a photo shows the water rising" or "an image of the creek". The validator will scan and reject entries referring to non-existent image filenames.

---

## 📝 Document Log Templates

### 1. Erratum Log Entry
```markdown
#### [ERR-CODE] [Subject] — YYYY-MM-DD
- **Official Claim:** [What the official city or agency records assert]
- **Ground Truth:** [The corrected reality verified through local fieldwork or archival discovery]
- **Source:** [Citations, transcripts, or data sheets proving the correction]
```

### 2. Pivot Log Entry
```markdown
#### [PIVOT] [Short pivot name] — YYYY-MM-DD
- **From:** [prior direction/scope]
- **To:** [new direction/scope]
- **Trigger:** [what caused the pivot]
- **Carried forward:** [what survives unchanged]
- **Dropped:** [what's explicitly no longer in scope, and why]
- **Document version:** [old] → [new]
```

---

## 🔍 The Auditor — API Layer
The Ala-Alab engine exposes four specialized, AI-powered endpoints designed to validate, cross-reference, query, and analyze repository contexts.

### Endpoint Protocols:
1. **`POST /api/validate`**
   - **Action**: Validates a proposed markdown entry or log update against the fixed-section schemas and required fields (e.g., date, source type, contributor name).
   - **Filename Checker**: If an image is cited, it checks if the named file exists in the repo's asset directory (`/assets/`). Returns explicit field-level error messages for malformed inputs.
   
2. **`POST /api/audit`**
   - **Action**: Scans a validated entry against the pre-loaded community corpus and existing canonical context.
   - **Verification**: Flags contradictions or structural overlap and generates proposed hot-fixes or Errata rules.
   - **Rule**: Never auto-applies modifications; all results are returned as human-in-the-loop proposals.

3. **`POST /api/query`**
   - **Action**: Natural-language question answering (Q&A) over the repository's active markdown context document (`context.md`).
   - **Output**: Synthesized answers paired with explicit cited section references.

4. **`POST /api/patterns`**
   - **Action**: Operates cross-repository to identify recurring sources, recurring contradiction categories, and informally-resurfacing topics across multiple researcher logs.
   - **Output**: Generates global cleanup proposals and organizational patterns (human confirms or rejects in UI).

---

## 📜 Changelog
- **v3.0.3** *(2026-07-01)*:
  - Pivoted primary focus to solo thesis and capstone researchers.
  - Added `## Pivot Log` fixed section and Markdown template.
  - Implemented the `The Auditor` API layer specification (four core endpoints).
  - Enforced the exact inline image filename rule.
- **v3.0.2** *(2026-06-15)*:
  - Initial structure and multi-agent roundtable (Gemini Communicator, NotebookLM Archivist, Scribe Scribe) established.
