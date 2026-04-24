# Plano de Correção: Timezone nas Vendas (Hoje → Ontem)

## Informações Coletadas
- `src/utils.ts` já possui `parseLocalDate` funcional que converte `YYYY-MM-DD` para `Date` local sem shift de UTC
- Backend (`server.ts`) salva vendas no formato `YYYY-MM-DD` com timezone de São Paulo
- O bug ocorre quando `new Date('2025-01-23')` é interpretado como UTC (meia-noite UTC = 21h do dia anterior em Brasília)

## Locais com Problema Identificados

### `src/App.tsx` (~7 ocorrências)
1. `latestSales` useMemo — sort usa `new Date(b.data)` direto
2. `filteredSalesByType` useMemo — sort usa `new Date(b.data)` direto  
3. Cards ML (DashboardView) — exibição `{new Date(sale.data).toLocaleDateString(...)}`
4. Modal Transações — exibição `{new Date(sale.data).toLocaleDateString(...)}`
5. `handleEditSale` — `new Date(sale.data).toISOString()` gera data errada pro input date
6. `filteredItems` (SalesView) — filtro de data rápida/período usa `new Date(item.data)`
7. `chartData` (DashboardView) — `parseDate` interno já é parcialmente ok, mas `new Date(dateStr)` usado em `sales.forEach`

### `src/components/GlobalSearch.tsx` (~1 ocorrência)
1. `getResults` — `const saleDate = new Date(sale.data)` para comparação de mês

## Plano de Edição

### Etapa 1: `src/App.tsx`
- Substituir `new Date(b.data)` por `parseLocalDate(b.data)` nos sorts
- Substituir `new Date(sale.data)` por `parseLocalDate(sale.data)` nas exibições ML
- Substituir `new Date(sale.data).toISOString()` por `parseLocalDate(sale.data)` + formatar para `YYYY-MM-DD`
- Substituir `let itemDate = new Date(item.data)` por `let itemDate = parseLocalDate(item.data)` no filtro
- Verificar `chartData` `parseDate` interno e garantir consistência

### Etapa 2: `src/components/GlobalSearch.tsx`
- Importar `parseLocalDate` de `../utils`
- Substituir `new Date(sale.data)` por `parseLocalDate(sale.data)` no filtro de mês

### Etapa 3: `TODO.md`
- Marcar passos 2, 3, 4 como concluídos

## Arquivos Dependentes
- `src/App.tsx`
- `src/components/GlobalSearch.tsx`
- `TODO.md`

## Follow-up
- Build/test para verificar se não há regressões
- Verificar se filtros "Hoje", "Ontem", "Semana", "Mês" refletem corretamente

