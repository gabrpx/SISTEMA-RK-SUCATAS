const fs = require('fs');

const appPath = 'src/App.tsx';
let c = fs.readFileSync(appPath, 'utf-8');

// 1. Remover socket whatsapp-notification
c = c.replace(/socket\.on\('whatsapp-notification',[\s\S]*?setUnreadCount\(data\.count\);[\s\S]*?\}\);[\s\S]*?\/\*/, '/*');

// 2. Remover fetch /api/whatsapp/messages
c = c.replace(/fetchWithRetry\('\/api\/whatsapp\/messages'\)[\s\S]*?\.catch\(.*?\);/, '');

// 3. wrapEdit sem 'atendimento'
c = c.replace(
  "'dashboard' | 'estoque' | 'vendas' | 'motos' | 'atendimento' | 'frete' | 'clients' | 'mercadolivre'",
  "'dashboard' | 'estoque' | 'vendas' | 'motos' | 'frete' | 'clients' | 'mercadolivre'"
);

// 4. Título sem atendimento
c = c.replace(/activeTab === 'atendimento' \? 'Atendimento' :[\n\s]+/, '');

// 5. Render sem Atendimento
c = c.replace(
  /\) : activeTab === 'atendimento' \? \([\s\S]*?<Atendimento theme=\{theme\} \/>[\s\S]*?\) : activeTab === 'frete'/,
  ") : activeTab === 'frete'"
);

fs.writeFileSync(appPath, c);
console.log('App.tsx limpo de whatsapp/atendimento');
