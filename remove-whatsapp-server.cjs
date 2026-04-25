const fs = require('fs');

const path = 'server.ts';
let c = fs.readFileSync(path, 'utf-8');

// 1. Remover import QRCode
c = c.replace(/import QRCode from 'qrcode';\n/, '');

// 2. Remover variáveis globais whatsapp
c = c.replace(/  let whatsappMessages: any\[\] = \[\];\n/, '');
c = c.replace(/  let conversations: Map<string, any> = new Map\(\);\n/, '');
c = c.replace(/  let contacts: Map<string, any> = new Map\(\);\n/, '');
c = c.replace(/  let isWhatsAppConnected = false;\n/, '');
c = c.replace(/  let whatsappLogs: string\[\] = \[\];\n/, '');
c = c.replace(/  let isReconnecting = false;\n/, '');
c = c.replace(/  let qrCodeData: string \| null = null;\n/, '');
c = c.replace(/  let currentSocket: any = null;\n/, '');
c = c.replace(/  let messageQueue: any\[\] = \[\];\n/, '');

// 3. Remover função addLog
c = c.replace(/  function addLog\(log: string\) \{\n    console\.log\(log\);\n    whatsappLogs\.push\(log\);\n    if \(whatsappLogs\.length > 100\) whatsappLogs\.shift\(\);\n  \}\n/, '');

// 4. Remover função emitStatus
c = c.replace(/  function emitStatus\(\) \{\n    io\.emit\('whatsapp-status', \{\n      connected: isWhatsAppConnected,\n      isConnecting: !isWhatsAppConnected && qrCodeData !== null,\n      reconnectAttempts: 0\n    \}\);\n  \}\n/, '');

// 5. Remover função connectToWhatsApp (grande bloco)
c = c.replace(/  async function connectToWhatsApp\(\) \{\n    if \(isReconnecting\) return;\n    isReconnecting = true;\n    try \{\n      const \{ default: makeWASocket[^}]+saveCreds \} = await useMultiFileAuthState\('baileys_auth_info'\);\n      const \{ version \} = await fetchLatestBaileysVersion\(\);\n[^}]+currentSocket = sock;\n[^}]+qrCodeData = await QRCode\.toDataURL\(qr\);\n[^}]+io\.emit\('whatsapp-qr', qrCodeData\);\n[^}]+emitStatus\(\);\n[^}]+if \(update\.connection === 'close'\) \{\n[^}]+isWhatsAppConnected = false;\n[^}]+qrCodeData = null;\n[^}]+emitStatus\(\);\n[^}]+if \(shouldReconnect\) \{\n[^}]+setTimeout\(connectToWhatsApp, 5000\);\n[^}]+if \(update\.connection === 'open'\) \{\n[^}]+isWhatsAppConnected = true;\n[^}]+qrCodeData = null;\n[^}]+emitStatus\(\);\n[^}]+while \(messageQueue\.length > 0\) \{\n[^}]+const \{ number, message, sentMessageId \} = messageQueue\.shift\(\);\n[^}]+addLog\(`📤 Enviando mensagem enfileirada para \$\{msg\.number\}`\);\n[^}]+const sendPromise = currentSocket\.sendMessage\(msg\.jid, msg\.message\);\n[^}]+sendPromise\.then\(\(\) => \{\n[^}]+if \(conversations\.has\(msg\.number\)\) \{\n[^}]+const conv = conversations\.get\(msg\.number\);\n[^}]+const idx = conv\.messages\.findIndex\(\(m: any\) => m\.id === msg\.sentMessageId\);\n[^}]+if \(idx !== -1\) conv\.messages\[idx\]\.status = 'sent';\n[^}]+conversations\.set\(msg\.number, conv\);\n[^}]+io\.emit\('whatsapp-conversations', Array\.from\(conversations\.values\(\)\)\);\n[^}]+sock\.ev\.on\('messages\.upsert', async \(m\) => \{\n[^}]+const msg = m\.messages\[0\];\n[^}]+if \(!msg\.message \|\| msg\.key\.fromMe\) return;\n[^}]+const body = msg\.message\.conversation \|\| msg\.message\.extendedTextMessage\?\.text \|\| '';\n[^}]+const from = msg\.key\.remoteJid \|\| '';\n[^}]+const number = from\.replace\('@s\.whatsapp\.net', ''\)\.replace\('@g\.us', ''\);\n[^}]+const messageData = \{\n[^}]+id: msg\.key\.id,\n[^}]+from: number,\n[^}]+body,\n[^}]+timestamp: new Date\(\),\n[^}]+status: 'unread',\n[^}]+sender: msg\.pushName \|\| 'Desconhecido',\n[^}]+whatsappMessages\.push\(messageData\);\n[^}]+if \(conversations\.has\(number\)\) \{\n[^}]+conversations\.set\(number, conv\);\n[^}]+\} else \{\n[^}]+conversations\.set\(number, \{\n[^}]+number,\n[^}]+messages: \[messageData\],\n[^}]+lastTimestamp: new Date\(\),\n[^}]+io\.emit\('whatsapp-conversations', Array\.from\(conversations\.values\(\)\)\);\n[^}]+io\.emit\('whatsapp-notification', \{ count: whatsappMessages\.filter\(m => m\.status === 'unread'\)\.length \}\);\n[^}]+sock\.ev\.on\('creds\.update', saveCreds\);\n[^}]+} catch \(error: any\) \{\n[^}]+addLog\(`❌ Erro na conexão WhatsApp: \$\{error\.message\}`\);\n[^}]+isReconnecting = false;\n[^}]+isWhatsAppConnected = false;\n[^}]+qrCodeData = null;\n[^}]+emitStatus\(\);\n[^}]+setTimeout\(connectToWhatsApp, 10000\);\n[^}]+isReconnecting = false;\n[^}]+}\n[^}]+}\n/, '');

// 6. Remover todas as rotas /api/whatsapp/*
const whatsappRoutes = [
  /  app\.get\("\/api\/whatsapp\/status"[^}]+}\);\n/,
  /  app\.get\("\/api\/whatsapp\/messages"[^}]+}\);\n/,
  /  app\.get\("\/api\/whatsapp\/conversations"[^}]+}\);\n/,
  /  app\.get\("\/api\/whatsapp\/conversations\/:number\/messages"[^}]+}\);\n/,
  /  app\.post\("\/api\/whatsapp\/messages\/:id\/read"[^}]+}\);\n/,
  /  app\.delete\("\/api\/whatsapp\/conversations\/:number"[^}]+}\);\n/,
  /  app\.delete\("\/api\/whatsapp\/messages\/:id"[^}]+}\);\n/,
  /  app\.delete\("\/api\/whatsapp\/messages\/:id\/remote"[^}]+}\);\n/,
  /  app\.post\("\/api\/whatsapp\/send"[^}]+}\);\n/,
  /  app\.get\("\/api\/whatsapp\/logs"[^}]+}\);\n/,
  /  app\.post\("\/api\/whatsapp\/logout"[^}]+}\);\n/,
  /  app\.post\("\/api\/whatsapp\/reconnect"[^}]+}\);\n/,
  /  app\.post\("\/api\/whatsapp\/force-qr"[^}]+}\);\n/
];

whatsappRoutes.forEach(route => {
  c = c.replace(route, '');
});

// 7. Remover chamada connectToWhatsApp no startup
c = c.replace(/  connectToWhatsApp\(\);\n/, '');

// 8. Remover graceful shutdown do WhatsApp
c = c.replace(/  const sock = \(app as any\)\.whatsappSock;\n  if \(sock\) \{\n    console\.log\('🛑 Encerrando servidor...'\);\n    await sock\.logout\(\);\n    console\.log\('✅ WhatsApp desconectado'\);\n  \}\n/, '');

fs.writeFileSync(path, c);
console.log('server.ts limpo de whatsapp');
