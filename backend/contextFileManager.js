const fs = require('fs');
const path = require('path');

const CONTEXTS_DIR = path.join(__dirname, 'contexts');

function sanitizeName(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function scaffold(name, scope, description) {
  const now = new Date().toISOString();
  const date = now.split('T')[0];
  return `# ${name} — Ala-Alab Context Document
**Scope:** ${scope}
**Description:** ${description}
**Version:** 1.0.0 | **Created:** ${date} | **Last updated:** ${date}

---

## Identity & Metadata

- **Barangay/Unit:** ${name}
- **Scope:** ${scope}
- **Created by:** Ala-Alab system
- **Date initialized:** ${date}

---

## Active Threads

*No active threads.*

---

## Ecological Records

*No entries yet.*

---

## Community & Oral History

*No entries yet.*

---

## Official Records

*No entries yet.*

---

## Infrastructure & Policy Friction

*No entries yet.*

---

## Cross-Reference Flags

*No entries yet.*

---

## Human Annotations

*No annotations yet.*

---

## Erratum Log

*No errata.*

---

## Session History

*Session history will be logged here after each session.*
`;
}

function listContexts() {
  if (!fs.existsSync(CONTEXTS_DIR)) fs.mkdirSync(CONTEXTS_DIR, { recursive: true });
  return fs.readdirSync(CONTEXTS_DIR).filter(f => f.endsWith('.md'));
}

function readContext(filename) {
  const filepath = path.join(CONTEXTS_DIR, filename);
  if (!fs.existsSync(filepath)) return null;
  return fs.readFileSync(filepath, 'utf8');
}

let activeContext = 'canumay-east.md';

function getCurrentContextName() { return activeContext; }
function setActiveContext(filename) { activeContext = filename; }
function readCurrentContext() { return readContext(activeContext); }

function createContext(name, scope, description) {
  if (!fs.existsSync(CONTEXTS_DIR)) fs.mkdirSync(CONTEXTS_DIR, { recursive: true });
  const filename = sanitizeName(name) + '.md';
  const filepath = path.join(CONTEXTS_DIR, filename);
  fs.writeFileSync(filepath, scaffold(name, scope, description), 'utf8');
  activeContext = filename;
  return filename;
}

// Write a properly formatted entry block appended to the context file
function appendFormattedEntry({ content, sourceTag, contributor, dateOfObservation, significance, sensitive, section, note }) {
  const filepath = path.join(CONTEXTS_DIR, activeContext);
  if (!fs.existsSync(filepath)) return false;

  const today = new Date().toISOString().split('T')[0];
  const title = content.substring(0, 60).replace(/\n/g, ' ').trim() + (content.length > 60 ? '…' : '');
  const sensitiveFlag = sensitive ? '\n- **⚠ Sensitive:** `[SENSITIVE — PENDING REVIEW]`' : '';

  const entryBlock = `
#### ${title}
- **Date of observation:** ${dateOfObservation || today}
- **Date of submission:** ${today}
- **Source type:** ${sourceTag || '[ORAL]'}
- **Data flow direction:** Bottom-up
- **Contributor:** ${contributor || 'User'}
- **Content:** ${content}
- **Significance:** ${significance || 'Community-relevant'}${sensitiveFlag}
- **Linked entries:** —
${note ? `> Note: ${note}` : ''}
`;

  // Try to insert under the right section heading
  let fileContent = fs.readFileSync(filepath, 'utf8');
  const sectionHeader = `## ${section || 'Community & Oral History'}`;
  const sectionIndex = fileContent.indexOf(sectionHeader);

  if (sectionIndex !== -1) {
    // Find end of section (next ## heading or end of file)
    const afterSection = fileContent.indexOf('\n## ', sectionIndex + sectionHeader.length);
    const insertPoint = afterSection !== -1 ? afterSection : fileContent.length;
    fileContent = fileContent.slice(0, insertPoint) + '\n' + entryBlock + fileContent.slice(insertPoint);
  } else {
    // Append at end
    fileContent += '\n' + entryBlock;
  }

  // Update Last updated timestamp
  fileContent = fileContent.replace(/\*\*Last updated:\*\* \S+/, `**Last updated:** ${today}`);
  fs.writeFileSync(filepath, fileContent, 'utf8');
  return true;
}

// Simple append (used by /contexts/update route for manual writes)
function appendEntry(entry, category) {
  return appendFormattedEntry({
    content: entry,
    sourceTag: category || '[ORAL]',
    contributor: 'User',
    section: 'Community & Oral History'
  });
}

async function save() {
  const filepath = path.join(CONTEXTS_DIR, activeContext);
  if (!fs.existsSync(filepath)) return;
  const content = fs.readFileSync(filepath, 'utf8');
  const today = new Date().toISOString().split('T')[0];
  const updated = content.replace(/\*\*Last updated:\*\* \S+/, `**Last updated:** ${today}`);
  fs.writeFileSync(filepath, updated, 'utf8');
}

function ensureSeedContext() {
  if (!fs.existsSync(CONTEXTS_DIR)) fs.mkdirSync(CONTEXTS_DIR, { recursive: true });
  const seedPath = path.join(CONTEXTS_DIR, 'canumay-east.md');
  if (!fs.existsSync(seedPath)) {
    const seedContent = buildCanumayEastSeed();
    fs.writeFileSync(seedPath, seedContent, 'utf8');
  }
}

function buildCanumayEastSeed() {
  return `# Canumay East — Ala-Alab Context Document
**Scope:** Barangay
**Description:** Living community memory document for Canumay East, Valenzuela City. Reconstructed from field walks, oral testimony, barangay archives, and academic sources.
**Version:** 1.6.0 | **Created:** 2026-04-01 | **Last updated:** 2026-06-29

---

## Identity & Metadata

- **Barangay:** Canumay East
- **City:** Valenzuela City, Metro Manila, Philippines
- **Named after:** The Kanumai tree (*Kleinhovia hospita*) — a tree no longer found in the barangay
- **Scope:** Barangay
- **Primary documentarian:** CS student, PUP — Valenzuela City
- **Documentation period:** April–June 2026 (The Dredge project)

> [HUMAN NOTE — 2026-06-28]: The official Barangay Profile names the Kanumai tree as the barangay's landmark. It does not say it's gone. The user discovered the extinction through three months of solo fieldwork. This gap — between what the official record says and what is true on the ground — is exactly why Ala-Alab needs to exist.

---

## Active Threads

#### The Kanumai Tree — Extinction Verification Pending
- **Status:** Open — oral testimony suggests extinction, no official acknowledgment
- **Action needed:** Cross-reference with Valenzuela City yearly ecological report + BFP botanical records
- **Opened:** 2026-06-28

#### Creek Name Documentation — Incomplete
- **Status:** Active — eleven creeks identified by name, ecological reconstruction ongoing
- **Action needed:** Field walk to verify remaining creek beds, oral testimony from Sitio Libis elders
- **Opened:** 2026-06-28

---

## Ecological Records

#### The Eleven Creeks of Canumay East — Reconstruction
- **Date of observation:** 2026-04-01 to 2026-06-28 (ongoing)
- **Date of submission:** 2026-06-28
- **Source type:** [FIELD] + [ORAL] + [SECONDARY]
- **Data flow direction:** Bottom-up
- **Contributor:** CS student documentarian + unnamed grandfather (oral source)
- **Content:** Eleven creek systems once defined the water ecology of Canumay East. None are intact. Creek names preserve the ecological memory that formal surveys missed: *Sapang Pangitlogan-Bakaw* (mangrove nesting ground), *Sapang Bangka-bangka* (navigable by small boat), *Sapang Pulo* (island creek). These names are biological observations written in Tagalog by people who lived beside the water.
- **Significance:** Ecological / Historical
- **Linked entries:** NLEX Construction Impact, The Kanumai Tree extinction

#### NLEX Construction and Ecological Disruption — 1966
- **Date of observation:** October 2, 1966 (construction date)
- **Date of submission:** 2026-06-28
- **Source type:** [OFFICIAL] + [SECONDARY]
- **Data flow direction:** Top-down
- **Contributor:** Historical record — 512th Engineering Construction Battalion, Col. Tan
- **Content:** NLEX (North Luzon Expressway) construction began October 2, 1966. The highway cut through the wetland ecology of what is now Canumay East, severing Sapang Pangitlogan-Bakaw from its upstream watershed. The wetland that buffered storm surge was eliminated. The barangay now floods from below — old creek beds still direct water underground along the original drainage paths.
- **Significance:** Ecological / Disaster
- **Linked entries:** The Eleven Creeks, Flooding from Below

#### Flooding from Below — Subsurface Water Memory
- **Date of observation:** 2026-06-28 (field walk + oral confirmation)
- **Date of submission:** 2026-06-28
- **Source type:** [FIELD] + [ORAL]
- **Data flow direction:** Bottom-up
- **Contributor:** CS student documentarian + Sitio Libis resident
- **Content:** Canumay East floods from below, not only from rain. The depression tracing the old creek bed in the empty lot near Victoria Village confirms the old water table memory is still active under the concrete. Sitios historically cut off first follow the original creek geometry. No emergency response brief documents this. Oral testimony from Sitio Libis residents confirms the pattern has been consistent for decades.
- **Significance:** Disaster / Ecological
- **Linked entries:** The Eleven Creeks, NLEX Construction

---

## Community & Oral History

#### The Grandfather's Fish — Oral Ecological Memory
- **Date of observation:** Estimated 1950s–1970s
- **Date of submission:** 2026-06-28
- **Source type:** [ORAL]
- **Data flow direction:** Bottom-up
- **Contributor:** Unnamed grandfather of documentarian (oral testimony, June 2026)
- **Content:** An elder's memory of fish living under the house — species that required the creek depth and water quality that preceded NLEX construction. The elder did not think this memory was worth preserving. Nobody told anyone it was leaving. The fish species have not been identified formally. The memory is the only surviving record.
- **Significance:** Ecological / Historical
- **Linked entries:** The Eleven Creeks, Sapang Bangka-bangka

> [HUMAN NOTE — 2026-06-28]: "The grandfather didn't think his memory of the fish was worth preserving. None of them told anyone it was leaving." This is the human problem underneath the technical one — and why Ala-Alab exists.

#### The Kanumai Tree — Ecological Extinction
- **Date of observation:** 2026-05-15 (field walk confirmation)
- **Date of submission:** 2026-06-28
- **Source type:** [FIELD] + [ORAL]
- **Data flow direction:** Bottom-up
- **Contributor:** CS student documentarian (field walk) + barangay worker (oral)
- **Content:** The Kanumai tree (*Kleinhovia hospita*) gave Canumay its name. It is no longer present in the barangay. Three field walks and botanical cross-referencing confirmed absence. The official Barangay Profile still lists it as the barangay landmark. The record froze at the moment it was written. No mechanism existed to update it.
- **Significance:** Ecological / Historical
- **Linked entries:** Official Barangay Profile (erratum pending)

---

## Official Records

#### Barangay Profile of Canumay East — Retrieved from Archives
- **Date of observation:** Original publication date unknown
- **Date of submission:** 2026-06-28
- **Source type:** [OFFICIAL]
- **Data flow direction:** Top-down
- **Contributor:** Barangay Hall archives, retrieved in person by documentarian
- **Content:** The physical Barangay Profile was the single most important primary source in the entire Dredge reconstruction. It names the Kanumai tree as the barangay's landmark. It does not indicate the tree is gone. It does not mention the eleven creeks by name. It was the only document in the archive.
- **Significance:** Historical / Policy
- **Linked entries:** The Kanumai Tree extinction, The Eleven Creeks

---

## Infrastructure & Policy Friction

#### Official Landmark vs. Field Reality — The Kanumai Tree
- **Official position:** The Kanumai tree is listed as Canumay East's barangay landmark — [OFFICIAL, Barangay Profile, date unknown]
- **Ground truth:** The tree is no longer present in the barangay — [FIELD, documentarian, 2026-05-15]
- **Contradiction type:** Frozen official record vs. ground-truth extinction
- **Status:** Unresolved — flagged for human review and barangay council acknowledgment
- **Implication:** Emergency response and ecological planning based on the official record will reference a landmark that does not exist. Any FOI-based research will reproduce the error.

---

## Cross-Reference Flags

> [CROSS-REF]: Flooding from Below → Valenzuela City Yearly Ecological Reports → ## City Ecological Reports.
> Relationship: expands. Hydrological data from city reports may confirm the subsurface creek geometry.
> Scope direction: Barangay → City Hall.

> [CROSS-REF]: The Eleven Creeks → Soil Classification Maps (FOI) → ## Ecological Records.
> Relationship: corroborates. Soil type boundaries align with former creek beds.
> Scope direction: Lateral.

---

## Human Annotations

> [HUMAN NOTE — 2026-06-28 — CS student documentarian]: "I built an architecture from a project where I could've used it — and used that architecture to build that product on top of itself." The Dredge proved the problem. Ala-Alab is the counter-system.

> [HUMAN NOTE — 2026-06-28 — CS student documentarian]: This document is the proof-of-concept corpus. The Dredge's findings — creek names, NLEX date, the grandfather's fish, the Kanumai tree — are hyper-local and unguessable from general knowledge. Inject this document into any fresh AI session and it answers on turn one. That's the demo.

---

## Erratum Log

*No errata filed. This is a reconstructed document — all entries carry original provenance.*

---

## Session History

#### Session — 2026-06-28
- **Scope:** Barangay
- **Mode:** Mixed (Intake + Maintenance + Query)
- **Added:** Eleven Creeks, NLEX Construction, Flooding from Below, Grandfather's Fish, Kanumai Tree, Barangay Profile, Policy Friction entry
- **Version:** 1.0.0 → 1.6.0
- **Note:** Initial population from The Dredge project. Documentarian is the builder. The system is running on itself.
`;
}

module.exports = {
  listContexts, readContext, readCurrentContext, createContext,
  appendEntry, appendFormattedEntry, save, ensureSeedContext,
  getCurrentContextName, setActiveContext, sanitizeName
};
