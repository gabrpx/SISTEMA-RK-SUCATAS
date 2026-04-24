// ============================================
// MOTO FILTERS - Componente de filtros para view de Motos
// ============================================
// Funcionalidades:
// - Barra de busca textual (nome da moto)
// - Filtro por marca (botões: Todas, Honda, Suzuki, etc)
// - Ordenação (recentes, nome, preço, cilindrada, ano, lote)
// - Filtros avançados: cilindrada (dropdown), ano (min), valor (min/max)
// ============================================

import React from 'react';
import { Search, X, RefreshCw, Plus, Filter, Calendar, DollarSign, Gauge } from 'lucide-react';
import { CustomDropdown } from '../CustomDropdown';
import { cn } from '../../utils';

interface MotoFiltersProps {
  // Tema
  theme: 'dark' | 'light';
  
  // Busca
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  
  // Filtro por marca
  brandFilter: string;
  setBrandFilter: (value: string) => void;
  brands: string[];  // Lista de marcas disponíveis
  
  // Ordenação
  sortOrder: string;
  setSortOrder: (value: string) => void;
  
  // Filtro por cilindrada
  cilindradaFilter: string;
  setCilindradaFilter: (value: string) => void;
  cilindradas: string[];  // Lista de cilindradas disponíveis
  
  // Filtro por ano (mínimo)
  anoMinFilter: string;
  setAnoMinFilter: (value: string) => void;
  
  // Filtro por valor (mínimo e máximo)
  valorMinFilter: string;
  setValorMinFilter: (value: string) => void;
  valorMaxFilter: string;
  setValorMaxFilter: (value: string) => void;
  
  // Estados de loading
  loading: boolean;
  isRefreshing: boolean;
  
  // Ações
  onRefresh: () => void;
  onNewItem: () => void;
  
  // Permissões
  readOnly: boolean;
  
  // Reset de página
  setCurrentPage: (page: number) => void;
}

export function MotoFilters({
  theme,
  searchTerm,
  setSearchTerm,
  brandFilter,
  setBrandFilter,
  brands,
  sortOrder,
  setSortOrder,
  cilindradaFilter,
  setCilindradaFilter,
  cilindradas,
  anoMinFilter,
  setAnoMinFilter,
  valorMinFilter,
  setValorMinFilter,
  valorMaxFilter,
  setValorMaxFilter,
  loading,
  isRefreshing,
  onRefresh,
  onNewItem,
  readOnly,
  setCurrentPage,
}: MotoFiltersProps) {
  
  // Função auxiliar: reset para página 1
  const handleFilterChange = (callback: () => void) => {
    callback();
    setCurrentPage(1);
  };

  // Opções de ordenação disponíveis
  const sortOptions = [
    { value: "Data de Criação", label: "📅 Mais recente" },
    { value: "Data de Criação Antigo", label: "📅 Mais antigo" },
    { value: "Nome", label: "🔤 Nome" },
    { value: "Mais baratas", label: "💰 Mais baratas" },
    { value: "Mais caras", label: "💰 Mais caras" },
    { value: "Baixa cilindrada", label: "⚡ Baixa cilindrada" },
    { value: "Alta cilindrada", label: "⚡ Alta cilindrada" },
    { value: "Ano", label: "📆 Ano" },
    ...(readOnly ? [] : [{ value: "Lote", label: "📦 Lote" }]),
  ];

  // Verifica se há filtros ativos
  const hasActiveFilters = 
    searchTerm !== '' || 
    brandFilter !== 'Todas' || 
    cilindradaFilter !== 'Todas' || 
    anoMinFilter !== '' || 
    valorMinFilter !== '' || 
    valorMaxFilter !== '';

  // Limpa todos os filtros
  const clearAllFilters = () => {
    setSearchTerm('');
    setBrandFilter('Todas');
    setCilindradaFilter('Todas');
    setAnoMinFilter('');
    setValorMinFilter('');
    setValorMaxFilter('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      
      {/* ========================================== */}
      {/* BARRA DE PESQUISA */}
      {/* ========================================== */}
      <div className="relative group">
        <div className={cn(
          "absolute inset-0 rounded-2xl blur-xl transition-all duration-300 opacity-0 group-hover:opacity-100",
          theme === 'dark' ? "bg-violet-500/20" : "bg-violet-400/20"
        )} />
        
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
            placeholder="Buscar motos por nome, modelo ou marca..."
            value={searchTerm}
            onChange={(e) => handleFilterChange(() => setSearchTerm(e.target.value))}
            className={cn(
              "flex-1 py-3.5 pr-4 bg-transparent outline-none text-sm placeholder:text-sm",
              theme === 'dark' ? "text-zinc-100 placeholder:text-zinc-600" : "text-zinc-900 placeholder:text-zinc-400"
            )}
          />
          
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
      {/* LINHA DE AÇÕES (Sincronizar + Nova Moto) */}
      {/* ========================================== */}
      <div className="flex items-center justify-end gap-2">
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
              <span>Nova Moto</span>
            </div>
          </button>
        )}
      </div>

      {/* ========================================== */}
      {/* FILTRO POR MARCA (Botões) */}
      {/* ========================================== */}
      <div className="flex flex-col gap-2">
        <span className={cn(
          "text-[10px] font-bold uppercase tracking-wider ml-1 flex items-center gap-1",
          theme === 'dark' ? "text-zinc-400" : "text-zinc-500"
        )}>
          <Filter size={12} /> Filtrar por marca
        </span>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {brands.map((brand) => (
            <button
              key={brand}
              onClick={() => handleFilterChange(() => setBrandFilter(brand))}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
                brandFilter === brand
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-transparent shadow-md shadow-violet-500/20"
                  : theme === 'dark' 
                    ? "bg-zinc-800/50 text-zinc-400 border-zinc-700/50 hover:bg-zinc-800 hover:text-zinc-300" 
                    : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900"
              )}
            >
              {brand}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================== */}
{/* ORDENAÇÃO (Botões) */}
      {/* ========================================== */}
      <div className="flex flex-col gap-2">
        <span className={cn(
          "text-[10px] font-bold uppercase tracking-wider ml-1",
          theme === 'dark' ? "text-zinc-400" : "text-zinc-500"
        )}>
          Ordenar por
        </span>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleFilterChange(() => setSortOrder(option.value))}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
                sortOrder === option.value
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-transparent shadow-md shadow-violet-500/20"
                  : theme === 'dark' 
                    ? "bg-zinc-800/50 text-zinc-400 border-zinc-700/50 hover:bg-zinc-800 hover:text-zinc-300" 
                    : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================== */}
      {/* FILTROS AVANÇADOS (Cilindrada, Ano, Valor) */}
      {/* ========================================== */}
      {!readOnly && (
        <div className={cn(
          "flex flex-wrap items-center gap-3 p-3 rounded-2xl border transition-all duration-300",
          theme === 'dark' 
            ? "bg-zinc-900/50 border-zinc-800" 
            : "bg-zinc-50 border-zinc-200"
        )}>
          
          {/* Cilindrada */}
          <div className="flex items-center gap-2">
            <Gauge size={14} className={theme === 'dark' ? "text-zinc-500" : "text-zinc-400"} />
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Cilindrada:</span>
            <CustomDropdown
              theme={theme}
              value={cilindradaFilter}
              onChange={(val) => handleFilterChange(() => setCilindradaFilter(val))}
              options={cilindradas.map(c => ({ value: c, label: c }))}
              className="w-28"
              compact
            />
          </div>

          {/* Ano mínimo */}
          <div className="flex items-center gap-2">
            <Calendar size={14} className={theme === 'dark' ? "text-zinc-500" : "text-zinc-400"} />
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Ano mínimo:</span>
            <input 
              type="number"
              placeholder="Ano"
              value={anoMinFilter}
              onChange={(e) => handleFilterChange(() => setAnoMinFilter(e.target.value))}
              className={cn(
                "w-24 border rounded-xl py-2 px-3 text-xs font-medium outline-none transition-all",
                theme === 'dark' 
                  ? "bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-violet-500" 
                  : "bg-white border-zinc-200 text-zinc-900 focus:border-violet-500"
              )}
            />
          </div>

          {/* Valor mínimo e máximo */}
          <div className="flex items-center gap-2">
            <DollarSign size={14} className={theme === 'dark' ? "text-zinc-500" : "text-zinc-400"} />
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Valor:</span>
            <div className="flex items-center gap-1">
              <input 
                type="number"
                placeholder="Min"
                value={valorMinFilter}
                onChange={(e) => handleFilterChange(() => setValorMinFilter(e.target.value))}
                className={cn(
                  "w-24 border rounded-xl py-2 px-3 text-xs font-medium outline-none transition-all",
                  theme === 'dark' 
                    ? "bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-violet-500" 
                    : "bg-white border-zinc-200 text-zinc-900 focus:border-violet-500"
                )}
              />
              <span className="text-zinc-500 text-xs">até</span>
              <input 
                type="number"
                placeholder="Max"
                value={valorMaxFilter}
                onChange={(e) => handleFilterChange(() => setValorMaxFilter(e.target.value))}
                className={cn(
                  "w-24 border rounded-xl py-2 px-3 text-xs font-medium outline-none transition-all",
                  theme === 'dark' 
                    ? "bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-violet-500" 
                    : "bg-white border-zinc-200 text-zinc-900 focus:border-violet-500"
                )}
              />
            </div>
          </div>

          {/* Botão limpar filtros avançados */}
          {hasActiveFilters && (
            <button 
              onClick={clearAllFilters}
              className="text-xs text-rose-400 hover:text-rose-300 font-bold uppercase tracking-wider flex items-center gap-1 transition-colors ml-auto"
            >
              <X size={14} />
              Limpar Filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}
