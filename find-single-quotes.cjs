const fs = require('fs');

const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

let inDoubleQuote = false;
let inSingleQuote = false;
let inBacktick = false;
let inComment = false; // block comment
let inLineComment = false;

for (let i = 0; i < content.length; i++) {
  const char = content[i];
  const nextChar = content[i + 1];
  const prevChar = content[i - 1];
  
  const lineNum = content.substring(0, i).split('\n').length;
  
  if (inLineComment) {
    if (char === '\n') inLineComment = false;
    continue;
  }
  
  if (inComment) {
    if (char === '*' && nextChar === '/') {
      inComment = false;
      i++;
    }
    continue;
  }
  
  if (inDoubleQuote) {
    if (char === '"' && prevChar !== '\\') inDoubleQuote = false;
    continue;
  }
  
  if (inSingleQuote) {
    if (char === "'" && prevChar !== '\\') inSingleQuote = false;
    continue;
  }
  
  if (inBacktick) {
    if (char === '`' && prevChar !== '\\') inBacktick = false;
    continue;
  }
  
  // Check start of comment
  if (char === '/' && nextChar === '/') {
    inLineComment = true;
    i++;
    continue;
  }
  
  if (char === '/' && nextChar === '*') {
    inComment = true;
    i++;
    continue;
  }
  
  // Check start of string
  if (char === '"') {
    inDoubleQuote = true;
    continue;
  }
  
  if (char === "'") {
    inSingleQuote = true;
    console.log(`[Line ${lineNum}] Opened single quote`);
    continue;
  }
  
  if (char === '`') {
    inBacktick = true;
    continue;
  }
}

if (inSingleQuote) {
  console.log('Ended with open single quote!');
}
