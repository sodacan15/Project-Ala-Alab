let clipboardBuffer = null;

function copyMessage(message) {
  const formatted = formatBlock(message);
  clipboardBuffer = {
    type: 'message',
    messageId: message.id,
    content: formatted,
    raw: message,
    savedAt: new Date().toISOString(),
    label: `[${message.from}] → [${message.to}]`
  };
  return clipboardBuffer;
}

function copyText(text, label) {
  clipboardBuffer = {
    type: 'text',
    content: text,
    savedAt: new Date().toISOString(),
    label: label || 'Text'
  };
  return clipboardBuffer;
}

function getCurrent() {
  return clipboardBuffer;
}

function clear() {
  clipboardBuffer = null;
}

function formatBlock(message) {
  const p = message.payload || {};
  return [
    '========================================',
    `[FROM: ${message.from}] / [TO: ${message.to}]`,
    `Type: ${message.type} | ${message.timestamp}`,
    '----------------------------------------',
    p.content || '',
    '----------------------------------------',
    `Source: ${p.source_tag || 'N/A'} | Sensitive: ${p.sensitive || false}`,
    `Note: ${p.note || ''}`,
    '========================================'
  ].join('\n');
}

module.exports = { copyMessage, copyText, getCurrent, clear, formatBlock };
