const fs = require('fs');
const path = require('path');

const PENDING_DIR = path.join(__dirname, 'storage', 'pending');

function ensureDir() {
  if (!fs.existsSync(PENDING_DIR)) fs.mkdirSync(PENDING_DIR, { recursive: true });
}

function saveMessage(msg) {
  ensureDir();
  const id = msg.id;
  const jsonPath = path.join(PENDING_DIR, `${id}.json`);
  const mdPath = path.join(PENDING_DIR, `${id}.md`);
  try {
    fs.writeFileSync(jsonPath, JSON.stringify(msg, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write pending json', err);
  }

  // Create a readable markdown export for easy copy/download
  const header = `# Pending Message — ${id}\n\n`;
  const meta = `- from: ${msg.from}\n- to: ${msg.to}\n- type: ${msg.type}\n- status: ${msg.status}\n- timestamp: ${msg.timestamp}\n\n`;
  const payload = msg.payload && msg.payload.content ? msg.payload.content : JSON.stringify(msg.payload || {}, null, 2);
  const md = [header, meta, '---\n\n', payload].join('');
  try {
    fs.writeFileSync(mdPath, md, 'utf8');
  } catch (err) {
    console.error('Failed to write pending md', err);
  }
}

function removeMessage(id) {
  ensureDir();
  const jsonPath = path.join(PENDING_DIR, `${id}.json`);
  const mdPath = path.join(PENDING_DIR, `${id}.md`);
  try {
    if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
    if (fs.existsSync(mdPath)) fs.unlinkSync(mdPath);
  } catch (err) {
    console.error('Failed to remove pending files', err);
  }
}

function loadAll() {
  ensureDir();
  const files = fs.readdirSync(PENDING_DIR).filter(f => f.endsWith('.json'));
  const out = [];
  for (const f of files) {
    try {
      const json = fs.readFileSync(path.join(PENDING_DIR, f), 'utf8');
      const obj = JSON.parse(json);
      out.push(obj);
    } catch (err) {
      console.error('Failed to load pending file', f, err);
    }
  }
  return out;
}

function getMessage(id) {
  ensureDir();
  const jsonPath = path.join(PENDING_DIR, `${id}.json`);
  if (!fs.existsSync(jsonPath)) return null;
  try {
    const json = fs.readFileSync(jsonPath, 'utf8');
    return JSON.parse(json);
  } catch (err) {
    console.error('Failed to read pending message', id, err);
    return null;
  }
}

function list() {
  ensureDir();
  const files = fs.readdirSync(PENDING_DIR).filter(f => f.endsWith('.json'));
  return files.map(f => {
    try {
      const json = fs.readFileSync(path.join(PENDING_DIR, f), 'utf8');
      const obj = JSON.parse(json);
      return { id: obj.id, from: obj.from, to: obj.to, type: obj.type, status: obj.status, timestamp: obj.timestamp };
    } catch (err) {
      return null;
    }
  }).filter(Boolean);
}

function getMdPath(id) {
  ensureDir();
  return path.join(PENDING_DIR, `${id}.md`);
}

module.exports = { saveMessage, removeMessage, loadAll, getMessage, list, getMdPath };
