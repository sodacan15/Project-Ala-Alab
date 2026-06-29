const { addToTransit, confirmMessage, purgeMessage, getTransit, getLog, clearLog } = require('./transit');
const { copyMessage, formatBlock } = require('./clipboard');

const VALID_AGENTS = ['User', 'Gemini', 'Claude', 'NotebookLM'];
const VALID_TYPES = ['raw_input', 'intake_summary', 'corpus_query', 'proposed_entry', 'corpus_report', 'context_update', 'confirmation', 'error'];

function validateMessage(data) {
  const errors = [];
  if (!data.from) errors.push('Missing field: from');
  if (!data.to) errors.push('Missing field: to');
  if (!data.type) errors.push('Missing field: type');
  if (!data.timestamp) errors.push('Missing field: timestamp');
  if (data.from && !VALID_AGENTS.includes(data.from)) errors.push(`Invalid from: ${data.from}`);
  if (data.to && !VALID_AGENTS.includes(data.to)) errors.push(`Invalid to: ${data.to}`);
  if (data.type && !VALID_TYPES.includes(data.type)) errors.push(`Invalid type: ${data.type}`);
  return errors;
}

function send(data) {
  const errors = validateMessage(data);
  if (errors.length > 0) {
    return { success: false, errors };
  }
  const message = addToTransit(data);
  const formatted = formatBlock(message);
  return { success: true, message, formatted };
}

function confirm(id) {
  const msg = confirmMessage(id);
  if (!msg) return { success: false, error: 'Message not found' };
  return { success: true, message: msg };
}

function purge(id, reason) {
  const msg = purgeMessage(id, reason || 'User rejected');
  if (!msg) return { success: false, error: 'Message not found' };
  return { success: true, message: msg };
}

function getTransitMessages() {
  return getTransit();
}

function getMessageLog() {
  return getLog();
}

function clearMessageLog() {
  clearLog();
}

module.exports = { send, confirm, purge, getTransitMessages, getMessageLog, clearMessageLog };
