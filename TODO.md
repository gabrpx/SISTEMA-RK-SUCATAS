# Correção Timezone Vendas

## Problema
Vendas salvas no dia 23 aparecem como dia 22 (aba "Ontem"). Strings `YYYY-MM-DD` sem timezone são interpretadas como UTC pelo JavaScript.

## Passos
- [x] 1. Entender o problema (backend salva `2025-01-23`, frontend parseia como UTC)
- [x] 2. Adicionar `parseLocalDate` em `src/utils.ts`
- [x] 3. Atualizar `src/App.tsx` para usar `parseLocalDate` em:
  - [x] DashboardView (parseDate, gráficos, métricas)
  - [x] SalesView (formatDate, filtros já parcialmente corrigidos)
  - [x] Exibições de data de vendas
- [x] 4. Atualizar `src/components/GlobalSearch.tsx` para usar `parseLocalDate`
- [x] 5. Testar/verificar se não há regressões

## Status
Concluído em: 23/01/2025

