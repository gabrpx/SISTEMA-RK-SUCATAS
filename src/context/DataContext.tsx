import React, { useState, useEffect, useRef, createContext } from 'react';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Capacitor } from '@capacitor/core';
import { fetchWithRetry, parseJson } from '../utils/api';

// DataContext: contexto global de dados compartilhado entre todas as views
// Fornece inventory, sales, motos, loading e funções de refresh
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

// DataProvider: carrega dados de estoque/vendas/motos
export function DataProvider({ children }: { children: React.ReactNode }) {
  const [inventory, setInventory] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [motos, setMotos] = useState<any[]>([]);

  // Carrega cache do localStorage na montagem
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

  // loadData: busca estoque, vendas e motos da API com cache e retentativas
  const loadData = async (force = false, silent = false) => {
    const now = Date.now();
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Polling silencioso a cada 10s apenas quando a aba está visível
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadData(false, true);
      }
    }, 10000);

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
