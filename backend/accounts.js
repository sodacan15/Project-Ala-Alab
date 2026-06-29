let accounts = {
  Gemini: { connected: false, displayName: null, email: null, model: 'Gemini Flash', tab: 'gemini.google.com' },
  Claude: { connected: false, displayName: null, email: null, model: 'Claude Sonnet 4.5', tab: 'claude.ai' },
  NotebookLM: { connected: false, displayName: null, email: null, model: 'NotebookLM', tab: 'notebooklm.google.com' }
};

function getAll() {
  return accounts;
}

function getAgent(agent) {
  return accounts[agent] || null;
}

function connect(agent, displayName, email) {
  if (!accounts[agent]) return null;
  accounts[agent].connected = true;
  accounts[agent].displayName = displayName;
  accounts[agent].email = email;
  return accounts[agent];
}

function disconnect(agent) {
  if (!accounts[agent]) return null;
  accounts[agent].connected = false;
  accounts[agent].displayName = null;
  accounts[agent].email = null;
  return accounts[agent];
}

module.exports = { getAll, getAgent, connect, disconnect };
