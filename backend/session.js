const { v4: uuidv4 } = require('uuid');
const { clearTransit, getLog, clearLog } = require('./transit');
const { copyText } = require('./clipboard');
const contextFileManager = require('./contextFileManager');

let currentSession = null;

function getCurrentSession() {
  return currentSession;
}

async function preResetSequence() {
  const result = { contextSaved: false, lastPromptSaved: false, lastPrompt: null };

  // Step 1 — Save context
  try {
    await contextFileManager.save();
    result.contextSaved = true;
    console.log('Context saved before reset.');
  } catch (e) {
    console.error('Context save failed:', e.message);
  }

  // Step 2 — Grab last user prompt
  const log = getLog();
  const lastUserMsg = [...log].reverse().find(m => m.from === 'User');
  if (lastUserMsg && lastUserMsg.payload && lastUserMsg.payload.content) {
    const content = lastUserMsg.payload.content;
    copyText(content, 'Last Prompt (pre-reset)');
    result.lastPromptSaved = true;
    result.lastPrompt = content.substring(0, 80);
    result.sessionId = currentSession ? currentSession.id : null;
    console.log('Last prompt saved to clipboard.');
  }

  // Step 3 — notify (returned in result)
  return result;
}

async function newSession(contextName) {
  const preReset = await preResetSequence();

  // Step 4 — clear
  clearTransit();
  clearLog();

  // Step 5 — new session
  currentSession = {
    id: uuidv4(),
    startTime: new Date().toISOString(),
    activeContext: contextName || (currentSession ? currentSession.activeContext : 'canumay-east'),
    agentStates: { Gemini: 'idle', Claude: 'idle', NotebookLM: 'idle' }
  };

  return { preReset, session: currentSession };
}

async function endSession() {
  const preReset = await preResetSequence();

  clearTransit();
  clearLog();

  const ended = { ...currentSession, endTime: new Date().toISOString() };
  currentSession = null;

  return { preReset, ended };
}

function getStatus() {
  return currentSession;
}

function setActiveContext(name) {
  if (currentSession) currentSession.activeContext = name;
}

function initSession() {
  if (!currentSession) {
    currentSession = {
      id: uuidv4(),
      startTime: new Date().toISOString(),
      activeContext: 'canumay-east',
      agentStates: { Gemini: 'idle', Claude: 'idle', NotebookLM: 'idle' }
    };
  }
}

module.exports = { getCurrentSession, preResetSequence, newSession, endSession, getStatus, setActiveContext, initSession };
