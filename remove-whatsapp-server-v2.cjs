const fs = require('fs');

const input = fs.readFileSync('server.ts', 'utf-8');
const lines = input.split('\n');
const output = [];
let skip = false;
let skipDepth = 0;
let inConnectToWhatsApp = false;
let braceDepth = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  // Pular import QRCode
  if (trimmed === "import QRCode from 'qrcode';") continue;

  // Pular variáveis globais whatsapp
  if (
    trimmed.startsWith('let whatsappMessages') ||
    trimmed.startsWith('let conversations:') ||
    trimmed.startsWith('let contacts:') ||
    trimmed.startsWith('let isWhatsAppConnected') ||
    trimmed.startsWith('let whatsappLogs:') ||
    trimmed.startsWith('let isReconnecting') ||
    trimmed.startsWith('let qrCodeData:') ||
    trimmed.startsWith('let currentSocket:') ||
    trimmed.startsWith('let messageQueue:')
  ) continue;

  // Pular função addLog
  if (trimmed === 'function addLog(log: string) {' || trimmed === '  function addLog(log: string) {') {
    skip = true;
    skipDepth = 0;
  }
  if (skip && (trimmed.includes('{') || trimmed.includes('}'))) {
    // Contagem simples de chaves
    skipDepth += (trimmed.match(/\{/g) || []).length;
    skipDepth -= (trimmed.match(/\}/g) || []).length;
    if (skipDepth <= 0 && trimmed.includes('}')) {
      skip = false;
    }
    continue;
  }
  if (skip) continue;

  // Pular função emitStatus
  if (trimmed === 'function emitStatus() {' || trimmed === '  function emitStatus() {') {
    skip = true;
    skipDepth = 0;
    continue;
  }

  // Pular função connectToWhatsApp (async function)
  if (trimmed === 'async function connectToWhatsApp() {' || trimmed === '  async function connectToWhatsApp() {') {
    inConnectToWhatsApp = true;
    braceDepth = 0;
    continue;
  }
  if (inConnectToWhatsApp) {
    braceDepth += (line.match(/\{/g) || []).length;
    braceDepth -= (line.match(/\}/g) || []).length;
    if (braceDepth <= 0 && line.includes('}')) {
      inConnectToWhatsApp = false;
    }
    continue;
  }

  // Pular rotas /api/whatsapp/*
  if (trimmed.startsWith('app.get("/api/whatsapp/') ||
      trimmed.startsWith('app.post("/api/whatsapp/') ||
      trimmed.startsWith('app.delete("/api/whatsapp/')) {
    skip = true;
    skipDepth = 0;
    continue;
  }
  // Fim de rota arrow function
  if (skip && (trimmed === '});' || trimmed === '  });' || trimmed === '    });' || trimmed === '      });')) {
    skip = false;
    continue;
  }
  if (skip) continue;

  // Pular chamada connectToWhatsApp() no startup
  if (trimmed === 'connectToWhatsApp();' || trimmed === '  connectToWhatsApp();') continue;

  // Pular graceful shutdown whatsapp
  if (trimmed.includes("const sock = (app as any).whatsappSock;")) {
    skip = true;
    skipDepth = 0;
    continue;
  }
  if (skip && (trimmed.includes("process.exit") || (trimmed === '}' && skipDepth <= 0))) {
    skip = false;
    continue;
  }

  output.push(line);
}

fs.writeFileSync('server.ts', output.join('\n'));
console.log('server.ts processado - whatsapp removido');
