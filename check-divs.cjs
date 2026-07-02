const fs = require('fs');

const content = fs.readFileSync('src/App.tsx', 'utf8');

let i = 0;
const len = content.length;
const tagStack = [];

function getLineAndCol(index) {
  const lines = content.substring(0, index).split('\n');
  return { line: lines.length, col: lines[lines.length - 1].length + 1 };
}

while (i < len) {
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
  
  if (content[i] === '/' && content[i+1] === '/') {
    while (i < len && content[i] !== '\n') i++;
    continue;
  }
  
  if (content[i] === '/' && content[i+1] === '*') {
    i += 2;
    while (i < len && !(content[i] === '*' && content[i+1] === '/')) i++;
    i += 2;
    continue;
  }

  if (content[i] === '{' && content[i+1] === '/' && content[i+2] === '*') {
    i += 3;
    while (i < len && !(content[i] === '*' && content[i+1] === '/' && content[i+2] === '}')) i++;
    i += 3;
    continue;
  }

  if (content[i] === '<') {
    const startIdx = i;
    i++;
    const isClosing = content[i] === '/';
    if (isClosing) i++;
    
    let tagName = '';
    while (i < len && /[a-zA-Z0-9.-]/.test(content[i])) {
      tagName += content[i];
      i++;
    }
    
    if (tagName) {
      let isSelfClosing = false;
      while (i < len && content[i] !== '>') {
        if (content[i] === '/' && content[i+1] === '>') {
          isSelfClosing = true;
          break;
        }
        if (content[i] === '"' || content[i] === "'" || content[i] === '`') {
          const char = content[i];
          i++;
          while (i < len && content[i] !== char) {
            if (content[i] === '\\') i += 2;
            else i++;
          }
        }
        i++;
      }
      
      const endIdx = isSelfClosing ? i + 1 : i;
      i = endIdx + 1;
      
      const trackedTags = ['div', 'section', 'main', 'aside', 'header', 'footer', 'nav'];
      const lowerTagName = tagName.toLowerCase();
      
      if (trackedTags.includes(lowerTagName) && !isSelfClosing) {
        const pos = getLineAndCol(startIdx);
        if (isClosing) {
          if (tagStack.length === 0) {
            console.log(`[Line ${pos.line}] Extra closing tag: </${lowerTagName}>`);
          } else {
            const top = tagStack.pop();
            // Log popping of auditing tags
            if (pos.line >= 3330 && pos.line <= 4050) {
              console.log(`[Line ${pos.line}] POPPED <${top.name}> (opened at Line ${top.line})`);
            }
            if (top.name !== lowerTagName) {
              console.log(`[Line ${pos.line}, Col ${pos.col}] MISMATCH: expected </${top.name}> (opened at Line ${top.line}, Col ${top.col}), found </${lowerTagName}>`);
              // Put it back to trace
              tagStack.push(top);
            }
          }
        } else {
          tagStack.push({ name: lowerTagName, line: pos.line, col: pos.col });
          if (pos.line >= 3330 && pos.line <= 4050) {
            console.log(`[Line ${pos.line}] PUSHED <${lowerTagName}>`);
          }
        }
      }
    }
    continue;
  }
  
  i++;
}

console.log('--- Unclosed tags left in stack ---');
tagStack.forEach(item => {
  console.log(`Opened at Line ${item.line}, Col ${item.col}: <${item.name}>`);
});
