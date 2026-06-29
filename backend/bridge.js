const { addToTransit, confirmMessage, purgeMessage, purgeAll, getTransit, getLog, clearLog } = require('./transit');
const { copyMessage, formatBlock } = require('./clipboard');
const contextFileManager = require('./contextFileManager');

const VALID_AGENTS = ['User', 'Gemini', 'Claude', 'NotebookLM'];
const VALID_TYPES = ['raw_input', 'intake_summary', 'corpus_query', 'proposed_entry', 'corpus_report', 'context_update', 'confirmation', 'error'];

const SENSITIVE_KEYWORDS = ['health', 'medical', 'disease', 'case', 'legal', 'lupon', 'dispute', 'minor', 'financial', 'income', 'debt'];

function detectSensitive(content) {
  if (!content) return false;
  const lower = content.toLowerCase();
  return SENSITIVE_KEYWORDS.some(k => lower.includes(k));
}

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
  if (errors.length > 0) return { success: false, errors };

  // Auto-detect sensitive content if not already flagged
  if (data.payload && !data.payload.sensitive) {
    data.payload.sensitive = detectSensitive(data.payload.content);
  }

  const message = addToTransit(data);
  const formatted = formatBlock(message);
  return { success: true, message, formatted };
}

function confirm(id) {
  const msg = confirmMessage(id);
  if (!msg) return { success: false, error: 'Message not found' };

  // POOF protocol: proposed_entry and context_update → write to context.md
  if ((msg.type === 'proposed_entry' || msg.type === 'context_update') && msg.payload?.content) {
    const section = sectionFromTag(msg.payload.source_tag, msg.payload.section);
    contextFileManager.appendFormattedEntry({
      content: msg.payload.content,
      sourceTag: msg.payload.source_tag || '[ORAL]',
      contributor: msg.payload.contributor || 'User',
      dateOfObservation: msg.payload.dateOfObservation || new Date().toISOString().split('T')[0],
      significance: msg.payload.significance || '',
      sensitive: msg.payload.sensitive || false,
      section,
      from: msg.from,
      note: msg.payload.note || ''
    });
  }

  return { success: true, message: msg };
}

function sectionFromTag(tag, explicit) {
  if (explicit) return explicit;
  if (!tag) return 'Community & Oral History';
  if (tag === '[FIELD]') return 'Ecological Records';
  if (tag === '[OFFICIAL]' || tag === '[POLICY]') return 'Official Records';
  if (tag === '[SYNTHESIS]') return 'Cross-Reference Flags';
  return 'Community & Oral History';
}

function purge(id, reason) {
  const msg = purgeMessage(id, reason || 'User rejected');
  if (!msg) return { success: false, error: 'Message not found' };
  return { success: true, message: msg };
}

function purgeAllTransit(reason) {
  const msgs = purgeAll(reason || 'Purge all');
  return { success: true, purged: msgs.length };
}

function getTransitMessages() { return getTransit(); }
function getMessageLog() { return getLog(); }
function clearMessageLog() { clearLog(); }

module.exports = { send, confirm, purge, purgeAllTransit, getTransitMessages, getMessageLog, clearMessageLog };
