// ============================================
// SALE FILTERS - Componente de filtros para view de Vendas
// ============================================
// Funcionalidades:
// - Barra de busca textual (peça, moto, ID da venda)
// - Filtro por tipo de pagamento (dropdown)
// - Filtros rápidos: Tudo, Hoje, Ontem, Semana, Mês, 30 Dias
// - Seletor de período personalizado (data inicial e final)
// ============================================

import React, { useRef } from 'react';
import { Search, X, RefreshCw, Plus, Filter, Calendar } from 'lucide-react';
import { CustomDropdown } from '../CustomDropdown';
import { cn } from '../../utils';

interface SaleFiltersProps {
  // Tema
  theme: 'dark' | 'light';
  
  // Busca
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  searchInputRef?: React.RefObject<HTMLInputElement>;
  
  // Filtro por tipo de pagamento
  paymentType: string;
  setPaymentType: (value: string) => void;
  paymentTypes: string[];
  
  // Filtros rápidos (Hoje, Ontem, Semana, Mês, etc)
  quickFilter: string;
  setQuickFilter: (value: string) => void;
  
  // Filtro por período personalizado (datas)
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  
  // Estados de loading
  loading: boolean;
  isRefreshing: boolean;
  
  // Ações
  onRefresh: () => void;
  onNewSale: () => void;
  onClearFilters: () => void;
  
  // Reset de página
  setCurrentPage: (page: number) => void;
}

// Opções de filtro rápido
const QUICK_FILTERS = [
  { id: 'all', label: 'Tudo' },
  { id: 'today', label: 'Hoje' },
  { id: 'yesterday', label: 'Ontem' },
  { id: 'this-week', label: 'Semana' },
  { id: 'this-month', label: 'Mês' },
  { id: 'last-30-days', label: '30 Dias' },
];

export function SaleFilters({
  theme,
  searchTerm,
  setSearchTerm,
  searchInputRef,
  paymentType,
  setPaymentType,
  paymentTypes,
  quickFilter,
  setQuickFilter,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  loading,
  isRefreshing,
  onRefresh,
  onNewSale,
  onClearFilters,
  setCurrentPage,
}: SaleFiltersProps) {
  
  // Função auxiliar: reset para página 1 após qualquer filtro
  const handleFilterChange = (callback: () => void) => {
    callback();
    setCurrentPage(1);
  };

  // Aplica filtro rápido e reseta as datas personalizadas
  const handleQuickFilterClick = (filterId: string) => {
    setQuickFilter(filterId);
    setStartDate('');   // Limpa data inicial ao usar filtro rápido
    setEndDate('');     // Limpa data final ao usar filtro rápido
    setCurrentPage(1);
  };

  // Aplica datas personalizadas e reseta o filtro rápido
  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setStartDate(value);
    } else {
      setEndDate(value);
    }
    setQuickFilter('all');  // Reseta filtro rápido ao usar datas personalizadas
    setCurrentPage(1);
  };

  // Verifica se há filtros ativos
  const hasActiveFilters = searchTerm !== '' || paymentType !== 'Todos' || quickFilter !== 'all' || startDate !== '' || endDate !== '';

  return (
    <div className="space-y-4">
      
      {/* ========================================== */}
      {/* TOOLBAR PRINCIPAL - Busca + Ações */}
      {/* ========================================== */}
      <div className={cn(
        "p-3 md:p-4 rounded-2xl md:rounded-3xl transition-all duration-300 shadow-xl border",
        theme === 'dark' 
          ? "bg-zinc-900/90 backdrop-blur-xl border-zinc-800 shadow-black/40" 
          : "bg-white/90 backdrop-blur-xl border-zinc-100 shadow-zinc-200/40"
      )}>
        
        {/* Barra de busca */}
        <div className="w-full relative group mb-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-violet-500 transition-colors" size={18} />
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="Buscar por peça, moto ou ID da venda..." 
            value={searchTerm}
            onChange={(e) => handleFilterChange(() => setSearchTerm(e.target.value))}
            className={cn(
              "w-full rounded-xl py-3 pl-11 pr-4 text-sm font-medium outline-none transition-all duration-200 border shadow-inner",
              theme === 'dark' 
                ? "bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/50" 
                : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:bg-white"
            )}
          />
        </div>

        {/* Linha de ações (filtro + botões) */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2">
          
          {/* Filtro de tipo de pagamento */}
          <div className="flex flex-wrap items-center gap-2">
            <CustomDropdown
              theme={theme}
              icon={<Filter size={14} />}
              value={paymentType}
              className="min-w-[140px]"
              onChange={(val) => handleFilterChange(() => setPaymentType(val))}
              options={paymentTypes.map(type => ({ value: type, label: type }))}
            />
          </div>

          {/* Botões de ação */}
          <div className="flex items-center gap-2">
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
                <span className="hidden md:inline">Sincronizar</span>
              </div>
            </button>

            <button 
              onClick={onNewSale}
              className={cn(
                "h-10 px-6 rounded-xl transition-all duration-200 text-[11px] font-bold uppercase tracking-wider shadow-md",
                theme === 'dark'
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:shadow-lg hover:shadow-violet-500/30"
                  : "bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:shadow-lg hover:shadow-violet-500/25"
              )}
            >
              <div className="flex items-center gap-2">
                <Plus size={16} />
                <span>Nova Venda</span>
              </div>
            </button>

            {hasActiveFilters && (
              <button 
                onClick={onClearFilters}
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

      {/* ========================================== */}
      {/* FILTROS RÁPIDOS E PERÍODO */}
      {/* ========================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2">
        
        {/* Botões de filtro rápido */}
        <div className="flex flex-wrap items-center gap-2">
          {QUICK_FILTERS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => handleQuickFilterClick(filter.id)}
              className={cn(
                "px-3 md:px-4 py-2 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all border",
                quickFilter === filter.id
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 border-transparent text-white shadow-md shadow-violet-500/20"
                  : theme === 'dark'
                    ? "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Seletor de período personalizado */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className={cn(
            "w-full sm:w-auto flex items-center gap-2 border rounded-xl px-3 py-2",
            theme === 'dark' ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"
          )}>
            <Calendar size={14} className={theme === 'dark' ? "text-zinc-500" : "text-zinc-400"} />
            <input 
              type="date"
              value={startDate}
              onChange={(e) => handleDateChange('start', e.target.value)}
              className={cn(
                "bg-transparent text-sm outline-none w-full",
                theme === 'dark' ? "text-zinc-200" : "text-zinc-900"
              )}
              placeholder="Data inicial"
            />
            <span className={theme === 'dark' ? "text-zinc-600" : "text-zinc-400"}>até</span>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => handleDateChange('end', e.target.value)}
              className={cn(
                "bg-transparent text-sm outline-none w-full",
                theme === 'dark' ? "text-zinc-200" : "text-zinc-900"
              )}
              placeholder="Data final"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
