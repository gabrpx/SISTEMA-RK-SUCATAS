const fs = require('fs');
const path = require('path');

// Mapeamento de sequências corrompidas (UTF-8 lido como Latin-1) para caracteres corretos
// Ordem: mais específicos primeiro para evitar conflitos
const replacements = [
  // Minúsculas compostas
  { from: 'á', to: 'á' },
  { from: 'â', to: 'â' },
  { from: 'ã', to: 'ã' },
  { from: 'ç', to: 'ç' },
  { from: 'é', to: 'é' },
  { from: 'ê', to: 'ê' },
  { from: 'í', to: 'í' },
  { from: 'ó', to: 'ó' },
  { from: 'õ', to: 'õ' },
  { from: 'ú', to: 'ú' },
  { from: 'à', to: 'à' }, // àseguido de espaço comum
  { from: 'à\u00a0', to: 'à' }, // àseguido de NBSP (0xA0)
  { from: 'à\u0080', to: 'À' }, // àseguido de 0x80 -> À
  { from: 'à', to: 'à' }, // fallback para àisolado
  // Maiúsculas
  { from: 'É', to: 'É' },
  { from: 'Ê', to: 'Ê' },
  { from: 'Ó', to: 'Ó' },
  { from: 'Õ', to: 'Õ' },
  { from: 'Ú', to: 'Ú' },
  { from: 'Ç', to: 'Ç' },
  { from: 'Ã', to: 'à' }, // Ã -> à? Na verdade Ã (0xC3 0x83) -> à(0xC3)
];

// Diretórios e extensões a processar
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

// Processar arquivos na raiz também
const rootFiles = fs.readdirSync('.', { withFileTypes: true });
for (const entry of rootFiles) {
  if (entry.isFile()) {
    processFile(path.join('.', entry.name));
  }
}

console.log(`\n📊 Resumo: ${changedFiles} de ${totalFiles} arquivos corrigidos.`);

