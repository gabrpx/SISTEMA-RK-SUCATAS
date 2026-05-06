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
import { PAGAMENTOS_OFICIAIS } from './constants/lists';
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
import { useDebounce } from './hooks/useDebounce';
import { fetchWithRetry, parseJson } from './lib/apiClient';
import { extrairCategoria, extrairModeloMoto } from './utils/motoParsing';

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

import SalesView from "./views/SalesView";
import MotosView from "./views/MotosView";


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
