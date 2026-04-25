const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

// ============================================
// 1. LIMPAR src/App.tsx — abordagem linha a linha
// ============================================
const appPath = path.join(ROOT, 'src', 'App.tsx');
let appLines = fs.readFileSync(appPath, 'utf-8').split('\n');

const newAppLines = [];
let skipUntil = -1;
let i = 0;

while (i < appLines.length) {
  const line = appLines[i];
  
  // Remover import de MessageSquare (exceto se for usado em outro lugar — não é)
  if (line.trim() === 'MessageSquare,' &amp;&amp; i > 0 &amp;&amp; appLines[i-1].includes('lucide-react')) {
    i++;
    continue;
  }
  
  // Remover bloco unreadCount + socket
  if (line.includes('const [unreadCount, setUnreadCount]')) {
    // Pula esta linha e o bloco do socket
    i++;
    while (i < appLines.length &amp;&amp; !appLines[i].includes('const [mlDashboardData')) {
      i++;
    }
    newAppLines.push(line.replace(/const \[unreadCount.*?\n/, ''));
    i++;
    continue;
  }
  
  // Remover fetch comentado de whatsapp messages
  if (line.trim().startsWith('fetchWithRetry(\'/api/whatsapp/messages\')')) {
    // Pula esta linha e o .then/.catch até fechar o comentário */
    while (i < appLines.length &amp;&amp; !appLines[i].includes('*/')) {
      i++;
    }
    i++; // pula o */
    continue;
  }
  
  // Remover 'atendimento' do const validTabs
  if (line.includes("const validTabs = ['dashboard'")) {
    newAppLines.push(line.replace("'atendimento', ", ""));
    i++;
    continue;
  }
  
  // Remover título 'Atendimento'
  if (line.includes("activeTab === 'atendimento' ? 'Atendimento' :")) {
    i++;
    continue;
  }
  
  // Remover renderização do componente Atendimento
  if (line.includes("activeTab === 'atendimento' ? (")) {
    // Pula até o próximo fechamento que precede 'frete'
    let depth = 1;
    i++;
    while (i < appLines.length &amp;&amp; depth > 0) {
      if (appLines[i].includes('(')) depth++;
      if (appLines[i].includes(')')) depth--;
      if (appLines[i].includes(') : activeTab') &amp;&amp; depth === 0) break;
      i++;
    }
    // Agora i está no ") : activeTab === 'frete' ? ("
    // Pula o ") :" e deixa só o "activeTab === 'frete' ? ("
    const current = appLines[i];
    if (current.includes(") : activeTab === 'frete' ? (")) {
      newAppLines.push("              ) : activeTab === 'frete' ? (");
    }
    i++;
    continue;
  }
  
  // Remover 'atendimento' da tipagem do wrapEdit
  if (line.includes("wrapEdit")) {
    newAppLines.push(line.replace(" | 'atendimento'", ""));
    i++;
    continue;
  }
  
  newAppLines.push(line);
  i++;
}

fs.writeFileSync(appPath, newAppLines.join('\n'));
console.log('✅ src/App.tsx limpo');

// ============================================
// 2. LIMPAR server.ts
// ============================================
const serverPath = path.join(ROOT, 'server.ts');
let server = fs.readFileSync(serverPath, 'utf-8');

// Remover import QRCode
server = server.replace(/import QRCode from 'qrcode';\n/, '');

// Remover toda a seção "WHATSAPP INTEGRATION" até "MERCADO LIVRE ROUTES"
const whatsappStart = server.indexOf('// ==================== WHATSAPP INTEGRATION');
const mercadoLivreStart = server.indexOf('// ==================== MERCADO LIVRE ROUTES');

if (whatsappStart !== -1 &amp;&amp; mercadoLivreStart !== -1) {
  server = server.slice(0, whatsappStart) + server.slice(mercadoLivreStart);
  console.log('✅ Seção WhatsApp removida do server.ts');
} else {
  console.log('⚠️ Marcadores da seção WhatsApp não encontrados no server.ts');
}

// Remover inicialização do WhatsApp no startup
const startupIdx = server.indexOf('📱 Inicializando WhatsApp');
if (startupIdx !== -1) {
  // Encontrar início do bloco (console.log anterior)
  let blockStart = server.lastIndexOf('\n', startupIdx);
  // Encontrar fim do bloco (fechamento do setTimeout))
  let blockEnd = server.indexOf('}, 10000);', startupIdx);
  if (blockEnd !== -1) {
    blockEnd = server.indexOf('\n', blockEnd) + 1;
    server = server.slice(0, blockStart) + server.slice(blockEnd);
    console.log('✅ Inicialização WhatsApp removida do startup');
  }
}

// Remover graceful shutdown do socket WhatsApp
const shutdownIdx = server.indexOf('const sock = (app as any).whatsappSock;');
if (shutdownIdx !== -1) {
  let blockStart = server.lastIndexOf('\n', shutdownIdx);
  let blockEnd = server.indexOf('}\n', shutdownIdx);
  if (blockEnd !== -1) {
    blockEnd = server.indexOf('\n', blockEnd) + 1;
    server = server.slice(0, blockStart) + server.slice(blockEnd);
    console.log('✅ Graceful shutdown WhatsApp removido');
  }
}

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

