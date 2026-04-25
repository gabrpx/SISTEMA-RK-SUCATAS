// ============================================
// APP.TSX â€” Componente raiz da aplicação RK Sucatas
// ============================================
// Responsável por:
// - Contexto global de dados (estoque, vendas, motos)
// - Layout principal (sidebar, header, navegação)
// - Views: Dashboard, Estoque, Vendas, Motos, Config, etc.
// ============================================

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================
// IMPORTS DO REACT
// ============================================
// Hooks e utilidades principais usados em todo o arquivo
// ============================================
import React, { useState, useEffect, useMemo, useContext, createContext, useRef, useCallback, memo } from 'react';
// ============================================
// IMPORTS DO FIREBASE E COMPONENTES INTERNOS
// ============================================
// db: instância do Firestore para notificações em tempo real
// query, collection, etc: utilitários de consulta do Firestore
// QuestionsDashboard, AdminUsers, AuditLogs: componentes de funcionalidades específicas
// ============================================
import { db } from './firebase'; // keeping only what is necessary, if any
import { query, collection, orderBy, limit, onSnapshot } from 'firebase/firestore';
import QuestionsDashboard from './components/QuestionsDashboard';
import AdminUsers from './components/AdminUsers';
import AuditLogs from './components/AuditLogs';
import { 
  LayoutDashboard, 
  Package, 
  TrendingUp, 
  Users, 
  DollarSign, 
  ShoppingCart,
  Menu,
  X,
  Search,
  Bell,
  ChevronRight,
  Loader2,
  AlertCircle,
  Plus,
  Minus,
  Save,
  Wrench,
  ChevronLeft,
  Sun,
  Moon,
  Trash2,
  Layers,
  Check,
  Bike,
  Edit,
  Settings,
  History,
  Calendar,
  Filter,
  RefreshCw,
  ExternalLink,
  Edit2,
  LayoutGrid,
  Table as TableIcon,
  Upload,

  User,
  Camera,
  Image as ImageIcon,
  Box,
  BarChart3,
  MessageCircle,
  ShoppingBag,
  Eye,
  FileText,
  CreditCard,
  Zap,
  Tag,
  FileDown,
  EyeOff,
  Truck,
  Activity,
  MapPin,
  Hash,
  TrendingDown,
  Copy,
  ArrowDownAZ,
  LogOut,
  UserCog
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { cn, parseLocalDate } from './utils';
import { BudgetModal } from './components/BudgetModal';
import { GlobalSearch } from './components/GlobalSearch';
import { CustomDropdown } from './components/CustomDropdown';
import { CATEGORIAS_OFICIAIS, MOTOS_OFICIAIS, PAGAMENTOS_OFICIAIS } from './constants/lists';
import { MobileBottomNav } from './components/MobileBottomNav';
import { FreteView } from './components/FreteView';
import { MercadoLivre } from './views/MercadoLivreView';
import { RegistroModal } from './components/RegistroModal';
import { io } from 'socket.io-client';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Capacitor } from '@capacitor/core';
import { StockFilters } from './components/filters';
import { InventoryView } from './views/InventoryView';
import { DashboardView } from './views/DashboardView';

const modelosMotos = MOTOS_OFICIAIS;
const modelosUnicos = MOTOS_OFICIAIS;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

const parseJson = async (res: Response) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error(`❌ Erro ao parsear JSON de ${res.url}. Conteúdo recebido:`, text.substring(0, 200));
    throw new Error(`Resposta inválida de ${res.url}`);
  }
};

const fetchWithRetry = async (url: string, init?: RequestInit, retries = 8) => {
  const isInternal = url.startsWith('/') || url.startsWith(window.location.origin);
  let localToken = null;
  
  if (isInternal) {
    try {
      localToken = localStorage.getItem('auth_token');
    } catch (e) {
      console.error("Failed to get local token for fetchWithRetry", e);
    }
  }
  
  const headers: HeadersInit = {
    ...(init?.headers || {}),
    ...(localToken ? { 'Authorization': `Bearer ${localToken}` } : {})
  };
  
  console.log(`ðŸ” Fetching ${url} with method ${init?.method || 'GET'} and headers:`, headers);
  
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { ...init, headers });
      
      // Se o status for 503 ou 502, é provável que o servidor esteja iniciando
      if (res.status === 503 || res.status === 502) {
        throw new Error('Servidor indisponível (iniciando)');
      }

      // Verifica o corpo da resposta mesmo se o status for 200
      // O proxy da plataforma às vezes retorna 200 com o HTML de "Starting Server"
      const text = await res.clone().text();
      if (
        text.includes('<title>Starting Server...</title>') || 
        text.includes('Starting Server...') ||
        text.trim().startsWith('<!doctype html>') ||
        text.trim().startsWith('<!DOCTYPE html>')
      ) {
        throw new Error('Servidor ainda iniciando (HTML recebido)');
      }

      if (res.status === 401 || res.status === 403 || res.status === 404) {
        return res; // Return directly, don't retry client errors
      }

      if (!res.ok) throw new Error(`Status ${res.status}`);
      
      return res;
    } catch (err) {
      // Don't retry if it's a known non-retryable error
      if (err instanceof Error && err.message.includes('Sessão expirada')) {
        throw err;
      }
      
      if (i === retries) {
        console.error(`❌ Falha definitiva ao buscar ${url}:`, err);
        throw err;
      }
      // Espera progressiva mais longa: 3s, 6s, 9s...
      const delay = 3000 * (i + 1);
      console.warn(`⚠️ Tentativa ${i + 1} falhou para ${url}: ${err instanceof Error ? err.message : String(err)}. Tentando novamente em ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Falha após retentativas');
};

function normalizarTexto(texto: string) {
  return texto
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

function extrairModeloMoto(textoPeca: string) {
  if (!textoPeca || textoPeca.length < 3) return '';
  const textoNormalizado = normalizarTexto(textoPeca);
  for (const modelo of modelosUnicos) {
    const modeloNormalizado = normalizarTexto(modelo);
    if (textoNormalizado.includes(modeloNormalizado)) return modelo;
  }
  for (const modelo of modelosUnicos) {
    const modeloNormalizado = normalizarTexto(modelo);
    const palavrasModelo = modeloNormalizado.split(' ');
    if (palavrasModelo.length >= 2) {
      let encontrouTodas = true;
      let posicao = 0;
      for (const palavra of palavrasModelo) {
        const index = textoNormalizado.indexOf(palavra, posicao);
        if (index === -1) { encontrouTodas = false; break; }
        posicao = index + palavra.length;
      }
      if (encontrouTodas) return modelo;
    }
  }
  const padraoNumerico = textoPeca.match(/\b(50|100|110|125|150|160|190|200|250|300|400|500|600|660|900|1000)\b/i);
  if (padraoNumerico) {
    const numero = padraoNumerico[0];
    for (const modelo of modelosUnicos) {
      if (modelo.includes(numero)) return modelo;
    }
  }
  return '';
}

function extrairCategoria(textoPeca: string) {
  if (!textoPeca || textoPeca.length < 3) return '';
  const textoNormalizado = normalizarTexto(textoPeca);
  // Ordena por tamanho decrescente para pegar o termo mais específico primeiro
  const categoriasOrdenadas = [...CATEGORIAS_OFICIAIS].sort((a, b) => b.length - a.length);
  for (const categoria of categoriasOrdenadas) {
    const categoriaNormalizada = normalizarTexto(categoria);
    // Se o texto da peça contém a categoria OU a categoria contém o texto da peça (ex: "escapamento" -> "Escapamentos")
    if (textoNormalizado.includes(categoriaNormalizada) || categoriaNormalizada.includes(textoNormalizado)) return categoria;
  }
  return '';
}

const dropdownClass = (theme: string) => cn(
  "w-full border rounded-xl py-2 px-4 text-sm outline-none transition-all focus:ring-2 focus:ring-violet-500/50",
  theme === 'dark' 
    ? "bg-zinc-950 border-zinc-800 text-zinc-200 hover:border-zinc-700" 
    : "bg-white border-zinc-200 text-zinc-900 hover:border-zinc-300"
);

// Global Data Context
export const DataContext = createContext<{
  inventory: any[];
  sales: any[];
  motos: any[];
  loading: boolean;
  setInventory: React.Dispatch<React.SetStateAction<any[]>>;
  setSales: React.Dispatch<React.SetStateAction<any[]>>;
  setMotos: React.Dispatch<React.SetStateAction<any[]>>;
  refreshData: () => Promise<void>;
  showSensitiveInfo: boolean;
  setShowSensitiveInfo: React.Dispatch<React.SetStateAction<boolean>>;
}>({
  inventory: [],
  sales: [],
  motos: [],
  loading: false,
  setInventory: () => {},
  setSales: () => {},
  setMotos: () => {},
  refreshData: async () => {},
  showSensitiveInfo: true,
  setShowSensitiveInfo: () => {},
});

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [inventory, setInventory] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [motos, setMotos] = useState<any[]>([]);

  useEffect(() => {
    try {
      const savedInventory = localStorage.getItem('rk_inventory');
      if (savedInventory) setInventory(JSON.parse(savedInventory));
      
      const savedSales = localStorage.getItem('rk_sales');
      if (savedSales) setSales(JSON.parse(savedSales));
      
      const savedMotos = localStorage.getItem('rk_motos');
      if (savedMotos) setMotos(JSON.parse(savedMotos));
    } catch (e) {
      console.error('Erro ao carregar cache do localStorage', e);
    }
  }, []);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState(0);
  const lastMutationRef = useRef(0);
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(true);
  const CACHE_TIME = 5 * 1000; // 5 segundos

  const loadData = async (force = false, silent = false) => {
    const now = Date.now();
    // Se não for forçado, não for silencioso e o cache for recente, não faz nada
    if (!force && !silent && (now - lastFetch) < CACHE_TIME && inventory.length > 0) {
      return; 
    }

    if (!silent) setLoading(true);
    
    try {
      const query = force ? '?force=true' : '';
      
      const results = await Promise.allSettled([
        fetchWithRetry(`/api/produtos${query}`),
        fetchWithRetry(`/api/vendas${query}`),
        fetchWithRetry(`/api/motos${query}`)
      ]);

      // Processar resultados individualmente
      // Estoque
      if (results[0].status === 'fulfilled') {
        try {
          const data = await parseJson(results[0].value);
          if (data.success) {
            setInventory(prev => {
              const newDataStr = JSON.stringify(data.data);
              const prevDataStr = JSON.stringify(prev);
              if (newDataStr !== prevDataStr) {
                try { localStorage.setItem('rk_inventory', newDataStr); } catch (e) { console.warn('Cache de estoque cheio'); }
                return data.data;
              }
              return prev;
            });
          }
        } catch (e) {
          console.error('❌ Erro ao processar estoque:', e);
        }
      } else {
        console.error('❌ Erro ao buscar estoque:', results[0].reason);
      }

      // Vendas
      if (results[1].status === 'fulfilled') {
        try {
          const data = await parseJson(results[1].value);
          if (data.success) {
            setSales(prev => {
              const newDataStr = JSON.stringify(data.data);
              const prevDataStr = JSON.stringify(prev);
              if (newDataStr !== prevDataStr) {
                try { localStorage.setItem('rk_sales', newDataStr); } catch (e) { console.warn('Cache de vendas cheio'); }
                return data.data;
              }
              return prev;
            });
          }
        } catch (e) {
          console.error('❌ Erro ao processar vendas:', e);
        }
      } else {
        console.error('❌ Erro ao buscar vendas:', results[1].reason);
      }

      // Motos
      if (results[2].status === 'fulfilled') {
        try {
          const data = await parseJson(results[2].value);
          if (data.success) {
            // Grace period: se houve uma mutação recente (últimos 15s) e é um fetch silencioso,
            // não sobrescrevemos o estado das motos para evitar que itens novos sumam (eventual consistency do Notion)
            const isRecentMutation = (Date.now() - lastMutationRef.current) < 15000;
            if (!silent || !isRecentMutation || motos.length === 0) {
              setMotos(prev => {
                const newDataStr = JSON.stringify(data.data);
                const prevDataStr = JSON.stringify(prev);
                if (newDataStr !== prevDataStr) {
                  try { localStorage.setItem('rk_motos', newDataStr); } catch (e) { console.warn('Cache de motos cheio'); }
                  return data.data;
                }
                return prev;
              });
            } else {
              console.log('⏳ Pulando atualização de motos devido a mutação recente');
            }
          }
        } catch (e) {
          console.error('❌ Erro ao processar motos:', e);
        }
      } else {
        console.error('❌ Erro ao buscar motos:', results[2].reason);
      }
      
      setLastFetch(now);
    } catch (error: any) {
      console.error('Erro crítico ao carregar dados:', error);
      // Só mostra erro se não for silencioso
      if (!silent) {
        // Aqui poderíamos usar um toast ou setError global
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Carrega os dados imediatamente ao montar o componente
    loadData();

    // Polling para sincronização "instantânea" (silenciosa)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadData(false, true);
      }
    }, 10000); // Aumentado para 10 segundos e adicionado verificação de visibilidade

    const initApp = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await CapacitorUpdater.notifyAppReady();
          console.log('✅ App pronto para atualizações automáticas');
        } catch (error) {
          console.error('Erro no auto-update:', error);
        }
      }
    };
    initApp();

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <DataContext.Provider value={{ 
      inventory, 
      sales, 
      motos,
      loading, 
      setInventory, 
      setSales, 
      setMotos: (val) => {
        if (typeof val === 'function') {
          setMotos(prev => {
            const next = (val as any)(prev);
            lastMutationRef.current = Date.now();
            return next;
          });
        } else {
          setMotos(val);
          lastMutationRef.current = Date.now();
        }
      },
      refreshData: () => loadData(true),
      showSensitiveInfo,
      setShowSensitiveInfo
    }}>
      {children}
    </DataContext.Provider>
  );
}




// Components
const SidebarItem = memo(({ 
  icon: Icon, 
  label, 
  active, 
  onClick,
  theme,
  badge,
  className
}: { 
  icon: any, 
  label: string, 
  active: boolean, 
  onClick: () => void,
  theme: 'light' | 'dark',
  badge?: number,
  className?: string
}) => (
  <motion.button
    whileHover={{ x: 4 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-500 group relative overflow-hidden transform-gpu",
      active 
        ? "bg-violet-600 text-white shadow-[0_10px_30px_rgba(139,92,246,0.3)]" 
        : theme === 'dark' 
          ? "text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
      className
    )}
  >
    {active && (
      <motion.div 
        layoutId="activeTabGlow"
        className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
      />
    )}
    <Icon size={20} strokeWidth={active ? 3 : 2} className="relative z-10" />
    {label && <span className="font-black text-xs uppercase tracking-[0.2em] whitespace-nowrap relative z-10">{label}</span>}
    {badge !== undefined && (
      <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-lg shadow-rose-500/40 relative z-10">
        {badge}
      </span>
    )}
  </motion.button>
));

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

// =============================================================================
// MOTOS VIEW COMPONENT
// =============================================================================

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
                    <Edit className="text-violet-500" size={28} />
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

// Helper to format relative time

import { Login } from './components/Login';

export default function App() {
  const [isUserAuthenticated, setIsUserAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null); // Modificado para aceitar usuário Supabase

  useEffect(() => {
    // Escuta mudanças de sessão baseadas no novo Custom Auth (SQLite na Vercel/Cloud Run via JWT local)
    const checkAuthStatus = () => {
      const token = localStorage.getItem('auth_token');
      const role = localStorage.getItem('user_role');
      const name = localStorage.getItem('user_name');
      
      if (token && role) {
        setCurrentUser({ id: 'local-user', email: name, user_metadata: { full_name: name } });
        setIsUserAuthenticated(true);
        if (window.location.pathname.toLowerCase() === '/login' || window.location.pathname === '/') {
          if (role === 'client' || role === 'cliente') {
            window.history.replaceState(null, '', '/catalogo');
          } else {
            window.history.replaceState(null, '', '/dashboard');
          }
        }
      } else {
        setIsUserAuthenticated(false);
        if (window.location.pathname === '/' || window.location.pathname === '') {
          window.history.replaceState(null, '', '/login');
        }
      }
    };

    // Verificar na inicialização
    checkAuthStatus();

    // Escutar eventos de login bem sucedido disparados pelo componente Login.tsx
    const handleLoginSuccess = (e: any) => {
      checkAuthStatus();
    };

    window.addEventListener('local-login-success', handleLoginSuccess);

    return () => {
      window.removeEventListener('local-login-success', handleLoginSuccess);
    };
  }, []);

  const handleLogout = async () => {
    try {
      // Remover chamadas de logout do supabase, já que não usamos mais o auth dele
    } catch (error) {
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_phone');
    setCurrentUser(null);
    setIsUserAuthenticated(false);
    window.location.href = '/login';
  };

  if (isUserAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const isLoginRoute = window.location.pathname.toLowerCase() === '/login';

  if (isLoginRoute && !isUserAuthenticated) {
    return <Login onLogin={() => {
      // No-op: onAuthStateChange will handle the state update
    }} />;
  }
  
  if (!isUserAuthenticated && !isLoginRoute && window.location.pathname !== '/catalogo') {
    window.location.href = '/login';
    return null;
  }

  return (
    <DataProvider>
      <AppContent onLogout={handleLogout} currentUser={currentUser} />
    </DataProvider>
  );
}

// =============================================================================
// DETAIL MODAL COMPONENT
// =============================================================================

const DetailModal = ({ item, onClose, theme, userRole, onEdit, onDelete }: { 
  item: any, 
  onClose: () => void, 
  theme: 'light' | 'dark',
  userRole?: string,
  onEdit?: (item: any) => void,
  onDelete?: (id: string) => void
}) => {
  if (!item) return null;

  const [copied, setCopied] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (Math.abs(diff) > 50) { // threshold
      if (diff > 0) { // swipe left
        setCurrentImageIndex(prev => (prev + 1) % images.length);
      } else { // swipe right
        setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length);
      }
    }
    setTouchStart(null);
  };

  // Scroll Lock
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const images = useMemo(() => {
    const imgs = item.imagens && item.imagens.length > 0 ? item.imagens : (item.imagem ? [item.imagem] : []);
    return imgs.filter(Boolean);
  }, [item.imagens, item.imagem]);

  const handleCopyLink = () => {
    const link = item.ml_link || item.permalink;
    if (link) {
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppShare = () => {
    const hour = new Date().getHours();
    let greeting = 'Bom dia';
    if (hour >= 12 && hour < 18) {
      greeting = 'Boa tarde';
    } else if (hour >= 18) {
      greeting = 'Boa noite';
    }
    const text = `${greeting}, quero mais detalhes da ${item.nome || item.titulo} que vi no seu site.`;
    window.open(`https://wa.me/5583982039490?text=${encodeURIComponent(text)}`, '_blank');
  };

  const parseValue = (val: any) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    
    let str = String(val).trim();
    
    // Remove R$ and spaces
    str = str.replace(/R\$\s?/g, '');
    
    // Check if it has both dots and commas (e.g. 1.200,50)
    if (str.includes('.') && str.includes(',')) {
      // Remove dots (thousands separators) and replace comma with dot
      str = str.replace(/\./g, '').replace(',', '.');
    } else if (str.includes(',')) {
      // Only has comma, assume it's decimal separator
      str = str.replace(',', '.');
    }
    
    // Remove any other non-digit/dot/minus characters
    const cleaned = str.replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const formatCurrency = (value: any) => {
    if (typeof value === 'string' && value.includes('R$')) return value;
    const num = parseValue(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  const isSale = item.tipo !== undefined && item.tipo !== null;
  const itemValue = item.valor || item.preco || item.preco_venda || item.price || 0;
  const itemName = item.nome || item.titulo || item.peca || item.title || 'Sem Nome';

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={cn(
          "w-[95%] md:max-w-2xl h-[90vh] md:h-auto md:max-h-[90vh] rounded-[2.5rem] overflow-hidden border shadow-2xl flex flex-col relative",
          theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200"
        )}
      >
        {/* Handle for mobile */}
        <div className="md:hidden w-full flex justify-center pt-4 pb-2">
          <div className="w-12 h-1.5 rounded-full bg-zinc-800/50" />
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose} 
          className={cn(
            "absolute top-6 right-6 z-50 p-2 rounded-full transition-all active:scale-90 shadow-xl border",
            theme === 'dark' ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white" : "bg-zinc-100 border-zinc-200 text-zinc-500 hover:text-zinc-900"
          )}
        >
          <X size={20} />
        </button>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* Image Gallery */}
          <div className="relative aspect-[4/3] w-full bg-zinc-950 overflow-hidden">
            {images.length > 0 ? (
              <div className="w-full h-full relative">
                <div 
                  className="flex transition-transform duration-500 ease-out h-full"
                  style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                  {images.map((src: string, idx: number) => (
                    <div 
                      key={idx} 
                      className="w-full h-full flex-shrink-0 cursor-zoom-in"
                      onClick={() => setFullScreenImage(src)}
                    >
                      <img loading="lazy" src={src} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
                
                {images.length > 1 && (
                  <>
                    <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 pointer-events-none">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length); }}
                        className="p-2 rounded-full bg-black/20 backdrop-blur-md text-white pointer-events-auto active:scale-90 transition-all"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev + 1) % images.length); }}
                        className="p-2 rounded-full bg-black/20 backdrop-blur-md text-white pointer-events-auto active:scale-90 transition-all"
                      >
                        <ChevronRight size={24} />
                      </button>
                    </div>
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
                      {images.map((_: any, idx: number) => (
                        <div 
                          key={idx} 
                          className={cn(
                            "h-1.5 rounded-full transition-all duration-300",
                            idx === currentImageIndex ? "w-8 bg-white" : "w-2 bg-white/40"
                          )}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-800">
                <Bike size={64} strokeWidth={1} className="opacity-10" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-8 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-violet-500/10 text-violet-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-violet-500/20">
                    {item.categoria || (isSale ? 'Venda' : (item.marca ? 'Moto' : 'Peça'))}
                  </span>
                  {(item.status || item.tipo) && (
                    <span className={cn(
                      "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border",
                      (item.status === 'Disponível' || item.status === 'DISPONÍVEL' || item.status === 'Ativo' || (isSale && item.tipo !== 'SAÍDA'))
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                    )}>
                      {item.status || item.tipo}
                    </span>
                  )}
                </div>
                <span className="text-zinc-500 text-[10px] font-mono font-bold">#{item.rk_id || (item.id && String(item.id).slice(0,4)) || 'N/A'}</span>
              </div>

              <h2 className={cn("text-3xl md:text-4xl font-black tracking-tight uppercase leading-none", theme === 'dark' ? "text-white" : "text-zinc-900")}>
                {itemName}
              </h2>

              <div className={cn(
                "text-4xl md:text-5xl font-black tracking-tighter transition-all duration-500",
                item.tipo === 'SAÍDA' ? "text-rose-500" : "text-emerald-500"
              )}>
                {formatCurrency(itemValue)}
              </div>
            </div>

            {/* Elegant Grid */}
            <div className="grid grid-cols-2 gap-4">
              {!isSale && !item.marca && (
                <>
                  <DetailItem label="Estoque" value={item.estoque !== undefined ? item.estoque : 'N/A'} icon={Package} theme={theme} />
                  <DetailItem label="Moto/Modelo" value={item.moto || item.modelo || 'N/A'} icon={Bike} theme={theme} />
                  <div className="col-span-2">
                    <DetailItem label="Ano" value={item.ano || 'N/A'} icon={Calendar} theme={theme} />
                  </div>
                </>
              )}
              
              {item.marca && (
                <>
                  <DetailItem label="Moto/Modelo" value={item.moto || item.modelo || 'N/A'} icon={Bike} theme={theme} />
                  <DetailItem label="Marca" value={item.marca} icon={Tag} theme={theme} />
                  <DetailItem label="Ano" value={item.ano || 'N/A'} icon={Calendar} theme={theme} />
                  <DetailItem label="Cilindrada" value={item.cilindrada ? `${item.cilindrada}cc` : 'N/A'} icon={Zap} theme={theme} />
                  <div className="col-span-2">
                    <DetailItem label="Lote" value={item.lote || 'N/A'} icon={Layers} theme={theme} />
                  </div>
                </>
              )}
              
              {isSale && (
                <>
                  <DetailItem label="Moto/Modelo" value={item.moto || item.modelo || 'N/A'} icon={Bike} theme={theme} />
                  <DetailItem label="Pagamento" value={item.forma_pagamento || item.tipo || 'N/A'} icon={CreditCard} theme={theme} />
                </>
              )}
            </div>

            {/* Description Section */}
            {(item.descricao || item.pecas_retiradas || item.observacoes) && (
              <div className="space-y-4">
                {(item.pecas_retiradas) && (
                  <div className={cn(
                    "p-6 rounded-3xl border space-y-2",
                    theme === 'dark' ? "bg-zinc-900/30 border-zinc-800" : "bg-zinc-50 border-zinc-100"
                  )}>
                    <h4 className="text-[10px] font-black uppercase text-violet-400 tracking-[0.1em] flex items-center gap-2">
                      <Wrench size={14} /> Peças Retiradas
                    </h4>
                    <p className={cn("text-sm leading-relaxed", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
                      {item.pecas_retiradas}
                    </p>
                  </div>
                )}
                {(item.descricao || item.observacoes) && (
                  <div className={cn(
                    "p-6 rounded-3xl border space-y-2",
                    theme === 'dark' ? "bg-zinc-900/30 border-zinc-800" : "bg-zinc-50 border-zinc-100"
                  )}>
                    <h4 className="text-[10px] font-black uppercase text-amber-400 tracking-[0.1em] flex items-center gap-2">
                      <FileText size={14} /> Observações
                    </h4>
                    <p className={cn("text-sm leading-relaxed", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
                      {item.descricao || item.observacoes}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Ações */}
            <div className="flex flex-col gap-3 pt-4">
              <button 
                onClick={handleWhatsAppShare}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3"
              >
                <MessageCircle size={20} />
                Tenho Interesse
              </button>
              
              {(item.ml_link || item.permalink) && (
                <motion.a 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  href={item.ml_link || item.permalink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full py-5 bg-[#FFE600] text-[#2D3277] font-black text-xs uppercase tracking-[0.1em] rounded-2xl hover:bg-[#F0D800] transition-all shadow-xl border border-[#FFE600]/20"
                >
                  <ExternalLink size={20} />
                  Abrir no Mercado Livre
                </motion.a>
              )}

              {onEdit && userRole !== 'client' && (
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => { onEdit(item); onClose(); }}
                    className={cn(
                      "py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all border flex items-center justify-center gap-2",
                      theme === 'dark' ? "bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800" : "bg-white border-zinc-200 text-zinc-900 hover:bg-zinc-50"
                    )}
                  >
                    <Edit size={16} />
                    Editar
                  </button>
                  <button 
                    onClick={() => { 
                      if (window.confirm('Tem certeza que deseja excluir este item?')) {
                        onDelete?.(item.id || item.rk_id);
                        onClose();
                      }
                    }}
                    className="py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Excluir
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Full Screen Image Viewer */}
      <AnimatePresence>
        {fullScreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] bg-black flex items-center justify-center p-4 md:p-10"
            onClick={() => setFullScreenImage(null)}
          >
            <button 
              className="absolute top-6 right-6 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all z-[3001]"
              onClick={(e) => { e.stopPropagation(); setFullScreenImage(null); }}
            >
              <X size={24} />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={fullScreenImage}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              referrerPolicy="no-referrer"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DetailItem = ({ label, value, theme, icon: Icon }: { label: string, value: any, theme: 'light' | 'dark', icon: any }) => {
  const displayValue = (value === null || value === undefined || value === "") ? "-" : value;
  
  return (
    <div className={cn(
      "p-4 rounded-2xl border flex flex-col gap-1.5 transition-all",
      theme === 'dark' ? "bg-zinc-900/40 border-zinc-800/50" : "bg-zinc-50 border-zinc-200"
    )}>
      <div className="flex items-center gap-2 text-zinc-500">
        <Icon size={14} strokeWidth={2.5} />
        <span className="text-[10px] uppercase font-black tracking-widest">{label}</span>
      </div>
      <span className={cn(
        "text-sm md:text-base font-black truncate uppercase",
        theme === 'dark' ? "text-zinc-100" : "text-zinc-900",
        (label === 'Estoque') && "text-emerald-400 [text-shadow:0_0_8px_rgba(16,185,129,0.3)]"
      )}>
        {displayValue}
      </span>
    </div>
  );
};

// =============================================================================
// MOTO CARD COMPONENT
// =============================================================================

const MOTO_COLORS: Record<string, string> = {
  'Preta': '#000000',
  'Branca': '#FFFFFF',
  'Vermelha': '#EF4444',
  'Azul': '#3B82F6',
  'Amarela': '#FBBF24',
  'Verde': '#10B981',
  'Cinza': '#6B7280',
  'Prata': '#D1D5DB',
  'Dourada': '#F59E0B',
  'Laranja': '#F97316',
  'Roxa': '#8B5CF6',
  'Rosa': '#EC4899',
  'Marrom': '#78350F',
  'Bege': '#F5F5DC',
  'Vinho': '#7F1D1D',
  'Grafite': '#374151',
  'Cobre': '#B45309',
  'Titanium': '#4B5563',
  'Azul Marinho': '#1E3A8A',
  'Verde Militar': '#365314'
};

const getMotoColor = (colorName: string) => {
  if (!colorName) return 'transparent';
  const normalized = colorName.trim().charAt(0).toUpperCase() + colorName.trim().slice(1).toLowerCase();
  return MOTO_COLORS[normalized] || 'transparent';
};

const MotoCard = React.memo(({ item, theme, onSelectItem, handleEditMoto, setItemToDelete, setIsDeleteConfirmOpen, getStatusColor, readOnly = false }: any) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const images = useMemo(() => {
    const imgs = item.imagens && item.imagens.length > 0 ? item.imagens : (item.imagem ? [item.imagem] : []);
    return imgs.filter(Boolean);
  }, [item.imagens, item.imagem]);

  // Preload images for smoother experience
  useEffect(() => {
    if (images.length > 0) {
      images.forEach(src => {
        const img = new Image();
        img.src = src;
      });
    }
  }, [images]);

  const handleMouseLeave = () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    // Volta instantaneamente a disparar o reset, mas a transição suave é mantida pelo CSS
    setCurrentImageIndex(0);
  };

  const handleMouseEnter = () => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleWheel = (e: WheelEvent) => {
      if (images.length <= 1) return;
      
      if (e.deltaY !== 0) {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.deltaY > 0) {
          setCurrentImageIndex((prev) => (prev + 1) % images.length);
        } else {
          setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
        }
      }
    };

    let touchStartX = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (images.length <= 1) return;
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX - touchEndX;

      if (Math.abs(diff) > 50) { // Threshold for swipe
        if (diff > 0) {
          setCurrentImageIndex((prev) => (prev + 1) % images.length);
        } else {
          setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
        }
      }
    };

    card.addEventListener('wheel', handleWheel, { passive: false });
    card.addEventListener('touchstart', handleTouchStart, { passive: true });
    card.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      card.removeEventListener('wheel', handleWheel);
      card.removeEventListener('touchstart', handleTouchStart);
      card.removeEventListener('touchend', handleTouchEnd);
    };
  }, [images.length]);

  return (
    <div 
      ref={cardRef}
      onClick={() => onSelectItem(item)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "group relative border rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer flex flex-col h-full",
        theme === 'dark' 
          ? "bg-zinc-900/40 border-zinc-800/50 hover:border-violet-500/50 hover:shadow-[0_8px_30px_rgba(139,92,246,0.1)]" 
          : "bg-white border-zinc-200 hover:border-violet-500/50 hover:shadow-lg",
        item.status === 'Vendida' && "opacity-60 grayscale-[0.5] brightness-75"
      )}
    >
      {/* Image Container */}
      <div className={cn("aspect-[4/3] relative overflow-hidden", theme === 'dark' ? "bg-zinc-950" : "bg-zinc-100")}>
        {images.length > 0 ? (
          <div className="w-full h-full relative">
            {imgLoading && (
              <div className={cn("absolute inset-0 flex items-center justify-center", theme === 'dark' ? "bg-zinc-900" : "bg-zinc-100")}>
                <Loader2 size={24} className="animate-spin text-violet-500/50" />
              </div>
            )}
            <div 
              className="flex transition-transform duration-500 ease-out h-full"
              style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
            >
              {images.map((src: string, idx: number) => (
                <div key={idx} className="w-full h-full flex-shrink-0 relative">
                  <img 
                    loading="lazy"
                    src={src} 
                    onLoad={() => idx === currentImageIndex && setImgLoading(false)}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (idx === currentImageIndex) {
                        console.error("Failed to load image:", src);
                        // Hide failed image to show the icon behind it
                        target.style.display = 'none';
                      } else {
                        target.style.display = 'none';
                      }
                    }}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer" 
                  />
                  {/* Fallback if single image fails */}
                  <div className={cn("absolute inset-0 -z-10 flex flex-col items-center justify-center text-zinc-400", theme === 'dark' ? "bg-zinc-900/50" : "bg-zinc-100")}>
                    <Bike size={48} strokeWidth={1} className="opacity-20" />
                    <span className="text-[10px] uppercase font-bold tracking-tighter mt-2 opacity-40">Erro ao carregar</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Image Indicators */}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 px-2">
                {images.map((_: any, idx: number) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "h-1 rounded-full transition-all duration-300 shadow-sm",
                      idx === currentImageIndex ? "w-6 bg-white" : "w-1.5 bg-white/40"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className={cn("w-full h-full flex flex-col items-center justify-center text-zinc-400", theme === 'dark' ? "bg-zinc-900/50" : "bg-zinc-100")}>
            <Bike size={48} strokeWidth={1} className="opacity-20" />
            <span className="text-[10px] uppercase font-bold tracking-tighter mt-2 opacity-40">Sem Imagem</span>
          </div>
        )}
        
        {/* Status Badge - Removed as requested */}
        {/* {!readOnly && (
          <div className="absolute top-3 left-3">
            <span className={cn(
              "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg backdrop-blur-md border border-white/10",
              getStatusColor(item.status, true)
            )}>
              {item.status}
            </span>
          </div>
        )} */}

        {/* Quick Actions - Repositioned to top right */}
        {!readOnly && (
          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
            <button 
              onClick={(e) => { e.stopPropagation(); handleEditMoto(item); }}
              className="p-2.5 rounded-xl bg-white/90 backdrop-blur-sm text-zinc-900 hover:bg-violet-500 hover:text-white transition-all shadow-xl border border-zinc-200/50"
            >
              <Edit size={16} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setItemToDelete(item.id); setIsDeleteConfirmOpen(true); }}
              className="p-2.5 rounded-xl bg-white/90 backdrop-blur-sm text-zinc-900 hover:bg-rose-500 hover:text-white transition-all shadow-xl border border-zinc-200/50"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 md:p-5 flex-1 flex flex-col justify-between space-y-2 md:space-y-4">
        <div className="space-y-1 md:space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[8px] md:text-[10px] font-bold text-violet-500 uppercase tracking-widest">{item.marca}</span>
            </div>
            <span className={cn("text-[8px] md:text-[10px] font-mono text-zinc-500 px-1 md:px-1.5 py-0.5 rounded", theme === 'dark' ? "bg-zinc-800" : "bg-zinc-100")}>{item.rk_id}</span>
          </div>
          
          <div>
            <h3 className={cn(
              "font-black text-sm md:text-xl leading-tight line-clamp-2 tracking-tight",
              theme === 'dark' ? "text-white" : "text-zinc-900"
            )}>
              {item.nome && item.nome !== '-' ? item.nome : (item.modelo && item.modelo !== '-' ? item.modelo : 'Moto sem Nome')}
            </h3>
            {item.nome && item.nome !== '-' && item.modelo && item.modelo !== '-' && item.nome !== item.modelo && (
              <p className="text-[10px] md:text-xs text-zinc-500 font-medium mt-0.5 line-clamp-1">{item.modelo}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-y-1 md:gap-y-2 gap-x-2 md:gap-x-3 pt-1">
            {item.lote && !readOnly && (
              <div className={cn("flex items-center gap-1 md:gap-1.5 text-[9px] md:text-xs text-zinc-500 px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg border", theme === 'dark' ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
                <Layers size={10} className="text-violet-500" />
                <span className="font-bold">Lote: {item.lote}</span>
              </div>
            )}
            <div className={cn("flex items-center gap-1 md:gap-1.5 text-[9px] md:text-xs text-zinc-500 px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg border", theme === 'dark' ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
              <Calendar size={10} className="text-violet-500" />
              <span>{item.ano}</span>
            </div>
            <div className={cn("flex items-center gap-1 md:gap-1.5 text-[9px] md:text-xs text-zinc-500 px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg border", theme === 'dark' ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
              <div 
                className={cn("w-2 md:w-2.5 h-2 md:h-2.5 rounded-full border shadow-inner", theme === 'dark' ? "border-zinc-700" : "border-zinc-300")} 
                style={{ backgroundColor: getMotoColor(item.cor) }} 
              />
              <span>{item.cor || '-'}</span>
            </div>
            {item.cilindrada && item.cilindrada !== '-' && (
              <div className={cn("flex items-center gap-1 md:gap-1.5 text-[9px] md:text-xs text-zinc-500 px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg border", theme === 'dark' ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
                <TrendingUp size={10} className="text-violet-500" />
                <span>{item.cilindrada}cc</span>
              </div>
            )}
          </div>
        </div>

        <div className={cn("pt-2 md:pt-4 border-t flex items-center justify-between", theme === 'dark' ? "border-zinc-800" : "border-zinc-100")}>
          <div className="flex flex-col">
            <span className="text-[8px] md:text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{readOnly ? 'Valor' : 'Investimento'}</span>
            <span className="text-sm md:text-xl font-black text-violet-500">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500 group-hover:bg-violet-500 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-violet-500/20">
            <ChevronRight size={20} />
          </div>
        </div>
      </div>
    </div>
  );
});

const LogoutModal = memo(({ isOpen, onClose, onLogout, theme }: { isOpen: boolean, onClose: () => void, onLogout: () => void, theme: 'light' | 'dark' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={cn(
          "relative w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl p-8 text-center",
          theme === 'dark' ? "bg-zinc-950 border border-zinc-800" : "bg-white"
        )}
      >
        <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mx-auto mb-6">
          <Trash2 size={40} />
        </div>
        <h2 className={cn("text-2xl font-black tracking-tight mb-2", theme === 'dark' ? "text-white" : "text-zinc-900")}>
          Sair da Conta?
        </h2>
        <p className="text-zinc-500 text-sm font-medium mb-8">
          Tem certeza que deseja encerrar sua sessão atual? Você precisará entrar novamente.
        </p>
        <div className="flex flex-col gap-3">
          <button 
            onClick={onLogout}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-rose-500/20"
          >
            Sim, Sair Agora
          </button>
          <button 
            onClick={onClose}
            className={cn(
              "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all",
              theme === 'dark' ? "bg-zinc-900 text-zinc-400 hover:bg-zinc-800" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            )}
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </div>
  );
});

function AppContent({ onLogout, currentUser }: { onLogout: () => void, currentUser: FirebaseUser | null }) {
  const context = useContext(DataContext);
  const showSensitiveInfo = context?.showSensitiveInfo ?? true;
  const setShowSensitiveInfo = context?.setShowSensitiveInfo ?? (() => {});
  const [userRole, setUserRole] = useState<string>(localStorage.getItem('user_role') || 'client');
  const [isClientRegistered, setIsClientRegistered] = useState<boolean>(localStorage.getItem('rk_client_registered') === 'true');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'estoque' | 'vendas' | 'motos' | 'catalogo' | 'frete' | 'clients' | 'mercadolivre' | 'users' | 'audit'>(() => {
    const path = window.location.pathname.replace('/', '');
    const role = localStorage.getItem('user_role') || 'client';
    
    // Se for ADM, abre no dashboard ou na aba da URL
    if (role === 'admin' || role === 'gerente') {
      return (path && ['dashboard', 'estoque', 'vendas', 'motos', 'catalogo', 'frete', 'clients', 'mercadolivre', 'users', 'audit'].includes(path)) ? path as any : 'dashboard';
    }
    
    // Se for cliente, abre sempre no catálogo
    return 'catalogo';
  });
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);

  useEffect(() => {
    // Roteamento Client-Side: Sincronizar URL e restringir acesso
    const path = window.location.pathname.replace('/', '');
    const role = localStorage.getItem('user_role') || 'client';
    const validTabs = ['dashboard', 'estoque', 'vendas', 'motos', 'frete', 'clients', 'mercadolivre', 'users', 'audit'];
    
    if (role === 'client') {
      if (path !== 'catalogo') {
        window.history.replaceState(null, '', '/catalogo');
        setActiveTab('catalogo');
      }
    } else if (role === 'admin') {
      if (!validTabs.includes(path)) {
        window.history.replaceState(null, '', '/dashboard');
        setActiveTab('dashboard');
      }
    }
  }, []);

  // Atualizar URL quando a aba mudar
  useEffect(() => {
    if (activeTab) {
      window.history.pushState(null, '', `/${activeTab}`);
    }
  }, [activeTab]);
  const [pendingEditItem, setPendingEditItem] = useState<any | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [paymentFilter, setPaymentFilter] = useState<string>('TODOS');
  const [showPaymentFilter, setShowPaymentFilter] = useState(false);

  const [selectedDetailItem, setSelectedDetailItem] = useState<any | null>(null);
  const [inventoryActions, setInventoryActions] = useState<{ edit: (item: any) => void, delete: (id: string) => void, focusSearch?: () => void } | null>(null);
  const [salesActions, setSalesActions] = useState<{ edit: (item: any) => void, delete: (id: string) => void, focusSearch?: () => void } | null>(null);
  const [motosActions, setMotosActions] = useState<{ edit: (item: any) => void, delete: (id: string) => void, focusSearch?: () => void } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  // Atalho Ctrl + F para busca global
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const [mlDashboardData, setMlDashboardData] = useState<any>(null);
  const [isMlDashboardLoading, setIsMlDashboardLoading] = useState(false);
  const [dashboardSource, setDashboardSource] = useState<'estoque' | 'mercadolivre'>('estoque');
  const [mlPeriod, setMlPeriod] = useState('30d');
  const [mlCustomDate, setMlCustomDate] = useState({ start: '', end: '' });
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<{id: string, title: string, message: string, read: boolean}[]>([]);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  // Atualiza a foto de perfil quando o usuário muda
  useEffect(() => {
    const phone = localStorage.getItem('user_phone');
    if (phone) {
      setProfilePhoto(localStorage.getItem(`profilePhoto_${phone}`));
    } else {
      setProfilePhoto(null);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    // Notificações
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(20));
    const unsubscribeNotifications = onSnapshot(q, (snapshot) => {
      const newNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setNotifications(newNotifications);
    });
    return () => unsubscribeNotifications();
  }, [currentUser]);

  const [allMlListings, setAllMlListings] = useState<any[]>([]);
  const [showAllMlAds, setShowAllMlAds] = useState(false);

  useEffect(() => {
    const shouldLock = showAllMlAds || showPaymentFilter || isBudgetModalOpen || isLogoutModalOpen || selectedDetailItem || isAnyModalOpen;
    
    if (shouldLock) {
      document.body.style.overflow = 'hidden';
      if (contentRef.current) contentRef.current.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      if (contentRef.current) contentRef.current.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
      if (contentRef.current) contentRef.current.style.overflow = 'auto';
    };
  }, [showAllMlAds, showPaymentFilter, isBudgetModalOpen, isLogoutModalOpen, selectedDetailItem, isAnyModalOpen]);
  const [isMlListingsLoading, setIsMlListingsLoading] = useState(false);
  
  // Estados para filtros, ordenação e paginação
  const [mlSearchTerm, setMlSearchTerm] = useState('');
  const [mlSortConfig, setMlSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'criado_em', direction: 'desc' });
  const [mlCurrentPage, setMlCurrentPage] = useState(1);
  const mlItemsPerPage = 10;

  const toggleMlSort = (key: string) => {
    setMlSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const filteredMlListings = allMlListings
    .filter(item => 
      (item.titulo || '').toLowerCase().includes(mlSearchTerm.toLowerCase()) ||
      (item.id || '').toLowerCase().includes(mlSearchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = a[mlSortConfig.key as keyof typeof a];
      const bVal = b[mlSortConfig.key as keyof typeof b];
      if (aVal < bVal) return mlSortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return mlSortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const mlTotalPages = Math.ceil(filteredMlListings.length / mlItemsPerPage);
  const paginatedMlListings = filteredMlListings.slice(
    (mlCurrentPage - 1) * mlItemsPerPage,
    mlCurrentPage * mlItemsPerPage
  );
  
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    setDashboardSource('estoque');
    window.scrollTo(0, 0);
    if (contentRef.current) {
      contentRef.current.scrollTo(0, 0);
    }
  }, [activeTab]);

  const fetchMlDashboard = useCallback(async () => {
    setIsMlDashboardLoading(true);
    try {
      let url = `/api/ml/dashboard?period=${mlPeriod}`;
      if (mlPeriod === 'custom' && mlCustomDate.start && mlCustomDate.end) {
        url += `&start=${mlCustomDate.start}&end=${mlCustomDate.end}`;
      }
      const res = await fetchWithRetry(url);
      const data = await res.json();
      if (data.success) {
        setMlDashboardData(data.data);
      }
    } catch (err) {
      console.error('Erro ao buscar dashboard ML:', err);
    } finally {
      setIsMlDashboardLoading(false);
    }
  }, [mlPeriod, mlCustomDate]);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchMlDashboard();
    }
  }, [activeTab, fetchMlDashboard]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const phone = localStorage.getItem('user_phone');
    
    let localToken = null;
    try {
      localToken = localStorage.getItem('auth_token');
    } catch(err) {}

    if (file && phone && localToken) {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('phone', phone);

      try {
        const res = await fetch('/api/upload/profile', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localToken}`
          },
          body: formData
        });

        const data = await res.json();
        if (data.success) {
          setProfilePhoto(data.url);
          localStorage.setItem(`profilePhoto_${phone}`, data.url);
          console.log('✅ Foto de perfil atualizada:', data.url);
        } else {
          alert('Erro ao enviar foto: ' + data.error);
        }
      } catch (error) {
        console.error('❌ Erro ao enviar foto de perfil:', error);
        alert('Erro de conexão ao enviar foto');
      }
    }
  };

  const handleRemovePhoto = () => {
    const phone = localStorage.getItem('user_phone');
    setProfilePhoto(null);
    if (phone) {
      localStorage.removeItem(`profilePhoto_${phone}`);
    }
    setIsProfileDropdownOpen(false);
  };

  const fetchAllMlListings = async () => {
    setIsMlListingsLoading(true);
    try {
      const res = await fetchWithRetry('/api/ml/listings?limit=50');
      const data = await parseJson(res);
      setAllMlListings(data.data || []);
      setShowAllMlAds(true);
    } catch (err) {
      console.error('Erro ao buscar todos os anúncios ML:', err);
    } finally {
      setIsMlListingsLoading(false);
    }
  };

  const itemActions = useMemo(() => {
    if (!selectedDetailItem) return { edit: undefined, delete: undefined };
    const item = selectedDetailItem;
    
    const wrapEdit = (originalEdit: any, tab: 'dashboard' | 'estoque' | 'vendas' | 'motos' | 'frete' | 'clients' | 'mercadolivre') => {
      if (!originalEdit) {
        return (item: any) => {
          setActiveTab(tab);
          setPendingEditItem(item);
        };
      }
      return (item: any) => {
        if (activeTab !== tab) {
          setActiveTab(tab);
          setPendingEditItem(item);
        } else {
          originalEdit(item);
        }
      };
    };

    if (item.marca) {
      return { 
        edit: wrapEdit(motosActions?.edit, 'motos'), 
        delete: motosActions?.delete 
      };
    }
    if (item.rk_id || item.categoria) {
      return { 
        edit: wrapEdit(inventoryActions?.edit, 'estoque'), 
        delete: inventoryActions?.delete 
      };
    }
    if (item.valor !== undefined) {
      return { 
        edit: wrapEdit(salesActions?.edit, 'vendas'), 
        delete: salesActions?.delete 
      };
    }
    return { edit: undefined, delete: undefined };
  }, [selectedDetailItem, inventoryActions, salesActions, motosActions, activeTab]);

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-300 flex font-sans w-full relative overflow-x-hidden",
      theme === 'dark' 
        ? "bg-[radial-gradient(ellipse_at_top,_#1a1b1f,_#09090b)] text-zinc-100" 
        : "bg-zinc-50 text-zinc-900"
    )}>
      {/* Sidebar Backdrop for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      {userRole !== 'client' && (
        <aside className={cn(
          "fixed top-0 h-screen inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out border-r hidden md:flex overflow-y-auto",
          theme === 'dark' ? "bg-zinc-950/50 border-zinc-800/50 backdrop-blur-xl" : "bg-white border-zinc-200 shadow-xl",
          isSidebarOpen ? "w-64 translate-x-0" : "w-20 -translate-x-full md:translate-x-0",
          !isSidebarOpen && "md:w-20"
        )}>
          <div className={cn(
            "h-full flex flex-col p-4",
            theme === 'dark' ? "bg-zinc-950" : "bg-white"
          )}>
            <div className="flex items-center gap-3 px-2 mb-10 overflow-hidden">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <Wrench className={theme === 'dark' ? "text-zinc-100" : "text-zinc-900"} size={20} />
              </div>
              {isSidebarOpen && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col min-w-0"
                >
                  <span className={cn(
                    "font-black text-xl tracking-tighter truncate",
                    theme === 'dark' ? "text-white" : "text-zinc-900"
                  )}>
                    RK <span className="text-violet-500">SUCATAS</span>
                  </span>
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Gestão Inteligente</span>
                </motion.div>
              )}
            </div>

            <nav className="flex-1 space-y-2">
              {(userRole === 'admin' || userRole === 'gerente') && (
                <SidebarItem 
                  icon={LayoutDashboard} 
                  label={isSidebarOpen ? "Dashboard" : ""} 
                  active={activeTab === 'dashboard'} 
                  onClick={() => setActiveTab('dashboard')} 
                  theme={theme}
                />
              )}
              <SidebarItem 
                icon={Package} 
                label={isSidebarOpen ? "Estoque" : ""} 
                active={activeTab === 'estoque'} 
                onClick={() => setActiveTab('estoque')} 
                theme={theme}
              />
              {(userRole === 'admin' || userRole === 'gerente') && (
                <SidebarItem 
                  icon={ShoppingCart} 
                  label={isSidebarOpen ? "Vendas" : ""} 
                  active={activeTab === 'vendas'} 
                  onClick={() => setActiveTab('vendas')} 
                  theme={theme}
                />
              )}
              {(userRole === 'admin' || userRole === 'gerente') && (
                <SidebarItem 
                  icon={TrendingUp} 
                  label={isSidebarOpen ? "Mercado Livre" : ""} 
                  active={activeTab === 'mercadolivre'} 
                  onClick={() => setActiveTab('mercadolivre')} 
                  theme={theme}
                  className="hidden md:flex"
                />
              )}
              {(userRole === 'admin' || userRole === 'gerente') && (
                <SidebarItem 
                  icon={UserCog} 
                  label={isSidebarOpen ? "Usuários" : ""} 
                  active={activeTab === 'users'} 
                  onClick={() => setActiveTab('users')} 
                  theme={theme}
                />
              )}
              {userRole === 'admin' && (
                <SidebarItem 
                  icon={Activity} 
                  label={isSidebarOpen ? "Auditoria" : ""} 
                  active={activeTab === 'audit'} 
                  onClick={() => setActiveTab('audit')} 
                  theme={theme}
                />
              )}
              <SidebarItem 
                icon={Bike} 
                label={isSidebarOpen ? "Motos" : ""} 
                active={activeTab === 'motos'} 
                onClick={() => setActiveTab('motos')} 
                theme={theme}
              />
              {(userRole === 'admin' || userRole === 'gerente') && (
                <SidebarItem 
                  icon={Truck} 
                  label={isSidebarOpen ? "Frete" : ""} 
                  active={activeTab === 'frete'} 
                  onClick={() => setActiveTab('frete')} 
                  theme={theme}
                />
              )}
              {(userRole === 'admin' || userRole === 'gerente') && (
                <SidebarItem 
                  icon={Users} 
                  label={isSidebarOpen ? "Clientes" : ""} 
                  active={activeTab === 'clients'} 
                  onClick={() => setActiveTab('clients')} 
                  theme={theme}
                />
              )}
              <SidebarItem 
                icon={LogOut} 
                label={isSidebarOpen ? "Sair" : ""} 
                active={false} 
                onClick={() => setIsLogoutModalOpen(true)} 
                theme={theme}
                className="text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
              />
            </nav>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className={cn(
        "flex-1 flex flex-col min-w-0 pb-nav-safe md:pb-0 transition-all duration-300",
        userRole !== 'client' && (isSidebarOpen ? "md:ml-64" : "md:ml-20")
      )}>
        {/* Header - Restored for clients as requested */}
        <header className={cn(
          "min-h-16 border-b backdrop-blur-md flex items-center justify-between px-4 md:px-6 sticky top-0 z-[100] transition-colors pt-safe",
          theme === 'dark' ? "bg-zinc-950/40 border-zinc-800/50" : "bg-white/50 border-zinc-200"
        )}>
          <div className="flex items-center gap-2 md:gap-4 relative z-50">
            <h2 className={cn(
              "text-base md:text-lg font-semibold capitalize transition-colors truncate max-w-[120px] md:max-w-none",
              theme === 'dark' ? "text-white" : "text-zinc-900"
            )}>
              {activeTab === 'dashboard' ? 'Dashboard' :
               activeTab === 'vendas' ? 'Vendas' :
               activeTab === 'estoque' ? 'Estoque' :
               activeTab === 'motos' ? 'Motos' :
               activeTab === 'catalogo' ? 'Catálogo' :
               activeTab === 'clients' ? 'Clientes' :
               activeTab === 'mercadolivre' ? 'Mercado Livre' :
               activeTab === 'frete' ? 'Frete' :
               activeTab === 'users' ? 'Usuários' :
               activeTab === 'audit' ? 'Auditoria' :
               activeTab}
            </h2>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={cn(
                "p-2 rounded-lg transition-all duration-300 relative",
                theme === 'dark' ? "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200" : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700"
              )}
              title="Notificações"
            >
              <Bell size={20} />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
              )}
            </button>
            <button 
              onClick={toggleTheme}
              className={cn(
                "p-2 rounded-lg transition-all duration-300",
                theme === 'dark' ? "hover:bg-zinc-800 text-amber-400" : "hover:bg-zinc-100 text-violet-600"
              )}
              title={theme === 'dark' ? "Mudar para modo claro" : "Mudar para modo escuro"}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>
        
        {/* Notification Dropdown */}
        <AnimatePresence>
          {isNotificationsOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={cn(
                "absolute right-4 top-16 w-80 rounded-2xl shadow-2xl border z-[110] overflow-hidden backdrop-blur-2xl",
                theme === 'dark' ? "bg-zinc-900/90 border-zinc-800" : "bg-white/90 border-zinc-200"
              )}
            >
              <div className="p-4 border-b border-zinc-800/50 flex justify-between items-center">
                <h3 className="font-bold text-sm">Notificações</h3>
                <button onClick={() => setIsNotificationsOpen(false)} className="p-1 rounded-full hover:bg-zinc-800">
                  <X size={16} />
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-zinc-500">Nenhuma notificação</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={cn("p-4 border-b border-zinc-800/50 text-sm", !n.read && "bg-violet-500/10")}>
                      <p className="font-bold">{n.title}</p>
                      <p className="text-xs text-zinc-400">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <div ref={contentRef} className="p-4 md:p-6 pb-32 md:pb-6 overflow-y-auto flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-full h-full"
                >
              {activeTab === 'dashboard' ? (
                <DashboardView 
                  theme={theme} 
                  onSelectItem={setSelectedDetailItem} 
                  mlData={mlDashboardData}
                  source={dashboardSource}
                  onToggleSource={setDashboardSource}
                  onTabChange={setActiveTab}
                  allMlListings={allMlListings}
                  showAllMlAds={showAllMlAds}
                  setShowAllMlAds={setShowAllMlAds}
                  onFetchAllMlListings={fetchAllMlListings}
                  isMlListingsLoading={isMlListingsLoading}
                  onRefreshMlDashboard={fetchMlDashboard}
                  mlPeriod={mlPeriod}
                  setMlPeriod={setMlPeriod}
                  mlCustomDate={mlCustomDate}
                  setMlCustomDate={setMlCustomDate}
                  isMlDashboardLoading={isMlDashboardLoading}
                  mlSearchTerm={mlSearchTerm}
                  setMlSearchTerm={setMlSearchTerm}
                  mlSortConfig={mlSortConfig}
                  toggleMlSort={toggleMlSort}
                  mlCurrentPage={mlCurrentPage}
                  setMlCurrentPage={setMlCurrentPage}
                  mlTotalPages={mlTotalPages}
                  paginatedMlListings={paginatedMlListings}
                  paymentFilter={paymentFilter}
                  setPaymentFilter={setPaymentFilter}
                  showPaymentFilter={showPaymentFilter}
                  setShowPaymentFilter={setShowPaymentFilter}
                  isSearchOpen={isSearchOpen}
                />
              ) : activeTab === 'estoque' ? (
                <InventoryView 
                  theme={theme} 
                  onSelectItem={setSelectedDetailItem} 
                  onRegisterActions={setInventoryActions}
                  isSearchOpen={isSearchOpen}
                  readOnly={userRole === 'client'}
                  pendingEditItem={pendingEditItem}
                  setPendingEditItem={setPendingEditItem}
                />
              ) : activeTab === 'vendas' ? (
                <SalesView theme={theme} onSelectItem={setSelectedDetailItem} onRegisterActions={setSalesActions} isSearchOpen={isSearchOpen} />
              ) : activeTab === 'motos' ? (
                <MotosView 
                  theme={theme} 
                  onSelectItem={setSelectedDetailItem} 
                  onRegisterActions={setMotosActions} 
                  isSearchOpen={isSearchOpen} 
                  readOnly={userRole === 'client'}
                />
              ) : activeTab === 'catalogo' ? (
                <MotosView 
                  theme={theme} 
                  onSelectItem={setSelectedDetailItem} 
                  onRegisterActions={setMotosActions} 
                  isSearchOpen={isSearchOpen} 
                  readOnly={true}
                />
              ) : activeTab === 'clients' ? (
                <div className={cn("p-6", theme === 'dark' ? "text-white" : "text-zinc-900")}>
                  <h2 className="text-2xl font-bold mb-4">Clientes</h2>
                  <p>Funcionalidade de visualização de clientes em breve.</p>
                </div>
              ) : activeTab === 'mercadolivre' ? (
                <MercadoLivre theme={theme} />
              ) : activeTab === 'users' ? (
                <AdminUsers userRole={userRole} onModalChange={setIsAnyModalOpen} theme={theme} />
              ) : activeTab === 'audit' ? (
                <AuditLogs />
              ) : activeTab === 'frete' ? (
                <FreteView theme={theme} />
              ) : (
                <div className={cn(
                  "flex flex-col items-center justify-center h-[60vh] transition-colors w-full",
                  theme === 'dark' ? "text-violet-500" : "text-violet-600"
                )}>
                  <Settings size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-bold">Funcionalidade em desenvolvimento</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      {userRole !== 'client' && (
        <MobileBottomNav 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          theme={theme} 
          userRole={userRole} 
          isMoreOpen={isMoreMenuOpen}
          setIsMoreOpen={setIsMoreMenuOpen}
        />
      )}
      
      {/* Grupo de ações flutuantes - Only for Admin/Gerente/Estoque */}
      {userRole !== 'client' && !isMoreMenuOpen && !isAnyModalOpen && (
        <div className="fixed bottom-24 md:bottom-8 right-6 z-[60] flex flex-col gap-3">
          <GlobalSearch 
            theme={theme} 
            onSelectItem={setSelectedDetailItem} 
            isOpen={isSearchOpen} 
            setIsOpen={setIsSearchOpen}
            customClick={() => {
              setIsSearchOpen(true);
            }}
          />

          {/* Budget FAB */}
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsBudgetModalOpen(true)}
            className={cn(
              "relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl group border",
              theme === 'dark' 
                ? "bg-zinc-800 hover:bg-zinc-700 border-zinc-700" 
                : "bg-white hover:bg-gray-50 border-zinc-200"
            )}
          >
            <DollarSign className={cn(
              "w-6 h-6 transition-transform group-hover:scale-110",
              theme === 'dark' ? "text-violet-400" : "text-violet-600"
            )} />
          </motion.button>
        </div>
      )}

      <BudgetModal 
        isOpen={isBudgetModalOpen} 
        onClose={() => setIsBudgetModalOpen(false)} 
        theme={theme} 
      />
      
      {/* Modal de Detalhes Global */}
      <AnimatePresence>
        {selectedDetailItem && (
          <DetailModal 
            item={selectedDetailItem} 
            theme={theme} 
            userRole={userRole}
            onClose={() => setSelectedDetailItem(null)} 
            onEdit={itemActions.edit}
            onDelete={itemActions.delete}
          />
        )}
      </AnimatePresence>

      {/* Modal de Registro */}
      <RegistroModal 
        isOpen={activeTab === 'catalogo' && !isClientRegistered} 
        onClose={() => {
          setIsClientRegistered(true);
          setPendingEditItem(null); 
        }} 
        theme={theme} 
      />

      {/* Modal de Logout */}
      <AnimatePresence>
        {isLogoutModalOpen && (
          <LogoutModal 
            isOpen={isLogoutModalOpen} 
            onClose={() => setIsLogoutModalOpen(false)} 
            onLogout={onLogout} 
            theme={theme} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
