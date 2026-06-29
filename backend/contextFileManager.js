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
  return scaffold('Canumay East', 'Barangay', 'Seed context for Canumay East barangay community memory');
}

function writeContext(filename, content) {
  if (!filename || !content) return false;
  const safe = path.basename(filename);
  if (!safe.endsWith('.md')) return false;
  const filepath = path.join(CONTEXTS_DIR, safe);
  const today = new Date().toISOString().split('T')[0];
  let updated = content;
  if (/\*\*Last updated:\*\*/.test(updated)) {
    updated = updated.replace(/\*\*Last updated:\*\* \S+/, `**Last updated:** ${today}`);
  }
  fs.writeFileSync(filepath, updated, 'utf8');
  return true;
}

module.exports = {
  listContexts, readContext, readCurrentContext, createContext,
  appendEntry, appendFormattedEntry, save, writeContext, ensureSeedContext,
  getCurrentContextName, setActiveContext, sanitizeName
};
