const fs = require('fs');

const appPath = 'src/App.tsx';
let c = fs.readFileSync(appPath, 'utf-8');

// Remover bloco comentado fetchWithRetry /api/whatsapp/messages
c = c.replace(/    \/\*\s*\n\s*fetchWithRetry\('\/api\/whatsapp\/messages'\)[\s\S]*?    \*\//, '');

// Remover socket = io() e disconnect se ficou vazio
c = c.replace(/useEffect\(\(\) => \{\s*const socket = io\(\);\s*\n\s*return \(\) => \{\s*socket\.disconnect\(\);\s*\};\s*\}, \[\]\);/, '');

fs.writeFileSync(appPath, c);
console.log('App.tsx finalizado');
