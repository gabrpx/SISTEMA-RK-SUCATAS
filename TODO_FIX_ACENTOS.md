# Plano de Correção de Acentos

## Problema
Arquivos `.tsx` foram salvos com encoding corrompido, exibindo acentos quebrados como `MÃªs` em vez de `Mês`.

## Arquivos Identificados (com acentos quebrados)
- `src/views/DashboardView.tsx` — labels, comentários, strings de UI
- `src/App.tsx` — comentários, strings, mensagens de erro
- `src/views/InventoryView.tsx` — labels de colunas, placeholders, textos
- `src/components/BudgetModal.tsx` — textos de orçamento
- `src/components/AdminUsers.tsx` — mensagens de confirmação
- `src/context/DataContext.tsx` — comentários, logs
- `src/views/MercadoLivreView.tsx` — textos de integração
- `src/components/FreteView.tsx` — textos de envio

## Ação
Substituir todas as ocorrências de sequências UTF-8 mal interpretadas (ex: `Ãª`→`ê`, `Ã­`→`í`, `Ã§`→`ç`, `Ã£`→`ã`, `Ãµ`→`õ`, `Ã³`→`ó`, `Ãº`→`ú`, `Ã`→`à`, etc.) nos arquivos listados.

## Status
✅ Concluído em 09/01/2025

- Script `fix_acentos.cjs` executado com sucesso.
- 9 arquivos corrigidos de 49 analisados.
- Todas as sequências corrompidas (ex: `MÃªs`, `SaÃ­das`, `Ãšltimos`) foram convertidas para acentos UTF-8 corretos.
- Busca pós-execução confirmou 0 ocorrências restantes de acentos quebrados.

## Correções Complementares (10/01/2025)
- Script `fix_acentos2.cjs` aplicado para corrigir maiúsculas acentuadas quebradas (ex: `Ã‰`→`É`, `ÃŠ`→`Ê`, `Ãš`→`Ú`).

## Correções Finais (Rodada Atual)
Padrões restantes corrigidos manualmente:
- `àš` → `Ú` (Últimos, Últimas)
- `à‰` → `É` (CRÉDITO, DÉBITO)
- `àŠ` → `Ê` (PENDÊNCIA)
- `â†‘` → `↑`
- `â†“` → `↓`
- `â†` → `←`
- `ÇàO` / `çào` → `ÇÃO` / `ção` (ATENÇÃO, ORDENAÇÃO, GESTÃO, EXPORTAÇÃO, NÃO)

Arquivos editados:
- `src/App.tsx`
- `src/views/DashboardView.tsx`
- `src/components/AdminUsers.tsx`
- `src/components/Login.tsx`
- `src/components/filters/MotoFilters.tsx`
- `src/components/filters/index.ts`
- `middleware/auth.ts`

Verificação pós-correção: nenhum acento quebrado restante nos arquivos ativos.

