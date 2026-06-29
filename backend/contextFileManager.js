const fs = require('fs');
const path = require('path');

const CONTEXTS_DIR = path.join(__dirname, 'contexts');

function sanitizeName(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function scaffold(name, scope, description) {
  const now = new Date().toISOString();
  return `# ${name} — Ala-Alab Context Document
**Scope:** ${scope}
**Description:** ${description}
**Version:** 1.0.0 | **Created:** ${now} | **Last updated:** ${now}

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

function getCurrentContextName() {
  return activeContext;
}

function setActiveContext(filename) {
  activeContext = filename;
}

function readCurrentContext() {
  return readContext(activeContext);
}

function createContext(name, scope, description) {
  if (!fs.existsSync(CONTEXTS_DIR)) fs.mkdirSync(CONTEXTS_DIR, { recursive: true });
  const filename = sanitizeName(name) + '.md';
  const filepath = path.join(CONTEXTS_DIR, filename);
  fs.writeFileSync(filepath, scaffold(name, scope, description), 'utf8');
  activeContext = filename;
  return filename;
}

function appendEntry(entry, category) {
  const filepath = path.join(CONTEXTS_DIR, activeContext);
  if (!fs.existsSync(filepath)) return false;
  const now = new Date().toISOString();
  const addition = `\n### Entry ${now}\n**Category:** ${category || 'General'}\n\n${entry}\n`;
  fs.appendFileSync(filepath, addition, 'utf8');
  return true;
}

async function save() {
  const filepath = path.join(CONTEXTS_DIR, activeContext);
  if (!fs.existsSync(filepath)) return;
  const content = fs.readFileSync(filepath, 'utf8');
  const now = new Date().toISOString();
  const updated = content.replace(/\*\*Last updated:\*\* [^\n|]+/, `**Last updated:** ${now}`);
  fs.writeFileSync(filepath, updated, 'utf8');
}

function ensureSeedContext() {
  if (!fs.existsSync(CONTEXTS_DIR)) fs.mkdirSync(CONTEXTS_DIR, { recursive: true });
  const seedPath = path.join(CONTEXTS_DIR, 'canumay-east.md');
  if (!fs.existsSync(seedPath)) {
    fs.writeFileSync(seedPath, scaffold('Canumay East', 'Barangay', 'Seed context for Canumay East barangay community memory'), 'utf8');
  }
}

module.exports = { listContexts, readContext, readCurrentContext, createContext, appendEntry, save, ensureSeedContext, getCurrentContextName, setActiveContext, sanitizeName };
