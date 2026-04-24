const fs = require('fs');
const path = require('path');

// Correção complementar: sequências onde `Ã` (de UTF-8 como Latin-1) foi convertido para `à`
// mas o segundo byte ficou como caractere de controle (0x80-0x9F) ou maiúscula.
// Essas são maiúsculas acentuadas em UTF-8 interpretadas como Latin-1.
const replacements = [
  { from: 'à\u0080', to: 'À' },
  { from: 'à\u0081', to: 'Á' },
  { from: 'à\u0082', to: 'Â' },
  { from: 'à\u0083', to: 'Ã' },
  { from: 'à\u0087', to: 'Ç' },
  { from: 'à\u0088', to: 'È' },
  { from: 'à\u0089', to: 'É' },
  { from: 'à\u008A', to: 'Ê' },
  { from: 'à\u008C', to: 'Ì' },
  { from: 'à\u008D', to: 'Í' },
  { from: 'à\u0092', to: 'Ò' },
  { from: 'à\u0093', to: 'Ó' },
  { from: 'à\u0095', to: 'Õ' },
  { from: 'à\u0098', to: 'Ø' },
  { from: 'à\u0099', to: 'Ù' },
  { from: 'à\u009A', to: 'Ú' },
  { from: 'à\u009B', to: 'Û' },
  { from: 'à\u009D', to: 'Ý' },
  // Caso tenha sobrado alguma minúscula (raro, mas por segurança)
  { from: 'à\u00A0', to: 'à' },
  { from: 'à\u00A1', to: 'á' },
  { from: 'à\u00A2', to: 'â' },
  { from: 'à\u00A3', to: 'ã' },
  { from: 'à\u00A7', to: 'ç' },
  { from: 'à\u00A8', to: 'è' },
  { from: 'à\u00A9', to: 'é' },
  { from: 'à\u00AA', to: 'ê' },
  { from: 'à\u00AC', to: 'ì' },
  { from: 'à\u00AD', to: 'í' },
  { from: 'à\u00B2', to: 'ò' },
  { from: 'à\u00B3', to: 'ó' },
  { from: 'à\u00B5', to: 'õ' },
  { from: 'à\u00B8', to: 'ø' },
  { from: 'à\u00B9', to: 'ù' },
  { from: 'à\u00BA', to: 'ú' },
  { from: 'à\u00BB', to: 'û' },
  { from: 'à\u00BD', to: 'ý' },
];

const targetDirs = ['src', 'middleware', 'services'];
const extensions = ['.tsx', '.ts', '.js', '.cjs', '.css', '.html'];

let totalFiles = 0;
let changedFiles = 0;

function processFile(filePath) {
  const ext = path.extname(filePath);
  if (!extensions.includes(ext)) return;

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    console.warn(`⚠️ Não foi possível ler ${filePath}`);
    return;
  }

  let newContent = content;
  let changed = false;

  for (const r of replacements) {
    if (newContent.includes(r.from)) {
      newContent = newContent.split(r.from).join(r.to);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`✅ Corrigido: ${filePath}`);
    changedFiles++;
  }
  totalFiles++;
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      walkDir(fullPath);
    } else if (entry.isFile()) {
      processFile(fullPath);
    }
  }
}

for (const dir of targetDirs) {
  if (fs.existsSync(dir)) {
    walkDir(dir);
  }
}

const rootFiles = fs.readdirSync('.', { withFileTypes: true });
for (const entry of rootFiles) {
  if (entry.isFile()) {
    processFile(path.join('.', entry.name));
  }
}

console.log(`\n📊 Resumo: ${changedFiles} de ${totalFiles} arquivos corrigidos.`);

