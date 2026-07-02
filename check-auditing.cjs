const fs = require('fs');

const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

const targetLines = lines.slice(5007, 5148);
const targetContent = targetLines.join('\n');

let i = 0;
const len = targetContent.length;
const stack = [];

function getLineAndCol(idx) {
  const preceding = targetContent.substring(0, idx).split('\n');
  return { line: preceding.length + 5007, col: preceding[preceding.length - 1].length + 1 };
}

while (i < len) {
  if (targetContent[i] === '"' || targetContent[i] === '`') {
    const char = targetContent[i];
    i++;
    while (i < len && targetContent[i] !== char) {
      if (targetContent[i] === '\\') i += 2;
      else i++;
    }
    i++;
    continue;
  }

  if (targetContent[i] === '/' && targetContent[i+1] === '/') {
    while (i < len && targetContent[i] !== '\n') i++;
    continue;
  }
  if (targetContent[i] === '/' && targetContent[i+1] === '*') {
    i += 2;
    while (i < len && !(targetContent[i] === '*' && targetContent[i+1] === '/')) i++;
    i += 2;
    continue;
  }

  if (targetContent[i] === '{' && targetContent[i+1] === '/' && targetContent[i+2] === '*') {
    i += 3;
    while (i < len && !(targetContent[i] === '*' && targetContent[i+1] === '/' && targetContent[i+2] === '}')) i++;
    i += 3;
    continue;
  }

  if (targetContent[i] === '<') {
    const nextChar = targetContent[i+1];
    if (/[a-zA-Z/!]/.test(nextChar) || nextChar === '>') {
      const startIdx = i;
      const isClosing = nextChar === '/';
      if (isClosing) i++;
      
      i++;
      
      let tagName = '';
      while (i < len && /[a-zA-Z0-9.-]/.test(targetContent[i])) {
        tagName += targetContent[i];
        i++;
      }
      
      let isSelfClosing = false;
      while (i < len && targetContent[i] !== '>') {
        if (targetContent[i] === '/' && targetContent[i+1] === '>') {
          isSelfClosing = true;
          break;
        }
        if (targetContent[i] === '"' || targetContent[i] === '`') {
          const char = targetContent[i];
          i++;
          while (i < len && targetContent[i] !== char) {
            if (targetContent[i] === '\\') i += 2;
            else i++;
          }
        }
        if (targetContent[i] === '{') {
          let braceCount = 1;
          i++;
          while (i < len && braceCount > 0) {
            if (targetContent[i] === '{') braceCount++;
            else if (targetContent[i] === '}') braceCount--;
            else if (targetContent[i] === '"' || targetContent[i] === '`') {
              const char = targetContent[i];
              i++;
              while (i < len && targetContent[i] !== char) {
                if (targetContent[i] === '\\') i += 2;
                else i++;
              }
            }
            i++;
          }
          continue;
        }
        i++;
      }
      
      if (isSelfClosing) {
        i += 2;
      } else {
        i++;
      }
      
      const lowerTagName = tagName.toLowerCase();
      const structuralTags = ['div', 'section', 'main', 'aside', 'header', 'footer', 'nav', 'span', 'p', 'button', 'select', 'textarea', 'label', 'h1', 'h2', 'h3', 'h4', 'ul', 'li', 'svg', 'a', 'form', 'table', 'tbody', 'tr', 'td', 'th', 'thead'];
      
      if (structuralTags.includes(lowerTagName) && !isSelfClosing) {
        const pos = getLineAndCol(startIdx);
        if (isClosing) {
          if (stack.length === 0) {
            console.log(`[Line ${pos.line}, Col ${pos.col}] Extra closing tag: </${tagName}>`);
          } else {
            const top = stack.pop();
            if (top.name !== lowerTagName) {
              console.log(`[Line ${pos.line}, Col ${pos.col}] MISMATCH: expected </${top.name}> (opened at Line ${top.line}, Col ${top.col}), found </${tagName}>`);
              stack.push(top);
            }
          }
        } else {
          stack.push({ name: lowerTagName, line: pos.line, col: pos.col });
        }
      }
      continue;
    }
  }
  i++;
}

console.log('--- Unclosed tags left in stack ---');
stack.forEach(item => {
  console.log(`Opened at Line ${item.line}, Col ${item.col}: <${item.name}>`);
});
