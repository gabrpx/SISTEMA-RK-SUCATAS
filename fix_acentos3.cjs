const fs = require('fs');
const path = require('path');

// Mapeamento completo dos padrões restantes de acentos quebrados
// Estes são caracteres UTF-8 interpretados como Latin-1, depois o "Ã" foi convertido para "à"
// ou emojis/unicode que ficaram como sequências de controle
const replacements = [
  // Setas (UTF-8 como Latin-1)
  { from: '↑', to: '↑' },
  { from: '↓', to: '↓' },
  { from: '←', to: '←' },
  // Emojis comuns que ficaram como sequências de controle
  { from: '📊', to: '📊' },
  { from: '🎉', to: '🎉' },
  { from: '📸', to: '📸' },
  { from: '📤', to: '📤' },
  { from: '📥', to: '📥' },
  { from: '✅', to: '✅' },
  { from: '❌', to: '❌' },
  { from: '⚠️', to: '⚠️' },
  { from: '⏳', to: '⏳' },
  // Maiúsculas acentuadas (à + byte de controle)
  { from: 'Ú', to: 'Ú' },
  { from: 'É', to: 'É' },
  { from: 'Ê', to: 'Ê' },
  { from: 'Ã', to: 'Ã' },
  { from: 'Ç', to: 'Ç' },
  { from: 'Ó', to: 'Ó' },
  { from: 'Õ', to: 'Õ' },
  // Minúsculas acentuadas
  { from: 'á', to: 'á' },
  { from: 'â', to: 'â' },
  { from: 'ã', to: 'ã' },
  { from: 'ç', to: 'ç' },
  { from: 'è', to: 'è' },
  { from: 'é', to: 'é' },
  { from: 'ê', to: 'ê' },
  { from: 'í', to: 'í' },
  { from: 'ò', to: 'ò' },
  { from: 'ó', to: 'ó' },
  { from: 'õ', to: 'õ' },
  { from: 'ú', to: 'ú' },
  { from: 'û', to: 'û' },
  { from: 'ý', to: 'ý' },
  // Outros padrões específicos encontrados
  { from: 'à', to: 'à' },
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

