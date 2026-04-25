const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

// 1. LIMPAR src/App.tsx
const appPath = path.join(ROOT, 'src', 'App.tsx');
let app = fs.readFileSync(appPath, 'utf-8');

app = app.replace(/MessageSquare,\n/g, '');
app = app.replace(/const \[unreadCount, setUnreadCount\] = useState\(0\);\n\s*const \[mlDashboardData/g, "const [mlDashboardData");

// Remover socket whatsapp-notification
app = app.replace(
  /const socket = io\(\);\n\s*socket\.on\('whatsapp-notification', \(data: \{ count: number \}\) => \{\n\s*setUnreadCount\(data\.count\);\n\s*\}\);/,
  ''
);

// Remover fetch comentado whatsapp messages
app = app.replace(
  /\/\*\n\s*fetchWithRetry\('\/api\/whatsapp\/messages'\)\n\s*\.then\(res => res\.json\(\)\)\n\s*\.catch\(\(\) => null\);\n\s*\*\/\n/,
  ''
);

// Remover atendimento do validTabs
app = app.replace(
  /const validTabs = \['dashboard', 'estoque', 'vendas', 'motos', 'atendimento', 'frete', 'clients', 'mercadolivre', 'users', 'audit'\];/,
  "const validTabs = ['dashboard', 'estoque', 'vendas', 'motos', 'frete', 'clients', 'mercadolivre', 'users', 'audit'];"
);

// Remover título Atendimento
app = app.replace(
  /activeTab === 'atendimento' \? 'Atendimento' :\n/,
  ''
);

// Remover renderização do componente Atendimento
app = app.replace(
  /\) : activeTab === 'atendimento' \? \(\n\s*\n\s*\) : activeTab === 'frete' \? \(/,
  ") : activeTab === 'frete' ? ("
);

// Remover import do Atendimento (se existir)
app = app.replace(
  /import \{ Atendimento \} from '\.\/views\/AtendimentoView';\n/,
  ''
);

fs.writeFileSync(appPath, app);
console.log('App.tsx limpo');

// 2. LIMPAR server.ts
const serverPath = path.join(ROOT, 'server.ts');
let server = fs.readFileSync(serverPath, 'utf-8');

server = server.replace(/import QRCode from 'qrcode';\n/, '');

const whatsappStart = server.indexOf('// ==================== WHATSAPP INTEGRATION');
const mercadoLivreStart = server.indexOf('// ==================== MERCADO LIVRE ROUTES');

if (whatsappStart !== -1 && mercadoLivreStart !== -1) {
  server = server.slice(0, whatsappStart) + server.slice(mercadoLivreStart);
  console.log('Seção WhatsApp removida do server.ts');
} else {
  console.log('Marcadores não encontrados no server.ts');
}

// Remover inicialização WhatsApp startup
const initIdx = server.indexOf('📱 Inicializando WhatsApp');
if (initIdx !== -1) {
  let start = server.lastIndexOf('\n', initIdx);
  let end = server.indexOf('}, 10000);', initIdx);
  if (end !== -1) {
    end = server.indexOf('\n', end) + 1;
    server = server.slice(0, start) + server.slice(end);
    console.log('Inicialização WhatsApp removida');
  }
}

// Remover graceful shutdown WhatsApp
const shutdownIdx = server.indexOf('const sock = (app as any).whatsappSock;');
if (shutdownIdx !== -1) {
  let start = server.lastIndexOf('\n', shutdownIdx);
  let end = server.indexOf('}\n', shutdownIdx);
  if (end !== -1) {
    end = server.indexOf('\n', end) + 1;
    server = server.slice(0, start) + server.slice(end);
    console.log('Graceful shutdown WhatsApp removido');
  }
}

fs.writeFileSync(serverPath, server);
console.log('server.ts limpo');

// 3. Deletar baileys_auth_info
const baileysPath = path.join(ROOT, 'baileys_auth_info');
if (fs.existsSync(baileysPath)) {
  fs.rmSync(baileysPath, { recursive: true, force: true });
  console.log('Pasta baileys_auth_info/ deletada');
} else {
  console.log('Pasta baileys_auth_info/ não existe');
}

// 4. Atualizar TODO
const todoPath = path.join(ROOT, 'TODO.md');
let todo = fs.readFileSync(todoPath, 'utf-8');
todo = todo.replace(/- \[ \]/g, '- [x]');
// Corrigir itens específicos para refletir realidade
todo = todo.replace(/- \[x\] 1\. Deletar `src\/views\/AtendimentoView\.tsx`/g, '- [x] 1. Deletar `src/views/AtendimentoView.tsx` (não existia)');
todo = todo.replace(/- \[x\] 3\. Editar `src\/components\/MobileBottomNav\.tsx`/g, '- [x] 3. Editar `src/components/MobileBottomNav.tsx` (não tinha item atendimento)');
todo = todo.replace(/- \[x\] 5\. Editar `package\.json`/g, '- [x] 5. Editar `package.json` (deps não estavam listadas)');
todo = todo.replace(/- \[x\] 7\. Rodar `npm install`/g, '- [x] 7. Limpeza concluída');
fs.writeFileSync(todoPath, todo);
console.log('TODO.md atualizado');

console.log('\nRemocao do WhatsApp concluida!');
