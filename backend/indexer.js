const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const STORAGE_DIR = path.join(__dirname, 'storage');
const INDEX_FILE = path.join(STORAGE_DIR, 'corpus-index.md');

let index = { ORIGINAL: [], LINK: [], IMAGE: [] };

function ensureStorage() {
  ['files', 'links', 'images'].forEach(d => {
    const dir = path.join(STORAGE_DIR, d);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
  if (!fs.existsSync(INDEX_FILE)) {
    writeIndexFile();
  }
}

function writeIndexFile() {
  const now = new Date().toISOString().split('T')[0];
  const total = index.ORIGINAL.length + index.LINK.length + index.IMAGE.length;
  let content = `# Ala-Alab — Corpus Index\n**Last updated:** ${now} | **Total entries:** ${total}\n\n`;

  content += `## ORIGINAL Files\n| ID | Filename | Date Added | Added By | In Notebook | Description |\n|---|---|---|---|---|---|\n`;
  index.ORIGINAL.forEach(e => {
    content += `| ${e.id.slice(0,8)} | ${e.filename} | ${e.dateAdded.split('T')[0]} | ${e.addedBy} | ${e.inNotebook ? '✓' : '✗'} | ${e.description || ''} |\n`;
  });

  content += `\n## LINKS\n| ID | Title | URL | Date Accessed | Added By | In Notebook | Generated File |\n|---|---|---|---|---|---|---|\n`;
  index.LINK.forEach(e => {
    content += `| ${e.id.slice(0,8)} | ${e.title} | ${e.url} | ${e.dateAccessed.split('T')[0]} | ${e.addedBy} | ${e.inNotebook ? '✓' : '✗'} | ${e.generatedFile || ''} |\n`;
  });

  content += `\n## IMAGES\n| ID | Filename | Date Added | Added By | In Notebook | Caption |\n|---|---|---|---|---|---|\n`;
  index.IMAGE.forEach(e => {
    content += `| ${e.id.slice(0,8)} | ${e.filename} | ${e.dateAdded.split('T')[0]} | ${e.addedBy} | ${e.inNotebook ? '✓' : '✗'} | ${e.caption || ''} |\n`;
  });

  fs.writeFileSync(INDEX_FILE, content, 'utf8');
}

function getAll() {
  return index;
}

function getByType(type) {
  return index[type.toUpperCase()] || [];
}

function addEntry(data) {
  ensureStorage();
  const id = uuidv4();
  const now = new Date().toISOString();

  if (data.type === 'ORIGINAL') {
    const entry = { id, type: 'ORIGINAL', filename: data.filename, path: data.path, dateAdded: now, addedBy: data.addedBy || 'User', description: data.description || '', inNotebook: false };
    index.ORIGINAL.push(entry);
    writeIndexFile();
    return entry;
  }

  if (data.type === 'LINK') {
    const safeName = data.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 50);
    const generatedFile = `/storage/links/${safeName}.md`;
    const fullPath = path.join(STORAGE_DIR, 'links', `${safeName}.md`);
    const linkContent = `# ${data.title}\n**URL:** ${data.url}\n**Date Accessed:** ${now.split('T')[0]}\n**Notes:** ${data.notes || ''}\n\n---\n\n*Paste content here after visiting the URL.*\n`;
    fs.writeFileSync(fullPath, linkContent, 'utf8');
    const entry = { id, type: 'LINK', url: data.url, title: data.title, dateAccessed: now, addedBy: data.addedBy || 'User', notes: data.notes || '', generatedFile, inNotebook: false };
    index.LINK.push(entry);
    writeIndexFile();
    return entry;
  }

  if (data.type === 'IMAGE') {
    const metadataFile = data.path.replace(/\.[^.]+$/, '.json');
    const metadata = { id, filename: data.filename, caption: data.caption || '', dateAdded: now, addedBy: data.addedBy || 'User', linkedEntry: data.linkedEntry || null };
    const fullMetaPath = path.join(__dirname, metadataFile.replace(/^\//, ''));
    try { fs.writeFileSync(fullMetaPath, JSON.stringify(metadata, null, 2), 'utf8'); } catch(e) {}
    const entry = { id, type: 'IMAGE', filename: data.filename, path: data.path, metadataFile, dateAdded: now, addedBy: data.addedBy || 'User', caption: data.caption || '', inNotebook: false };
    index.IMAGE.push(entry);
    writeIndexFile();
    return entry;
  }

  return null;
}

function removeEntry(id) {
  let found = false;
  ['ORIGINAL', 'LINK', 'IMAGE'].forEach(type => {
    const before = index[type].length;
    index[type] = index[type].filter(e => e.id !== id);
    if (index[type].length < before) found = true;
  });
  if (found) writeIndexFile();
  return found;
}

function updateNotebook(id, inNotebook) {
  let found = false;
  ['ORIGINAL', 'LINK', 'IMAGE'].forEach(type => {
    const entry = index[type].find(e => e.id === id);
    if (entry) { entry.inNotebook = inNotebook; found = true; }
  });
  if (found) writeIndexFile();
  return found;
}

function init() {
  ensureStorage();
}

module.exports = { getAll, getByType, addEntry, removeEntry, updateNotebook, init };
