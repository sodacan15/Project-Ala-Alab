const { v4: uuidv4 } = require('uuid');

let transitMessages = [];
let messageLog = [];

function addToTransit(message) {
  const msg = {
    ...message,
    id: uuidv4(),
    status: 'pending',
    timestamp: message.timestamp || new Date().toISOString()
  };
  transitMessages.push(msg);
  messageLog.push({ ...msg });
  return msg;
}

function getTransit() {
  return transitMessages.filter(m => m.status === 'pending');
}

function confirmMessage(id) {
  const msg = transitMessages.find(m => m.id === id);
  if (!msg) return null;
  msg.status = 'confirmed';
  const logEntry = messageLog.find(m => m.id === id);
  if (logEntry) logEntry.status = 'confirmed';
  transitMessages = transitMessages.filter(m => m.id !== id);
  return msg;
}

function purgeMessage(id, reason) {
  const msg = transitMessages.find(m => m.id === id);
  if (!msg) return null;
  msg.status = 'purged';
  const logEntry = messageLog.find(m => m.id === id);
  if (logEntry) {
    logEntry.status = 'purged';
    logEntry.purgeReason = reason;
  }
  transitMessages = transitMessages.filter(m => m.id !== id);
  return msg;
}

function getLog() {
  return messageLog;
}

function clearLog() {
  messageLog = [];
}

function clearTransit() {
  transitMessages = [];
}

function getAllTransit() {
  return transitMessages;
}

module.exports = { addToTransit, getTransit, confirmMessage, purgeMessage, getLog, clearLog, clearTransit, getAllTransit };
