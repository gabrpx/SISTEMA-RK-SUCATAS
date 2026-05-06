import React, { useState, useEffect, useMemo, useContext, useRef, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Filter, RefreshCw, Plus, X, Check, Calendar, Edit, Trash2, ChevronLeft, ChevronRight, Loader2, Save, ShoppingCart } from "lucide-react";
import { cn, parseLocalDate } from "../utils";
import { CustomDropdown } from "../components/CustomDropdown";
import { PAGAMENTOS_OFICIAIS } from "../constants/lists";
import { useDebounce } from "../hooks/useDebounce";
import { fetchWithRetry } from "../lib/apiClient";
import { extrairCategoria, extrairModeloMoto } from "../utils/motoParsing";
import { DataContext } from "../App";

const SkeletonRow = memo(({ theme }: { theme: 'light' | 'dark', key?: any }) => (
  <tr className="animate-pulse transform-gpu">
    <td className="px-6 py-4"><div className={cn("h-4 rounded w-16", theme === 'dark' ? "bg-zinc-800" : "bg-zinc-200")}></div></td>
    <td className="px-6 py-4"><div className={cn("h-4 rounded w-48", theme === 'dark' ? "bg-zinc-800" : "bg-zinc-200")}></div></td>
    <td className="px-6 py-4"><div className={cn("h-4 rounded w-32", theme === 'dark' ? "bg-zinc-800" : "bg-zinc-200")}></div></td>
    <td className="px-6 py-4"><div className={cn("h-4 rounded w-24", theme === 'dark' ? "bg-zinc-800" : "bg-zinc-200")}></div></td>
    <td className="px-6 py-4"><div className={cn("h-4 rounded w-20", theme === 'dark' ? "bg-zinc-800" : "bg-zinc-200")}></div></td>
  </tr>
));

const SalesView = memo(({ theme, onSelectItem, onRegisterActions, isSearchOpen }: { theme: 'light' | 'dark', onSelectItem: (item: any) => void, onRegisterActions?: (actions: any) => void, isSearchOpen?: boolean }) => {
  const { sales: items, loading, refreshData, setSales } = useContext(DataContext);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(window.innerWidth < 768 ? 10 : 25);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{ itemId: string, field: string } | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editingSale, setEditingSale] = useState<any | null>(null);

  useEffect(() => {
    if (isModalOpen || isEditModalOpen || isDeleteConfirmOpen || isBulkDeleteConfirmOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, isEditModalOpen, isDeleteConfirmOpen, isBulkDeleteConfirmOpen]);

  const [formData, setFormData] = useState({
    nome: '',
    moto: '',
    categoria: '',
    valor: '',
    tipo: 'Pix',
    data: new Date().toISOString().split('T')[0]
  });

  const [editFormData, setEditFormData] = useState({
    nome: '',
    moto: '',
    valor: '',
    tipo: 'Pix',
    data: ''
  });

  // Novos estados de filtro
  const [quickFilter, setQuickFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentType, setPaymentType] = useState('Todos');

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedItems.map(item => item.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    const idsToRemove = [...selectedIds];
    setIsBulkDeleteConfirmOpen(false);
    
    // Optimistic update
    setSales(prev => prev.filter(item => !idsToRemove.includes(item.id)));
    setSelectedIds([]);

    try {
      // Supabase supports bulk by array of IDs but we already have id-based routes
      // Let's use a loop or if we added a bulk-delete on backend we use it.
      // I didn't add bulk-delete for vendas on backend yet, let's do it or use single deletes.
      // Better to add it on backend too for parity.
      const response = await fetchWithRetry('/api/vendas/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToRemove })
      });
      
      if (!response.ok) throw new Error('Falha ao excluir vendas');
    } catch (err: any) {
      alert(err.message);
      // Rollback if needed (optional, but good practice)
      refreshData();
    }
  };

  const handleDeleteSale = async () => {
    if (!itemToDelete) return;
    const idToRemove = itemToDelete;
    setIsDeleteConfirmOpen(false);
    
    // Optimistic update
    setSales(prev => prev.filter(item => item.id !== idToRemove));
    setSelectedIds(prev => prev.filter(i => i !== idToRemove));
    setItemToDelete(null);

    try {
      const response = await fetchWithRetry(`/api/vendas/${idToRemove}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Falha ao excluir venda');
    } catch (err: any) {
      alert(err.message);
      refreshData();
    }
  };

  const handleEditSale = (sale: any) => {
    setEditingSale(sale);
    setEditFormData({
      nome: sale.nome || '',
      moto: sale.moto || '',
      valor: sale.valor?.toString() || '',
      tipo: sale.tipo || 'Pix',
      data: sale.data ? parseLocalDate(sale.data).toISOString().split('T')[0] : ''
    });
    setIsEditModalOpen(true);
  };

  const handleInlineEdit = (itemId: string, field: string) => {
    setEditingCell({ itemId, field });
  };

  const handleSaleInlineSave = async (itemId: string, field: string, value: string) => {
    setEditingCell(null);
    
    const itemToUpdate = items.find(s => s.id === itemId);
    if (!itemToUpdate || itemToUpdate[field as keyof typeof itemToUpdate] === value) return;

    const updatedData = { [field]: field === 'valor' ? Number(value) : value };
    
    // Optimistic update
    setSales(prev => prev.map(item => item.id === itemId ? { ...item, ...updatedData } : item));

    try {
      const response = await fetchWithRetry(`/api/vendas/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Falha ao atualizar venda');
      }
      // Refresh to ensure consistency
      refreshData();
    } catch (err: any) {
      alert(err.message);
      refreshData();
    }
  };

  const handleUpdateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;
    const saleId = editingSale.id;
    const updatedData = { ...editFormData, id: saleId, valor: Number(editFormData.valor) };
    
    // Optimistic update
    setSales(prev => prev.map(item => item.id === saleId ? { ...item, ...updatedData } : item));
    setIsEditModalOpen(false);
    setEditingSale(null);

    try {
      const response = await fetchWithRetry(`/api/vendas/${saleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Falha ao atualizar venda');
      }
      // Update with real data from server if needed
      setSales(prev => prev.map(item => item.id === saleId ? result.data : item));
    } catch (err: any) {
      alert(err.message);
      refreshData();
    }
  };

  const handleSaveSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetchWithRetry('/api/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      if (result.success) {
        setSales(prev => [result.data, ...prev]);
        setIsModalOpen(false);
        setFormData({
          nome: '',
          moto: '',
          categoria: '',
          valor: '',
          tipo: 'Pix',
          data: new Date().toISOString().split('T')[0]
        });
      } else {
        throw new Error(result.error || 'Falha ao salvar venda');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (onRegisterActions) {
      onRegisterActions({
        edit: handleEditSale,
        delete: (id: string) => {
          setItemToDelete(id);
          setIsDeleteConfirmOpen(true);
        },
        focusSearch: () => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
            searchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      });
    }
  }, [onRegisterActions]);

  const paymentTypes = useMemo(() => {
    const types = new Set(items.map(item => item.tipo).filter(Boolean));
    return ['Todos', ...Array.from(types)];
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = [...items];

    // Filtro de busca
    if (debouncedSearchTerm) {
      const searchTerms = debouncedSearchTerm.toLowerCase().split(' ').filter(t => t.length > 0);
      result = result.filter(item => 
        searchTerms.every(term => 
          (item.nome?.toLowerCase() || '').includes(term) ||
          (item.numero_id?.toLowerCase() || '').includes(term) ||
          (item.moto?.toLowerCase() || '').includes(term)
        )
      );
    }

    // Filtro de Tipo de Pagamento
    if (paymentType && paymentType !== 'Todos') {
      result = result.filter(item => item.tipo === paymentType);
    }

    // Filtro de Data
    let start: Date | null = null;
    let end: Date | null = null;

    if (quickFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      switch (quickFilter) {
        case 'today':
          start = today;
          end = new Date(today);
          end.setHours(23, 59, 59, 999);
          break;
        case 'yesterday':
          start = new Date(today);
          start.setDate(today.getDate() - 1);
          end = new Date(start);
          end.setHours(23, 59, 59, 999);
          break;
        case 'this-week':
          start = new Date(today);
          start.setDate(today.getDate() - today.getDay());
          end = new Date(today);
          end.setHours(23, 59, 59, 999);
          break;
        case 'this-month':
          start = new Date(today.getFullYear(), today.getMonth(), 1);
          end = new Date(today);
          end.setHours(23, 59, 59, 999);
          break;
        case 'last-30-days':
          start = new Date(today);
          start.setDate(today.getDate() - 30);
          end = new Date(today);
          end.setHours(23, 59, 59, 999);
          break;
      }
    } else if (startDate || endDate) {
      if (startDate) {
        const [y, m, d] = startDate.split('-').map(Number);
        start = new Date(y, m - 1, d);
        start.setHours(0, 0, 0, 0);
      }
      if (endDate) {
        const [y, m, d] = endDate.split('-').map(Number);
        end = new Date(y, m - 1, d);
        end.setHours(23, 59, 59, 999);
      }
    }

    if (start || end) {
      result = result.filter(item => {
        const itemDate = parseLocalDate(item.data);

        if (start && itemDate < start) return false;
        if (end && itemDate > end) return false;
        return true;
      });
    }

    // Ordena por data descendente (mais recente primeiro)
    result.sort((a, b) => parseLocalDate(b.data).getTime() - parseLocalDate(a.data).getTime());

    return result;
  }, [items, debouncedSearchTerm, quickFilter, startDate, endDate, paymentType]);

  const totalValue = useMemo(() => {
    return filteredItems.reduce((acc, item) => acc + (item.valor || 0), 0);
  }, [filteredItems]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const clearAllFilters = () => {
    setSearchTerm('');
    setQuickFilter('all');
    setStartDate('');
    setEndDate('');
    setPaymentType('Todos');
    setCurrentPage(1);
  };

  const formatCurrency = (value: any) => {
    const num = Number(value);
    if (isNaN(num)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const d = parseLocalDate(dateString);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading && items.length === 0) {
    // Não bloquear a tela
  }

  return (
    <div className="space-y-4">
      {/* Toolbar Profissional e Compacta */}
      <div className={cn(
        "relative z-50 p-3 md:p-4 rounded-3xl flex flex-col gap-3 transition-all duration-300 shadow-xl border",
        theme === 'dark' 
          ? "bg-zinc-900/90 backdrop-blur-xl border-zinc-800 shadow-black/40" 
          : "bg-white/90 backdrop-blur-xl border-zinc-100 shadow-zinc-200/40",
        isSearchOpen && "blur-md pointer-events-none opacity-50"
      )}>
        {/* Search Bar Compacta */}
        <div className="w-full relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-violet-500 transition-colors" size={18} />
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="Buscar por peça, moto ou ID..." 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className={cn(
              "w-full rounded-xl py-2.5 pl-11 pr-4 text-sm font-medium outline-none transition-all duration-200 border shadow-inner",
              theme === 'dark' 
                ? "bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/50" 
                : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:bg-white"
            )}
          />
        </div>

        {/* Filtros e Ações Compactos */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CustomDropdown
              theme={theme}
              icon={<Filter size={14} />}
              value={paymentType}
              className="flex-1 md:flex-none"
              onChange={(val) => {
                setPaymentType(val);
                setCurrentPage(1);
              }}
              options={paymentTypes.map(type => ({ value: type, label: type }))}
            />

            <button 
              onClick={handleManualRefresh}
              disabled={loading || isRefreshing}
              className={cn(
                "flex-1 md:flex-none flex items-center justify-center gap-2 h-10 px-4 rounded-xl transition-all duration-200 border text-[11px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md",
                theme === 'dark' 
                  ? "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700" 
                  : "bg-zinc-100 border-zinc-200 text-zinc-500 hover:bg-zinc-200"
              )}
            >
              <RefreshCw size={14} className={cn((loading || isRefreshing) && "animate-spin")} />
              <span className="hidden md:inline">Sincronizar</span>
            </button>

            <button 
              onClick={() => setIsModalOpen(true)}
              className={cn(
                "flex-1 md:flex-none flex items-center justify-center gap-2 h-10 px-4 rounded-xl transition-all duration-200 border text-[11px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md",
                theme === 'dark' 
                  ? "bg-violet-600 border-violet-500 text-white shadow-violet-900/20 hover:bg-violet-500" 
                  : "bg-violet-600 border-violet-500 text-white shadow-violet-200/50 hover:bg-violet-700"
              )}
            >
              <Plus size={16} />
              <span>Nova Venda</span>
            </button>

            {(searchTerm || paymentType !== 'Todos') && (
              <button 
                onClick={clearAllFilters}
                className={cn(
                  "flex-1 md:flex-none flex items-center justify-center gap-2 h-10 px-4 rounded-xl transition-all duration-200 border text-[11px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md",
                  theme === 'dark' 
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20" 
                    : "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                )}
              >
                <X size={16} />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>
      </div>
        {/* Filtros Rápidos e Período */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-4 border-t border-zinc-800/30">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'Tudo' },
              { id: 'today', label: 'Hoje' },
              { id: 'yesterday', label: 'Ontem' },
              { id: 'this-week', label: 'Semana' },
              { id: 'this-month', label: 'Mês' },
              { id: 'last-30-days', label: '30 Dias' },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => {
                  setQuickFilter(filter.id);
                  setStartDate('');
                  setEndDate('');
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-3 md:px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all border",
                  quickFilter === filter.id
                    ? "bg-violet-600 border-violet-500 text-white shadow-[0_8px_20px_rgba(139,92,246,0.3)]"
                    : theme === 'dark'
                      ? "bg-zinc-950 border-zinc-800/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-200"
                      : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className={cn("w-full sm:w-auto flex items-center gap-2 border rounded-xl px-3 py-1.5", theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
              <Calendar size={14} className="text-zinc-500" />
              <input 
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setQuickFilter('all');
                  setCurrentPage(1);
                }}
                className={cn(
                  "bg-transparent text-xs outline-none w-full",
                  theme === 'dark' ? "text-zinc-200" : "text-zinc-900"
                )}
              />
              <span className="text-zinc-500 text-xs">até</span>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setQuickFilter('all');
                  setCurrentPage(1);
                }}
                className={cn(
                  "bg-transparent text-xs outline-none w-full",
                  theme === 'dark' ? "text-zinc-200" : "text-zinc-900"
                )}
              />
            </div>

            <button 
              onClick={clearAllFilters}
              className={cn(
                "w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
                theme === 'dark'
                  ? "bg-zinc-950 border-zinc-800/50 text-zinc-500 hover:text-zinc-200"
                  : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900"
              )}
            >
              Limpar
            </button>
          </div>
        </div>

      {/* Tabela / Cards */}
      <div className="space-y-4">
        {/* Desktop Table */}
        <div className={cn(
          "hidden md:block border rounded-2xl overflow-hidden relative transition-all duration-300",
          theme === 'dark' 
            ? "bg-zinc-900/40 border-zinc-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)]" 
            : "bg-white border-zinc-200 shadow-sm"
        )}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
                <tr className={cn(
                  "transition-colors",
                  theme === 'dark' ? "bg-zinc-800/30" : "bg-zinc-50"
                )}>
                  <th className="px-6 py-4 w-10">
                    <div 
                      onClick={toggleSelectAll}
                      className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-all duration-200",
                        selectedIds.length === paginatedItems.length && paginatedItems.length > 0
                          ? "bg-violet-600 border-violet-600 shadow-[0_0_8px_rgba(139,92,246,0.3)]" 
                          : theme === 'dark' ? "border-zinc-700" : "border-zinc-300"
                      )}
                    >
                      {selectedIds.length === paginatedItems.length && paginatedItems.length > 0 && <Check className="text-white" size={14} />}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Peça</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Moto</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-emerald-500">Valor</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Tipo</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Data</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-right">Ações</th>
                </tr>
            </thead>
            <tbody className={cn(
              "divide-y transition-colors",
              theme === 'dark' ? "divide-zinc-800/30" : "divide-zinc-100"
            )}>
              {loading && items.length === 0 ? (
                Array(5).fill(0).map((_, i) => <SkeletonRow key={i} theme={theme} />)
              ) : paginatedItems.map((item) => (
                <tr 
                  key={item.id} 
                  onClick={() => onSelectItem(item)}
                  className={cn(
                    "transition-all duration-200 group cursor-pointer",
                    selectedIds.includes(item.id) 
                      ? theme === 'dark' ? "bg-violet-500/10" : "bg-violet-50"
                      : theme === 'dark' ? "hover:bg-zinc-800/20" : "hover:bg-zinc-50"
                  )}
                >
                  <td className="px-6 py-4">
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(item.id);
                      }}
                      className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-all duration-200",
                        selectedIds.includes(item.id)
                          ? "bg-violet-600 border-violet-600 shadow-[0_0_8px_rgba(139,92,246,0.3)]" 
                          : theme === 'dark' ? "border-zinc-700" : "border-zinc-300"
                      )}
                    >
                      {selectedIds.includes(item.id) && <Check className="text-white" size={14} />}
                    </div>
                  </td>
                  <td className="px-6 py-4" onDoubleClick={() => handleInlineEdit(item.id, 'nome')}>
                    <div className="flex items-center gap-3">
                      {item.imagem && (
                        <div className="w-8 h-8 rounded-lg overflow-hidden border border-zinc-800/50">
                          <img loading="lazy" src={item.imagem} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      )}
                      {editingCell?.itemId === item.id && editingCell?.field === 'nome' ? (
                        <input 
                          defaultValue={item.nome}
                          onBlur={(e) => handleSaleInlineSave(item.id, 'nome', e.target.value)}
                          autoFocus
                          className="w-full bg-transparent border-b border-violet-500 outline-none"
                        />
                      ) : (
                        <span className={cn("text-sm font-bold tracking-tight", theme === 'dark' ? "text-white" : "text-zinc-900")}>
                          {item.nome ? item.nome.charAt(0).toUpperCase() + item.nome.slice(1) : ''}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-zinc-500" onDoubleClick={() => handleInlineEdit(item.id, 'moto')}>
                    {editingCell?.itemId === item.id && editingCell?.field === 'moto' ? (
                      <input 
                        defaultValue={item.moto}
                        onBlur={(e) => handleSaleInlineSave(item.id, 'moto', e.target.value)}
                        autoFocus
                        className="w-full bg-transparent border-b border-violet-500 outline-none"
                      />
                    ) : (
                      <span className="uppercase font-bold text-[10px] tracking-wider">{item.moto}</span>
                    )}
                  </td>
                  <td className="px-6 py-4" onDoubleClick={() => handleInlineEdit(item.id, 'valor')}>
                    {editingCell?.itemId === item.id && editingCell?.field === 'valor' ? (
                      <input 
                        defaultValue={item.valor}
                        onBlur={(e) => handleSaleInlineSave(item.id, 'valor', e.target.value)}
                        autoFocus
                        className="w-full bg-transparent border-b border-violet-500 outline-none"
                      />
                    ) : (
                      <span className={cn(
                        "text-sm font-black font-sans transition-all duration-300",
                        (item.tipo?.toUpperCase() === 'SAÍDA')
                          ? "text-rose-500 [text-shadow:0_0_10px_rgba(244,63,94,0.5)]"
                          : "text-emerald-500 [text-shadow:0_0_10px_rgba(16,185,129,0.5)]"
                      )}>
                        {item.tipo?.toUpperCase() === 'SAÍDA' ? '-' : ''}{formatCurrency(Math.abs(item.valor))}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {item.tipo && (
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm transition-colors",
                        item.tipo.toUpperCase() === 'PIX' ? (theme === 'dark' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border-emerald-200") :
                        item.tipo.toUpperCase() === 'SAÍDA' ? (theme === 'dark' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-rose-50 text-rose-600 border-rose-200") :
                        item.tipo.toUpperCase() === 'DINHEIRO' ? (theme === 'dark' ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-green-50 text-green-600 border-green-200") :
                        item.tipo.toUpperCase() === 'CRÉDITO' ? (theme === 'dark' ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-orange-50 text-orange-600 border-orange-200") :
                        item.tipo.toUpperCase() === 'DÉBITO' ? (theme === 'dark' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-600 border-blue-200") :
                        item.tipo.toUpperCase() === 'MARCELO' ? (theme === 'dark' ? "bg-violet-500/10 text-violet-400 border-violet-500/20" : "bg-violet-50 text-violet-600 border-violet-200") :
                        item.tipo.toUpperCase().includes('MERCADO LIVRE') ? (theme === 'dark' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-600 border-amber-200") :
                        (theme === 'dark' ? "bg-zinc-800 text-zinc-300 border-zinc-700" : "bg-zinc-100 text-zinc-600 border-zinc-200")
                      )}>
                        {item.tipo}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm transition-colors font-mono",
                      theme === 'dark' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-600 border-blue-200"
                    )}>
                      {formatDate(item.data)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-zinc-600">{item.numero_id}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditSale(item);
                        }}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          theme === 'dark' ? "bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-700" : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
                        )}
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemToDelete(item.id);
                          setIsDeleteConfirmOpen(true);
                        }}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          theme === 'dark' ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" : "text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
                        )}
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

        {/* Mobile Cards */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {loading && items.length === 0 ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className={cn(
                "p-4 rounded-2xl border animate-pulse",
                theme === 'dark' ? "bg-zinc-900/40 border-zinc-800/50" : "bg-white border-zinc-200"
              )}>
                <div className="flex justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800" />
                    <div className="space-y-2">
                      <div className="w-24 h-4 bg-zinc-800 rounded" />
                      <div className="w-16 h-3 bg-zinc-800 rounded" />
                    </div>
                  </div>
                  <div className="w-20 h-6 bg-zinc-800 rounded" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-8 bg-zinc-800 rounded" />
                  <div className="h-8 bg-zinc-800 rounded" />
                </div>
              </div>
            ))
          ) : paginatedItems.map((item) => (
            <div 
              key={item.id}
              onClick={() => onSelectItem(item)}
              className={cn(
                "p-4 rounded-2xl border transition-all active:scale-[0.98]",
                theme === 'dark' 
                  ? "bg-zinc-900/40 border-zinc-800/50" 
                  : "bg-white border-zinc-200 shadow-sm"
              )}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  {item.imagem && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-800/50">
                      <img loading="lazy" src={item.imagem} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className={cn("font-bold text-base", theme === 'dark' ? "text-zinc-200" : "text-zinc-900")}>
                      {item.nome ? item.nome.charAt(0).toUpperCase() + item.nome.slice(1) : ''}
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border",
                        theme === 'dark' ? "bg-zinc-800 text-zinc-400 border-zinc-700" : "bg-zinc-100 text-zinc-500 border-zinc-200"
                      )}>
                        {item.numero_id}
                      </span>
                      {item.moto && (
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border",
                          theme === 'dark' ? "bg-violet-500/10 text-violet-400 border-violet-500/20" : "bg-violet-50 text-violet-600 border-violet-200"
                        )}>
                          {item.moto.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className={cn(
                  "text-lg font-black font-sans transition-all duration-300",
                  (item.tipo?.toUpperCase() === 'SAÍDA')
                    ? "text-rose-500 [text-shadow:0_0_10px_rgba(244,63,94,0.5)]"
                    : "text-emerald-500 [text-shadow:0_0_10px_rgba(16,185,129,0.5)]"
                )}>
                  {item.tipo?.toUpperCase() === 'SAÍDA' ? '-' : ''}{formatCurrency(Math.abs(item.valor))}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {item.tipo && (
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm flex items-center gap-1.5",
                    item.tipo.toUpperCase() === 'PIX' ? (theme === 'dark' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border-emerald-200") :
                    item.tipo.toUpperCase() === 'SAÍDA' ? (theme === 'dark' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-rose-50 text-rose-600 border-rose-200") :
                    item.tipo.toUpperCase() === 'DINHEIRO' ? (theme === 'dark' ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-green-50 text-green-600 border-green-200") :
                    item.tipo.toUpperCase() === 'CRÉDITO' ? (theme === 'dark' ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-orange-50 text-orange-600 border-orange-200") :
                    item.tipo.toUpperCase() === 'DÉBITO' ? (theme === 'dark' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-600 border-blue-200") :
                    item.tipo.toUpperCase() === 'MARCELO' ? (theme === 'dark' ? "bg-violet-500/10 text-violet-400 border-violet-500/20" : "bg-violet-50 text-violet-600 border-violet-200") :
                    item.tipo.toUpperCase().includes('MERCADO LIVRE') ? (theme === 'dark' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-600 border-amber-200") :
                    (theme === 'dark' ? "bg-zinc-800 text-zinc-300 border-zinc-700" : "bg-zinc-100 text-zinc-600 border-zinc-200")
                  )}>
                    {item.tipo}
                  </div>
                )}
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm flex items-center gap-1.5",
                  theme === 'dark' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-600 border-blue-200"
                )}>
                  <Calendar size={10} />
                  {formatDate(item.data)}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800/30">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditSale(item);
                  }}
                  className={cn("flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold", theme === 'dark' ? "bg-zinc-800 text-zinc-400" : "bg-zinc-100 text-zinc-600")}
                >
                  <Edit size={14} />
                  Editar
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setItemToDelete(item.id);
                    setIsDeleteConfirmOpen(true);
                  }}
                  className="flex-1 py-2 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center gap-2 text-xs font-bold"
                >
                  <Trash2 size={14} />
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className={cn(
        "p-4 border rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors",
        theme === 'dark' ? "bg-zinc-900/30 border-zinc-800/50" : "bg-zinc-50 border-zinc-200"
      )}>
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total: {filteredItems.length} vendas</span>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={cn(
              "p-2 border rounded-xl disabled:opacity-30 transition-all",
              theme === 'dark' ? "border-zinc-800 hover:bg-zinc-800" : "border-zinc-200 hover:bg-zinc-100"
            )}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-xs font-bold text-zinc-400">Página {currentPage} de {totalPages}</span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className={cn(
              "p-2 border rounded-xl disabled:opacity-30 transition-all",
              theme === 'dark' ? "border-zinc-800 hover:bg-zinc-800" : "border-zinc-200 hover:bg-zinc-100"
            )}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Modal Nova Venda */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "w-full max-w-lg p-8 rounded-3xl border shadow-2xl relative",
                theme === 'dark' ? "bg-zinc-900/90 backdrop-blur-xl border-zinc-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.2)] text-white" : "bg-white border-zinc-200 text-zinc-900"
              )}
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X size={20} className="text-zinc-500" />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-violet-600/10 rounded-2xl">
                  <ShoppingCart className="text-violet-500" size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Registrar Venda</h2>
                  <p className="text-sm text-zinc-500">Adicione os detalhes da nova transação</p>
                </div>
              </div>

              <form onSubmit={handleSaveSale} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Nova Movimentação</label>
                  <input 
                    required
                    type="text" 
                    value={formData.nome}
                    onChange={(e) => {
                      const novoNome = e.target.value;
                      setFormData(prev => {
                        const novoEstado = {...prev, nome: novoNome};
                        // Lógica de extração automática
                        if (novoNome.length < 3) {
                          novoEstado.moto = '';
                          novoEstado.categoria = '';
                        } else {
                          const modelo = extrairModeloMoto(novoNome);
                          if (modelo) {
                            novoEstado.moto = modelo;
                          }
                          const categoria = extrairCategoria(novoNome);
                          if (categoria) {
                            novoEstado.categoria = categoria;
                          }
                        }
                        return novoEstado;
                      });
                    }}
                    placeholder="Ex: Motor Honda CB 300"
                    className={cn(
                      "w-full border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-violet-500 transition-colors",
                      theme === 'dark' ? "bg-zinc-950 border-zinc-800 text-zinc-200" : "bg-white border-zinc-200 text-zinc-900"
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Moto</label>
                    <input 
                      type="text"
                      value={formData.moto}
                      onChange={(e) => setFormData({...formData, moto: e.target.value})}
                      placeholder="Ex: CB 300"
                      className={cn(
                        "w-full border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-violet-500 transition-colors",
                        theme === 'dark' ? "bg-zinc-950 border-zinc-800 text-zinc-200" : "bg-white border-zinc-200 text-zinc-900"
                      )}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Valor (R$)</label>
                    <input 
                      required
                      type="number"
                      step="0.01"
                      value={formData.valor}
                      onChange={(e) => setFormData({...formData, valor: e.target.value})}
                      placeholder="R$ 0,00"
                      className={cn(
                        "w-full border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-violet-500 transition-colors",
                        theme === 'dark' ? "bg-zinc-950 border-zinc-800 text-zinc-200" : "bg-white border-zinc-200 text-zinc-900"
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Pagamento</label>
                    <CustomDropdown
                      theme={theme}
                      variant="form"
                      value={formData.tipo}
                      onChange={(val) => setFormData({...formData, tipo: val})}
                      options={[
                        { value: '', label: 'Selecione...' },
                        ...PAGAMENTOS_OFICIAIS.map(p => ({ value: p, label: p })),
                        { value: 'VENDA MERCADO LIVRE', label: 'VENDA MERCADO LIVRE' },
                        { value: 'SAÍDA', label: 'SAÍDA' },
                      ]}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Data</label>
                    <input 
                      type="date"
                      value={formData.data}
                      onChange={(e) => setFormData({...formData, data: e.target.value})}
                      className={cn(
                      "w-full border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-violet-500 transition-colors",
                      theme === 'dark' ? "bg-zinc-950 border-zinc-800 text-zinc-200" : "bg-white border-zinc-200 text-zinc-900"
                    )}
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={cn(
                    "px-6 py-3 rounded-xl font-medium transition-all active:scale-95",
                    theme === 'dark' ? "bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 border border-zinc-200 text-zinc-600 hover:bg-zinc-200"
                  )}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className={cn(
                    "px-8 py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center gap-2",
                    theme === 'dark'
                      ? "bg-violet-600 border border-violet-500 text-white shadow-lg shadow-violet-900/20 hover:bg-violet-500"
                      : "bg-violet-600 border border-violet-500 text-white shadow-lg shadow-violet-200/50 hover:bg-violet-700"
                  )}
                >
                  {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Registrar Venda
                </button>
              </div>
            </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Editar Venda */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "w-full max-w-lg p-8 rounded-3xl border shadow-2xl relative",
                theme === 'dark' ? "bg-zinc-900/90 backdrop-blur-xl border-zinc-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.2)] text-white" : "bg-white border-zinc-200 text-zinc-900"
              )}
            >
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X size={20} className="text-zinc-500" />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-violet-600/10 rounded-2xl">
                  <Edit className="text-violet-500" size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Editar Venda</h2>
                  <p className="text-sm text-zinc-500">Atualize os detalhes da transação</p>
                </div>
              </div>

              <form onSubmit={handleUpdateSale} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Peça Vendida</label>
                  <input 
                    required
                    type="text" 
                    value={editFormData.nome}
                    onChange={(e) => setEditFormData({...editFormData, nome: e.target.value})}
                    placeholder="Ex: Motor Honda CB 300"
                    className={cn(
                      "w-full border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-violet-500 transition-colors",
                      theme === 'dark' ? "bg-zinc-950 border-zinc-800 text-zinc-200" : "bg-white border-zinc-200 text-zinc-900"
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Moto</label>
                    <input 
                      type="text"
                      value={editFormData.moto}
                      onChange={(e) => setEditFormData({...editFormData, moto: e.target.value})}
                      placeholder="Ex: CB 300"
                      className={cn(
                        "w-full border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-violet-500 transition-colors",
                        theme === 'dark' ? "bg-zinc-950 border-zinc-800 text-zinc-200" : "bg-white border-zinc-200 text-zinc-900"
                      )}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Valor (R$)</label>
                    <input 
                      required
                      type="number"
                      step="0.01"
                      value={editFormData.valor}
                      onChange={(e) => setEditFormData({...editFormData, valor: e.target.value})}
                      placeholder="0,00"
                      className={cn(
                        "w-full border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-violet-500 transition-colors",
                        theme === 'dark' ? "bg-zinc-950 border-zinc-800 text-zinc-200" : "bg-white border-zinc-200 text-zinc-900"
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Pagamento</label>
                    <CustomDropdown
                      theme={theme}
                      variant="form"
                      value={editFormData.tipo}
                      onChange={(val) => setEditFormData({...editFormData, tipo: val})}
                      options={[
                        { value: '', label: 'Selecione...' },
                        ...PAGAMENTOS_OFICIAIS.map(p => ({ value: p, label: p })),
                        { value: 'VENDA MERCADO LIVRE', label: 'VENDA MERCADO LIVRE' },
                        { value: 'SAÍDA', label: 'SAÍDA' },
                      ]}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Data</label>
                    <input 
                      type="date"
                      value={editFormData.data}
                      onChange={(e) => setEditFormData({...editFormData, data: e.target.value})}
                      className={cn(
                      "w-full border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-violet-500 transition-colors",
                      theme === 'dark' ? "bg-zinc-950 border-zinc-800 text-zinc-200" : "bg-white border-zinc-200 text-zinc-900"
                    )}
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className={cn(
                    "flex-1 px-6 py-3 rounded-xl font-medium transition-all active:scale-95",
                    theme === 'dark' ? "bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 border border-zinc-200 text-zinc-600 hover:bg-zinc-200"
                  )}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className={cn(
                    "flex-1 px-8 py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2",
                    theme === 'dark'
                      ? "bg-violet-600 border border-violet-500 text-white shadow-lg shadow-violet-900/20 hover:bg-violet-500"
                      : "bg-violet-600 border border-violet-500 text-white shadow-lg shadow-violet-200/50 hover:bg-violet-700"
                  )}
                >
                  {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Salvar Alterações
                </button>
              </div>
            </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Confirmação Exclusão Individual */}
      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "w-full max-w-md p-8 rounded-3xl border shadow-2xl text-center",
                theme === 'dark' ? "bg-zinc-900/90 backdrop-blur-xl border-zinc-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.2)] text-white" : "bg-white border-zinc-200 text-zinc-900"
              )}
            >
              <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Excluir Venda?</h3>
              <p className="text-zinc-500 text-sm mb-8">
                Esta ação não pode ser desfeita. A venda será removida permanentemente do Notion.
              </p>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-xl font-medium transition-all active:scale-95",
                    theme === 'dark' ? "bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 border border-zinc-200 text-zinc-600 hover:bg-zinc-200"
                  )}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDeleteSale}
                  disabled={isActionLoading}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2",
                    theme === 'dark'
                      ? "bg-rose-600 border border-rose-500 text-white shadow-lg shadow-rose-900/20 hover:bg-rose-500"
                      : "bg-rose-600 border border-rose-500 text-white shadow-lg shadow-rose-200/50 hover:bg-rose-700"
                  )}
                >
                  {isActionLoading ? <Loader2 className="animate-spin" size={18} /> : "Excluir"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Confirmação Exclusão em Massa */}
      <AnimatePresence>
        {isBulkDeleteConfirmOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "w-full max-w-md p-8 rounded-3xl border shadow-2xl text-center",
                theme === 'dark' ? "bg-zinc-900/90 backdrop-blur-xl border-zinc-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.2)] text-white" : "bg-white border-zinc-200 text-zinc-900"
              )}
            >
              <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Excluir {selectedIds.length} Vendas?</h3>
              <p className="text-zinc-500 text-sm mb-8">
                Esta ação removerá permanentemente todas as vendas selecionadas do Notion.
              </p>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsBulkDeleteConfirmOpen(false)}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-xl font-medium transition-all active:scale-95",
                    theme === 'dark' ? "bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 border border-zinc-200 text-zinc-600 hover:bg-zinc-200"
                  )}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleBulkDelete}
                  disabled={isActionLoading}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2",
                    theme === 'dark'
                      ? "bg-rose-600 border border-rose-500 text-white shadow-lg shadow-rose-900/20 hover:bg-rose-500"
                      : "bg-rose-600 border border-rose-500 text-white shadow-lg shadow-rose-200/50 hover:bg-rose-700"
                  )}
                >
                  {isActionLoading ? <Loader2 className="animate-spin" size={18} /> : "Excluir Todas"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl border transition-colors backdrop-blur-xl",
              theme === 'dark' ? "bg-zinc-900/90 border-zinc-800 text-white" : "bg-white/90 border-zinc-200 text-zinc-900"
            )}
          >
            <span className="text-sm font-medium mr-4">
              {selectedIds.length} venda(s) selecionada(s)
            </span>
            
            <div className={cn("flex items-center gap-2 border-l pl-4", theme === 'dark' ? "border-zinc-800" : "border-zinc-200")}>
              <button 
                onClick={() => setIsBulkDeleteConfirmOpen(true)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95",
                  theme === 'dark'
                    ? "bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white"
                    : "bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white"
                )}
              >
                <Trash2 size={16} />
                Excluir Selecionadas
              </button>
              <button 
                onClick={() => setSelectedIds([])}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors rounded-lg active:scale-95",
                  theme === 'dark' ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                )}
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default SalesView;
