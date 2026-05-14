import React, { useState, useEffect, useMemo, useContext, useRef, memo } from "react";
import { motion, AnimatePresence, Reorder } from "motion/react";
import { Check, Edit2, Trash2, X, Filter, Layers, ArrowDownAZ, Loader2, Save, Plus, Search, RefreshCw, Upload, Camera, Image as ImageIcon, Calendar, LayoutGrid, Table as TableIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn, parseLocalDate } from "../utils";
import { CustomDropdown } from "../components/CustomDropdown";
import { useDebounce } from "../hooks/useDebounce";
import { fetchWithRetry } from "../lib/apiClient";
import { DataContext } from "../App";
import { MotoCard } from "../components/MotoCard";


const MotoRow = memo(({ 
  item, 
  theme, 
  selectedIds, 
  toggleSelect, 
  onSelectItem, 
  readOnly, 
  handleMotoInlineEdit, 
  editingCell, 
  handleMotoInlineSave, 
  setEditingCell, 
  columns, 
  formatCurrency, 
  formatDate,
  handleEditMoto,
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
      )} onDoubleClick={() => !readOnly && handleMotoInlineEdit(item.id, col.key)}>
        {editingCell?.itemId === item.id && editingCell?.field === col.key ? (
          <input 
            defaultValue={item[col.key]}
            onBlur={(e) => handleMotoInlineSave(item.id, col.key, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleMotoInlineSave(item.id, col.key, e.currentTarget.value);
              if (e.key === 'Escape') setEditingCell(null);
            }}
            autoFocus
            className="w-full bg-transparent border-b border-violet-500 outline-none"
          />
        ) : col.key === 'valor' ? (
          <span className="font-bold text-emerald-500">{formatCurrency(item[col.key])}</span>
        ) : col.key === 'criado_em' ? (
          <span className="text-[10px] text-zinc-500">{formatDate(item[col.key])}</span>
        ) : col.key === 'actions' ? (
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleEditMoto(item);
              }}
              className={cn(
                "p-2 rounded-lg transition-all",
                theme === 'dark' ? "bg-violet-500/10 text-violet-400 hover:bg-violet-500/20" : "text-zinc-400 hover:text-violet-600 hover:bg-violet-50"
              )}
              title="Editar moto"
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
              title="Excluir moto"
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

export const MotosView = memo(({ theme, onSelectItem, onRegisterActions, isSearchOpen, readOnly = false }: { theme: 'light' | 'dark', onSelectItem: (item: any) => void, onRegisterActions?: (actions: any) => void, isSearchOpen?: boolean, readOnly?: boolean }) => {
  const { motos: items, loading, refreshData, setMotos } = useContext(DataContext);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(window.innerWidth < 768 ? 10 : 25);
  
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editingMoto, setEditingMoto] = useState<any | null>(null);

  // Filter Modal Component
  const FilterModal = () => (
    <AnimatePresence>
      {isFilterModalOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsFilterModalOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-[101] rounded-t-3xl p-6 pb-10 border-t",
              theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-100"
            )}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className={cn("text-lg font-black", theme === 'dark' ? "text-white" : "text-zinc-900")}>Filtros e Ordenação</h3>
              <button onClick={() => setIsFilterModalOpen(false)} className={cn("p-2 rounded-full", theme === 'dark' ? "hover:bg-zinc-800" : "hover:bg-zinc-100")}>
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Marca</label>
                <CustomDropdown
                  theme={theme}
                  icon={<Filter size={14} />}
                  value={brandFilter}
                  className="w-full"
                  onChange={(val) => {
                    setBrandFilter(val);
                    setCurrentPage(1);
                  }}
                  options={brands.map(brand => ({ value: brand, label: brand }))}
                />
              </div>

              {!readOnly && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Status</label>
                  <CustomDropdown
                    theme={theme}
                    icon={<Layers size={14} />}
                    value={statusFilter}
                    className="w-full"
                    onChange={(val) => {
                      setStatusFilter(val);
                      setCurrentPage(1);
                    }}
                    options={statuses.map(s => ({ value: s, label: s }))}
                  />
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Ordenação</label>
                <CustomDropdown
                  theme={theme}
                  icon={<ArrowDownAZ size={14} />}
                  value={sortOrder}
                  className="w-full"
                  onChange={(val) => setSortOrder(val)}
                  options={[
                    { value: "Data de Criação", label: "Mais recente" },
                    { value: "Data de Criação Antigo", label: "Mais antigo" },
                    { value: "Nome", label: "Nome" },
                    { value: "Mais baratas", label: "Mais baratas" },
                    { value: "Mais caras", label: "Mais caras" },
                    { value: "Baixa cilindrada", label: "Baixa cilindrada" },
                    { value: "Alta cilindrada", label: "Alta cilindrada" },
                    { value: "Ano", label: "Ano" },
                    ...(readOnly ? [] : [{ value: "Lote", label: "Lote" }]),
                  ]}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

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
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [inlineEditData, setInlineEditData] = useState<any>(null);
  const editRowRef = useRef<HTMLTableRowElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (onRegisterActions) {
      onRegisterActions({
        edit: handleEditMoto,
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

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Função para lidar com seleção de arquivos
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      // Limitar a 15 arquivos
      if (files.length + selectedFiles.length > 15) {
        alert('Máximo de 15 fotos permitido');
        return;
      }
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  // Função para remover arquivo selecionado
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Função para fazer upload dos arquivos
  const uploadFiles = async (isEdit: boolean = false) => {
    if (selectedFiles.length === 0) return;
    
    const uploadedUrls = await performUpload();
    if (uploadedUrls.length > 0) {
      if (isEdit && editingMoto) {
        console.log('🎉 Todas as imagens enviadas:', uploadedUrls);

        // 3. ATUALIZAR A MOTO COM AS NOVAS IMAGENS
        // PEGAR AS IMAGENS EXISTENTES + AS NOVAS
        const imagensExistentes = editFormData.imagens || [];
        const todasImagens = [...imagensExistentes, ...uploadedUrls];

        console.log('📸 Imagens que serão salvas:', todasImagens);

        // Preparar os dados para atualização
        const motoData = {
          nome: editFormData.nome,
          marca: editFormData.marca,
          modelo: editFormData.modelo,
          ano: editFormData.ano,
          valor: Number(editFormData.valor),
          cor: editFormData.cor,
          cilindrada: Number(editFormData.cilindrada),
          lote: editFormData.lote,
          nome_nf: editFormData.nome_nf,
          pecas_retiradas: editFormData.pecas_retiradas,
          status: editFormData.status,
          descricao: editFormData.descricao,
          imagens: todasImagens // ← IMPORTANTE: incluir as imagens aqui
        };

        console.log('📤 Enviando atualização com imagens:', motoData);

        try {
          const updateResponse = await fetchWithRetry(`/api/motos/${editingMoto.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(motoData)
          });
          
          const responseText = await updateResponse.text();
          let result;
          try {
            result = JSON.parse(responseText);
          } catch (e) {
            console.error('❌ Resposta inválida do servidor:', responseText.substring(0, 200));
            throw new Error('O servidor retornou um formato inválido (HTML em vez de JSON).');
          }

          if (result.success) {
            setMotos(prev => prev.map(m => m.id === editingMoto.id ? result.data : m));
            setEditFormData(prev => ({
              ...prev,
              imagens: todasImagens,
              imagem: prev.imagem || todasImagens[0] || ''
            }));
            alert('✅ Imagens salvas com sucesso!');
          } else {
            alert('❌ Erro ao salvar imagens no banco: ' + result.error);
          }
        } catch (error) {
          console.error('Erro ao atualizar moto após upload:', error);
          alert('❌ Erro de conexão ao salvar imagens.');
        }
      } else {
        setFormData(prev => {
          const newImagens = [...prev.imagens, ...uploadedUrls];
          return {
            ...prev, 
            imagens: newImagens,
            imagem: prev.imagem || newImagens[0] || ''
          };
        });
      }
      setSelectedFiles([]);
    }
  };

  const performUpload = async () => {
    if (selectedFiles.length === 0) return [];
    
    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      // Realizar uploads em paralelo para maior velocidade
      const uploadPromises = selectedFiles.map(async (file) => {
        try {
          /* 
          // TENTATIVA 1: URL assinada (Desabilitado temporariamente devido a erro 500)
          const requestRes = await fetchWithRetry('/api/storage/request-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              fileType: file.type
            })
          });
          
          const requestText = await requestRes.text();
          let requestData;
          try {
            requestData = JSON.parse(requestText);
          } catch (e) {
            requestData = { success: false };
          }
          
          if (requestData.success) {
            const { uploadUrl, publicUrl } = requestData.data;
            const uploadRes = await fetchWithRetry(uploadUrl, {
              method: 'PUT',
              body: file,
              headers: { 'Content-Type': file.type }
            });
            
            if (uploadRes.ok) return publicUrl;
          }
          */
        } catch (e) {
          console.warn('Falha no upload assinado, tentando direto:', e);
        }

        // TENTATIVA 2: Upload direto (Fallback)
        const formData = new FormData();
        formData.append('file', file);
        const directRes = await fetchWithRetry('/api/storage/upload', {
          method: 'POST',
          body: formData
        });

        const directText = await directRes.text();
        const directData = JSON.parse(directText);
        if (directData.success) return directData.data.publicUrl;
        throw new Error(directData.error || 'Falha no upload');
      });

      const results = await Promise.all(uploadPromises);
      const successfulUrls = results.filter(url => !!url) as string[];
      
      setSelectedFiles([]);
      return successfulUrls;
    } catch (error: any) {
      console.error('Erro no upload:', error);
      alert('❌ Erro ao enviar fotos: ' + (error as Error).message);
      return [];
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editRowRef.current && !editRowRef.current.contains(event.target as Node)) {
        saveInlineEdit();
      }
    };

    if (editingRowId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingRowId, inlineEditData]);

  const [formData, setFormData] = useState({
    nome: '',
    marca: '',
    modelo: '',
    ano: '',
    valor: '',
    cor: '',
    cilindrada: '',
    lote: '',
    nome_nf: '',
    pecas_retiradas: '',
    status: '',
    descricao: '',
    imagem: '',
    imagens: [] as string[]
  });

  const [editFormData, setEditFormData] = useState({
    nome: '',
    marca: '',
    modelo: '',
    ano: '',
    valor: '',
    cor: '',
    cilindrada: '',
    lote: '',
    nome_nf: '',
    pecas_retiradas: '',
    status: '',
    descricao: '',
    imagem: '',
    imagens: [] as string[]
  });

  const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);
  const [brandFilter, setBrandFilter] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [cilindradaFilter, setCilindradaFilter] = useState('Todas');
  const [sortOrder, setSortOrder] = useState('Data de Criação');
  const [anoMinFilter, setAnoMinFilter] = useState('');
  const [valorMinFilter, setValorMinFilter] = useState('');
  const [valorMaxFilter, setValorMaxFilter] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'card'>(readOnly ? 'card' : 'card');

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 || readOnly) {
        setViewMode('card');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [readOnly]);

  const closeModals = () => {
    setIsModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedFiles([]);
  };

  const getStatusColor = (status: string, isBadge: boolean = false) => {
    switch (status) {
      case 'Disponível':
        return isBadge ? "bg-emerald-500 text-white" : "bg-emerald-500/10 text-emerald-500";
      case 'Desmontada':
        return isBadge ? "bg-amber-500 text-white" : "bg-amber-500/10 text-amber-500";
      case 'Vendida':
        return isBadge ? "bg-rose-500 text-white" : "bg-rose-500/10 text-rose-500";
      case 'Em estoque':
        return isBadge ? "bg-zinc-600 text-white" : "bg-zinc-500/10 text-zinc-400";
      default:
        return isBadge ? "bg-violet-500 text-white" : "bg-violet-500/10 text-violet-500";
    }
  };

  const handleRowClick = (item: any) => {
    if (editingRowId === item.id) return;
    
    if (clickTimer) {
      clearTimeout(clickTimer);
      setClickTimer(null);
      handleInlineEdit(item);
    } else {
      const timer = setTimeout(() => {
        onSelectItem(item);
        setClickTimer(null);
      }, 250);
      setClickTimer(timer);
    }
  };

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
    
    setMotos(prev => prev.filter(item => !idsToRemove.includes(item.id)));
    setSelectedIds([]);

    try {
      const response = await fetchWithRetry('/api/motos/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToRemove })
      });
      
      if (!response.ok) throw new Error('Falha ao excluir motos');
    } catch (err: any) {
      alert(err.message);
      refreshData();
    }
  };

  const handleDeleteMoto = async () => {
    if (!itemToDelete) return;
    const idToRemove = itemToDelete;
    setIsDeleteConfirmOpen(false);
    
    setMotos(prev => prev.filter(item => item.id !== idToRemove));
    setSelectedIds(prev => prev.filter(i => i !== idToRemove));
    setItemToDelete(null);

    try {
      const response = await fetchWithRetry(`/api/motos/${idToRemove}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Falha ao excluir moto');
    } catch (err: any) {
      alert(err.message);
      refreshData();
    }
  };

  const handleEditMoto = (moto: any) => {
    setEditingMoto(moto);
    setEditFormData({
      nome: moto.nome || '',
      marca: moto.marca || '',
      modelo: moto.modelo || '',
      ano: moto.ano || '',
      valor: moto.valor?.toString() || '',
      cor: moto.cor || '',
      cilindrada: moto.cilindrada?.toString() || '',
      lote: moto.lote || '',
      nome_nf: moto.nome_nf || '',
      pecas_retiradas: moto.pecas_retiradas || '',
      status: moto.status || '',
      descricao: moto.descricao || '',
      imagem: moto.imagem || '',
      imagens: moto.imagens || []
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateMoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMoto) return;
    setIsSaving(true);

    try {
      // Upload automático se houver arquivos pendentes
      let currentImagens = [...editFormData.imagens];
      let currentImagem = editFormData.imagem;

      if (selectedFiles.length > 0) {
        const uploadedUrls = await performUpload();
        if (uploadedUrls.length > 0) {
          currentImagens = [...currentImagens, ...uploadedUrls];
          if (!currentImagem) currentImagem = uploadedUrls[0];
        }
      }

      const motoId = editingMoto.id;
      
      // Garantir que os campos obrigatórios estejam presentes e formatados
      const payload = {
        nome: editFormData.nome || editingMoto.nome,
        marca: editFormData.marca || editingMoto.marca,
        modelo: editFormData.modelo || editingMoto.modelo,
        ano: editFormData.ano || editingMoto.ano,
        valor: Number(editFormData.valor) || editingMoto.valor,
        cor: editFormData.cor || editingMoto.cor,
        cilindrada: Number(editFormData.cilindrada) || editingMoto.cilindrada,
        lote: editFormData.lote || editingMoto.lote,
        nome_nf: editFormData.nome_nf || editingMoto.nome_nf,
        pecas_retiradas: editFormData.pecas_retiradas || editingMoto.pecas_retiradas,
        status: editFormData.status || editingMoto.status,
        descricao: editFormData.descricao || editingMoto.descricao,
        imagens: currentImagens
      };
      
      console.log('📤 Enviando atualização:', payload);
      
      const response = await fetchWithRetry(`/api/motos/${motoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      console.log('📥 Resposta do servidor:', result);
      
      if (result.success) {
        // Atualizar o estado local com os dados retornados do servidor
        setMotos(prev => prev.map(m => m.id === motoId ? result.data : m));
        setIsEditModalOpen(false);
        setEditingMoto(null);
      } else {
        throw new Error(result.error || 'Erro ao atualizar');
      }
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
      refreshData();
    } finally {
      setIsSaving(false);
    }
  };

  const handleInlineEdit = (item: any) => {
    setEditingRowId(item.id);
    setInlineEditData({ ...item });
  };

  const saveInlineEdit = async () => {
    if (!editingRowId || !inlineEditData) return;
    const motoId = editingRowId;
    
    // Optimistic update
    setMotos(prev => prev.map(item => item.id === motoId ? { ...item, ...inlineEditData } : item));
    setEditingRowId(null);
    setInlineEditData(null);

    try {
      const response = await fetchWithRetry(`/api/motos/${motoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inlineEditData)
      });
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Falha ao atualizar moto');
      }
      setMotos(prev => prev.map(item => item.id === motoId ? result.data : item));
    } catch (err: any) {
      alert(err.message);
      refreshData();
    }
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveInlineEdit();
    } else if (e.key === 'Escape') {
      setEditingRowId(null);
      setInlineEditData(null);
    }
  };

  const handleSaveMoto = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Upload automático se houver arquivos pendentes
      let currentImagens = [...formData.imagens];
      let currentImagem = formData.imagem;

      if (selectedFiles.length > 0) {
        const uploadedUrls = await performUpload();
        if (uploadedUrls.length > 0) {
          currentImagens = [...currentImagens, ...uploadedUrls];
          if (!currentImagem) currentImagem = uploadedUrls[0];
        }
      }

      const finalData = {
        ...formData,
        imagens: currentImagens,
        imagem: currentImagens[0] || ''
      };

      const response = await fetchWithRetry('/api/motos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData)
      });
      
      const result = await response.json();
      if (result.success) {
        setMotos(prev => [result.data, ...prev]);
        setIsModalOpen(false);
        setFormData({
          nome: '',
          marca: '',
          modelo: '',
          ano: '',
          valor: '',
          cor: '',
          cilindrada: '',
          lote: '',
          nome_nf: '',
          pecas_retiradas: '',
          status: '',
          descricao: '',
          imagem: '',
          imagens: []
        });
      } else {
        throw new Error(result.error || 'Falha ao salvar moto');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const brands = useMemo(() => {
    const b = new Set(items.map(item => item.marca).filter(Boolean));
    return ['Todas', ...Array.from(b)];
  }, [items]);

  const statuses = useMemo(() => {
    const s = new Set(['Disponível', 'Em estoque', 'Desmontada', 'Vendida']);
    items.forEach(item => {
      if (item.status) s.add(item.status);
    });
    return ['Todos', ...Array.from(s)];
  }, [items]);

  const cilindradas = useMemo(() => {
    const c = new Set(items.map(item => item.cilindrada).filter(Boolean));
    return ['Todas', ...Array.from(c)];
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (debouncedSearchTerm) {
      const searchTerms = debouncedSearchTerm.toLowerCase().split(' ').filter(t => t.length > 0);
      result = result.filter(item => 
        searchTerms.every(term => 
          (item.nome?.toLowerCase() || '').includes(term) ||
          (item.marca?.toLowerCase() || '').includes(term) ||
          (item.modelo?.toLowerCase() || '').includes(term) ||
          (item.rk_id?.toLowerCase() || '').includes(term) ||
          (item.lote?.toLowerCase() || '').includes(term)
        )
      );
    }

    if (brandFilter && brandFilter !== 'Todas') {
      result = result.filter(item => item.marca === brandFilter);
    }

    if (statusFilter && statusFilter !== 'Todos') {
      result = result.filter(item => item.status === statusFilter);
    }

    if (cilindradaFilter && cilindradaFilter !== 'Todas') {
      result = result.filter(item => item.cilindrada === cilindradaFilter);
    }

    if (anoMinFilter) {
      result = result.filter(item => Number(item.ano) >= Number(anoMinFilter));
    }

    if (valorMinFilter) {
      result = result.filter(item => item.valor >= Number(valorMinFilter));
    }

    if (valorMaxFilter) {
      result = result.filter(item => item.valor <= Number(valorMaxFilter));
    }

    if (readOnly) {
      result = result.filter(item => item.status !== 'Vendida');
    }

    // Ordenar
    result.sort((a, b) => {
      // 1. Prioridade Máxima: Vendidas sempre para o final
      const aIsSold = a.status === 'Vendida';
      const bIsSold = b.status === 'Vendida';
      if (aIsSold && !bIsSold) return 1;
      if (!aIsSold && bIsSold) return -1;

      // 2. Prioridade Secundária: Com fotos no topo (se não for vendida)
      const aHasPhotos = (a.imagens && a.imagens.length > 0) || (a.imagem && a.imagem !== '');
      const bHasPhotos = (b.imagens && b.imagens.length > 0) || (b.imagem && b.imagem !== '');
      
      if (aHasPhotos && !bHasPhotos) return -1;
      if (!aHasPhotos && bHasPhotos) return 1;

      // 3. Ordenação selecionada
      let comparison = 0;
      switch (sortOrder) {
        case 'Mais baratas':
          comparison = (Number(a.valor) || 0) - (Number(b.valor) || 0);
          break;
        case 'Mais caras':
          comparison = (Number(b.valor) || 0) - (Number(a.valor) || 0);
          break;
        case 'Baixa cilindrada':
          comparison = (Number(a.cilindrada) || 0) - (Number(b.cilindrada) || 0);
          break;
        case 'Alta cilindrada':
          comparison = (Number(b.cilindrada) || 0) - (Number(a.cilindrada) || 0);
          break;
        case 'Nome':
          comparison = (a.nome || '').localeCompare(b.nome || '');
          break;
        case 'Data de Criação':
          comparison = new Date(b.criado_em || 0).getTime() - new Date(a.criado_em || 0).getTime();
          break;
        case 'Data de Criação Antigo':
          comparison = new Date(a.criado_em || 0).getTime() - new Date(b.criado_em || 0).getTime();
          break;
        case 'Ano':
          comparison = (Number(a.ano) || 0) - (Number(b.ano) || 0);
          break;
        case 'Lote':
          comparison = (a.lote || '').localeCompare(b.lote || '');
          break;
        default:
          // Default: Recentemente adicionadas (Data de Criação desc)
          comparison = new Date(b.criado_em || 0).getTime() - new Date(a.criado_em || 0).getTime();
      }
      
      return comparison;
    });

    return result;
  }, [items, debouncedSearchTerm, brandFilter, statusFilter, cilindradaFilter, anoMinFilter, valorMinFilter, valorMaxFilter, sortOrder, readOnly]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const formatCurrency = (value: any) => {
    const num = Number(value);
    if (isNaN(num)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  if (loading && items.length === 0) {
    // Não bloquear a tela
  }

  return (
    <div className="space-y-4">
      {/* Toolbar Profissional e Compacta */}
      <div className={cn(
        "relative z-50 p-2 md:p-4 rounded-2xl md:rounded-3xl flex flex-col gap-2 md:gap-3 transition-all duration-300 shadow-xl border overflow-visible",
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
            placeholder="Buscar motos..." 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className={cn(
              "w-full rounded-xl py-3 md:py-3.5 pl-12 md:pl-14 pr-4 text-xs md:text-sm font-medium outline-none transition-all duration-200 border shadow-inner",
              theme === 'dark' 
                ? "bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/50" 
                : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:bg-white"
            )}
          />
        </div>

        {/* Ações (Refresh, Nova Moto) */}
        <div className="flex items-center justify-end mt-1">
          <div className="flex items-center gap-2">
            {!readOnly && (
              <button 
                onClick={handleManualRefresh}
                disabled={loading || isRefreshing}
                className={cn(
                  "flex items-center justify-center gap-2 h-10 px-4 rounded-xl transition-all duration-200 border text-[11px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md",
                  theme === 'dark' 
                    ? "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700" 
                    : "bg-zinc-100 border-zinc-200 text-zinc-500 hover:bg-zinc-200"
                )}
              >
                <RefreshCw size={14} className={cn((loading || isRefreshing) && "animate-spin")} />
              </button>
            )}

            {!readOnly && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className={cn(
                  "flex items-center justify-center gap-2 h-10 px-4 rounded-xl transition-all duration-200 border text-[11px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md",
                  theme === 'dark' 
                    ? "bg-violet-600 border-violet-500 text-white shadow-violet-900/20 hover:bg-violet-500" 
                    : "bg-violet-600 border-violet-500 text-white shadow-violet-200/50 hover:bg-violet-700"
                )}
              >
                <Plus size={16} />
                <span className="hidden md:inline">Nova Moto</span>
              </button>
            )}
          </div>
        </div>
        <FilterModal />
      </div>

      {/* Filtros e Ordenação (Fora da div principal) */}
      <div className="flex flex-col gap-4 mt-2 px-1">
        {/* Row for Brand Filter */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Filtrar por marca</span>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-2 px-2 md:mx-0 md:px-0">
            {brands.map(brand => (
              <button
                key={brand}
                onClick={() => { setBrandFilter(brand); setCurrentPage(1); }}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
                  brandFilter === brand
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-transparent shadow-md shadow-violet-500/20"
                    : (theme === 'dark' ? "bg-zinc-800/50 text-zinc-400 border-zinc-700/50 hover:bg-zinc-800 hover:text-zinc-300" : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900")
                )}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>

        {/* Row for Sort Order */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Ordenar por</span>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-2 px-2 md:mx-0 md:px-0">
            {[
              { value: "Data de Criação", label: "Mais recente" },
              { value: "Data de Criação Antigo", label: "Mais antigo" },
              { value: "Nome", label: "Nome" },
              { value: "Mais baratas", label: "Mais baratas" },
              { value: "Mais caras", label: "Mais caras" },
              { value: "Baixa cilindrada", label: "Baixa cilindrada" },
              { value: "Alta cilindrada", label: "Alta cilindrada" },
              { value: "Ano", label: "Ano" },
              ...(readOnly ? [] : [{ value: "Lote", label: "Lote" }]),
            ].map(sortOption => (
              <button
                key={sortOption.value}
                onClick={() => { setSortOrder(sortOption.value); setCurrentPage(1); }}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
                  sortOrder === sortOption.value
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-transparent shadow-md shadow-violet-500/20"
                    : (theme === 'dark' ? "bg-zinc-800/50 text-zinc-400 border-zinc-700/50 hover:bg-zinc-800 hover:text-zinc-300" : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900")
                )}
              >
                {sortOption.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filtros Secundários Compactos */}
      {!readOnly && (
        <div className={cn(
          "flex flex-wrap items-center gap-3 p-2 px-3 rounded-2xl border transition-all duration-300 overflow-visible",
          theme === 'dark' 
            ? "bg-zinc-900/50 border-zinc-800" 
            : "bg-zinc-50 border-zinc-200"
        )}>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Cilindrada:</span>
            <CustomDropdown
              theme={theme}
              value={cilindradaFilter}
              onChange={(val) => {
                setCilindradaFilter(val);
                setCurrentPage(1);
              }}
              options={cilindradas.map(c => ({ value: c, label: c }))}
              className="w-24"
              compact={false}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Ano:</span>
            <input 
              type="number"
              placeholder="Mín"
              value={anoMinFilter}
              onChange={(e) => {
                setAnoMinFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={cn(
                "w-16 border rounded-xl py-1.5 px-2 text-[11px] font-bold outline-none transition-all",
                theme === 'dark' 
                  ? "bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-violet-500" 
                  : "bg-white border-zinc-200 text-zinc-900 focus:border-violet-500"
              )}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Valor:</span>
            <div className="flex items-center gap-1">
              <input 
                type="number"
                placeholder="Min"
                value={valorMinFilter}
                onChange={(e) => {
                  setValorMinFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={cn(
                  "w-20 border rounded-xl py-1.5 px-2 text-[11px] font-bold outline-none transition-all",
                  theme === 'dark' 
                    ? "bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-violet-500" 
                    : "bg-white border-zinc-200 text-zinc-900 focus:border-violet-500"
                )}
              />
              <span className="text-zinc-500">-</span>
              <input 
                type="number"
                placeholder="Max"
                value={valorMaxFilter}
                onChange={(e) => {
                  setValorMaxFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={cn(
                  "w-20 border rounded-xl py-1.5 px-2 text-[11px] font-bold outline-none transition-all",
                  theme === 'dark' 
                    ? "bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-violet-500" 
                    : "bg-white border-zinc-200 text-zinc-900 focus:border-violet-500"
                )}
              />
            </div>
          </div>

          {(brandFilter !== 'Todas' || statusFilter !== 'Todos' || cilindradaFilter !== 'Todas' || anoMinFilter || valorMinFilter || valorMaxFilter) && (
            <button 
              onClick={() => {
                setBrandFilter('Todas');
                setStatusFilter('Todos');
                setCilindradaFilter('Todas');
                setAnoMinFilter('');
                setValorMinFilter('');
                setValorMaxFilter('');
                setCurrentPage(1);
              }}
              className="text-xs text-rose-400 hover:text-rose-300 font-bold uppercase tracking-wider flex items-center gap-1 transition-colors ml-auto"
            >
              <X size={14} />
              Limpar Filtros
            </button>
          )}
        </div>
      )}

      {viewMode === 'table' ? (
        <div className={cn(
          "border rounded-2xl overflow-visible relative transition-all duration-300",
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
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Moto</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Marca/Modelo</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Ano</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Lote</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Valor</th>
                  {!readOnly && <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className={cn(
                "divide-y transition-colors",
                theme === 'dark' ? "divide-zinc-800/30" : "divide-zinc-100"
              )}>
                {paginatedItems.map((item) => (
                  <tr 
                    key={item.id} 
                    ref={editingRowId === item.id ? editRowRef : null}
                    onClick={() => handleRowClick(item)}
                    className={cn(
                      "transition-all duration-200 group cursor-pointer",
                      selectedIds.includes(item.id) 
                        ? theme === 'dark' ? "bg-violet-500/10" : "bg-violet-50"
                        : theme === 'dark' ? "hover:bg-zinc-800/20" : "hover:bg-zinc-50",
                      editingRowId === item.id && (theme === 'dark' ? "bg-zinc-800/40" : "bg-zinc-100")
                    )}
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div 
                        onClick={() => toggleSelect(item.id)}
                        className={cn(
                          "w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-all duration-200",
                          selectedIds.includes(item.id)
                            ? "bg-violet-600 border-violet-600 shadow-[0_0_8px_rgba(139,92,246,0.3)] opacity-100" 
                            : cn(
                                "opacity-0 group-hover:opacity-100",
                                theme === 'dark' ? "border-zinc-700 hover:border-zinc-500" : "border-zinc-300 hover:border-zinc-400"
                              )
                        )}
                      >
                        {selectedIds.includes(item.id) && <Check className="text-white" size={14} />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-zinc-500">
                      {editingRowId === item.id ? (
                        <input 
                          autoFocus
                          type="text" 
                          value={inlineEditData.rk_id} 
                          onChange={(e) => setInlineEditData({...inlineEditData, rk_id: e.target.value})}
                          onKeyDown={handleInlineKeyDown}
                          className={cn("w-full bg-transparent border-b border-violet-500 outline-none px-1")}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : item.rk_id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {item.imagem && (
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-800/50">
                            <img loading="lazy" src={item.imagem} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}
                        {editingRowId === item.id ? (
                          <input 
                            type="text" 
                            value={inlineEditData.nome} 
                            onChange={(e) => setInlineEditData({...inlineEditData, nome: e.target.value})}
                            onKeyDown={handleInlineKeyDown}
                            className={cn("w-full bg-transparent border-b border-violet-500 outline-none px-1 text-sm font-bold", theme === 'dark' ? "text-white" : "text-zinc-900")}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className={cn("text-sm font-bold tracking-tight", theme === 'dark' ? "text-white" : "text-zinc-900")}>{item.nome}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-zinc-500">
                      {editingRowId === item.id ? (
                        <div className="flex gap-1">
                          <input 
                            type="text" 
                            value={inlineEditData.marca} 
                            onChange={(e) => setInlineEditData({...inlineEditData, marca: e.target.value})}
                            onKeyDown={handleInlineKeyDown}
                            className={cn("w-1/2 bg-transparent border-b border-violet-500 outline-none px-1")}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <input 
                            type="text" 
                            value={inlineEditData.modelo} 
                            onChange={(e) => setInlineEditData({...inlineEditData, modelo: e.target.value})}
                            onKeyDown={handleInlineKeyDown}
                            className={cn("w-1/2 bg-transparent border-b border-violet-500 outline-none px-1")}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      ) : (
                        `${item.marca} ${item.modelo}`
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {editingRowId === item.id ? (
                        <input 
                          type="text" 
                          value={inlineEditData.ano} 
                          onChange={(e) => setInlineEditData({...inlineEditData, ano: e.target.value})}
                          onKeyDown={handleInlineKeyDown}
                          className={cn("w-full bg-transparent border-b border-violet-500 outline-none px-1")}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (isNaN(Number(item.ano)) ? "0" : item.ano)}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {editingRowId === item.id ? (
                        <input 
                          type="text" 
                          value={inlineEditData.lote} 
                          onChange={(e) => setInlineEditData({...inlineEditData, lote: e.target.value})}
                          onKeyDown={handleInlineKeyDown}
                          className={cn("w-full bg-transparent border-b border-violet-500 outline-none px-1")}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (isNaN(Number(item.lote)) ? "0" : item.lote)}
                    </td>
                    <td className="px-6 py-4">
                      {editingRowId === item.id ? (
                        <CustomDropdown
                          theme={theme}
                          variant="form"
                          value={inlineEditData.status} 
                          onChange={(val) => setInlineEditData({...inlineEditData, status: val})}
                          options={[
                            { value: 'Disponível', label: 'Disponível' },
                            { value: 'Em estoque', label: 'Em estoque' },
                            { value: 'Desmontada', label: 'Desmontada' },
                            { value: 'Vendida', label: 'Vendida' },
                          ]}
                          className="w-full"
                        />
                      ) : (
                        <span className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold uppercase whitespace-normal break-words max-w-[120px] inline-block",
                          getStatusColor(item.status)
                        )}>
                          {item.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingRowId === item.id ? (
                        <input 
                          type="number" 
                          value={inlineEditData.valor} 
                          onChange={(e) => setInlineEditData({...inlineEditData, valor: Number(e.target.value)})}
                          onKeyDown={handleInlineKeyDown}
                          className={cn("w-full bg-transparent border-b border-violet-500 outline-none px-1 text-sm font-bold text-violet-400")}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-sm font-bold text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.2)]">
                          {formatCurrency(item.valor)}
                        </span>
                      )}
                    </td>
                    {!readOnly && (
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {editingRowId === item.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={saveInlineEdit}
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all"
                            >
                              <Check size={14} />
                            </button>
                            <button 
                              onClick={() => { setEditingRowId(null); setInlineEditData(null); }}
                              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleEditMoto(item)}
                              className={cn(
                                "p-2 rounded-lg transition-all",
                                theme === 'dark' ? "bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-700" : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
                              )}
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => {
                                setItemToDelete(item.id);
                                setIsDeleteConfirmOpen(true);
                              }}
                              className={cn(
                                "p-2 rounded-lg transition-all",
                                theme === 'dark' ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" : "text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
                              )}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-6">
          {paginatedItems.map((item) => (
            <MotoCard 
              key={item.id}
              item={item}
              theme={theme}
              onSelectItem={onSelectItem}
              handleEditMoto={handleEditMoto}
              setItemToDelete={setItemToDelete}
              setIsDeleteConfirmOpen={setIsDeleteConfirmOpen}
              getStatusColor={getStatusColor}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      <div className={cn(
          "p-4 border-t flex items-center justify-between transition-colors",
          theme === 'dark' ? "bg-zinc-900/30 border-zinc-800/50" : "bg-zinc-50 border-zinc-200"
        )}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total: {filteredItems.length} motos</span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={cn(
                "p-1.5 border rounded-lg disabled:opacity-30 transition-all",
                theme === 'dark' ? "border-zinc-800 hover:bg-zinc-800" : "border-zinc-200 hover:bg-zinc-100"
              )}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-zinc-400">Página {currentPage} de {totalPages}</span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className={cn(
                "p-1.5 border rounded-lg disabled:opacity-30 transition-all",
                theme === 'dark' ? "border-zinc-800 hover:bg-zinc-800" : "border-zinc-200 hover:bg-zinc-100"
              )}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

      {/* Modal Nova Moto */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "w-full max-w-2xl max-h-[90vh] rounded-3xl border shadow-2xl relative overflow-visible",
                theme === 'dark' ? "bg-zinc-900/90 backdrop-blur-xl border-zinc-800/50 text-white" : "bg-white border-zinc-200 text-zinc-900"
              )}
            >
              <form onSubmit={handleSaveMoto} className="flex flex-col max-h-[90vh]">
                <button type="button" onClick={closeModals} className="absolute top-6 right-6 p-2 hover:bg-zinc-800 rounded-full transition-colors z-10">
                  <X size={20} className="text-zinc-500" />
                </button>

                <div className="p-8 pb-4 flex items-center gap-4 border-b border-zinc-800/50">
                  <div className="p-3 bg-violet-600/10 rounded-2xl">
                    <Plus className="text-violet-500" size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Nova Moto</h2>
                    <p className="text-sm text-zinc-500">Adicione uma nova moto ao catálogo</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Nome/Título</label>
                    <input required type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className={cn("w-full border rounded-xl py-2 px-4 text-sm", theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200")} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Marca</label>
                    <input type="text" value={formData.marca} onChange={(e) => setFormData({...formData, marca: e.target.value})} className={cn("w-full border rounded-xl py-2 px-4 text-sm", theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200")} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Modelo</label>
                    <input type="text" value={formData.modelo} onChange={(e) => setFormData({...formData, modelo: e.target.value})} className={cn("w-full border rounded-xl py-2 px-4 text-sm", theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200")} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Ano</label>
                    <input type="text" value={formData.ano} onChange={(e) => setFormData({...formData, ano: e.target.value})} className={cn("w-full border rounded-xl py-2 px-4 text-sm", theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200")} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Cilindrada</label>
                    <input type="number" value={formData.cilindrada} onChange={(e) => setFormData({...formData, cilindrada: e.target.value})} className={cn("w-full border rounded-xl py-2 px-4 text-sm", theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200")} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Valor (R$)</label>
                    <input required type="number" value={formData.valor} onChange={(e) => setFormData({...formData, valor: e.target.value})} className={cn("w-full border rounded-xl py-2 px-4 text-sm", theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200")} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Cor</label>
                    <input type="text" value={formData.cor} onChange={(e) => setFormData({...formData, cor: e.target.value})} className={cn("w-full border rounded-xl py-2 px-4 text-sm", theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200")} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Lote</label>
                    <input type="text" value={formData.lote} onChange={(e) => setFormData({...formData, lote: e.target.value})} className={cn("w-full border rounded-xl py-2 px-4 text-sm", theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200")} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Status</label>
                    <CustomDropdown
                      theme={theme}
                      variant="form"
                      value={formData.status}
                      onChange={(val) => setFormData({...formData, status: val})}
                      options={[
                        { value: 'Disponível', label: 'Disponível' },
                        { value: 'Em estoque', label: 'Em estoque' },
                        { value: 'Desmontada', label: 'Desmontada' },
                        { value: 'Vendida', label: 'Vendida' },
                      ]}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Nome NF</label>
                    <input type="text" value={formData.nome_nf} onChange={(e) => setFormData({...formData, nome_nf: e.target.value})} className={cn("w-full border rounded-xl py-2 px-4 text-sm", theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200")} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Peças Retiradas</label>
                  <input type="text" value={formData.pecas_retiradas} onChange={(e) => setFormData({...formData, pecas_retiradas: e.target.value})} className={cn("w-full border rounded-xl py-2 px-4 text-sm", theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200")} />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Fotos (Máx 15)</label>
                  
                  {/* Imagens já salvas */}
                  {formData.imagens.length > 0 && (
                    <Reorder.Group 
                      axis="x" 
                      values={formData.imagens} 
                      onReorder={(newOrder) => setFormData({...formData, imagens: newOrder})}
                      className="flex gap-2 mb-3 overflow-x-auto pb-2 custom-scrollbar"
                    >
                      {formData.imagens.map((img) => (
                        <Reorder.Item 
                          key={img} 
                          value={img}
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="relative flex-shrink-0 w-24 aspect-square rounded-lg overflow-hidden border border-zinc-800 group cursor-grab active:cursor-grabbing"
                        >
                          <img loading="lazy" src={img} className="w-full h-full object-cover pointer-events-none" referrerPolicy="no-referrer" />
                          <button 
                            type="button"
                            onClick={() => setFormData({...formData, imagens: formData.imagens.filter((i) => i !== img)})}
                            className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          >
                            <X size={10} />
                          </button>
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <Layers size={16} className="text-white/70" />
                          </div>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  )}

                  {/* Pré-visualização das imagens selecionadas */}
                  {selectedFiles.length > 0 && (
                    <Reorder.Group 
                      axis="x" 
                      values={selectedFiles} 
                      onReorder={setSelectedFiles}
                      className="flex gap-2 mb-3 overflow-x-auto pb-2 custom-scrollbar"
                    >
                      {selectedFiles.map((file) => (
                        <Reorder.Item 
                          key={file.name + file.size + file.lastModified} 
                          value={file}
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="relative flex-shrink-0 w-24 group aspect-square cursor-grab active:cursor-grabbing"
                        >
                          <img 
                            src={URL.createObjectURL(file)} 
                            alt={file.name}
                            className="w-full h-full object-cover rounded-lg border border-zinc-700 pointer-events-none"
                          />
                          <button
                            type="button"
                            onClick={() => setSelectedFiles(prev => prev.filter(f => f !== file))}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          >
                            <X size={14} />
                          </button>
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none rounded-lg">
                            <Layers size={16} className="text-white/70" />
                          </div>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  )}
                  
                  {/* Botão de adicionar fotos */}
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={selectedFiles.length + formData.imagens.length >= 15}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      <Plus size={18} />
                      Selecionar Fotos ({selectedFiles.length + formData.imagens.length}/15)
                    </button>
                    
                    {selectedFiles.length > 0 && (
                      <button
                        type="button"
                        onClick={() => uploadFiles(false)}
                        disabled={uploading}
                        className="px-4 py-2 bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors flex items-center gap-2 text-sm font-bold"
                      >
                        {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                        {uploading ? 'Enviando...' : 'Fazer Upload'}
                      </button>
                    )}
                  </div>
                  
                  <p className="text-[10px] text-zinc-500 mt-1 uppercase font-bold tracking-widest">
                    Selecione imagens do seu computador (máx 15)
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Descrição</label>
                  <textarea rows={3} value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} className={cn("w-full border rounded-xl py-2 px-4 text-sm", theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200")} />
                </div>
              </div>

              <div className="p-6 border-t border-zinc-800/50 bg-zinc-900/20 flex items-center justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={closeModals} 
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
                    Salvar Moto
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Editar Moto */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "w-full max-w-2xl max-h-[90vh] rounded-3xl border shadow-2xl relative overflow-visible",
                theme === 'dark' ? "bg-zinc-900/90 backdrop-blur-xl border-zinc-800/50 text-white" : "bg-white border-zinc-200 text-zinc-900"
              )}
            >
              <form onSubmit={handleUpdateMoto} className="flex flex-col max-h-[90vh]">
                <button type="button" onClick={closeModals} className="absolute top-6 right-6 p-2 hover:bg-zinc-800 rounded-full transition-colors z-10">
                  <X size={20} className="text-zinc-500" />
                </button>

                <div className="p-8 pb-4 flex items-center gap-4 border-b border-zinc-800/50">
                  <div className="p-3 bg-violet-600/10 rounded-2xl">
<Edit2 className="text-violet-500" size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Editar Moto</h2>
                    <p className="text-sm text-zinc-500">Atualize as informações da moto</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Nome/Título</label>
                    <input required type="text" value={editFormData.nome} onChange={(e) => setEditFormData({...editFormData, nome: e.target.value})} className={cn("w-full border rounded-xl py-2 px-4 text-sm", theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200")} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Marca</label>
                    <input type="text" value={editFormData.marca} onChange={(e) => setEditFormData({...editFormData, marca: e.target.value})} className={cn("w-full border rounded-xl py-2 px-4 text-sm", theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200")} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Modelo</label>
                    <input type="text" value={editFormData.modelo} onChange={(e) => setEditFormData({...editFormData, modelo: e.target.value})} className={cn("w-full border rounded-xl py-2 px-4 text-sm", theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200")} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Ano</label>
                    <input type="text" value={editFormData.ano} onChange={(e) => setEditFormData({...editFormData, ano: e.target.value})} className={cn("w-full border rounded-xl py-2 px-4 text-sm", theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200")} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Cilindrada</label>
                    <input type="number" value={editFormData.cilindrada} onChange={(e) => setEditFormData({...editFormData, cilindrada: e.target.value})} className={cn("w-full border rounded-xl py-2 px-4 text-sm", theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200")} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Valor (R$)</label>
                    <input required type="number" value={editFormData.valor} onChange={(e) => setEditFormData({...editFormData, valor: e.target.value})} className={cn("w-full border rounded-xl py-2 px-4 text-sm", theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200")} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Cor</label>
                    <input type="text" value={editFormData.cor} onChange={(e) => setEditFormData({...editFormData, cor: e.target.value})} className={cn("w-full border rounded-xl py-2 px-4 text-sm", theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200")} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Lote</label>
                    <input type="text" value={editFormData.lote} onChange={(e) => setEditFormData({...editFormData, lote: e.target.value})} className={cn("w-full border rounded-xl py-2 px-4 text-sm", theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200")} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Status</label>
                    <CustomDropdown
                      theme={theme}
                      variant="form"
                      value={editFormData.status}
                      onChange={(val) => setEditFormData({...editFormData, status: val})}
                      options={[
                        { value: 'Disponível', label: 'Disponível' },
                        { value: 'Em estoque', label: 'Em estoque' },
                        { value: 'Desmontada', label: 'Desmontada' },
                        { value: 'Vendida', label: 'Vendida' },
                      ]}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Nome NF</label>
                    <input type="text" value={editFormData.nome_nf} onChange={(e) => setEditFormData({...editFormData, nome_nf: e.target.value})} className={cn("w-full border rounded-xl py-2 px-4 text-sm", theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200")} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Peças Retiradas</label>
                  <input type="text" value={editFormData.pecas_retiradas} onChange={(e) => setEditFormData({...editFormData, pecas_retiradas: e.target.value})} className={cn("w-full border rounded-xl py-2 px-4 text-sm", theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200")} />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Fotos (Máx 15)</label>
                  
                  {/* Imagens já salvas */}
                  {editFormData.imagens.length > 0 && (
                    <Reorder.Group 
                      axis="x" 
                      values={editFormData.imagens} 
                      onReorder={(newOrder) => setEditFormData({...editFormData, imagens: newOrder})}
                      className="flex gap-2 mb-3 overflow-x-auto pb-2 custom-scrollbar"
                    >
                      {editFormData.imagens.map((img) => (
                        <Reorder.Item 
                          key={img} 
                          value={img}
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="relative flex-shrink-0 w-24 aspect-square rounded-lg overflow-hidden border border-zinc-800 group cursor-grab active:cursor-grabbing"
                        >
                          <img loading="lazy" src={img} className="w-full h-full object-cover pointer-events-none" referrerPolicy="no-referrer" />
                          <button 
                            type="button"
                            onClick={() => setEditFormData({...editFormData, imagens: editFormData.imagens.filter((i) => i !== img)})}
                            className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          >
                            <X size={10} />
                          </button>
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <Layers size={16} className="text-white/70" />
                          </div>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  )}

                  {/* Pré-visualização das imagens selecionadas */}
                  {selectedFiles.length > 0 && (
                    <Reorder.Group 
                      axis="x" 
                      values={selectedFiles} 
                      onReorder={setSelectedFiles}
                      className="flex gap-2 mb-3 overflow-x-auto pb-2 custom-scrollbar"
                    >
                      {selectedFiles.map((file) => (
                        <Reorder.Item 
                          key={file.name + file.size + file.lastModified} 
                          value={file}
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="relative flex-shrink-0 w-24 group aspect-square cursor-grab active:cursor-grabbing"
                        >
                          <img 
                            src={URL.createObjectURL(file)} 
                            alt={file.name}
                            className="w-full h-full object-cover rounded-lg border border-zinc-700 pointer-events-none"
                          />
                          <button
                            type="button"
                            onClick={() => setSelectedFiles(prev => prev.filter(f => f !== file))}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          >
                            <X size={14} />
                          </button>
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none rounded-lg">
                            <Layers size={16} className="text-white/70" />
                          </div>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  )}
                  
                  {/* Botão de adicionar fotos */}
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={selectedFiles.length + editFormData.imagens.length >= 15}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      <Plus size={18} />
                      Selecionar Fotos ({selectedFiles.length + editFormData.imagens.length}/15)
                    </button>
                    
                    {selectedFiles.length > 0 && (
                      <button
                        type="button"
                        onClick={() => uploadFiles(true)}
                        disabled={uploading}
                        className="px-4 py-2 bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors flex items-center gap-2 text-sm font-bold"
                      >
                        {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                        {uploading ? 'Enviando...' : 'Fazer Upload'}
                      </button>
                    )}
                  </div>
                  
                  <p className="text-[10px] text-zinc-500 mt-1 uppercase font-bold tracking-widest">
                    Selecione imagens do seu computador (máx 15)
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Descrição</label>
                  <textarea rows={3} value={editFormData.descricao} onChange={(e) => setEditFormData({...editFormData, descricao: e.target.value})} className={cn("w-full border rounded-xl py-2 px-4 text-sm", theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200")} />
                </div>
              </div>

              <div className="p-6 border-t border-zinc-800/50 bg-zinc-900/20 flex items-center justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={closeModals} 
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
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Confirmação Exclusão */}
      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className={cn("w-full max-w-md p-8 rounded-3xl border shadow-2xl text-center", theme === 'dark' ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900")}>
              <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Excluir Moto?</h3>
              <p className="text-zinc-500 text-sm mb-8">Esta ação não pode ser desfeita. A moto será removida do Notion.</p>
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
                  onClick={handleDeleteMoto} 
                  className={cn(
                    "flex-1 py-3 px-4 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2",
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

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className={cn("fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl", theme === 'dark' ? "bg-zinc-900/90 border-zinc-800 text-white" : "bg-white/90 border-zinc-200 text-zinc-900")}>
            <span className="text-sm font-medium mr-4">{selectedIds.length} moto(s) selecionada(s)</span>
            <div className="flex items-center gap-2 border-l pl-4 border-zinc-800">
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

      {/* Modal Confirmação Exclusão em Massa */}
      <AnimatePresence>
        {isBulkDeleteConfirmOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className={cn("w-full max-w-md p-8 rounded-3xl border shadow-2xl text-center", theme === 'dark' ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900")}>
              <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Excluir {selectedIds.length} Motos?</h3>
              <p className="text-zinc-500 text-sm mb-8">Esta ação removerá permanentemente todas as motos selecionadas.</p>
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
                  className={cn(
                    "flex-1 py-3 px-4 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2",
                    theme === 'dark'
                      ? "bg-rose-600 border border-rose-500 text-white shadow-lg shadow-rose-900/20 hover:bg-rose-500"
                      : "bg-rose-600 border border-rose-500 text-white shadow-lg shadow-rose-200/50 hover:bg-rose-700"
                  )}
                >
                  Excluir Todas
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default MotosView;
