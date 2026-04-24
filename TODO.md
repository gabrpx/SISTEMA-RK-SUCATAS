# Plano: Extrair DashboardView do App.tsx

## Passos
- [x] Analisar App.tsx e identificar componentes/funções do Dashboard
- [ ] Extrair `StatCard`, `QuestionsModal`, `DashboardView`, `formatRelativeTime` para `src/views/DashboardView.tsx`
- [ ] Ajustar imports no novo arquivo (React, lucide, recharts, motion, utils, api, App)
- [ ] Remover os componentes extraídos do `App.tsx`
- [ ] Adicionar `import { DashboardView } from './views/DashboardView'` no App.tsx
- [ ] Testar build para garantir que não há erros de import circular

