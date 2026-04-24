// src/views/DashboardView.tsx — View do Dashboard com métricas e gráficos
import React, { useState, useEffect, useMemo, useContext, memo } from 'react';
import {
  Package,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Box,
  BarChart3,
  MessageCircle,
  Truck,
  EyeOff,
  Eye,
  RefreshCw,
  Calendar,
  Filter,
  History,
  X,
  MessageSquare,
  Loader2,
  Activity,
  TrendingDown,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn, parseLocalDate } from '../utils';
import { fetchWithRetry } from '../utils/api';
import { DataContext } from '../App';
import QuestionsDashboard from '../components/QuestionsDashboard';

const COLORS = ['#8b5cf6', '#34d399', '#fb7185', '#f59e0b', '#3b82f6'];

const StatCard = memo(({ icon: Icon, label, value, trend, subValue, color, theme, onClick, isSensitive, isCurrency = true }: any) => {
  const context = useContext(DataContext);
  const showSensitiveInfo = context?.showSensitiveInfo ?? true;
  
  const formatValue = (val: any) => {
    if (!isCurrency) return val;
    if (typeof val === 'string' && val.includes('R$')) return val;
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d,-]/g, '').replace(',', '.'));
    if (isNaN(num)) return val;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  const displayValue = formatValue(value);
  const displayTrend = (trend === null || trend === undefined || isNaN(Number(trend))) ? null : Number(trend);

  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "group relative border p-5 sm:p-6 rounded-[2rem] transition-all duration-500 cursor-pointer overflow-hidden flex flex-col justify-between h-full",
        theme === 'dark' 
          ? "bg-zinc-900/40 border-zinc-800/50 shadow-2xl hover:border-violet-500/40 hover:bg-zinc-900/60" 
          : "bg-white border-zinc-200 shadow-xl hover:shadow-2xl hover:border-violet-200"
      )}
    >
      {/* Dynamic Glow Effect */}
      <div className={cn(
        "absolute -right-8 -top-8 w-32 h-32 rounded-full blur-[60px] opacity-0 transition-opacity duration-500 group-hover:opacity-20",
        color || "bg-violet-500"
      )} />

      <div className="flex items-center justify-between mb-4">
        <div className={cn(
          "p-3 rounded-2xl transition-all duration-500 shadow-lg",
          theme === 'dark' 
            ? "bg-zinc-800/80 text-zinc-400 group-hover:text-white group-hover:bg-violet-600/20 group-hover:scale-110" 
            : "bg-zinc-100 text-zinc-500 group-hover:text-zinc-900 group-hover:bg-violet-50"
        )}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
        {displayTrend !== null && (
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-wider shadow-sm",
            displayTrend > 0 
              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
              : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
          )}>
            {displayTrend > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(displayTrend)}%
          </div>
        )}
      </div>

      <div className="space-y-1">
        <span className={cn(
          "text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.25em] opacity-50", 
          theme === 'dark' ? "text-zinc-400" : "text-zinc-500"
        )}>
          {label}
        </span>
        <div className="flex items-baseline gap-2">
          <h3 className={cn(
            "text-lg sm:text-2xl font-black tracking-tighter transition-all duration-500",
            theme === 'dark' ? "text-white" : "text-zinc-900",
            isSensitive && !showSensitiveInfo && "blur-xl select-none",
            (label.includes('Valor') || label.includes('Vendas')) && "text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]",
            label.includes('Saídas') && "text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]"
          )}>
            {displayValue}
          </h3>
        </div>
        {subValue && (
          <p className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest truncate opacity-70 mt-1">
            {subValue}
          </p>
        )}
      </div>
    </motion.div>
  );
});

const QuestionsModal = memo(({ isOpen, onClose, theme }: { isOpen: boolean, onClose: () => void, theme: 'light' | 'dark' }) => {
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={cn(
          "relative w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col",
          theme === 'dark' ? "bg-zinc-950 border border-zinc-800" : "bg-white"
        )}
      >
        <div className={cn(
          "p-6 border-b flex items-center justify-between",
          theme === 'dark' ? "border-zinc-800" : "border-zinc-100"
        )}>
          <h2 className={cn("text-xl font-black tracking-tight", theme === 'dark' ? "text-white" : "text-zinc-900")}>
            Perguntas Mercado Livre
          </h2>
          <button onClick={onClose} className={cn("p-2 rounded-full", theme === 'dark' ? "hover:bg-zinc-800" : "hover:bg-zinc-100")}>
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <QuestionsDashboard theme={theme} />
        </div>
      </motion.div>
    </div>
  );
});

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'hoje';
  if (diffInDays === 1) return 'ontem';
  if (diffInDays < 30) return `há ${diffInDays} dias`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths === 1) return 'há 1 mês';
  return `há ${diffInMonths} meses`;
};

export const DashboardView = ({ 
  theme,
  onSelectItem, 
  mlData, 
  source, 
  onToggleSource, 
  onTabChange,
  allMlListings,
  showAllMlAds,
  setShowAllMlAds,
  onFetchAllMlListings,
  isMlListingsLoading,
  mlPeriod,
  setMlPeriod,
  mlCustomDate,
  setMlCustomDate,
  isMlDashboardLoading,
  mlSearchTerm,
  setMlSearchTerm,
  mlSortConfig,
  toggleMlSort,
  mlCurrentPage,
  setMlCurrentPage,
  mlTotalPages,
  paginatedMlListings,
  paymentFilter,
  setPaymentFilter,
  showPaymentFilter,
  setShowPaymentFilter,
  isSearchOpen,
  onRefreshMlDashboard
}: any) => {
  const { inventory, sales, loading, refreshData, showSensitiveInfo, setShowSensitiveInfo } = useContext(DataContext);
  const [selectedPaymentType, setSelectedPaymentType] = useState<string | null>(null);
  const [isQuestionsModalOpen, setIsQuestionsModalOpen] = useState(false);
  const [mlSalesSubTab, setMlSalesSubTab] = useState('pending');

  useEffect(() => {
    if (selectedPaymentType || isQuestionsModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedPaymentType, isQuestionsModalOpen]);

  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  const formatCurrency = (value: any) => {
    if (typeof value === 'string' && value.includes('R$')) return value;
    const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d,-]/g, '').replace(',', '.'));
    if (isNaN(num)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  const metrics = useMemo(() => {
    if (source === 'mercadolivre' && mlData) {
      return {
        valorTotalEstoque: 0,
        totalItensEstoque: Number(mlData.totalListings) || 0,
        activeListings: Number(mlData.activeListings) || 0,
        valorVendasMes: Number(mlData.monthlySales) || 0,
        totalVendasMes: Number(mlData.totalSalesCount) || 0,
        pendingShipments: Number(mlData.pendingShipments) || 0,
        ticketMedio: Number(mlData.avgTicket) || 0,
        perguntasPendentes: Number(mlData.pendingQuestions) || 0,
        totalPerguntas: Number(mlData.totalQuestions) || 0,
        ultimosItens: mlData.recentListings || [],
        ultimasVendas: mlData.recentSales || []
      };
    }

    const parseDate = (dateStr: any) => {
      if (!dateStr) return new Date(0);
      // Sempre usa parseLocalDate para evitar shift de timezone
      // pois o Supabase pode retornar ISO com timezone UTC
      return parseLocalDate(dateStr);
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

    // Estoque
    const valorTotalEstoque = inventory.reduce((sum, item) => sum + parseValue(item.valor), 0);
    const totalItensEstoque = inventory.length;
    const estoqueBaixo = inventory.filter(item => (Number(item.estoque) || 0) <= 2);
    const ultimosItens = [...inventory].sort((a, b) => {
      const dateA = a.criado_em ? new Date(a.criado_em).getTime() : 0;
      const dateB = b.criado_em ? new Date(b.criado_em).getTime() : 0;
      return dateB - dateA;
    }).slice(0, 5);

    // Vendas
    const vendasMes = sales.filter(item => {
      const itemDate = parseDate(item.data);
      const isCurrentMonth = itemDate.getMonth() === mesAtual && 
                             itemDate.getFullYear() === anoAtual;
      const isNotSaida = item.tipo !== 'SAÍDA';
      return isCurrentMonth && isNotSaida;
    });

    const saidasMes = sales.filter(item => {
      const itemDate = parseDate(item.data);
      const isCurrentMonth = itemDate.getMonth() === mesAtual && 
                             itemDate.getFullYear() === anoAtual;
      const isSaida = item.tipo === 'SAÍDA';
      return isCurrentMonth && isSaida;
    });

    const valorVendasMes = vendasMes.reduce((sum, v) => sum + parseValue(v.valor), 0);
    const valorSaidasMes = saidasMes.reduce((sum, v) => sum + parseValue(v.valor), 0);
    const ticketMedio = vendasMes.length > 0 ? valorVendasMes / vendasMes.length : 0;

    console.log('📊 Dashboard Metrics Debug:', {
      inventoryCount: inventory.length,
      salesCount: sales.length,
      vendasMesCount: vendasMes.length,
      valorVendasMes,
      valorTotalEstoque,
      mesAtual,
      anoAtual
    });

    return {
      valorTotalEstoque,
      totalItensEstoque,
      estoqueBaixo,
      ultimosItens,
      valorVendasMes,
      totalVendasMes: vendasMes.length,
      valorSaidasMes,
      totalSaidasMes: saidasMes.length,
      ticketMedio,
      ultimasVendas: [...sales].sort((a, b) => parseDate(b.data).getTime() - parseDate(a.data).getTime())
    };
  }, [inventory, sales, mlData, source, mesAtual, anoAtual]);

  const filteredLastSales = useMemo(() => {
    if (paymentFilter === 'TODOS') return metrics.ultimasVendas;
    return metrics.ultimasVendas.filter((sale: any) => sale.tipo === paymentFilter);
  }, [metrics.ultimasVendas, paymentFilter]);

  const filteredSales = useMemo(() => {
    if (source === 'estoque') return metrics.ultimasVendas;
    return metrics.ultimasVendas.filter((sale: any) => {
      const isCancelled = sale.is_cancelled || sale.status === 'cancelled' || sale.shipping_status?.startsWith('cancelled') || sale.shipping_substatus === 'cancelled' || sale.shipping_substatus === 'not_delivered';
      
      if (mlSalesSubTab === 'pending') {
        // Vendas pendentes: prontas para imprimir etiqueta, etiqueta já impressa ou aguardando NF
        return !sale.has_dispute && !isCancelled && (sale.shipping_status?.startsWith('ready_to_ship') || sale.shipping_status === 'pending' || sale.shipping_status?.includes('ready_to_print') || sale.shipping_status?.includes('printed') || sale.shipping_status?.includes('invoice_pending'));
      }
      if (mlSalesSubTab === 'dispute') return sale.has_dispute;
      if (mlSalesSubTab === 'shipped') return sale.shipping_status === 'shipped' && !isCancelled;
      if (mlSalesSubTab === 'delivered') return sale.shipping_status === 'delivered' && !isCancelled;
      if (mlSalesSubTab === 'cancelled') return isCancelled;
      if (mlSalesSubTab === 'all') return true;
      return false;
    });
  }, [metrics.ultimasVendas, mlSalesSubTab, source]);

  // Gráfico Vendas por Dia (últimos 30 dias)
  const chartData = useMemo(() => {
    if (source === 'mercadolivre' && mlData?.chartData) {
      return mlData.chartData;
    }

    const days = [];
    const hoje = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        date: dateStr,
        label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        vendas: 0,
        saidas: 0
      });
    }

    const parseDate = (dateStr: any) => {
      if (!dateStr) return new Date(0);
      // Sempre usa parseLocalDate para evitar shift de timezone
      return parseLocalDate(dateStr);
    };

    sales.forEach(sale => {
      const saleDateObj = parseDate(sale.data);
      const saleDate = `${saleDateObj.getFullYear()}-${String(saleDateObj.getMonth() + 1).padStart(2, '0')}-${String(saleDateObj.getDate()).padStart(2, '0')}`;
      const day = days.find(d => d.date === saleDate);
      if (day) {
        if (sale.tipo === 'SAÍDA') {
          day.saidas += Number(sale.valor) || 0;
        } else {
          day.vendas += Number(sale.valor) || 0;
        }
      }
    });

    return days;
  }, [sales, mlData, source]);

  // Gráfico Vendas por Tipo (Valor)
  const pieData = useMemo(() => {
    const types: Record<string, number> = {};
    sales.filter(s => s.tipo !== 'SAÍDA').forEach(sale => {
      types[sale.tipo] = (types[sale.tipo] || 0) + sale.valor;
    });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [sales]);

  const latestSales = useMemo(() => {
    return [...sales].sort((a, b) => parseLocalDate(b.data).getTime() - parseLocalDate(a.data).getTime()).slice(0, 5);
  }, [sales]);

  const filteredSalesByType = useMemo(() => {
    if (!selectedPaymentType) return [];
    return sales.filter(s => s.tipo === selectedPaymentType)
      .sort((a, b) => parseLocalDate(b.data).getTime() - parseLocalDate(a.data).getTime());
  }, [sales, selectedPaymentType]);

  if (loading && inventory.length === 0 && sales.length === 0) {
    // Retornar null ou não bloquear a tela para que inicie direto
    // Apenas mostrar um indicador sutil se necessário
  }

  return (
    <>
      <div className={cn("space-y-6", isSearchOpen && "blur-md pointer-events-none")}>
      <div className="space-y-4 mb-6">
        {/* Linha 1: Título e Ações Principais */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <h2 className={cn("text-2xl sm:text-3xl font-black tracking-tight", theme === 'dark' ? "text-white" : "text-zinc-900")}>
              Dashboard <span className="text-violet-500">RK</span>
            </h2>

            <div className="flex sm:hidden items-center gap-2">
              {/* Toggle de Informações Sensíveis (Mobile) */}
              <button
                onClick={() => setShowSensitiveInfo(!showSensitiveInfo)}
                className={cn(
                  "p-2 rounded-full transition-all border",
                  theme === 'dark' 
                    ? "bg-zinc-900 border-zinc-800 text-zinc-400" 
                    : "bg-white border-zinc-200 text-zinc-600"
                )}
              >
                {showSensitiveInfo ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>

              {/* Botão de Sincronizar (Mobile) */}
              <button 
                onClick={() => {
                  refreshData();
                  if (source === 'mercadolivre' && onRefreshMlDashboard) {
                    onRefreshMlDashboard();
                  }
                }}
                disabled={loading || isMlDashboardLoading}
                className={cn(
                  "p-2 rounded-full transition-all border",
                  theme === 'dark' 
                    ? "bg-zinc-900 border-zinc-800 text-zinc-400" 
                    : "bg-white border-zinc-200 text-zinc-600"
                )}
              >
                <RefreshCw size={16} className={cn((loading || isMlDashboardLoading) && "animate-spin")} />
              </button>
            </div>
          </div>
          
          <div className="hidden sm:flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            <div className="flex items-center gap-2">
              {/* Toggle de Informações Sensíveis */}
              <button
                onClick={() => setShowSensitiveInfo(!showSensitiveInfo)}
                className={cn(
                  "p-1.5 sm:p-2 rounded-full transition-all border",
                  theme === 'dark' 
                    ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800" 
                    : "bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                )}
                title={showSensitiveInfo ? "Ocultar Sensíveis" : "Mostrar Sensíveis"}
              >
                {showSensitiveInfo ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>

              {/* Botão de Sincronizar */}
              <button 
                onClick={() => {
                  refreshData();
                  if (source === 'mercadolivre' && onRefreshMlDashboard) {
                    onRefreshMlDashboard();
                  }
                }}
                disabled={loading || isMlDashboardLoading}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full transition-all border font-bold text-xs",
                  theme === 'dark' 
                    ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800" 
                    : "bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50",
                  (loading || isMlDashboardLoading) && "opacity-50 cursor-not-allowed"
                )}
                title="Sincronizar Dados"
              >
                <RefreshCw size={16} className={cn((loading || isMlDashboardLoading) && "animate-spin")} />
                <span className="hidden sm:inline">Sincronizar</span>
              </button>

              {/* Filtro de Período (apenas para Mercado Livre) */}
              {source === 'mercadolivre' && (
                <div className="relative">
                  <button
                    onClick={() => {
                      const dropdown = document.getElementById('ml-period-dropdown');
                      if (dropdown) {
                        dropdown.classList.toggle('hidden');
                      }
                    }}
                    className={cn(
                      "p-1.5 sm:p-2 rounded-full transition-all border flex items-center justify-center relative",
                      theme === 'dark' 
                        ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800" 
                        : "bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                    )}
                    title="Filtro de Período"
                  >
                    <Calendar size={18} />
                    {mlPeriod !== '30d' && (
                      <span className="absolute top-0 right-0 w-2 h-2 bg-amber-500 rounded-full"></span>
                    )}
                  </button>
                  
                  <div 
                    id="ml-period-dropdown" 
                    className={cn(
                      "hidden absolute right-0 top-full mt-2 w-64 p-3 rounded-2xl border shadow-xl z-50",
                      theme === 'dark' ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
                    )}
                  >
                    <h4 className={cn("text-xs font-bold uppercase tracking-wider mb-2 px-1", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>Período</h4>
                    <div className="space-y-1 mb-3">
                      {[
                        { value: '7d', label: 'Últimos 7 dias' },
                        { value: '15d', label: 'Últimos 15 dias' },
                        { value: '30d', label: 'Últimos 30 dias' },
                        { value: '60d', label: 'Últimos 60 dias' },
                        { value: 'custom', label: 'Data Específica' },
                      ].map(option => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setMlPeriod(option.value);
                            if (option.value !== 'custom') {
                              document.getElementById('ml-period-dropdown')?.classList.add('hidden');
                            }
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all",
                            mlPeriod === option.value
                              ? (theme === 'dark' ? "bg-amber-500/10 text-amber-500" : "bg-amber-50 text-amber-600")
                              : (theme === 'dark' ? "text-zinc-300 hover:bg-zinc-800" : "text-zinc-700 hover:bg-zinc-100")
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    {mlPeriod === 'custom' && (
                      <div className={cn("space-y-2 pt-2 border-t", theme === 'dark' ? "border-zinc-800" : "border-zinc-200")}>
                        <div>
                          <label className={cn("block text-[10px] font-bold uppercase mb-1", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>Início</label>
                          <input
                            type="date"
                            value={mlCustomDate.start}
                            onChange={(e) => setMlCustomDate({ ...mlCustomDate, start: e.target.value })}
                            className={cn(
                              "w-full px-3 py-2 rounded-xl text-xs font-medium border outline-none transition-all",
                              theme === 'dark' 
                                ? "bg-zinc-950 border-zinc-800 text-zinc-300 focus:border-amber-500/50" 
                                : "bg-zinc-50 border-zinc-200 text-zinc-700 focus:border-amber-500/50"
                            )}
                          />
                        </div>
                        <div>
                          <label className={cn("block text-[10px] font-bold uppercase mb-1", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>Fim</label>
                          <input
                            type="date"
                            value={mlCustomDate.end}
                            onChange={(e) => setMlCustomDate({ ...mlCustomDate, end: e.target.value })}
                            className={cn(
                              "w-full px-3 py-2 rounded-xl text-xs font-medium border outline-none transition-all",
                              theme === 'dark' 
                                ? "bg-zinc-950 border-zinc-800 text-zinc-300 focus:border-amber-500/50" 
                                : "bg-zinc-50 border-zinc-200 text-zinc-700 focus:border-amber-500/50"
                            )}
                          />
                        </div>
                        <button
                          onClick={() => document.getElementById('ml-period-dropdown')?.classList.add('hidden')}
                          className="w-full mt-2 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition-colors"
                        >
                          Aplicar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Grid de Métricas Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 px-4 sm:px-0">
        {source === 'estoque' ? (
          <>
            <StatCard 
              icon={Package} 
              label="Valor do Estoque" 
              value={metrics.valorTotalEstoque} 
              subValue={`${metrics.totalItensEstoque} itens em estoque`}
              color="bg-indigo-500" 
              theme={theme}
              isSensitive={true}
            />
            <StatCard 
              icon={TrendingUp} 
              label="Vendas (Mês)" 
              value={metrics.valorVendasMes} 
              subValue={`${metrics.totalVendasMes} vendas no mês`}
              color="bg-teal-500" 
              theme={theme}
              isSensitive={true}
            />
            
            {/* Gráfico Estiloso que ocupa o espaço de 2 cards */}
            <div className={cn(
              "col-span-2 border rounded-2xl p-5 transition-all duration-300 relative overflow-hidden flex flex-col h-full",
              theme === 'dark' 
                ? "bg-zinc-900/40 border-zinc-800/50 shadow-lg" 
                : "bg-white border-zinc-200 shadow-sm"
            )}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "p-2 rounded-xl",
                    theme === 'dark' ? "bg-zinc-800/50 text-zinc-400" : "bg-zinc-100 text-zinc-500"
                  )}>
                    <BarChart3 size={16} strokeWidth={2.5} />
                  </div>
                  <span className={cn("text-[9px] font-black uppercase tracking-[0.2em] opacity-60", theme === 'dark' ? "text-zinc-400" : "text-zinc-500")}>
                    Desempenho Semanal
                  </span>
                </div>
              </div>
              <div className="flex-1 min-h-[120px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.slice(-7)}>
                    <defs>
                      <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className={cn(
                              "p-2 rounded-lg border shadow-xl text-[10px] font-bold",
                              theme === 'dark' ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-100 text-zinc-900"
                            )}>
                              <p className="opacity-60 mb-1">{payload[0].payload.label}</p>
                              <p className={cn("text-emerald-400", !showSensitiveInfo && "blur-sm select-none")}>
                                {showSensitiveInfo ? formatCurrency(payload[0].value) : "R$ ***"}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="vendas" 
                      stroke="#10b981" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorVendas)" 
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <StatCard 
              icon={DollarSign} 
              label="Saídas (Mês)" 
              value={metrics.valorSaidasMes} 
              subValue="despesas operacionais"
              color="bg-rose-400" 
              theme={theme} 
              isSensitive={true}
            />
            <StatCard 
              icon={ShoppingCart} 
              label="Ticket Médio" 
              value={metrics.ticketMedio} 
              subValue="por venda realizada"
              color="bg-amber-400" 
              theme={theme} 
              isSensitive={true}
            />
          </>
        ) : (
          <>
    <StatCard 
      icon={Box} 
      label="Anúncios Ativos" 
      value={metrics.activeListings} 
      subValue={`De ${metrics.totalItensEstoque} anúncios totais`}
      color="bg-indigo-500" 
      theme={theme} 
      onClick={onFetchAllMlListings}
      isCurrency={false}
    />
    <StatCard 
      icon={BarChart3} 
      label="Vendas ML (Mês)" 
      value={metrics.valorVendasMes} 
      subValue={`${metrics.totalVendasMes} pedidos no período`}
      color="bg-teal-500" 
      theme={theme} 
      isSensitive={true}
    />
    <StatCard 
      icon={MessageCircle} 
      label="Perguntas" 
      value={`${metrics.perguntasPendentes} / ${metrics.totalPerguntas || '...'}`}
      subValue="pendentes / total"
      color="bg-rose-400" 
      theme={theme} 
      trend={metrics.perguntasPendentes > 0 ? -10 : 0}
      onClick={() => setIsQuestionsModalOpen(true)}
      isCurrency={false}
    />
    <QuestionsModal isOpen={isQuestionsModalOpen} onClose={() => setIsQuestionsModalOpen(false)} theme={theme} />
    <StatCard 
      icon={Truck} 
      label="Prontas para Envio" 
      value={metrics.pendingShipments} 
      subValue="pedidos aguardando despacho"
      color="bg-amber-400" 
      theme={theme} 
      trend={metrics.pendingShipments > 0 ? 10 : 0}
      isCurrency={false}
      onClick={() => {
        // Scroll to sales section and set tab to pending
        const salesSection = document.getElementById('vendas-section');
        if (salesSection) {
          salesSection.scrollIntoView({ behavior: 'smooth' });
          setMlSalesSubTab('pending');
        }
      }}
    />
          </>
        )}
      </div>

          <div className="h-[300px] hidden sm:block">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={source === 'estoque' ? "#8b5cf6" : "#10b981"} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={source === 'estoque' ? "#8b5cf6" : "#10b981"} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "#27272a" : "#e5e7eb"} vertical={false} />
                <XAxis 
                  dataKey="label" 
                  stroke="#71717a" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontWeight: 600 }}
                />
                <YAxis 
                  stroke="#71717a" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => formatCurrency(value)}
                  tick={{ fontWeight: 600 }}
                />
                <Tooltip 
                  formatter={(value: number) => [showSensitiveInfo ? formatCurrency(value) : "R$ ***", ""]}
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#18181b' : '#fff', 
                    border: `1px solid ${theme === 'dark' ? '#27272a' : '#e5e7eb'}`, 
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                  }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="vendas" name="Vendas" stroke={source === 'estoque' ? "#8b5cf6" : "#10b981"} strokeWidth={3} fillOpacity={1} fill="url(#colorVendas)" />
                {source === 'estoque' && (
                  <Area type="monotone" dataKey="saidas" name="Saídas" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorSaidas)" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Mobile Simplified View */}
          <div className={cn(
            "sm:hidden border p-4 rounded-2xl transition-all duration-300 mb-12",
            theme === 'dark' 
              ? "bg-zinc-900/40 border-zinc-800/50 shadow-lg" 
              : "bg-white border-zinc-200 shadow-sm"
          )}>
            <div className="flex items-center gap-2 mb-4 opacity-60">
              <Activity size={14} className="text-violet-500" />
              <span className={cn("text-[9px] font-black uppercase tracking-widest", theme === 'dark' ? "text-zinc-400" : "text-zinc-500")}>
                Fluxo Recente
              </span>
            </div>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.slice(-15)}>
                  <defs>
                    <linearGradient id="colorVendasMobile" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={source === 'estoque' ? "#8b5cf6" : "#10b981"} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={source === 'estoque' ? "#8b5cf6" : "#10b981"} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="vendas" 
                    stroke={source === 'estoque' ? "#8b5cf6" : "#10b981"} 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorVendasMobile)" 
                    animationDuration={1000}
                  />
                  <Tooltip 
                    formatter={(value: number) => [showSensitiveInfo ? formatCurrency(value) : "R$ ***", ""]}
                    contentStyle={{ 
                      backgroundColor: theme === 'dark' ? '#18181b' : '#fff', 
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '10px'
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[8px] text-center text-zinc-500 font-black uppercase tracking-[0.3em] mt-4">
              Últimos 15 dias
            </p>
          </div>

        {/* Gráfico Secundário / Ações Rápidas */}
        <div className="space-y-6">
          <div className={cn(
            "border p-6 rounded-2xl transition-all duration-300",
            theme === 'dark' 
              ? "bg-zinc-900/40 border-zinc-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-violet-500/30" 
              : "bg-white border-zinc-200 shadow-sm"
          )}>
            <h3 className={cn("text-lg font-bold tracking-tight mb-6", theme === 'dark' ? "text-white" : "text-zinc-900")}>
              {source === 'estoque' ? "Vendas por Tipo" : "Status de Anúncios"}
            </h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={source === 'estoque' ? pieData : [
                      { name: 'Ativos', value: metrics.activeListings },
                      { name: 'Inativos', value: metrics.totalItensEstoque - metrics.activeListings }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {(source === 'estoque' ? pieData : [
                      { name: 'Ativos', value: metrics.activeListings },
                      { name: 'Inativos', value: metrics.totalItensEstoque - metrics.activeListings }
                    ]).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={source === 'estoque' ? COLORS[index % COLORS.length] : (index === 0 ? '#10b981' : '#f43f5e')} />
                    ))}
                  </Pie>
                <Tooltip 
                    formatter={(value: number) => source === 'estoque' ? (showSensitiveInfo ? formatCurrency(value) : "R$ ***") : value}
                    contentStyle={{ 
                      backgroundColor: theme === 'dark' ? '#18181b' : '#fff', 
                      border: `1px solid ${theme === 'dark' ? '#27272a' : '#e5e7eb'}`, 
                      borderRadius: '12px' 
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {(source === 'estoque' ? pieData : [
                { name: 'Ativos', value: metrics.activeListings, color: '#10b981' },
                { name: 'Inativos', value: metrics.totalItensEstoque - metrics.activeListings, color: '#f43f5e' }
              ]).map((item: any, index: number) => (
                <div 
                  key={index} 
                  className={cn(
                    "group relative px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-2 transition-all w-fit",
                    theme === 'dark' 
                      ? "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-100" 
                      : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900"
                  )}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: source === 'estoque' ? COLORS[index % COLORS.length] : item.color }} />
                  {item.name}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                    {source === 'estoque' ? (showSensitiveInfo ? formatCurrency(item.value) : "R$ ***") : item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ações Rápidas ML */}
          {source === 'mercadolivre' && (
            <div className={cn(
              "border p-6 rounded-2xl transition-all duration-300",
              theme === 'dark' 
                ? "bg-zinc-900/40 border-zinc-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)]" 
                : "bg-white border-zinc-200 shadow-sm"
            )}>
              <h3 className={cn("text-sm font-bold tracking-tight mb-4 uppercase text-zinc-500", theme === 'dark' ? "text-zinc-400" : "text-zinc-500")}>
                Ações Rápidas ML
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => onTabChange('mercadolivre')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 transition-all group"
                >
                  <MessageSquare className="text-violet-500 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Responder</span>
                </button>
                <button 
                  onClick={() => onTabChange('mercadolivre')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all group"
                >
                  <Package className="text-amber-500 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Anúncios</span>
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Últimas Vendas / Pedidos ML */}
        <div id="vendas-section" className={cn(
          "lg:col-span-3 border rounded-2xl overflow-hidden transition-all duration-300 mt-6",
          theme === 'dark' 
            ? "bg-zinc-900/40 border-zinc-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)]" 
            : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className={cn(
            "p-4 border-b flex items-center justify-between relative",
            theme === 'dark' ? "border-zinc-800/50" : "border-zinc-100"
          )}>
            <h3 className={cn("font-bold tracking-tight", theme === 'dark' ? "text-white" : "text-zinc-900")}>
              {source === 'estoque' ? "Últimas Vendas" : "Vendas (Mercado Livre)"}
            </h3>
            
            <div className="flex items-center gap-2">
              {source === 'estoque' && (
                <div className="relative">
                  <button 
                    onClick={() => setShowPaymentFilter(!showPaymentFilter)}
                    className={cn(
                      "p-3 rounded-xl transition-all active:scale-95 border flex items-center justify-center min-w-[44px] min-h-[44px]",
                      theme === 'dark' 
                        ? "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:text-white" 
                        : "bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900",
                      paymentFilter !== 'TODOS' && "border-violet-500/50 text-violet-500 bg-violet-500/10"
                    )}
                  >
                    <Filter size={20} />
                  </button>
                  
                  <AnimatePresence>
                    {showPaymentFilter && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className={cn(
                          "absolute right-0 mt-2 w-48 rounded-2xl border shadow-2xl z-50 p-2",
                          theme === 'dark' ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
                        )}
                      >
                        {['TODOS', 'CRÉDITO', 'DÉBITO', 'DINHEIRO', 'MARCELO', 'PENDÊNCIA', 'PIX'].map((type) => (
                          <button
                            key={type}
                            onClick={() => {
                              setPaymentFilter(type);
                              setShowPaymentFilter(false);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-colors",
                              paymentFilter === type
                                ? "bg-violet-500 text-white"
                                : theme === 'dark'
                                  ? "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                            )}
                          >
                            {type}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              <History size={16} className="text-zinc-500" />
            </div>
          </div>
          
          {source === 'estoque' ?
            <div className="overflow-x-auto">
              {/* Desktop Table */}
              <table className="hidden md:table w-full text-left text-sm">
                <thead>
                  <tr className={cn(
                    "text-[10px] uppercase font-bold tracking-wider",
                    theme === 'dark' ? "bg-zinc-800/30 text-zinc-500" : "bg-zinc-50 text-zinc-500"
                  )}>
                    <th className="px-4 py-3">Peça</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Data</th>
                  </tr>
                </thead>
                <tbody className={cn("divide-y", theme === 'dark' ? "divide-zinc-800/30" : "divide-zinc-100")}>
                  {filteredLastSales.slice(0, 5).map((sale: any) => (
                    <tr 
                      key={sale.id} 
                      onClick={() => onSelectItem(sale)}
                      className="transition-colors group cursor-pointer hover:bg-zinc-800/20"
                    >
                      <td className={cn("px-4 py-3 font-bold", theme === 'dark' ? "text-zinc-200" : "text-zinc-900")}>
                        <div className="flex flex-col min-w-0">
                          <span className="truncate max-w-[200px]" title={sale.nome}>
                            {sale.nome ? sale.nome.charAt(0).toUpperCase() + sale.nome.slice(1) : ''}
                          </span>
                          {sale.moto && (
                            <span className="text-[9px] font-bold uppercase text-violet-400 tracking-wider">
                              {sale.moto.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-emerald-400 font-black font-mono drop-shadow-[0_0_8px_rgba(52,211,153,0.2)]">
                        {formatCurrency(sale.valor)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                          sale.tipo?.toUpperCase() === 'PIX' ? (theme === 'dark' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border-emerald-200") :
                          sale.tipo?.toUpperCase() === 'DINHEIRO' ? (theme === 'dark' ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-green-50 text-green-600 border-green-200") :
                          sale.tipo?.toUpperCase() === 'CRÉDITO' ? (theme === 'dark' ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-orange-50 text-orange-600 border-orange-200") :
                          sale.tipo?.toUpperCase() === 'DÉBITO' ? (theme === 'dark' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-600 border-blue-200") :
                          sale.tipo?.toUpperCase() === 'MARCELO' ? (theme === 'dark' ? "bg-violet-500/10 text-violet-400 border-violet-500/20" : "bg-violet-50 text-violet-600 border-violet-200") :
                          sale.tipo?.toUpperCase().includes('MERCADO LIVRE') ? (theme === 'dark' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-600 border-amber-200") :
                          (theme === 'dark' ? "bg-zinc-800 text-zinc-400 border-zinc-700/50" : "bg-zinc-100 text-zinc-600")
                        )}>
                          {sale.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                          theme === 'dark' ? "bg-zinc-800/50 text-zinc-500 border-zinc-700/50" : "bg-zinc-50 text-zinc-500 border-zinc-200"
                        )}>
                          {parseLocalDate(sale.data).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Cards */}
              <div className="md:hidden flex flex-col max-h-[500px] overflow-y-auto scrollbar-hide divide-y divide-zinc-800/10 px-8">
                {filteredLastSales.slice(0, 10).map((sale: any) => {
                  const isSaida = sale.tipo === 'SAÍDA';
                  return (
                    <div 
                      key={sale.id}
                      onClick={() => onSelectItem(sale)}
                      className="py-3 flex flex-col gap-1.5 active:bg-zinc-800/20 transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-col min-w-0">
                          <span className={cn(
                            "font-bold text-[13px] leading-tight truncate", 
                            theme === 'dark' ? "text-zinc-300" : "text-zinc-700"
                          )}>
                            {sale.nome ? sale.nome.charAt(0).toUpperCase() + sale.nome.slice(1) : ''}
                          </span>
                          <span className={cn(
                            "font-black text-base tracking-tight transition-all duration-300",
                            isSaida 
                              ? "text-rose-500 [text-shadow:0_0_10px_rgba(244,63,94,0.5)]" 
                              : "text-emerald-500 [text-shadow:0_0_10px_rgba(16,185,129,0.5)]"
                          )}>
                            {isSaida ? '-' : ''}{formatCurrency(Math.abs(sale.valor))}
                          </span>
                        </div>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border",
                          theme === 'dark' ? "bg-zinc-800/50 text-zinc-500 border-zinc-700/50" : "bg-zinc-50 text-zinc-500 border-zinc-200"
                        )}>
                          {parseLocalDate(sale.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border shadow-sm",
                          isSaida 
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : (
                              sale.tipo?.toUpperCase() === 'PIX' ? (theme === 'dark' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border-emerald-200") :
                              sale.tipo?.toUpperCase() === 'DINHEIRO' ? (theme === 'dark' ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-green-50 text-green-600 border-green-200") :
                              sale.tipo?.toUpperCase() === 'CRÉDITO' ? (theme === 'dark' ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-orange-50 text-orange-600 border-orange-200") :
                              sale.tipo?.toUpperCase() === 'DÉBITO' ? (theme === 'dark' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-600 border-blue-200") :
                              sale.tipo?.toUpperCase() === 'MARCELO' ? (theme === 'dark' ? "bg-violet-500/10 text-violet-400 border-violet-500/20" : "bg-violet-50 text-violet-600 border-violet-200") :
                              sale.tipo?.toUpperCase().includes('MERCADO LIVRE') ? (theme === 'dark' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-600 border-amber-200") :
                              (theme === 'dark' ? "bg-zinc-800 text-zinc-500 border border-zinc-700" : "bg-zinc-100 text-zinc-400 border border-zinc-200")
                            )
                        )}>
                          {sale.tipo}
                        </span>
                        {sale.moto && (
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border",
                            theme === 'dark' ? "bg-violet-500/10 text-violet-400 border-violet-500/20" : "bg-violet-50 text-violet-600 border-violet-200"
                          )}>
                            {sale.moto.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          :
            <div className="flex flex-col gap-4 p-4">
              {/* Resumo de Envios */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide">
                <button 
                  onClick={() => setMlSalesSubTab('pending')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors",
                    mlSalesSubTab === 'pending' 
                      ? (theme === 'dark' ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-900")
                      : (theme === 'dark' ? "text-zinc-400 hover:bg-zinc-800/50" : "text-zinc-500 hover:bg-zinc-50")
                  )}
                >
                  Envios pendentes
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full transition-colors",
                    mlSalesSubTab === 'pending' ? "bg-blue-500 text-white" : (theme === 'dark' ? "bg-zinc-800 text-zinc-500" : "bg-zinc-200 text-zinc-400")
                  )}>
                    {metrics.ultimasVendas.filter((s: any) => {
                      const isCancelled = s.is_cancelled || s.status === 'cancelled' || s.shipping_status?.startsWith('cancelled') || s.shipping_substatus === 'cancelled' || s.shipping_substatus === 'not_delivered';
                      const isReadyToShip = s.shipping_status?.startsWith('ready_to_ship') || s.shipping_status === 'pending' || s.shipping_status?.includes('ready_to_print') || s.shipping_status?.includes('printed') || s.shipping_status?.includes('invoice_pending');
                      return !s.has_dispute && isReadyToShip && !isCancelled;
                    }).length}
                  </span>
                </button>

                {metrics.ultimasVendas.some((s: any) => s.has_dispute) && (
                  <button 
                    onClick={() => setMlSalesSubTab('dispute')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors",
                      mlSalesSubTab === 'dispute' 
                        ? (theme === 'dark' ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-900")
                        : (theme === 'dark' ? "text-zinc-400 hover:bg-zinc-800/50" : "text-zinc-500 hover:bg-zinc-50")
                    )}
                  >
                    Mediações
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full transition-colors",
                      mlSalesSubTab === 'dispute' ? "bg-red-500 text-white" : (theme === 'dark' ? "bg-zinc-800 text-zinc-500" : "bg-zinc-200 text-zinc-400")
                    )}>
                      {metrics.ultimasVendas.filter((s: any) => s.has_dispute).length}
                    </span>
                  </button>
                )}

                <button 
                  onClick={() => setMlSalesSubTab('shipped')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors",
                    mlSalesSubTab === 'shipped' 
                      ? (theme === 'dark' ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-900")
                      : (theme === 'dark' ? "text-zinc-400 hover:bg-zinc-800/50" : "text-zinc-500 hover:bg-zinc-50")
                  )}
                >
                  Em trânsito
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full transition-colors",
                    mlSalesSubTab === 'shipped' ? "bg-violet-500 text-white" : (theme === 'dark' ? "bg-zinc-800 text-zinc-500" : "bg-zinc-200 text-zinc-400")
                  )}>
                    {metrics.ultimasVendas.filter((s: any) => s.shipping_status === 'shipped' && s.shipping_status !== 'cancelled' && s.shipping_substatus !== 'cancelled' && s.shipping_substatus !== 'not_delivered').length}
                  </span>
                </button>
                <button 
                  onClick={() => setMlSalesSubTab('delivered')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors",
                    mlSalesSubTab === 'delivered' 
                      ? (theme === 'dark' ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-900")
                      : (theme === 'dark' ? "text-zinc-400 hover:bg-zinc-800/50" : "text-zinc-500 hover:bg-zinc-50")
                  )}
                >
                  Finalizadas
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full transition-colors",
                    mlSalesSubTab === 'delivered' ? "bg-emerald-500 text-white" : (theme === 'dark' ? "bg-zinc-800 text-zinc-500" : "bg-zinc-200 text-zinc-400")
                  )}>
                    {metrics.ultimasVendas.filter((s: any) => s.shipping_status === 'delivered' && s.shipping_substatus !== 'cancelled' && s.shipping_substatus !== 'not_delivered').length}
                  </span>
                </button>
                <button 
                  onClick={() => setMlSalesSubTab('cancelled')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors",
                    mlSalesSubTab === 'cancelled' 
                      ? (theme === 'dark' ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-900")
                      : (theme === 'dark' ? "text-zinc-400 hover:bg-zinc-800/50" : "text-zinc-500 hover:bg-zinc-50")
                  )}
                >
                  Canceladas
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full transition-colors",
                    mlSalesSubTab === 'cancelled' ? "bg-red-500 text-white" : (theme === 'dark' ? "bg-zinc-800 text-zinc-500" : "bg-zinc-200 text-zinc-400")
                  )}>
                    {metrics.ultimasVendas.filter((s: any) => s.shipping_status === 'cancelled' || s.shipping_substatus === 'cancelled' || s.shipping_substatus === 'not_delivered').length}
                  </span>
                </button>
                <button 
                  onClick={() => setMlSalesSubTab('all')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors",
                    mlSalesSubTab === 'all' 
                      ? (theme === 'dark' ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-900")
                      : (theme === 'dark' ? "text-zinc-400 hover:bg-zinc-800/50" : "text-zinc-500 hover:bg-zinc-50")
                  )}
                >
                  Todas
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full transition-colors",
                    mlSalesSubTab === 'all' ? "bg-zinc-600 text-white" : (theme === 'dark' ? "bg-zinc-800 text-zinc-500" : "bg-zinc-200 text-zinc-400")
                  )}>
                    {metrics.ultimasVendas.length}
                  </span>
                </button>
              </div>

              {filteredSales.map((sale: any) => {
                const getShippingStatusInfo = (sale: any) => {
                  if (sale.shipping_status === 'cancelled' || sale.shipping_substatus === 'cancelled' || sale.shipping_substatus === 'not_delivered') {
                    return {
                      title: 'Cancelada',
                      titleColor: 'text-red-500',
                      description: 'A venda foi cancelada.',
                      buttonText: 'Ver detalhes',
                      buttonAction: 'view'
                    };
                  }
                  if (sale.has_dispute) {
                    return {
                      title: 'Mediação em curso',
                      titleColor: 'text-red-500',
                      description: 'Responda à mediação para prosseguir com a venda.',
                      buttonText: 'Responder mediação',
                      buttonAction: 'dispute'
                    };
                  }
                  if (sale.shipping_status?.startsWith('ready_to_ship') || sale.shipping_status?.includes('ready_to_print') || sale.shipping_status?.includes('printed') || sale.shipping_status?.includes('invoice_pending')) {
                    if (sale.shipping_status?.includes('ready_to_print') || sale.shipping_substatus === 'ready_to_print') {
                      return {
                        title: 'Pronta para gerar etiqueta',
                        titleColor: 'text-orange-500',
                        description: 'Você deve despachar o pacote hoje ou amanhã em Correios.',
                        buttonText: 'GERAR ETIQUETA',
                        buttonAction: 'print'
                      };
                    }
                    if (sale.shipping_status.includes('printed') || sale.shipping_substatus === 'printed') {
                      return {
                        title: 'Etiqueta já impressa',
                        titleColor: 'text-blue-500',
                        description: 'Aguardar coleta ou despachar o pacote.',
                        buttonText: 'Reimprimir etiqueta',
                        buttonAction: 'print'
                      };
                    }
                    if (sale.shipping_status.includes('invoice_pending') || sale.shipping_substatus === 'invoice_pending') {
                      return {
                        title: 'Aguardando nota fiscal',
                        titleColor: 'text-amber-500',
                        description: 'Enviar XML da NF para liberar a etiqueta.',
                        buttonText: 'Emitir NF',
                        buttonAction: 'invoice'
                      };
                    }
                    // Default for ready_to_ship
                    return {
                      title: 'Pronta para envio',
                      titleColor: 'text-orange-500',
                      description: 'Você deve despachar o pacote.',
                      buttonText: 'GERAR ETIQUETA',
                      buttonAction: 'print'
                    };
                  }
                  if (sale.shipping_status === 'shipped') {
                    return {
                      title: 'Em trânsito',
                      titleColor: 'text-violet-500',
                      description: 'O pacote está a caminho do comprador.',
                      buttonText: 'Acompanhar envio',
                      buttonAction: 'track'
                    };
                  }
                  if (sale.shipping_status === 'delivered') {
                    return {
                      title: 'Entregue',
                      titleColor: 'text-emerald-500',
                      description: 'O pacote foi entregue ao comprador.',
                      buttonText: 'Ver detalhes',
                      buttonAction: 'view'
                    };
                  }
                  if (sale.shipping_status === 'pending') {
                    return {
                      title: 'Envio pendente',
                      titleColor: 'text-amber-500',
                      description: 'Aguardando liberação da etiqueta.',
                      buttonText: 'Ver detalhes',
                      buttonAction: 'view'
                    };
                  }
                  if (sale.status === 'cancelled') {
                    return {
                      title: 'Cancelada',
                      titleColor: 'text-red-500',
                      description: 'A venda foi cancelada.',
                      buttonText: 'Ver detalhes',
                      buttonAction: 'view'
                    };
                  }
                  return {
                    title: sale.status === 'Pago' ? 'Pagamento aprovado' : sale.status,
                    titleColor: 'text-zinc-500',
                    description: 'Aguardando atualização de envio.',
                    buttonText: 'Ver detalhes',
                    buttonAction: 'view'
                  };
                };
                
                const statusInfo = getShippingStatusInfo(sale);

                return (
                <div key={sale.id} className={cn(
                  "border rounded-xl p-4 flex flex-col gap-4 transition-all",
                  theme === 'dark' ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
                )}>
                  {/* Header do Card */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-400 text-black text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm">ML</div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-200">#{sale.id}</span>
                        <span className="text-[10px] text-zinc-500">{parseLocalDate(sale.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={cn("text-sm font-semibold truncate max-w-[140px]", theme === 'dark' ? "text-zinc-100" : "text-zinc-900")}>
                          {sale.cliente || sale.nickname}
                        </div>
                        <div className="text-[10px] text-zinc-500 truncate max-w-[140px]">{sale.nickname}</div>
                      </div>
                      <button 
                        onClick={() => window.open(`https://myaccount.mercadolivre.com.br/messaging/orders/${sale.id}`, '_blank')}
                        className="p-2 rounded-full hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-blue-400"
                        title="Mensagens"
                      >
                        <MessageSquare size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Ação Principal e Detalhes */}
                  <div className="flex items-center justify-between bg-black/20 p-3 rounded-lg border border-white/5">
                    <div className="flex flex-col gap-0.5">
                      <span className={cn("font-bold text-sm", statusInfo.titleColor)}>{statusInfo.title}</span>
                      <span className="text-zinc-400 text-xs">{statusInfo.description}</span>
                    </div>
                    {statusInfo.buttonAction === 'print' ? (
                      <button 
                        onClick={async () => {
                          if (!sale.shipping_id) {
                            alert('ID de envio não encontrado para este pedido.');
                            return;
                          }
                          try {
                            const res = await fetchWithRetry(`/api/ml/shipment-label/${sale.shipping_id}`);
                            if (!res.ok) throw new Error('Falha ao baixar etiqueta');
                            const blob = await res.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            
                            const contentDisposition = res.headers.get('Content-Disposition');
                            let filename = `etiqueta-${sale.shipping_id}.pdf`;
                            if (contentDisposition) {
                              const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                              if (filenameMatch && filenameMatch.length === 2) {
                                filename = filenameMatch[1];
                              } else {
                                const filenameMatch2 = contentDisposition.match(/filename=([^;]+)/);
                                if (filenameMatch2 && filenameMatch2.length === 2) {
                                  filename = filenameMatch2[1];
                                }
                              }
                            }
                            
                            a.download = filename;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            window.URL.revokeObjectURL(url);
                          } catch (err) {
                            console.error('Erro ao baixar etiqueta:', err);
                            alert('Erro ao baixar etiqueta. Verifique se o pedido já possui etiqueta gerada.');
                          }
                        }}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                      >
                        {statusInfo.buttonText}
                      </button>
                    ) : statusInfo.buttonAction === 'dispute' ? (
                      <button 
                        onClick={() => window.open(`https://myaccount.mercadolivre.com.br/messaging/orders/${sale.id}`, '_blank')}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                      >
                        {statusInfo.buttonText}
                      </button>
                    ) : (
                      <button 
                        onClick={() => window.open(`https://myaccount.mercadolivre.com.br/sales/${sale.id}/detail`, '_blank')}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-bold transition-colors border",
                          theme === 'dark' ? "border-zinc-700 text-zinc-300 hover:bg-zinc-800" : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                        )}
                      >
                        {statusInfo.buttonText}
                      </button>
                    )}
                  </div>

                  {/* Detalhes do Item */}
                  <div className={cn(
                    "flex items-center justify-between p-3 rounded-lg",
                    theme === 'dark' ? "bg-zinc-800/30" : "bg-zinc-50"
                  )}>
                    <div className="flex items-center gap-3 min-w-0">
                      {sale.thumbnail && (
                        <img loading="lazy" src={sale.thumbnail} className="w-10 h-10 rounded-lg object-cover border border-zinc-800 shrink-0" referrerPolicy="no-referrer" />
                      )}
                      <span className={cn(
                        "text-sm font-semibold truncate",
                        theme === 'dark' ? "text-zinc-100" : "text-zinc-900"
                      )} title={sale.itens}>{sale.itens}</span>
                    </div>
                    <div className="flex items-center gap-8">
                      <span className={cn("text-zinc-500 text-sm font-mono", !showSensitiveInfo && "blur-sm select-none")}>
                        {showSensitiveInfo ? formatCurrency(sale.valor) : "R$ ***"}
                      </span>
                      <span className="text-zinc-500 text-sm">{sale.quantidade} unidade{sale.quantidade > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              )})}
              {filteredSales.length === 0 && (
                <div className="text-center py-12 px-4 border-2 border-dashed border-zinc-800 rounded-2xl">
                  <Package className="mx-auto text-zinc-700 mb-3 opacity-20" size={40} />
                  <p className="text-zinc-500 font-medium">Nenhuma encomenda nesta categoria.</p>
                </div>
              )}
              {source === 'mercadolivre' && metrics.ultimasVendas.length > 0 && (
                <div className="flex justify-center pt-4">
                  <button 
                    onClick={() => onTabChange('mercadolivre')}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95",
                      theme === 'dark' ? "bg-zinc-800 text-zinc-300 hover:text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                    )}
                  >
                    <ShoppingCart size={16} className="text-violet-500" />
                    Ver todas as vendas no Mercado Livre
                  </button>
                </div>
              )}
            </div>
          }
        </div>

        {/* Últimos Itens / Anúncios Recentes ML */}
        <div className={cn(
          "lg:col-span-3 border rounded-2xl overflow-hidden transition-all duration-300 mt-6",
          theme === 'dark' 
            ? "bg-zinc-900/40 border-zinc-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)]" 
            : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className={cn(
            "p-4 border-b flex items-center justify-between",
            theme === 'dark' ? "border-zinc-800/50" : "border-zinc-100"
          )}>
            <h3 className={cn("font-bold tracking-tight", theme === 'dark' ? "text-white" : "text-zinc-900")}>
              {source === 'estoque' ? "Últimos itens adicionados" : "Anúncios Recentes ML"}
            </h3>
            <Package size={16} className="text-violet-500" />
          </div>
          <div className="overflow-x-auto">
            {/* Desktop Table */}
            <table className="hidden md:table w-full text-left text-sm">
              <thead>
                <tr className={cn(
                  "text-[10px] uppercase font-bold tracking-wider",
                  theme === 'dark' ? "bg-zinc-800/30 text-zinc-500" : "bg-zinc-50 text-zinc-500"
                )}>
                  <th className="px-4 py-3">{source === 'estoque' ? "Peça" : "Anúncio"}</th>
                  <th className="px-4 py-3 text-center">{source === 'estoque' ? "Qtd" : "Vendas"}</th>
                  <th className="px-4 py-3">{source === 'estoque' ? "Moto" : "Status"}</th>
                  {source === 'mercadolivre' && <th className="px-4 py-3">Criado em</th>}
                  <th className="px-4 py-3">Valor</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", theme === 'dark' ? "divide-zinc-800/30" : "divide-zinc-100")}>
                {metrics.ultimosItens.map((item: any) => (
                  <tr 
                    key={item.id} 
                    onClick={() => {
                      if (source === 'estoque') onSelectItem(item);
                      else if (item.permalink) window.open(item.permalink, '_blank');
                    }}
                    className={cn(
                      "transition-colors group cursor-pointer",
                      theme === 'dark' ? "hover:bg-zinc-800/20" : "hover:bg-zinc-50"
                    )}
                  >
                    <td className={cn("px-4 py-3 font-bold", theme === 'dark' ? "text-zinc-200" : "text-zinc-900")}>
                      <div className="flex items-center gap-3">
                        {source === 'mercadolivre' && item.thumbnail && (
                          <img loading="lazy" src={item.thumbnail} className="w-10 h-10 rounded-lg object-cover border border-zinc-800" referrerPolicy="no-referrer" />
                        )}
                        <span className="">{source === 'mercadolivre' ? (item.titulo || item.id) : (item.nome || item.title)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                        theme === 'dark' ? "bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/30" : "bg-violet-100 text-violet-600"
                      )}>
                        {source === 'mercadolivre' ? (item.estoque || item.vendidos || 0) : (item.estoque || 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                        {source === 'mercadolivre' ? (item.status === 'active' ? 'Ativo' : item.status) : (item.moto || item.status)}
                      </span>
                    </td>
                    {source === 'mercadolivre' && (
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className={cn("text-[10px] font-bold", theme === 'dark' ? "text-zinc-300" : "text-zinc-700")}>
                            {item.date_created ? new Date(item.date_created).toLocaleDateString('pt-BR') : '-'}
                          </span>
                          <span className="text-[9px] text-zinc-500 italic">
                            {item.date_created ? formatRelativeTime(item.date_created) : ''}
                          </span>
                        </div>
                      </td>
                    )}
                    <td className={cn("px-4 py-3 font-black", theme === 'dark' ? "text-zinc-100" : "text-zinc-900")}>
                      {formatCurrency(source === 'mercadolivre' ? (item.preco || 0) : (item.valor || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Cards */}
            <div className="md:hidden flex flex-col max-h-[500px] overflow-y-auto scrollbar-hide divide-y divide-zinc-800/10 px-8">
              {metrics.ultimosItens.map((item: any) => (
                <div 
                  key={item.id}
                  onClick={() => {
                    if (source === 'estoque') onSelectItem(item);
                    else if (item.permalink) window.open(item.permalink, '_blank');
                  }}
                  className="py-3 flex flex-col gap-2 active:bg-zinc-800/20 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    {source === 'mercadolivre' && item.thumbnail && (
                      <img loading="lazy" src={item.thumbnail} className="w-10 h-10 rounded-lg object-cover border border-zinc-800 shadow-sm shrink-0" referrerPolicy="no-referrer" />
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className={cn(
                        "font-bold text-[13px] leading-tight truncate", 
                        theme === 'dark' ? "text-zinc-300" : "text-zinc-700"
                      )}>
                        {source === 'mercadolivre' ? (item.titulo || item.id) : (item.nome || item.title)}
                      </span>
                      <span className="text-emerald-400 font-black text-base tracking-tight">
                        {formatCurrency(source === 'mercadolivre' ? (item.preco || 0) : (item.valor || 0))}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shadow-sm",
                      theme === 'dark' ? "bg-violet-500/10 text-violet-400 border border-violet-500/20" : "bg-violet-100 text-violet-600 border border-violet-200"
                    )}>
                      Qtd: {source === 'mercadolivre' ? (item.estoque || item.vendidos || 0) : (item.estoque || 0)}
                    </span>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shadow-sm ml-auto",
                      theme === 'dark' ? "bg-zinc-800 text-zinc-500 border border-zinc-700" : "bg-zinc-100 text-zinc-400 border border-zinc-200"
                    )}>
                      {source === 'mercadolivre' ? (item.status === 'active' ? 'Ativo' : item.status) : (item.moto || item.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal de Transações por Tipo */}
      <AnimatePresence>
        {selectedPaymentType && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "w-full max-w-4xl max-h-[80vh] overflow-visible rounded-3xl border shadow-2xl flex flex-col",
                theme === 'dark' ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
              )}
            >
              <div className="p-6 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-900/50">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <History className="text-violet-500" />
                    Transações: {selectedPaymentType}
                  </h3>
                  <p className="text-zinc-500 text-sm mt-1">
                    Total de {filteredSalesByType.length} registros encontrados
                  </p>
                </div>
                
                <div className="flex flex-col items-end mr-4 md:mr-8">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Soma Total</span>
                  <div className="text-lg md:text-2xl font-black text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.4)]">
                    {formatCurrency(filteredSalesByType.reduce((sum, s) => sum + s.valor, 0))}
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedPaymentType(null)}
                  className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-0">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className={cn(
                      "text-[10px] uppercase font-bold tracking-wider",
                      theme === 'dark' ? "bg-zinc-800 text-zinc-500" : "bg-zinc-50 text-zinc-500"
                    )}>
                      <th className="px-6 py-4 border-b border-zinc-800/50">Item / Descrição</th>
                      <th className="px-6 py-4 border-b border-zinc-800/50">Valor</th>
                      <th className="px-6 py-4 border-b border-zinc-800/50">Data</th>
                      <th className="px-6 py-4 border-b border-zinc-800/50">RK ID</th>
                    </tr>
                  </thead>
                  <tbody className={cn("divide-y", theme === 'dark' ? "divide-zinc-800/30" : "divide-zinc-100")}>
                    {filteredSalesByType.length > 0 ? (
                      filteredSalesByType.map((sale) => (
                        <tr 
                          key={sale.id} 
                          className={cn(
                            "transition-colors",
                            theme === 'dark' ? "hover:bg-zinc-800/20" : "hover:bg-zinc-50"
                          )}
                        >
                          <td className="px-6 py-4">
                            <div className="font-bold text-white">{sale.nome}</div>
                            {sale.descricao && <div className="text-xs text-zinc-500 mt-1 line-clamp-1">{sale.descricao}</div>}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-emerald-400 font-bold">
                              {formatCurrency(sale.valor)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-zinc-400 text-xs">
                            {parseLocalDate(sale.data).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-zinc-500 font-mono text-xs">{sale.rk_id || '-'}</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                          Nenhuma transação encontrada para este tipo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="p-4 border-t border-zinc-800/50 bg-zinc-900/30 flex justify-end">
                <button 
                  onClick={() => setSelectedPaymentType(null)}
                  className="px-6 py-2 rounded-xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-all"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Todos os Anúncios ML */}
      <AnimatePresence>
        {showAllMlAds && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "w-full max-w-5xl max-h-[90vh] overflow-visible rounded-3xl border shadow-2xl flex flex-col",
                theme === 'dark' ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
              )}
            >
              <div className="p-6 border-b border-zinc-800/50 flex flex-col gap-4 bg-zinc-900/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <Package className="text-amber-500" />
                    Anúncios Ativos
                  </h3>
                  <button 
                    onClick={() => setShowAllMlAds(false)}
                    className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
                <input 
                  type="text"
                  placeholder="Buscar peça ou moto..."
                  value={mlSearchTerm}
                  onChange={(e) => { setMlSearchTerm(e.target.value); setMlCurrentPage(1); }}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 text-white text-sm border border-zinc-700 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex-1 overflow-auto p-0">
                {isMlListingsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="animate-spin text-amber-500" size={40} />
                    <p className="text-zinc-500 font-bold animate-pulse">Buscando anúncios...</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile View */}
                    <div className="md:hidden p-4 space-y-3">
                      {paginatedMlListings.map((item) => {
                        // Heuristic: extract moto name from title
                        // Assuming title format: "Peça Moto" or "Peça (Moto)"
                        const title = item.titulo || item.id;
                        const parts = title.split(/\s\(/)[0].split(/\s/);
                        const motoName = parts.slice(-2).join(' ');
                        const pieceName = parts.slice(0, -2).join(' ') || title;
                        
                        return (
                          <div 
                            key={item.id}
                            onClick={() => window.open(item.link, '_blank')}
                            className={cn(
                              "p-3 rounded-2xl border flex items-center gap-3 transition-colors cursor-pointer",
                              theme === 'dark' ? "bg-zinc-800/40 border-zinc-700 hover:bg-zinc-800" : "bg-white border-zinc-200 hover:bg-zinc-50"
                            )}
                          >
                            <img loading="lazy" src={item.thumbnail} className="w-16 h-16 rounded-xl object-cover border border-zinc-700" referrerPolicy="no-referrer" />
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="font-bold text-sm truncate">{pieceName}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-emerald-500 font-black text-sm">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.preco) || 0)}
                                </span>
                                <span className="text-[10px] bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full font-medium">
                                  {motoName}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Desktop View */}
                    <table className="hidden md:table w-full text-left text-sm border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className={cn(
                        "text-[10px] uppercase font-bold tracking-wider",
                        theme === 'dark' ? "bg-zinc-800 text-zinc-500" : "bg-zinc-50 text-zinc-500"
                      )}>
                        <th className="px-6 py-4 border-b border-zinc-800/50 cursor-pointer" onClick={() => toggleMlSort('titulo')}>Anúncio {mlSortConfig.key === 'titulo' && (mlSortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 border-b border-zinc-800/50 cursor-pointer" onClick={() => toggleMlSort('preco')}>Preço {mlSortConfig.key === 'preco' && (mlSortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 border-b border-zinc-800/50 text-center cursor-pointer" onClick={() => toggleMlSort('estoque')}>Estoque {mlSortConfig.key === 'estoque' && (mlSortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 border-b border-zinc-800/50 cursor-pointer" onClick={() => toggleMlSort('criado_em')}>Data {mlSortConfig.key === 'criado_em' && (mlSortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 border-b border-zinc-800/50">Status</th>
                      </tr>
                    </thead>
                    <tbody className={cn("divide-y", theme === 'dark' ? "divide-zinc-800/30" : "divide-zinc-100")}>
                      {paginatedMlListings.map((item) => (
                        <tr 
                          key={item.id} 
                          onClick={() => window.open(item.link, '_blank')}
                          className={cn(
                            "transition-colors cursor-pointer",
                            theme === 'dark' ? "hover:bg-zinc-800/20" : "hover:bg-zinc-50"
                          )}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <img loading="lazy" src={item.thumbnail} className="w-12 h-12 rounded-xl object-cover border border-zinc-800" referrerPolicy="no-referrer" />
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-white truncate max-w-[300px]">{item.titulo || item.id}</span>
                                <span className="text-[10px] text-zinc-500 font-mono">{item.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-emerald-400 font-black">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.preco) || 0)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-2 py-1 rounded-lg bg-zinc-800 text-zinc-300 font-bold text-xs">
                              {item.estoque}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-zinc-400 font-mono text-xs">
                            {item.criado_em ? new Date(item.criado_em).toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                              item.status === 'active' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                            )}>
                              {item.status === 'active' ? 'Ativo' : item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
              </div>
              
              <div className="p-4 border-t border-zinc-800/50 bg-zinc-900/30 flex justify-between items-center">
                <span className="text-sm text-zinc-500">Página {mlCurrentPage} de {mlTotalPages || 1}</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setMlCurrentPage(p => Math.max(1, p - 1))}
                    disabled={mlCurrentPage === 1}
                    className="px-4 py-2 rounded-xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-all disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button 
                    onClick={() => setMlCurrentPage(p => Math.min(mlTotalPages, p + 1))}
                    disabled={mlCurrentPage >= mlTotalPages}
                    className="px-4 py-2 rounded-xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-all disabled:opacity-50"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
};

