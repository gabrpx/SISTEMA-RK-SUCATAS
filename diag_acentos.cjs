const fs = require('fs');

const files = [
  'src/App.tsx',
  'src/views/DashboardView.tsx',
  'src/components/AdminUsers.tsx',
  'src/components/Login.tsx',
  'src/components/filters/MotoFilters.tsx'
];

for (const f of files) {
  const buf = fs.readFileSync(f);
  console.log(`\n=== ${f} ===`);
  
  // Procurar por "SA" seguido de possíveis variações
  for (let i = 0; i < buf.length - 2; i++) {
    if (buf[i] === 0x53 && buf[i+1] === 0x41) { // "SA"
      const hex = buf.slice(i, Math.min(i+8, buf.length)).toString('hex');
      const preview = buf.slice(i, Math.min(i+8, buf.length)).toString('utf-8');
      console.log(`  pos=${i} hex=${hex} preview="${preview}"`);
    }
  }
  
  // Procurar por "CR" seguido de possíveis variações
  for (let i = 0; i < buf.length - 2; i++) {
    if (buf[i] === 0x43 && buf[i+1] === 0x52) { // "CR"
      const hex = buf.slice(i, Math.min(i+10, buf.length)).toString('hex');
      const preview = buf.slice(i, Math.min(i+10, buf.length)).toString('utf-8');
      console.log(`  CR pos=${i} hex=${hex} preview="${preview}"`);
    }
  }

  // Procurar por "D" seguido de possíveis variações de É (DÉBITO)
  for (let i = 0; i < buf.length - 1; i++) {
    if (buf[i] === 0x44) { // "D"
      const hex = buf.slice(i, Math.min(i+8, buf.length)).toString('hex');
      const preview = buf.slice(i, Math.min(i+8, buf.length)).toString('utf-8');
      if (preview.includes('D') && (preview.includes('') || preview.includes('Ã') || preview.includes('à'))) {
        console.log(`  D pos=${i} hex=${hex} preview="${preview}"`);
      }
    }
  }
}
