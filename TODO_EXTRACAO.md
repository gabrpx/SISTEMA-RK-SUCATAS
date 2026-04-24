# TODO - Extração de Views do App.tsx

## Objetivo
Remover as views Estoque, Vendas e Motos do App.tsx para arquivos separados em `src/views/`, mantendo 100% da funcionalidade.

## Progresso

### Fase 1: Extrair InventoryView (Estoque)
- [ ] Criar `src/context/DataContext.tsx` (DataContext + DataProvider)
- [ ] Criar `src/utils/hooks.ts` (useDebounce)
- [ ] Criar `src/utils/api.ts` (fetchWithRetry + parseJson)
- [ ] Criar `src/components/SkeletonRow.tsx` (componente compartilhado)
- [ ] Criar `src/views/InventoryView.tsx` (InventoryRow + InventoryView)
- [ ] Editar `src/App.tsx` (remover código movido, adicionar imports)
- [ ] Testar build

### Fase 2: Extrair SalesView (Vendas) - AGUARDANDO PERMISSÃO
- [ ] Criar `src/views/SalesView.tsx`
- [ ] Editar `src/App.tsx`

### Fase 3: Extrair MotosView (Motos) - AGUARDANDO PERMISSÃO
- [ ] Criar `src/views/MotosView.tsx`
- [ ] Editar `src/App.tsx`

