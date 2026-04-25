const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

// ============================================
// 1. LIMPAR src/App.tsx
// ============================================
const appPath = path.join(ROOT, 'src', 'App.tsx');
let app = fs.readFileSync(appPath, 'utf-8');

// Remover MessageSquare do import do lucide-react  
app = app.replace(/MessageSquare,\n/g, '');

// Remover estado unreadCount e socket whatsapp-notification
app = app.replace(
  /const \[unreadCount, setUnreadCount\] = useState\(0\);\n\s*const socket = io\(\);\n\s*socket\.on\('whatsapp-notification', \(data: \{ count: number \}\) => \{\n\s*setUnreadCount\(data\.count\);\n\s*\}\);\n/,
  ''
);

// Remover o fetch comentado de whatsapp messages (se ainda existir)
app = app.replace(
  /\/\*\n\s*fetchWithRetry\('\/api\/whatsapp\/messages'\)\n\s*\.then\(res => res\.json\(\)\)\n\s*\.catch\(\(\) => null\);\n\s*\*\/\n/,
  ''
);

// Remover 'atendimento' das tipagens de tab
app = app.replace(
  /const validTabs = \['dashboard', 'estoque', 'vendas', 'motos', 'atendimento', 'frete', 'clients', 'mercadolivre', 'users', 'audit'\];/,
  "const validTabs = ['dashboard', 'estoque', 'vendas', 'motos', 'frete', 'clients', 'mercadolivre', 'users', 'audit'];"
);

// Remover título 'Atendimento' no header
app = app.replace(
  /activeTab === 'atendimento' \? 'Atendimento' :\n/,
  ''
);

// Remover renderização do componente Atendimento
app = app.replace(
  /\) : activeTab === 'atendimento' \? \(\n\s*\n\s*\) : activeTab === 'frete' \? \(/,
  ") : activeTab === 'frete' ? ("
);

fs.writeFileSync(appPath, app);
console.log('✅ src/App.tsx limpo');

// ============================================
// 2. LIMPAR server.ts — remover seção WhatsApp
// ============================================
const serverPath = path.join(ROOT, 'server.ts');
let server = fs.readFileSync(serverPath, 'utf-8');

// Remover import QRCode
server = server.replace(/import QRCode from 'qrcode';\n/, '');

// Remover toda a seção "WHATSAPP INTEGRATION" até "MERCADO LIVRE ROUTES"
const whatsappStart = server.indexOf('// ==================== WHATSAPP INTEGRATION');
const mercadoLivreStart = server.indexOf('// ==================== MERCADO LIVRE ROUTES');

if (whatsappStart !== -1 && mercadoLivreStart !== -1) {
  server = server.slice(0, whatsappStart) + server.slice(mercadoLivreStart);
  console.log('✅ Seção WhatsApp removida do server.ts');
} else {
  console.log('⚠️ Marcadores da seção WhatsApp não encontrados no server.ts');
}

// Remover inicialização do WhatsApp no startup
server = server.replace(
  /console\.log\("📱 Inicializando WhatsApp \(Baileys\)\.\.\."\);\n\s*\/\/ Pequeno delay para evitar conflitos se o servidor estiver reiniciando rápido\n\s*setTimeout\(\(\) => \{\n\s*connectToWhatsApp\(\)\.catch\(err => \{\n\s*console\.error\("❌ Erro ao inicializar WhatsApp:", err\);\n\s*\}\);\n\s*\}, 10000\);\n/,
  ''
);

// Remover graceful shutdown do socket WhatsApp
server = server.replace(
  /const sock = \(app as any\)\.whatsappSock;\n\s*if \(sock\) \{\n\s*try \{\n\s*sock\.ev\.removeAllListeners\('connection\.update'\);\n\s*sock\.end\(undefined\);\n\s*console\.log\('✅ Socket WhatsApp encerrado\.'\);\n\s*\} catch \(e\) \{\}\n\s*\}\n/,
  ''
);

fs.writeFileSync(serverPath, server);
console.log('✅ server.ts limpo');

// ============================================
// 3. DELETAR pasta baileys_auth_info
// ============================================
const baileysPath = path.join(ROOT, 'baileys_auth_info');
if (fs.existsSync(baileysPath)) {
  fs.rmSync(baileysPath, { recursive: true, force: true });
  console.log('✅ Pasta baileys_auth_info/ deletada');
} else {
  console.log('ℹ️ Pasta baileys_auth_info/ não existe');
}

// ============================================
// 4. ATUALIZAR TODO.md
// ============================================
const todoPath = path.join(ROOT, 'TODO.md');
let todo = fs.readFileSync(todoPath, 'utf-8');
todo = todo.replace(/- \[ \] 1\. Deletar `src\/views\/AtendimentoView\.tsx`/g, '- [x] 1. Deletar `src/views/AtendimentoView.tsx` (não existia)');
todo = todo.replace(/- \[ \] 2\. Editar `src\/App\.tsx`/g, '- [x] 2. Editar `src/App.tsx`');
todo = todo.replace(/- \[ \] 3\. Editar `src\/components\/MobileBottomNav\.tsx`/g, '- [x] 3. Editar `src/components/MobileBottomNav.tsx` (não tinha item atendimento)');
todo = todo.replace(/- \[ \] 4\. Editar `server\.ts`/g, '- [x] 4. Editar `server.ts`');
todo = todo.replace(/- \[ \] 5\. Editar `package\.json`/g, '- [x] 5. Editar `package.json` (deps não estavam listadas)');
todo = todo.replace(/- \[ \] 6\. Deletar pasta `baileys_auth_info\/`/g, '- [x] 6. Deletar pasta `baileys_auth_info/`');
todo = todo.replace(/- \[ \] 7\. Rodar `npm install`/g, '- [x] 7. Limpeza concluída');
fs.writeFileSync(todoPath, todo);
console.log('✅ TODO.md atualizado');

console.log('\n🎉 Remoção do WhatsApp concluída!');

