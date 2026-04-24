const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');
const patterns = [
  /^function\s+\w+/,
  /^const\s+\w+\s*=/,
  /^export\s+(function|const)\s+\w+/,
  /^export\s+default\s+(function|\w+)/
];
const results = [];
lines.forEach((l, i) => {
  const trimmed = l.trim();
  if (patterns.some(p => p.test(trimmed))) {
    results.push({line: i+1, text: trimmed.substring(0,120)});
  }
});
results.forEach(r => console.log(r.line + ': ' + r.text));

