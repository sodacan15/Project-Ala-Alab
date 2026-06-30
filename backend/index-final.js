require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Import core modules
const bridge = require('./bridge');
const clipboard = require('./clipboard');
const session = require('./session');
const contextFileManager = require('./contextFileManager');
const indexer = require('./indexer');
const accounts = require('./accounts');
const { getAllTransit } = require('./transit');

// Import new v2 modules
const OAuthHandler = require('./auth/oauth-handler');
const TokenManager = require('./auth/token-manager');
const SessionManager = require('./auth/session-manager');
const AccountManager = require('./accounts/account-manager');
const AutomationEngine = require('./automation/automation-engine');
const ComplianceAuditor = require('./audit/compliance-auditor');

const createAuthRoutes = require('./auth/auth-routes');
const createAgentRoutes = require('./agents/agent-routes');
const createAutomationRoutes = require('./automation/automation-routes');
const createAuditRoutes = require('./audit/audit-routes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/storage', express.static(path.join(__dirname, 'storage')));

// Initialize managers
const sessionManager = new SessionManager();
const tokenManager = new TokenManager(process.env.ENCRYPTION_KEY || 'default-key-change-me');
const accountManager = new AccountManager(sessionManager, tokenManager);
const automationEngine = new AutomationEngine({ enabled: false });
const complianceAuditor = new ComplianceAuditor();

// Setup default automation rules
automationEngine.defineRule('Gemini', 'Claude', {
  enabled: false,
  confirmThreshold: 'manual',
  retryCount: 2,
  timeout: 30000
});
automationEngine.defineRule('Claude', 'NotebookLM', {
  enabled: false,
  confirmThreshold: 'manual',
  retryCount: 2,
  timeout: 30000
});
automationEngine.defineRule('Gemini', 'NotebookLM', {
  enabled: false,
  confirmThreshold: 'manual',
  retryCount: 2,
  timeout: 30000
});

// Multer setup
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.query.type || 'files';
    const dirs = { files: 'files', images: 'images', attachments: 'attachments' };
    cb(null, path.join(__dirname, 'storage', dirs[type] || 'files'));
  },
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: fileStorage, limits: { fileSize: 20 * 1024 * 1024 } });

const attachStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'storage', 'attachments')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'))
});
const attachUpload = multer({ storage: attachStorage, limits: { fileSize: 20 * 1024 * 1024 } });

// ─── AUTH ROUTES ───
const authRoutes = createAuthRoutes({
  oauth: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/auth/callback'
  },
  encryptionKey: process.env.ENCRYPTION_KEY || 'default-key-change-me'
});
app.use('/auth', authRoutes);

// ─── AGENT ROUTES ───
const agentRoutes = createAgentRoutes(express, sessionManager, tokenManager, contextFileManager);
app.use('/agents', agentRoutes);

// ─── AUTOMATION ROUTES ───
const automationRoutes = createAutomationRoutes(express, sessionManager, automationEngine, accountManager);
app.use('/automation', automationRoutes);

// ─── AUDIT ROUTES ───
const auditRoutes = createAuditRoutes(express, complianceAuditor);
app.use('/audit', auditRoutes);

// Bridge attachment upload
app.post('/bridge/attach', attachUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  const id = uuidv4();
  res.json({
    id,
    filename: req.file.originalname,
    storedAs: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size,
    url: `/storage/attachments/${req.file.filename}`
  });
});

// ─── BRIDGE ROUTES ───
app.post('/bridge/send', (req, res) => {
  const data = { ...req.body, timestamp: req.body.timestamp || new Date().toISOString() };
  const result = bridge.send(data);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

app.get('/bridge/transit', (req, res) => {
  res.json(bridge.getTransitMessages());
});

app.post('/bridge/confirm/:id', (req, res) => {
  const result = bridge.confirm(req.params.id);
  if (!result.success) return res.status(404).json(result);
  res.json(result);
});

app.post('/bridge/purge/:id', (req, res) => {
  const result = bridge.purge(req.params.id, req.body.reason);
  if (!result.success) return res.status(404).json(result);
  res.json(result);
});

app.post('/bridge/purge-all', (req, res) => {
  const result = bridge.purgeAllTransit(req.body.reason);
  res.json(result);
});

app.get('/bridge/log', (req, res) => {
  res.json(bridge.getMessageLog());
});

app.delete('/bridge/log', (req, res) => {
  bridge.clearMessageLog();
  res.json({ success: true });
});

// ─── SESSION ROUTES ───
app.post('/session/new', async (req, res) => {
  const result = await session.newSession(req.body.contextName);
  res.json(result);
});

app.delete('/session/current', async (req, res) => {
  const result = await session.endSession();
  res.json(result);
});

app.get('/session/status', (req, res) => {
  const status = session.getStatus();
  res.json(status || { active: false });
});

app.get('/session/last-prompt', (req, res) => {
  const log = bridge.getMessageLog();
  const lastUserMsg = [...log].reverse().find(m => m.from === 'User');
  if (!lastUserMsg) return res.json({ found: false });
  res.json({ found: true, content: lastUserMsg.payload?.content });
});

// ─── CLIPBOARD ROUTES ───
app.post('/clipboard/copy', (req, res) => {
  const log = bridge.getMessageLog();
  const transit = getAllTransit();
  const all = [...log, ...transit];
  const msg = all.find(m => m.id === req.body.messageId);
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  const result = clipboard.copyMessage(msg);
  res.json(result);
});

app.post('/clipboard/copy-text', (req, res) => {
  const result = clipboard.copyText(req.body.text, req.body.label);
  res.json(result);
});

app.get('/clipboard/current', (req, res) => {
  res.json(clipboard.getCurrent() || { empty: true });
});

app.delete('/clipboard/clear', (req, res) => {
  clipboard.clear();
  res.json({ success: true });
});

// ─── CONTEXT ROUTES ───
app.get('/contexts', (req, res) => {
  res.json(contextFileManager.listContexts());
});

app.get('/contexts/current', (req, res) => {
  const content = contextFileManager.readCurrentContext();
  res.json({ filename: contextFileManager.getCurrentContextName(), content: content || '' });
});

app.post('/contexts/new', async (req, res) => {
  const { name, scope, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const preReset = await session.preResetSequence();
  const filename = contextFileManager.createContext(name, scope || 'Barangay', description || '');
  const newSessionResult = await session.newSession(filename.replace('.md', ''));
  session.setActiveContext(filename.replace('.md', ''));

  indexer.addEntry({
    type: 'ORIGINAL',
    filename,
    path: `/contexts/${filename}`,
    addedBy: 'System',
    description: `Context file: ${name}`
  });

  res.json({ created: true, filename, sessionId: newSessionResult.session.id, contextSaved: preReset.contextSaved });
});

app.post('/contexts/update', (req, res) => {
  const { entry, category } = req.body;
  if (!entry) return res.status(400).json({ error: 'Entry required' });
  const ok = contextFileManager.appendEntry(entry, category);
  res.json({ success: ok });
});

app.post('/contexts/append-entry', (req, res) => {
  const { content, sourceTag, contributor, dateOfObservation, significance, sensitive, section, note } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  const ok = contextFileManager.appendFormattedEntry({ content, sourceTag, contributor, dateOfObservation, significance, sensitive, section, note });
  res.json({ success: ok });
});

app.get('/contexts/:name', (req, res) => {
  const content = contextFileManager.readContext(req.params.name);
  if (!content) return res.status(404).json({ error: 'Not found' });
  res.json({ filename: req.params.name, content });
});

app.put('/contexts/:name/save', (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  const ok = contextFileManager.writeContext(req.params.name, content);
  if (!ok) return res.status(400).json({ error: 'Invalid filename' });
  res.json({ success: true });
});

// ─── SESSION PRIMER ───
const AGENT_INSTRUCTION_FILES = {
  Gemini: 'instruction-gemini.md',
  Claude: 'instruction-claude.md',
  NotebookLM: 'instruction-notebooklm.md',
};
const GUIDEBOOK_DIR = path.join(__dirname, '..', 'AgentGuidebook');
const GENERAL_INSTRUCTION_FILE = path.join(GUIDEBOOK_DIR, 'instruction-general.md');

app.get('/session/primer/:agent', (req, res) => {
  const agentKey = req.params.agent;
  const instrFile = AGENT_INSTRUCTION_FILES[agentKey];
  if (!instrFile) return res.status(404).json({ error: 'Unknown agent' });

  try {
    const instrPath = path.join(GUIDEBOOK_DIR, instrFile);
    const generalPath = GENERAL_INSTRUCTION_FILE;
    const instrContent = fs.existsSync(instrPath) ? fs.readFileSync(instrPath, 'utf8') : '';
    const generalContent = fs.existsSync(generalPath) ? fs.readFileSync(generalPath, 'utf8') : '';
    const ctx = contextFileManager.readCurrentContext();
    const contextContent = ctx?.content || '';
    const contextFile = ctx?.filename || 'context.md';

    const primer = [
      `# Ala-Alab Session Primer — ${agentKey}`,
      `# Generated: ${new Date().toISOString()}`,
      ``,
      `---`,
      `## GENERAL PROTOCOL`,
      ``,
      generalContent.trim(),
      ``,
      `---`,
      `## YOUR LANE — ${agentKey.toUpperCase()} INSTRUCTIONS`,
      ``,
      instrContent.trim(),
      ``,
      `---`,
      `## ACTIVE COMMUNITY MEMORY DOCUMENT (${contextFile})`,
      ``,
      contextContent.trim(),
      ``,
      `---`,
      `# END OF PRIMER`,
      `# You are now loaded. Wait for the first Bridge message.`,
    ].join('\n');

    res.json({ agent: agentKey, primer, contextFile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── INDEXER ROUTES ───
app.get('/indexer', (req, res) => {
  res.json(indexer.getAll());
});

app.post('/indexer/add', upload.single('file'), (req, res) => {
  let data = req.body;
  if (req.file) {
    const type = req.query.type || 'ORIGINAL';
    if (type === 'IMAGE') {
      data = { type: 'IMAGE', filename: req.file.filename, path: `/storage/images/${req.file.filename}`, caption: req.body.caption || '', addedBy: req.body.addedBy || 'User' };
    } else {
      data = { type: 'ORIGINAL', filename: req.file.filename, path: `/storage/files/${req.file.filename}`, description: req.body.description || '', addedBy: req.body.addedBy || 'User' };
    }
  }
  const entry = indexer.addEntry(data);
  if (!entry) return res.status(400).json({ error: 'Invalid entry type' });
  res.json(entry);
});

app.post('/indexer/:id', (req, res) => {
  const ok = indexer.updateNotebook(req.params.id, req.body.inNotebook);
  res.json({ success: ok });
});

app.delete('/indexer/:id', (req, res) => {
  const ok = indexer.removeEntry(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

app.get('/indexer/:type', (req, res) => {
  const entries = indexer.getByType(req.params.type);
  res.json(entries);
});

// ─── ACCOUNTS ROUTES ───
app.get('/accounts', (req, res) => {
  res.json(accounts.getAll());
});

app.post('/accounts/:agent/connect', (req, res) => {
  const result = accounts.connect(req.params.agent, req.body.displayName, req.body.email);
  if (!result) return res.status(404).json({ error: 'Agent not found' });
  res.json(result);
});

app.delete('/accounts/:agent/disconnect', (req, res) => {
  const result = accounts.disconnect(req.params.agent);
  if (!result) return res.status(404).json({ error: 'Agent not found' });
  res.json(result);
});

app.get('/accounts/:agent/status', (req, res) => {
  const result = accounts.getAgent(req.params.agent);
  if (!result) return res.status(404).json({ error: 'Agent not found' });
  res.json(result);
});

// ─── HEALTH CHECK ───
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '2.0' });
});

// ─── STARTUP ───
function startup() {
  contextFileManager.ensureSeedContext();
  indexer.init();

  const pending = getAllTransit();
  if (pending.length > 0) {
    console.log(`Pending transactions detected. Frontend will prompt user.`);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n╔════════════════════════════════════════════════════════╗`);
    console.log(`║  🌍 Ala-Alab Backend v2.0 Running                        ║`);
    console.log(`║  📍 http://localhost:${PORT}                              ║`);
    console.log(`║  ✅ OAuth: ${process.env.GOOGLE_CLIENT_ID ? 'Enabled' : 'Disabled (configure .env)'}           ║`);
    console.log(`║  🤖 AI Agents: Claude, Gemini, NotebookLM            ║`);
    console.log(`║  🛍 Dock System: Enabled                                 ║`);
    console.log(`║  💧 Automation: Available (user-controlled)          ║`);
    console.log(`║  ✅ Compliance: AgentGuidebook v3.0.2 FULL            ║`);
    console.log(`╚════════════════════════════════════════════════════════╝\n`);
  });
}

startup();
