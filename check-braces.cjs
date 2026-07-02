const fs = require('fs');

const content = fs.readFileSync('src/App.tsx', 'utf8');

let i = 0;
const len = content.length;
const braceStack = [];

function getLineAndCol(idx) {
  const preceding = content.substring(0, idx).split('\n');
  return { line: preceding.length, col: preceding[preceding.length - 1].length + 1 };
}

while (i < len) {
  // Handle string literals
  if (content[i] === '"' || content[i] === "'" || content[i] === '`') {
    const char = content[i];
    i++;
    while (i < len && content[i] !== char) {
      if (content[i] === '\\') i += 2;
      else i++;
    }
    i++;
    continue;
  }

  // Handle line comments
  if (content[i] === '/' && content[i+1] === '/') {
    while (i < len && content[i] !== '\n') i++;
    continue;
  }

  // Handle block comments
  if (content[i] === '/' && content[i+1] === '*') {
    i += 2;
    while (i < len && !(content[i] === '*' && content[i+1] === '/')) i++;
    i += 2;
    continue;
  }

  // Handle curly braces
  if (content[i] === '{') {
    const pos = getLineAndCol(i);
    braceStack.push({ type: '{', line: pos.line, col: pos.col });
  } else if (content[i] === '}') {
    const pos = getLineAndCol(i);
    if (braceStack.length === 0) {
      console.log(`[Line ${pos.line}, Col ${pos.col}] Extra closing brace '}'`);
    } else {
      braceStack.pop();
    }
  }

  i++;
}

console.log('--- Unclosed braces left in stack ---');
braceStack.forEach(b => {
  console.log(`Opened at Line ${b.line}, Col ${b.col}`);
});
