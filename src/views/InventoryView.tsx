// InventoryView.tsx - View de estoque de pecas
import React, { useState, useEffect, useMemo, useRef, useContext, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../utils";
import { DataContext } from "../App";
import { StockFilters } from "../components/filters";
import { CustomDropdown } from "../components/CustomDropdown";
import { SkeletonRow } from "../components/SkeletonRow";
import { CATEGORIAS_OFICIAIS, MOTOS_OFICIAIS } from "../constants/lists";
import { useDebounce } from "../utils/hooks";
import { fetchWithRetry } from "../utils/api";
import {
  Check, ExternalLink, Package, Edit2, Trash2, Plus, Minus, Layers,
  Save, X, AlertCircle, Loader2, Box
} from "lucide-react";

const InventoryRow = memo(({ 
  item, 
  theme, 
  selectedIds, 
  toggleSelect, 
  onSelectItem, 
  readOnly, 
  handleInventoryInlineEdit, 
  editingCell, 
  handleInventoryInlineSave, 
  setEditingCell, 
  columns, 
  formatCurrency, 
  formatDate,
  openEditModal,
  setItemToDelete,
  setIsDeleteConfirmOpen
}: any) => (
  <tr 
    key={item.id} 
    onClick={() => onSelectItem(item)}
    className={cn(
      "transition-all duration-200 group cursor-pointer transform-gpu",
      selectedIds.includes(item.id) 
        ? theme === 'dark' ? "bg-violet-500/10" : "bg-violet-50"
        : theme === 'dark' ? "hover:bg-zinc-800/20" : "hover:bg-zinc-50"
    )}
  >
    <td className="px-3 py-2">
      <div 
        className={cn(
          "w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all",
          selectedIds.includes(item.id) 
            ? "bg-violet-600 border-violet-600 opacity-100" 
            : cn(
                "opacity-0 group-hover:opacity-100",
                theme === 'dark' ? "border-zinc-700" : "border-zinc-300"
              )
        )}
        onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
      >
        {selectedIds.includes(item.id) && <Check className="text-white" size={10} />}
      </div>
    </td>
    {columns.map((col: any) => (
      <td key={`${item.id}-${col.key}`} className={cn(
        "px-3 py-2 text-xs transition-colors",
        theme === 'dark' ? "text-zinc-400" : "text-zinc-600"
      )} onDoubleClick={() => !readOnly && handleInventoryInlineEdit(item.id, col.key)}>
        {editingCell?.itemId === item.id && editingCell?.field === col.key ? (
          <input 
            defaultValue={item[col.key]}
            onBlur={(e) => handleInventoryInlineSave(item.id, col.key, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleInventoryInlineSave(item.id, col.key, e.currentTarget.value);
              if (e.key === 'Escape') setEditingCell(null);
            }}
            autoFocus
            className="w-full bg-transparent border-b border-violet-500 outline-none"
          />
        ) : col.key === 'valor' ? (
          <span className="font-bold text-emerald-500">{formatCurrency(item[col.key])}</span>
        ) : col.key === 'criado_em' ? (
          <span className="text-[10px] text-zinc-500">{formatDate(item[col.key])}</span>
        ) : col.key === 'ml_link' && item[col.key] ? (
          <a 
            href={item[col.key]} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 inline-block"
          >
            <ExternalLink size={12} />
          </a>
        ) : col.key === 'imagem' && item[col.key] ? (
          <div className={cn(
            "w-8 h-8 rounded-lg overflow-hidden border relative",
            theme === 'dark' ? "border-zinc-800/50" : "border-zinc-200"
          )}>
            <img 
              loading="lazy"
              src={item[col.key]} 
              alt={item.nome} 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer" 
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className={cn("absolute inset-0 flex items-center justify-center -z-10", theme === 'dark' ? "bg-zinc-900" : "bg-zinc-100")}>
              <Package size={12} className="text-zinc-400 opacity-50" />
            </div>
          </div>
        ) : col.key === 'categoria' ? (
          <span className={cn(
            "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors",
            theme === 'dark' ? "bg-violet-500/10 text-violet-400 border border-violet-500/20" : "bg-zinc-100 text-zinc-600"
          )}>
            {item[col.key]}
          </span>
        ) : col.key === 'moto' ? (
          <span className={cn(
            "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors",
            theme === 'dark' ? "bg-zinc-800 text-zinc-300 border-zinc-700" : "bg-zinc-100 text-zinc-600 border-zinc-200"
          )}>
            {item[col.key]}
          </span>
        ) : col.key === 'actions' ? (
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(item);
              }}
              className={cn(
                "p-2 rounded-lg transition-all",
                theme === 'dark' ? "bg-violet-500/10 text-violet-400 hover:bg-violet-500/20" : "text-zinc-400 hover:text-violet-600 hover:bg-violet-50"
              )}
              title="Editar item"
            >
              <Edit2 size={16} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setItemToDelete(item.id);
                setIsDeleteConfirmOpen(true);
              }}
              className={cn(
                "p-2 rounded-lg transition-all",
                theme === 'dark' ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "text-zinc-400 hover:text-red-600 hover:bg-red-50"
              )}
              title="Excluir item"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ) : (
          <span className="truncate block max-w-[150px]">{item[col.key] || '-'}</span>
        )}
      </td>
    ))}
  </tr>
));

export const InventoryView = memo(({ theme, onSelectItem, onRegisterActions, isSearchOpen, readOnly = false, pendingEditItem, setPendingEditItem }: { 
  theme: 'light' | 'dark', 
  onSelectItem: (item: any) => void,
  onRegisterActions?: (actions: { edit: (item: any) => void, delete: (id: string) => void, focusSearch?: () => void }) => void,
  isSearchOpen?: boolean,
  readOnly?: boolean,
  pendingEditItem?: any | null,
  setPendingEditItem?: (item: any | null) => void
}) => {
  const { inventory: items, loading, setInventory, refreshData } = useContext(DataContext);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  
  const handleInventoryInlineEdit = (itemId: string, field: string) => {
    setEditingCell({ itemId, field });
  };

  const handleInventoryInlineSave = async (itemId: string, field: string, value: string) => {
    setEditingCell(null);
    
    const itemToUpdate = items.find(s => s.id === itemId);
    if (!itemToUpdate || itemToUpdate[field as keyof typeof itemToUpdate] === value) return;

    const updatedData = { [field]: field === 'valor' ? Number(value) : value };
    
    // Optimistic update
    setInventory(prev => prev.map(item => item.id === itemId ? { ...item, ...updatedData } : item));

    try {
      const response = await fetchWithRetry(`/api/produtos/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Falha ao atualizar item');
      }
      refreshData();
    } catch (err: any) {
      alert(err.message);
      refreshData();
    }
  };
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedMoto, setSelectedMoto] = useState('Todas');
  const [onlyWithStock, setOnlyWithStock] = useState(false);
  const [showWithPhotoFirst, setShowWithPhotoFirst] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(window.innerWidth < 768 ? 10 : 25);

  // Sort states
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({
    key: 'criado_em',
    direction: 'desc'
  });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editingCell, setEditingCell] = useState<{ itemId: string, field: string } | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    nome: '',
    categoria: '',
    novaCategoria: '',
    moto: '',
    outraMoto: '',
    valor: '',
    estoque: '1',
    ano: '',
    descricao: '',
    ml_link: '',
    imagem: ''
  });

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  // Extract unique categories and motos for filters
  const categories = Array.from(new Set(items.map(item => item.categoria).filter(Boolean)));
  const motos = Array.from(new Set(items.map(item => item.moto).filter(Boolean)));

  // Sorting logic
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filtering and Sorting logic
  const filteredAndSortedItems = useMemo(() => {
    const searchTerms = debouncedSearchTerm.toLowerCase().split(' ').filter(t => t.length > 0);
    
    let result = [...items].filter(item => {
      const matchesSearch = searchTerms.length === 0 || searchTerms.every(term => 
        (item.nome?.toLowerCase() || '').includes(term) ||
        (item.moto?.toLowerCase() || '').includes(term) ||
        (item.rk_id?.toLowerCase() || '').includes(term) ||
        (item.categoria?.toLowerCase() || '').includes(term)
      );
      
      const matchesCategory = selectedCategory === 'Todas' || item.categoria === selectedCategory;
      const matchesMoto = selectedMoto === 'Todas' || item.moto === selectedMoto;
      const matchesStock = !onlyWithStock || (item.estoque > 0);

      return matchesSearch && matchesCategory && matchesMoto && matchesStock;
    });

    result.sort((a, b) => {
      // 1. Primary Sort: sortConfig
      if (sortConfig.key && sortConfig.direction) {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Ordenação Natural para rk_id
        if (sortConfig.key === 'rk_id') {
          const aNum = parseInt(String(aValue).replace(/\D/g, ''), 10) || 0;
          const bNum = parseInt(String(bValue).replace(/\D/g, ''), 10) || 0;
          
          if (aNum !== bNum) {
            return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
          }
        }

        if (aValue !== bValue) {
          if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        }
      }

      // 2. Secondary Sort: Photo priority (if enabled)
      if (showWithPhotoFirst) {
        const aHasPhoto = !!a.imagem;
        const bHasPhoto = !!b.imagem;
        if (aHasPhoto !== bHasPhoto) {
          if (aHasPhoto && !bHasPhoto) return -1;
          if (!aHasPhoto && bHasPhoto) return 1;
        }
      }

      return 0;
    });

    return result;
  }, [items, debouncedSearchTerm, selectedCategory, selectedMoto, onlyWithStock, sortConfig, showWithPhotoFirst]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedItems, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedMoto, onlyWithStock, itemsPerPage, showWithPhotoFirst]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('Todas');
    setSelectedMoto('Todas');
    setOnlyWithStock(false);
    setShowWithPhotoFirst(true);
    setSortConfig({ key: 'criado_em', direction: 'desc' });
    setSelectedIds([]);
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
    setInventory(prev => prev.filter(item => !idsToRemove.includes(item.id)));
    setSelectedIds([]);

    try {
      const response = await fetchWithRetry('/api/produtos/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToRemove })
      });
      
      if (!response.ok) throw new Error('Falha ao excluir itens');
    } catch (err: any) {
      alert(err.message);
      refreshData();
    }
  };

  const handleBulkUpdateStock = async (amount: number) => {
    if (!selectedIds.length) return;
    const idsToUpdate = [...selectedIds];
    
    // Optimistic update
    setInventory(prev => prev.map(item => {
      if (idsToUpdate.includes(item.id)) {
        return { ...item, estoque: Math.max(0, (item.estoque || 0) + amount) };
      }
      return item;
    }));

    try {
      const response = await fetchWithRetry('/api/produtos/bulk-update-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToUpdate, amount })
      });
      
      if (!response.ok) throw new Error('Falha ao atualizar estoque');
    } catch (err: any) {
      alert(err.message);
      refreshData();
    }
  };

  const handleBulkUpdateCategory = async () => {
    if (!selectedIds.length || !bulkCategory) return;
    const idsToUpdate = [...selectedIds];
    const newCategory = bulkCategory;
    setIsCategoryModalOpen(false);

    // Optimistic update
    setInventory(prev => prev.map(item => {
      if (idsToUpdate.includes(item.id)) {
        return { ...item, categoria: newCategory };
      }
      return item;
    }));
    setSelectedIds([]);
    setBulkCategory('');

    try {
      const response = await fetchWithRetry('/api/produtos/bulk-update-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToUpdate, categoria: newCategory })
      });

      if (!response.ok) throw new Error('Falha ao atualizar categoria');
    } catch (err: any) {
      setError(err.message);
      refreshData();
    }
  };

  useEffect(() => {
    if (isModalOpen || isDeleteConfirmOpen || isBulkDeleteConfirmOpen || isCategoryModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, isDeleteConfirmOpen, isBulkDeleteConfirmOpen, isCategoryModalOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const payload = {
      ...formData,
      categoria: formData.categoria === 'nova' ? formData.novaCategoria : formData.categoria,
      moto: formData.moto === 'outra' ? formData.outraMoto : formData.moto,
      valor: Number(formData.valor) || 0,
      estoque: Number(formData.estoque) || 0,
    };

    try {
      if (editingItem) {
        // Update
        const response = await fetchWithRetry(`/api/produtos/${editingItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
          throw new Error(errorData.error || `Erro ao atualizar item (Status ${response.status})`);
        }
        
        const updatedItem = await response.json();
        setInventory(prev => prev.map(item => item.id === editingItem.id ? updatedItem : item));
      } else {
        // Create
        const response = await fetchWithRetry('/api/produtos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
          throw new Error(errorData.error || `Erro ao salvar item (Status ${response.status})`);
        }
        
        const newItem = await response.json();
        setInventory(prev => [newItem, ...prev]);
      }
      
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({
        nome: '',
        categoria: '',
        novaCategoria: '',
        moto: '',
        outraMoto: '',
        valor: '',
        estoque: '1',
        ano: '',
        descricao: '',
        ml_link: '',
        imagem: ''
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleteConfirmOpen(false);
    const targetId = id || itemToDelete;
    if (!targetId) return;
    
    // Optimistic update
    setInventory(prev => prev.filter(item => item.id !== targetId));
    setSelectedIds(prev => prev.filter(i => i !== targetId));
    setItemToDelete(null);

    try {
      const response = await fetchWithRetry(`/api/produtos/${targetId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Falha ao excluir item');
    } catch (err: any) {
      setError(err.message);
      refreshData();
    }
  };

  const openEditModal = useCallback((item: any) => {
    setEditingItem(item);
    setFormData({
      nome: item.nome || '',
      categoria: item.categoria || '',
      novaCategoria: '',
      moto: item.moto || '',
      outraMoto: '',
      valor: item.valor ? item.valor.toString() : '',
      estoque: item.estoque ? item.estoque.toString() : '1',
      ano: item.ano || '',
      descricao: item.descricao || '',
      ml_link: item.ml_link || '',
      imagem: item.imagem || ''
    });
    setIsModalOpen(true);
  }, []);

  // Handle pending edit from other tabs
  useEffect(() => {
    if (pendingEditItem && setPendingEditItem) {
      openEditModal(pendingEditItem);
      setPendingEditItem(null);
    }
  }, [pendingEditItem, setPendingEditItem, openEditModal]);

  // Register actions for global access (e.g. from DetailModal)
  useEffect(() => {
    if (onRegisterActions) {
      onRegisterActions({
        edit: openEditModal,
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
  }, [onRegisterActions, openEditModal]);

  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth < 768) {
        setViewMode('card');
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (loading && items.length === 0) {
    // Não bloquear a tela
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-rose-400 gap-4">
        <AlertCircle size={40} />
        <p>Erro: {error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-zinc-800 rounded-lg text-white hover:bg-zinc-700 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  const columns = [
    { key: 'nome', label: 'Peça' },
    { key: 'categoria', label: 'Categoria' },
    { key: 'valor', label: 'Valor' },
    { key: 'moto', label: 'Moto' },
    { key: 'estoque', label: 'Estoque' },
    { key: 'ano', label: 'Ano' },
    { key: 'rk_id', label: 'ID' },
    { key: 'descricao', label: 'Descrição' },
    { key: 'criado_em', label: 'Criado em' },
    { key: 'imagem', label: 'Imagem' },
    { key: 'ml_link', label: 'ML LINK' },
    ...(!readOnly ? [{ key: 'actions', label: 'Ações' }] : []),
  ];

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
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
            {/* Filtros do Estoque - Versão Elegante */}
      <StockFilters
        theme={theme}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedMoto={selectedMoto}
        setSelectedMoto={setSelectedMoto}
        sortConfig={sortConfig}
        setSortConfig={setSortConfig}
        loading={loading}
        isRefreshing={isRefreshing}
        onRefresh={handleManualRefresh}
        onNewItem={() => {
          setEditingItem(null);
          setFormData({
            nome: '',
            categoria: '',
            novaCategoria: '',
            moto: '',
            outraMoto: '',
            valor: '',
            estoque: '1',
            ano: '',
            descricao: '',
            ml_link: '',
            imagem: ''
          });
          setIsModalOpen(true);
        }}
        readOnly={readOnly}
        setCurrentPage={setCurrentPage}
      />

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
              {selectedIds.length} item(s) selecionado(s)
            </span>
            
            <div className={cn("flex items-center gap-2 border-l pl-4", theme === 'dark' ? "border-zinc-800" : "border-zinc-200")}>
              <button 
                onClick={() => handleBulkUpdateStock(1)}
                className={cn("p-2 rounded-lg transition-all active:scale-95 text-emerald-400", theme === 'dark' ? "hover:bg-zinc-800" : "hover:bg-zinc-100")}
                title="Aumentar estoque"
              >
                <Plus size={18} />
              </button>
              <button 
                onClick={() => handleBulkUpdateStock(-1)}
                className={cn("p-2 rounded-lg transition-all active:scale-95 text-rose-400", theme === 'dark' ? "hover:bg-zinc-800" : "hover:bg-zinc-100")}
                title="Diminuir estoque"
              >
                <Minus size={18} />
              </button>
              <button 
                onClick={() => setIsCategoryModalOpen(true)}
                className={cn("p-2 rounded-lg transition-all active:scale-95 text-violet-400", theme === 'dark' ? "hover:bg-zinc-800" : "hover:bg-zinc-100")}
                title="Mudar categoria"
              >
                <Layers size={18} />
              </button>
              <button 
                onClick={() => setIsBulkDeleteConfirmOpen(true)}
                className={cn("p-2 rounded-lg transition-all active:scale-95 text-zinc-400", theme === 'dark' ? "hover:bg-rose-500/20 hover:text-rose-400" : "hover:bg-rose-50 hover:text-rose-600")}
                title="Excluir selecionados"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <button 
              onClick={() => setSelectedIds([])}
              className={cn(
                "ml-4 text-xs transition-colors active:scale-95",
                theme === 'dark' ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              Desmarcar tudo
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table Container */}
      <div className={cn(
        "border rounded-2xl overflow-visible relative transition-all duration-300",
        theme === 'dark' 
          ? "bg-zinc-900/40 border-zinc-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)]" 
          : "bg-white border-zinc-200 shadow-sm"
      )}>
        {loading && (
          <div className={cn(
            "absolute inset-0 backdrop-blur-[2px] z-10 flex items-center justify-center",
            theme === 'dark' ? "bg-zinc-950/50" : "bg-white/50"
          )}>
            <Loader2 className="animate-spin text-violet-500" size={32} />
          </div>
        )}
        <div className={cn(
          "p-4 md:p-6 border-b flex items-center justify-between transition-all duration-300",
          theme === 'dark' ? "border-zinc-800/50 bg-zinc-900/10" : "border-zinc-100 bg-zinc-50/50"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
              theme === 'dark' ? "bg-zinc-800 text-violet-400" : "bg-white text-violet-600 border border-zinc-100"
            )}>
              <Box size={20} />
            </div>
            <div className="flex flex-col">
              <h3 className={cn(
                "text-lg font-bold tracking-tight transition-colors",
                theme === 'dark' ? "text-white" : "text-zinc-900"
              )}>Estoque de Peças</h3>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider",
                  theme === 'dark' ? "text-zinc-500" : "text-zinc-400"
                )}>Sincronizado</span>
              </div>
            </div>
          </div>

          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md",
            theme === 'dark' ? "bg-zinc-950/50 border-zinc-800" : "bg-white border-zinc-200"
          )}>
            <span className={cn("text-[10px] font-bold uppercase tracking-wider", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
              {filteredAndSortedItems.length} itens
            </span>
          </div>
        </div>

        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className={cn(
                  "transition-colors",
                  theme === 'dark' ? "bg-zinc-800/30" : "bg-zinc-50"
                )}>
                  <th className="px-3 py-2 w-10">
                    <div 
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all",
                        selectedIds.length === paginatedItems.length && paginatedItems.length > 0
                          ? "bg-violet-600 border-violet-600" 
                          : theme === 'dark' ? "border-zinc-700" : "border-zinc-300"
                      )}
                      onClick={toggleSelectAll}
                    >
                      {selectedIds.length === paginatedItems.length && paginatedItems.length > 0 && <Check className="text-white" size={10} />}
                    </div>
                  </th>
                  {columns.map(col => (
                    <th 
                      key={col.key} 
                      onClick={() => handleSort(col.key)}
                      className={cn(
                        "px-3 py-2 text-[9px] font-bold uppercase tracking-wider cursor-pointer transition-all group",
                        theme === 'dark' ? "text-zinc-500 hover:bg-zinc-800/40" : "text-zinc-500 hover:bg-zinc-100",
                        sortConfig.key === col.key && (theme === 'dark' ? "text-violet-400 bg-violet-500/5" : "text-violet-600 bg-violet-50")
                      )}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        <div className="flex flex-col text-[6px] leading-[3px] opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className={cn(sortConfig.key === col.key && sortConfig.direction === 'asc' ? "text-violet-400" : "text-zinc-600")}>▲</span>
                          <span className={cn(sortConfig.key === col.key && sortConfig.direction === 'desc' ? "text-violet-400" : "text-zinc-600")}>▼</span>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={cn(
                "divide-y transition-colors",
                theme === 'dark' ? "divide-zinc-800/30" : "divide-zinc-100"
              )}>
                {loading && items.length === 0 ? (
                  Array(10).fill(0).map((_, i) => <SkeletonRow key={i} theme={theme} />)
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
                    <td className="px-3 py-2">
                      <div 
                        className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all",
                          selectedIds.includes(item.id) 
                            ? "bg-violet-600 border-violet-600 opacity-100" 
                            : cn(
                                "opacity-0 group-hover:opacity-100",
                                theme === 'dark' ? "border-zinc-700" : "border-zinc-300"
                              )
                        )}
                        onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                      >
                        {selectedIds.includes(item.id) && <Check className="text-white" size={10} />}
                      </div>
                    </td>
                    {columns.map(col => (
                      <td key={`${item.id}-${col.key}`} className={cn(
                        "px-3 py-2 text-xs transition-colors",
                        theme === 'dark' ? "text-zinc-400" : "text-zinc-600"
                      )} onDoubleClick={() => !readOnly && handleInventoryInlineEdit(item.id, col.key)}>
                        {editingCell?.itemId === item.id && editingCell?.field === col.key ? (
                          <input 
                            defaultValue={item[col.key]}
                            onBlur={(e) => handleInventoryInlineSave(item.id, col.key, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleInventoryInlineSave(item.id, col.key, e.currentTarget.value);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            autoFocus
                            className="w-full bg-transparent border-b border-violet-500 outline-none"
                          />
                        ) : col.key === 'valor' ? (
                          <span className="font-bold text-emerald-500">{formatCurrency(item[col.key])}</span>
                        ) : col.key === 'criado_em' ? (
                          <span className="text-[10px] text-zinc-500">{formatDate(item[col.key])}</span>
                        ) : col.key === 'ml_link' && item[col.key] ? (
                          <a 
                            href={item[col.key]} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 inline-block"
                          >
                            <ExternalLink size={12} />
                          </a>
                        ) : col.key === 'imagem' && item[col.key] ? (
                          <div className={cn(
                            "w-8 h-8 rounded-lg overflow-hidden border relative",
                            theme === 'dark' ? "border-zinc-800/50" : "border-zinc-200"
                          )}>
                            <img 
                              loading="lazy"
                              src={item[col.key]} 
                              alt={item.nome} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer" 
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <div className={cn("absolute inset-0 flex items-center justify-center -z-10", theme === 'dark' ? "bg-zinc-900" : "bg-zinc-100")}>
                              <Package size={12} className="text-zinc-400 opacity-50" />
                            </div>
                          </div>
                        ) : col.key === 'categoria' ? (
                          <span className={cn(
                            "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors",
                            theme === 'dark' ? "bg-violet-500/10 text-violet-400 border border-violet-500/20" : "bg-zinc-100 text-zinc-600"
                          )}>
                            {item[col.key]}
                          </span>
                        ) : col.key === 'moto' ? (
                          <span className={cn(
                            "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors",
                            theme === 'dark' ? "bg-zinc-800 text-zinc-300 border-zinc-700" : "bg-zinc-100 text-zinc-600 border-zinc-200"
                          )}>
                            {item[col.key]}
                          </span>
                        ) : col.key === 'actions' ? (
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(item);
                              }}
                              className={cn(
                                "p-2 rounded-lg transition-all",
                                theme === 'dark' ? "bg-violet-500/10 text-violet-400 hover:bg-violet-500/20" : "text-zinc-400 hover:text-violet-600 hover:bg-violet-50"
                              )}
                              title="Editar item"
                            >
                              <Edit2 size={16} />
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
                              title="Excluir item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ) : (
                          (typeof item[col.key] === 'number' && isNaN(item[col.key])) ? "0" : (item[col.key] || <span className="text-zinc-600 italic">-</span>)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={cn("p-3 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4", theme === 'dark' ? "bg-zinc-900/20" : "bg-zinc-50/50")}>
            {loading && items.length === 0 ? (
              Array(8).fill(0).map((_, i) => (
                <div key={i} className={cn("h-64 rounded-2xl animate-pulse", theme === 'dark' ? "bg-zinc-800/50" : "bg-zinc-200/50")} />
              ))
            ) : paginatedItems.map((item) => (
              <div 
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={cn(
                  "group relative flex flex-col rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden hover:-translate-y-1 hover:shadow-xl",
                  selectedIds.includes(item.id)
                    ? theme === 'dark' ? "bg-violet-500/10 border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.15)]" : "bg-violet-50 border-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                    : theme === 'dark' ? "bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700" : "bg-white border-zinc-200 hover:border-zinc-300"
                )}
              >
                {/* Selection Checkbox */}
                <div 
                  onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                  className={cn(
                    "absolute top-3 left-3 z-10 w-6 h-6 rounded-md border flex items-center justify-center transition-all duration-200 backdrop-blur-md",
                    selectedIds.includes(item.id)
                      ? "bg-violet-600 border-violet-600 shadow-[0_0_10px_rgba(139,92,246,0.5)] opacity-100"
                      : cn(
                          "opacity-0 group-hover:opacity-100",
                          theme === 'dark' ? "bg-zinc-900/80 border-zinc-600" : "bg-white/80 border-zinc-300"
                        )
                  )}
                >
                  {selectedIds.includes(item.id) && <Check className="text-white" size={14} strokeWidth={3} />}
                </div>

                {/* Actions Menu */}
                {!readOnly && (
                  <div className="absolute top-3 right-3 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(item);
                      }}
                      className={cn(
                        "p-2 rounded-xl backdrop-blur-md transition-all shadow-lg",
                        theme === 'dark' ? "bg-zinc-900/90 text-violet-400 hover:bg-violet-500 hover:text-white" : "bg-white/90 text-violet-600 hover:bg-violet-600 hover:text-white"
                      )}
                      title="Editar item"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemToDelete(item.id);
                        setIsDeleteConfirmOpen(true);
                      }}
                      className={cn(
                        "p-2 rounded-xl backdrop-blur-md transition-all shadow-lg",
                        theme === 'dark' ? "bg-zinc-900/90 text-rose-400 hover:bg-rose-500 hover:text-white" : "bg-white/90 text-rose-600 hover:bg-rose-600 hover:text-white"
                      )}
                      title="Excluir item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}

                {/* Image Section - Hidden on Mobile for sleek list view */}
                <div className={cn(
                  "hidden sm:block relative aspect-video w-full overflow-hidden border-b",
                  theme === 'dark' ? "border-zinc-800/50 bg-zinc-950" : "border-zinc-100 bg-zinc-50"
                )}>
                  {item.imagem ? (
                    <>
                      <img 
                        loading="lazy"
                        src={item.imagem} 
                        alt={item.nome} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className={cn("absolute inset-0 flex flex-col items-center justify-center -z-10", theme === 'dark' ? "bg-zinc-900" : "bg-zinc-100")}>
                        <Package size={32} className="text-zinc-400 opacity-20" />
                        <span className="text-[8px] uppercase font-bold tracking-widest mt-2 text-zinc-500 opacity-40">Sem Imagem</span>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20">
                      <Package size={48} />
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-md backdrop-blur-md",
                      item.estoque > 0 
                        ? "bg-emerald-500/90 text-white" 
                        : "bg-rose-500/90 text-white"
                    )}>
                      {item.estoque > 0 ? `${item.estoque} UN` : 'ESGOTADO'}
                    </span>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-3 md:p-4 flex flex-col flex-1">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h4 className={cn(
                      "font-bold text-sm md:text-base leading-tight line-clamp-2",
                      theme === 'dark' ? "text-zinc-100" : "text-zinc-900"
                    )}>
                      {item.nome}
                    </h4>
                    {/* Mobile only value display */}
                    <span className="sm:hidden font-black text-emerald-500 text-sm whitespace-nowrap drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">
                      {formatCurrency(item.valor)}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                      theme === 'dark' ? "bg-violet-500/10 text-violet-400 border-violet-500/20" : "bg-violet-50 text-violet-600 border-violet-100"
                    )}>
                      {item.categoria}
                    </span>
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                      theme === 'dark' ? "bg-zinc-800 text-zinc-400 border-zinc-700" : "bg-zinc-100 text-zinc-500 border-zinc-200"
                    )}>
                      {item.moto}
                    </span>
                    {/* Mobile only stock badge */}
                    <span className={cn(
                      "sm:hidden px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                      item.estoque > 0 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    )}>
                      {item.estoque > 0 ? `${item.estoque} UN` : 'ESGOTADO'}
                    </span>
                  </div>

                  <div className="hidden sm:flex mt-auto pt-3 border-t border-zinc-800/20 items-center justify-between">
                    <span className="font-black text-emerald-500 text-sm">
                      {formatCurrency(item.valor)}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {item.rk_id}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        <div className={cn(
          "p-4 border-t flex flex-wrap items-center justify-between gap-4 transition-colors",
          theme === 'dark' ? "bg-zinc-900/30 border-zinc-800" : "bg-zinc-50 border-zinc-200"
        )}>
          <div className="text-sm text-zinc-500">
            Mostrando <span className={cn("font-medium transition-colors", theme === 'dark' ? "text-zinc-300" : "text-zinc-900")}>{(currentPage - 1) * itemsPerPage + 1}</span>-
            <span className={cn("font-medium transition-colors", theme === 'dark' ? "text-zinc-300" : "text-zinc-900")}>{Math.min(currentPage * itemsPerPage, filteredAndSortedItems.length)}</span> de 
            <span className={cn("font-medium transition-colors", theme === 'dark' ? "text-zinc-300" : "text-zinc-900")}> {filteredAndSortedItems.length}</span> itens
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={cn(
                "px-3 py-1.5 border rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-medium",
                theme === 'dark' 
                  ? "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800" 
                  : "bg-white border-zinc-300 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              Anterior
            </button>
            <span className={cn(
              "px-3 py-1.5 text-sm font-medium",
              theme === 'dark' ? "text-zinc-400" : "text-zinc-600"
            )}>
              Página {currentPage} de {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className={cn(
                "px-3 py-1.5 border rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-medium",
                theme === 'dark' 
                  ? "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800" 
                  : "bg-white border-zinc-300 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              Próximo
            </button>
          </div>

          <CustomDropdown
            theme={theme}
            value={itemsPerPage.toString()}
            onChange={(val) => {
              setItemsPerPage(Number(val));
              setCurrentPage(1);
            }}
            options={[
              { value: '25', label: '25 por página' },
              { value: '50', label: '50 por página' },
              { value: '100', label: '100 por página' },
            ]}
            className="w-40"
          />
        </div>

        {filteredAndSortedItems.length === 0 && (
          <div className={cn(
            "p-12 text-center transition-colors flex flex-col items-center gap-4",
            theme === 'dark' ? "text-zinc-500" : "text-zinc-400"
          )}>
            <Box size={48} strokeWidth={1} className="opacity-20" />
            <div className="max-w-md">
              <p className="text-sm font-medium mb-1">
                {items.length === 0 
                  ? "O banco de dados parece estar vazio ou não compartilhado." 
                  : "Nenhum item corresponde aos filtros aplicados."}
              </p>
              {items.length === 0 && (
                <p className="text-xs opacity-70">
                  Certifique-se de que a Integração do Notion foi adicionada como conexão nesta página específica do Notion (Menu ... → Connections).
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de criação de - Slide Up Version */}
  {/* Modal de criação / edição - Bottom Sheet */}
  <AnimatePresence>
    {isModalOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[3000] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center"
        onClick={() => { setIsModalOpen(false); setEditingItem(null); }}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={cn(
            "relative w-full max-w-2xl h-[85vh] md:h-auto md:max-h-[80vh] flex flex-col overflow-hidden rounded-t-2xl md:rounded-2xl shadow-2xl",
            theme === 'dark' ? "bg-zinc-900 text-white" : "bg-white text-zinc-900"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="flex justify-center py-2">
            <div className="w-10 h-1.5 rounded-full bg-zinc-600/40" />
          </div>

          {/* Header */}
          <div className={cn(
            "sticky top-0 z-10 bg-inherit flex items-center justify-between p-4 border-b",
            theme === 'dark' ? "border-zinc-800" : "border-zinc-200"
          )}>
            <h2 className="text-xl font-semibold">
              {editingItem ? 'Editar Item' : '+ Novo Item no Estoque'}
            </h2>
            <button
              onClick={() => { setIsModalOpen(false); setEditingItem(null); }}
              className={cn(
                "p-1 rounded-full transition-colors",
                theme === 'dark' ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-100 text-zinc-500"
              )}
            >
              <X size={20} />
            </button>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-4 pt-4 pb-[90px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* URL da Imagem */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">URL da Imagem</label>
                <input
                  type="url"
                  value={formData.imagem}
                  onChange={(e) => setFormData({...formData, imagem: e.target.value})}
                  placeholder="https://..."
                  className={cn(
                    "w-full border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-violet-500",
                    theme === 'dark' ? "bg-zinc-950 border-zinc-800 text-zinc-200" : "bg-white border-zinc-200 text-zinc-900"
                  )}
                />
              </div>

              {/* Nome */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Nome da Peça *</label>
                <input
                  required
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  placeholder="Ex: Relé de Partida"
                  className={cn(
                    "w-full border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-violet-500",
                    theme === 'dark' ? "bg-zinc-950 border-zinc-800 text-zinc-200" : "bg-white border-zinc-200 text-zinc-900"
                  )}
                />
              </div>

              {/* Categoria */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Categoria</label>
                <CustomDropdown
                  theme={theme}
                  variant="form"
                  value={formData.categoria}
                  onChange={(val) => setFormData({...formData, categoria: val})}
                  options={[
                    { value: '', label: 'Selecione...' },
                    ...CATEGORIAS_OFICIAIS.map(cat => ({ value: cat, label: cat }))
                  ]}
                />
              </div>

              {/* Moto */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Moto</label>
                <CustomDropdown
                  theme={theme}
                  variant="form"
                  value={formData.moto}
                  onChange={(val) => setFormData({...formData, moto: val})}
                  options={[
                    { value: '', label: 'Selecione...' },
                    ...MOTOS_OFICIAIS.map(m => ({ value: m, label: m }))
                  ]}
                />
              </div>

              {/* Ano */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Ano</label>
                <input
                  type="text"
                  value={formData.ano}
                  onChange={(e) => setFormData({...formData, ano: e.target.value})}
                  placeholder="Ex: 2014-2018"
                  className={cn(
                    "w-full border rounded-xl py-2.5 px-4 text-sm",
                    theme === 'dark' ? "bg-zinc-950 border-zinc-800 text-zinc-200" : "bg-white border-zinc-200 text-zinc-900"
                  )}
                />
              </div>

              {/* Valor */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Valor (R$)</label>
                <input
                  type="number"
                  value={formData.valor}
                  onChange={(e) => setFormData({...formData, valor: e.target.value})}
                  placeholder="0,00"
                  className={cn(
                    "w-full border rounded-xl py-2.5 px-4 text-sm",
                    theme === 'dark' ? "bg-zinc-950 border-zinc-800 text-zinc-200" : "bg-white border-zinc-200 text-zinc-900"
                  )}
                />
              </div>

              {/* Estoque */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Estoque</label>
                <input
                  type="number"
                  value={formData.estoque}
                  onChange={(e) => setFormData({...formData, estoque: e.target.value})}
                  className={cn(
                    "w-full border rounded-xl py-2.5 px-4 text-sm",
                    theme === 'dark' ? "bg-zinc-950 border-zinc-800 text-zinc-200" : "bg-white border-zinc-200 text-zinc-900"
                  )}
                />
              </div>

              {/* ML */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Link Mercado Livre</label>
                <input
                  type="url"
                  value={formData.ml_link}
                  onChange={(e) => setFormData({...formData, ml_link: e.target.value})}
                  className={cn(
                    "w-full border rounded-xl py-2.5 px-4 text-sm",
                    theme === 'dark' ? "bg-zinc-950 border-zinc-800 text-zinc-200" : "bg-white border-zinc-200 text-zinc-900"
                  )}
                />
              </div>

              {/* Descrição */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Descrição</label>
                <textarea
                  rows={3}
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  className={cn(
                    "w-full border rounded-xl py-2.5 px-4 text-sm resize-none",
                    theme === 'dark' ? "bg-zinc-950 border-zinc-800 text-zinc-200" : "bg-white border-zinc-200 text-zinc-900"
                  )}
                />
              </div>

            </div>
          </form>

          {/* Bottom Actions */}
          <div className={cn(
            "sticky bottom-0 w-full p-4 border-t bg-inherit",
            theme === 'dark' ? "border-zinc-800" : "border-zinc-200"
          )}>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className={cn(
                  "flex-1 px-6 py-3 rounded-xl",
                  theme === 'dark'
                    ? "bg-zinc-800 text-zinc-300"
                    : "bg-zinc-100 text-zinc-600"
                )}
              >
                Cancelar
              </button>

              <button
                type="submit"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-8 py-3 rounded-xl bg-violet-600 text-white flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {editingItem ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </div>

        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>

      {/* Modal de Confirmação de Exclusão Individual */}
      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "w-full max-w-md p-6 rounded-2xl border shadow-2xl",
                theme === 'dark' ? "bg-zinc-900/90 backdrop-blur-xl border-zinc-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.2)] text-white" : "bg-white border-zinc-200 text-zinc-900"
              )}
            >
              <div className="flex items-center gap-4 text-rose-500 mb-4">
                <div className="p-3 bg-rose-500/10 rounded-full">
                  <AlertCircle size={24} />
                </div>
                <h3 className="text-xl font-bold">Excluir Item?</h3>
              </div>
              <p className={cn("mb-6", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
                Tem certeza que deseja excluir este item do estoque? Esta ação não pode ser desfeita no Notion.
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className={cn(
                    "px-6 py-3 rounded-xl font-medium transition-all active:scale-95",
                    theme === 'dark' ? "bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 border border-zinc-200 text-zinc-600 hover:bg-zinc-200"
                  )}
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleDelete(itemToDelete!)}
                  className={cn(
                    "px-8 py-3 rounded-xl font-bold transition-all active:scale-95",
                    theme === 'dark'
                      ? "bg-rose-600 border border-rose-500 text-white shadow-lg shadow-rose-900/20 hover:bg-rose-500"
                      : "bg-rose-600 border border-rose-500 text-white shadow-lg shadow-rose-200/50 hover:bg-rose-700"
                  )}
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Exclusão em Massa */}
      <AnimatePresence>
        {isBulkDeleteConfirmOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "w-full max-w-md p-6 rounded-2xl border shadow-2xl",
                theme === 'dark' ? "bg-zinc-900/90 backdrop-blur-xl border-zinc-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.2)] text-white" : "bg-white border-zinc-200 text-zinc-900"
              )}
            >
              <div className="flex items-center gap-4 text-rose-500 mb-4">
                <div className="p-3 bg-rose-500/10 rounded-full">
                  <Trash2 size={24} />
                </div>
                <h3 className="text-xl font-bold">Excluir {selectedIds.length} itens?</h3>
              </div>
              <p className={cn("mb-6", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
                Tem certeza que deseja excluir permanentemente os itens selecionados?
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setIsBulkDeleteConfirmOpen(false)}
                  className={cn(
                    "px-6 py-3 rounded-xl font-medium transition-all active:scale-95",
                    theme === 'dark' ? "bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 border border-zinc-200 text-zinc-600 hover:bg-zinc-200"
                  )}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleBulkDelete}
                  className={cn(
                    "px-8 py-3 rounded-xl font-bold transition-all active:scale-95",
                    theme === 'dark'
                      ? "bg-rose-600 border border-rose-500 text-white shadow-lg shadow-rose-900/20 hover:bg-rose-500"
                      : "bg-rose-600 border border-rose-500 text-white shadow-lg shadow-rose-200/50 hover:bg-rose-700"
                  )}
                >
                  Excluir Tudo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Mudança de Categoria em Massa */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "w-full max-w-md p-6 rounded-2xl border shadow-2xl",
                theme === 'dark' ? "bg-zinc-900/90 backdrop-blur-xl border-zinc-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.2)] text-white" : "bg-white border-zinc-200 text-zinc-900"
              )}
            >
              <div className="flex items-center gap-4 text-violet-500 mb-4">
                <div className="p-3 bg-violet-500/10 rounded-full">
                  <Layers size={24} />
                </div>
                <h3 className="text-xl font-bold">Mudar Categoria</h3>
              </div>
              <p className={cn("mb-4 text-sm", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
                Selecione ou digite a nova categoria para os {selectedIds.length} itens selecionados.
              </p>
              
              <div className="space-y-4 mb-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Nova Categoria</label>
                  <input 
                    type="text"
                    value={bulkCategory}
                    onChange={(e) => setBulkCategory(e.target.value)}
                    placeholder="Ex: Motor, Carenagem..."
                    className={cn(
                      "w-full border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-violet-500 transition-colors",
                      theme === 'dark' ? "bg-zinc-950 border-zinc-800 text-zinc-200" : "bg-white border-zinc-200 text-zinc-900"
                    )}
                    autoFocus
                  />
                </div>
                
                {categories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setBulkCategory(cat)}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs transition-colors",
                          bulkCategory === cat 
                            ? "bg-violet-600 text-white" 
                            : theme === 'dark' ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setBulkCategory('');
                  }}
                  className={cn(
                    "px-6 py-3 rounded-xl font-medium transition-all active:scale-95",
                    theme === 'dark' ? "bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 border border-zinc-200 text-zinc-600 hover:bg-zinc-200"
                  )}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleBulkUpdateCategory}
                  disabled={!bulkCategory}
                  className={cn(
                    "px-8 py-3 rounded-xl font-bold transition-all active:scale-95",
                    theme === 'dark'
                      ? "bg-violet-600 border border-violet-500 text-white shadow-lg shadow-violet-900/20 hover:bg-violet-500"
                      : "bg-violet-600 border border-violet-500 text-white shadow-lg shadow-violet-200/50 hover:bg-violet-700"
                  )}
                >
                  Atualizar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});


