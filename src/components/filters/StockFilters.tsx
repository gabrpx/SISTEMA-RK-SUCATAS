// ============================================
// STOCK FILTERS - Componente de filtros para view de Estoque
// ============================================
// Funcionalidades:
// - Barra de busca textual (nome, descrição, código)
// - Filtro por categoria (dropdown)
// - Filtro por modelo de moto (dropdown)
// - Ordenação (recentes, preço, nome, estoque)
// - Botões: Sincronizar, Novo Item, Limpar filtros
// ============================================

import React from 'react';
import { Search, X, Filter, Bike, ArrowDownAZ, RefreshCw, Plus } from 'lucide-react';
import { CustomDropdown } from '../CustomDropdown';
import { CATEGORIAS_OFICIAIS, MOTOS_OFICIAIS } from '../../constants/lists';
import { cn } from '../../utils';

interface StockFiltersProps {
  // Tema
  theme: 'dark' | 'light';
  
  // Busca
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  
  // Filtros
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  selectedMoto: string;
  setSelectedMoto: (value: string) => void;
  
  // Ordenação
  sortConfig: { key: string; direction: string };
  setSortConfig: (value: { key: string; direction: string }) => void;
  
  // Estados de loading
  loading: boolean;
  isRefreshing: boolean;
  
  // Ações
  onRefresh: () => void;
  onNewItem: () => void;
  
  // Permissões
  readOnly: boolean;
  
  // Reset de página (chamado após qualquer filtro)
  setCurrentPage: (page: number) => void;
}

export function StockFilters({
  theme,
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  selectedMoto,
  setSelectedMoto,
  sortConfig,
  setSortConfig,
  loading,
  isRefreshing,
  onRefresh,
  onNewItem,
  readOnly,
  setCurrentPage,
}: StockFiltersProps) {
  
  // Função auxiliar: reset para página 1 após qualquer filtro
  const handleFilterChange = (callback: () => void) => {
    callback();
    setCurrentPage(1);
  };

  // Verifica se há filtros ativos para mostrar botão "Limpar"
  const hasActiveFilters = searchTerm !== '' || selectedCategory !== 'Todas' || selectedMoto !== 'Todas';
  
  // Limpa todos os filtros
  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCategory('Todas');
    setSelectedMoto('Todas');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      
      {/* ========================================== */}
      {/* BARRA DE PESQUISA */}
      {/* ========================================== */}
      <div className="relative group">
        {/* Efeito de glow no hover */}
        <div className={cn(
          "absolute inset-0 rounded-2xl blur-xl transition-all duration-300 opacity-0 group-hover:opacity-100",
          theme === 'dark' ? "bg-violet-500/20" : "bg-violet-400/20"
        )} />
        
        {/* Container do input */}
        <div className={cn(
          "relative flex items-center gap-3 rounded-2xl border transition-all duration-300 focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-500",
          theme === 'dark' 
            ? "bg-zinc-900/50 border-zinc-700 hover:bg-zinc-900" 
            : "bg-white border-zinc-200 hover:shadow-lg hover:shadow-zinc-200/50"
        )}>
          <Search className={cn(
            "ml-4 transition-colors duration-200",
            theme === 'dark' ? "text-zinc-500 group-focus-within:text-violet-400" : "text-zinc-400 group-focus-within:text-violet-500"
          )} size={18} />
          
          <input
            type="text"
            placeholder="Buscar peças por nome, descrição ou código..."
            value={searchTerm}
            onChange={(e) => handleFilterChange(() => setSearchTerm(e.target.value))}
            className={cn(
              "flex-1 py-3.5 pr-4 bg-transparent outline-none text-sm placeholder:text-sm",
              theme === 'dark' ? "text-zinc-100 placeholder:text-zinc-600" : "text-zinc-900 placeholder:text-zinc-400"
            )}
          />
          
          {/* Botão limpar busca - aparece só quando há texto */}
          {searchTerm && (
            <button
              onClick={() => handleFilterChange(() => setSearchTerm(''))}
              className={cn(
                "mr-2 p-1.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95",
                theme === 'dark' ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-100 text-zinc-500"
              )}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* LINHA DE FILTROS E AÇÕES */}
      {/* ========================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        
        {/* GRUPO ESQUERDO - Dropdowns de filtro */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Filtro por Categoria */}
          <CustomDropdown
            theme={theme}
            icon={<Filter size={14} />}
            value={selectedCategory}
            className="min-w-[130px]"
            onChange={(val) => handleFilterChange(() => setSelectedCategory(val))}
            options={[
              { value: 'Todas', label: 'Todas categorias' },
              ...CATEGORIAS_OFICIAIS.map(cat => ({ value: cat, label: cat }))
            ]}
          />
          
          {/* Filtro por Moto */}
          <CustomDropdown
            theme={theme}
            icon={<Bike size={14} />}
            value={selectedMoto}
            className="min-w-[130px]"
            onChange={(val) => handleFilterChange(() => setSelectedMoto(val))}
            options={[
              { value: 'Todas', label: 'Todas motos' },
              ...MOTOS_OFICIAIS.map(moto => ({ value: moto, label: moto }))
            ]}
          />

          {/* Ordenação */}
          <CustomDropdown
            theme={theme}
            icon={<ArrowDownAZ size={14} />}
            value={sortConfig.key}
            className="min-w-[130px]"
            onChange={(val) => handleFilterChange(() => setSortConfig({ key: val, direction: 'desc' }))}
            options={[
              { value: 'criado_em', label: 'Mais recentes' },
              { value: 'valor', label: 'Menor preço' },
              { value: 'nome', label: 'Ordem alfabética' },
              { value: 'estoque', label: 'Estoque (maior)' }
            ]}
          />
        </div>

        {/* GRUPO DIREITO - Botões de ação */}
        <div className="flex items-center gap-2">
          
          {/* Botão Sincronizar */}
          <button 
            onClick={onRefresh}
            disabled={loading || isRefreshing}
            className={cn(
              "h-10 px-5 rounded-xl transition-all duration-200 border text-[11px] font-bold uppercase tracking-wider shadow-sm",
              theme === 'dark' 
                ? "bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100" 
                : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            )}
          >
            <div className="flex items-center gap-2">
              <RefreshCw size={14} className={cn((loading || isRefreshing) && "animate-spin")} />
              <span className="hidden sm:inline">Sincronizar</span>
            </div>
          </button>

          {/* Botão Novo Item - só aparece se não for readOnly */}
          {!readOnly && (
            <button 
              onClick={onNewItem}
              className={cn(
                "h-10 px-6 rounded-xl transition-all duration-200 text-[11px] font-bold uppercase tracking-wider shadow-md",
                theme === 'dark'
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:shadow-lg hover:shadow-violet-500/30"
                  : "bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:shadow-lg hover:shadow-violet-500/25"
              )}
            >
              <div className="flex items-center gap-2">
                <Plus size={16} />
                <span>Novo Item</span>
              </div>
            </button>
          )}

          {/* Botão Limpar Filtros - aparece APENAS quando há filtros ativos */}
          {hasActiveFilters && (
            <button 
              onClick={clearAllFilters}
              className={cn(
                "h-10 px-4 rounded-xl transition-all duration-200 text-[11px] font-bold uppercase tracking-wider",
                theme === 'dark' 
                  ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20" 
                  : "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200"
              )}
            >
              <div className="flex items-center gap-2">
                <X size={14} />
                <span>Limpar</span>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
