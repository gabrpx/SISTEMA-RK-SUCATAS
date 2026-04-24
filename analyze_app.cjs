const fs = require('fs');
const text = fs.readFileSync('src/App.tsx', 'utf8');
const lines = text.split('\n');

function findBlockEnd(startLine) {
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let escaped = false;
  let foundStart = false;

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }

      if (!inString) {
        if (ch === '"' || ch === "'" || ch === '`') {
          inString = true;
          stringChar = ch;
          continue;
        }
        if (ch === '(' || ch === '{' || ch === '[') {
          if (!foundStart) foundStart = true;
          depth++;
          continue;
        }
        if (ch === ')' || ch === '}' || ch === ']') {
          depth--;
          if (foundStart && depth === 0) {
            return i;
          }
          continue;
        }
      } else {
        if (ch === stringChar) {
          inString = false;
        }
      }
    }
  }
  return lines.length - 1;
}

const blocks = [
  { name: 'useDebounce', line: 127 },
  { name: 'parseJson', line: 140 },
  { name: 'fetchWithRetry', line: 150 },
  { name: 'normalizarTexto', line: 216 },
  { name: 'extrairModeloMoto', line: 224 },
  { name: 'extrairCategoria', line: 255 },
  { name: 'dropdownClass', line: 268 },
  { name: 'InventoryRow', line: 2595 },
  { name: 'InventoryView', line: 2740 },
  { name: 'SalesRow', line: 4214 },
  { name: 'SalesView', line: 4322 },
  { name: 'formatRelativeTime', line: 7691 },
  { name: 'MOTO_COLORS', line: 8217 },
  { name: 'getMotoColor', line: 8240 },
  { name: 'MotoCard', line: 8246 },
  { name: 'MotosView', line: 5774 },
  { name: 'AppContent', line: 8569 },
];

blocks.forEach(b => {
  const end = findBlockEnd(b.line);
  console.log(b.name + ': ' + (b.line + 1) + ' - ' + (end + 1) + ' (' + (end - b.line + 1) + ' linhas)');
});

