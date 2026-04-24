import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { Loader2, Package, Mail, KeyRound, Eye, EyeOff } from 'lucide-react';
import { CATEGORIAS_OFICIAIS } from '../constants/lists';
import { supabase } from '../utils/supabase';

interface LoginProps {
  onLogin: () => void;
}

const Marquee = React.memo(({ items, variant = 'default', speed = 40 }: { items: string[], variant?: 'default' | 'violet', speed?: number }) => {
  return (
    <div className="relative w-full overflow-hidden py-1" style={{ maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' }}>
      <div
        className="flex gap-2 w-max pr-2 will-change-transform"
        style={{ animation: `marquee ${speed}s linear infinite` }}
      >
        {[...items, ...items].map((item, i) => (
          <span 
            key={i} 
            className={cn(
              "px-3 md:px-4 py-1.5 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-wider border whitespace-nowrap transition-colors",
              variant === 'violet' 
                ? "bg-violet-600/10 text-violet-400 border-violet-500/20" 
                : "bg-zinc-900/50 text-zinc-500 border-zinc-800/50"
            )}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
});

export const Login = ({ onLogin }: LoginProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Inicializa com dados do localStorage para evitar o "0" inicial
  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem('rk_public_stats');
    return saved ? JSON.parse(saved) : { totalPecas: 0, totalMotos: 0, marcas: [] };
  });

  useEffect(() => {
    fetch('/api/public-stats')
      .then(res => res.json())
      .then(data => {
        const newStats = {
          totalPecas: data.totalPecas || 0,
          totalMotos: data.totalMotos || 0,
          marcas: data.marcas || []
        };
        setStats(newStats);
        localStorage.setItem('rk_public_stats', JSON.stringify(newStats));
      })
      .catch(console.error);
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Preencha usuário e senha.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao entrar');
      }
      
      // Simular o comportamento antigo pro App.tsx se adaptar
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_role', data.user.role);
      localStorage.setItem('user_name', data.user.username);
      
      // Dispatch custom event that App.tsx can listen to
      window.dispatchEvent(new CustomEvent('local-login-success', { detail: data.user }));
      onLogin();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const loginRef = React.useRef<HTMLDivElement>(null);

  const scrollToLogin = () => {
    loginRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const allBrands = React.useMemo(() => Array.from(new Set([
    'HONDA', 'YAMAHA', 'SUZUKI', 'SHINERAY', 
    ...(stats.marcas || []).map((m: string) => m.toUpperCase())
  ])).sort((a, b) => a.localeCompare(b)), [stats.marcas]);

  return (
    <div className="min-h-screen bg-[#09090b] font-sans relative overflow-x-hidden no-scrollbar">
      {/* Efeito Aura de Fundo Dinâmico (Apenas Desktop) */}
      <div className="hidden md:block">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.15, 0.1],
            x: [0, 50, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-violet-600/20 blur-[120px] rounded-full pointer-events-none" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.2, 0.1],
            x: [0, -60, 0],
            y: [0, 40, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" 
        />
      </div>
      
      {/* Overlay de Ruído Sutil (Apenas Desktop) */}
      <div className="hidden md:block absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />

      <div className="h-[100dvh] md:min-h-screen flex items-center justify-center p-0 md:p-4 relative z-10 no-scrollbar overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-4xl bg-zinc-900/80 backdrop-blur-xl rounded-none md:rounded-[2rem] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] overflow-y-auto md:overflow-hidden flex flex-col md:flex-row border-0 md:border border-zinc-800/50 h-[100dvh] md:h-auto no-scrollbar snap-y snap-mandatory"
        >
               {/* Esquerda: Painel de Status (Full screen no mobile) */}
          <div className="w-full md:w-5/12 h-[100dvh] md:min-h-[550px] bg-zinc-950 p-6 md:p-8 text-white flex flex-col justify-center gap-y-6 md:gap-y-10 relative overflow-hidden border-b md:border-b-0 md:border-r border-zinc-800/50 shrink-0 snap-start">
            {/* Efeito de Gradiente Interno */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-violet-600/10 via-transparent to-transparent pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center text-center pt-6 md:pt-12">
              <div className="mb-2 md:mb-4">
                <h1 className="text-2xl md:text-5xl font-black tracking-tighter uppercase leading-none">
                  <span className="text-white">RK</span>
                  <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent"> SUCATAS</span>
                </h1>
              </div>
              <p className="text-zinc-400 text-[10px] md:text-base font-medium leading-relaxed max-w-[240px] md:max-w-sm mx-auto">
                O maior estoque de peças da região com procedência garantida. <br className="hidden md:block" />
                Sua moto merece o melhor desempenho, explore nosso catálogo.
              </p>
            </div>

            <div className="space-y-3 md:space-y-6 relative z-10">
              <div className="group">
                <div className="text-[7px] md:text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-1.5 md:mb-3 text-center">Resumo do Estoque</div>
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <div 
                    className="bg-zinc-900/40 backdrop-blur-xl p-2.5 md:p-4 rounded-lg md:rounded-xl border border-zinc-800/50 transition-all shadow-2xl shadow-black/20 hover:-translate-y-0.5 hover:border-violet-500/40"
                  >
                    <div className="text-lg md:text-3xl font-black text-white mb-0.5 tracking-tighter">{stats.totalPecas}</div>
                    <div className="text-[6px] md:text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Peças em Linha</div>
                  </div>
                  <div 
                    className="bg-zinc-900/40 backdrop-blur-xl p-2.5 md:p-4 rounded-lg md:rounded-xl border border-zinc-800/50 transition-all shadow-2xl shadow-black/20 hover:-translate-y-0.5 hover:border-violet-500/40"
                  >
                    <div className="text-lg md:text-3xl font-black text-white mb-0.5 tracking-tighter">{stats.totalMotos}</div>
                    <div className="text-[6px] md:text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Motos no Pátio</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 md:space-y-4">
                <div>
                  <div className="text-[8px] md:text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-1.5 md:mb-2 flex items-center justify-center gap-2">
                    Principais Marcas
                  </div>
                  <Marquee items={allBrands} variant="violet" speed={35} />
                </div>

                <div>
                  <div className="text-[8px] md:text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-1.5 md:mb-2 flex items-center justify-center gap-2">
                    Categorias em Destaque
                  </div>
                  <Marquee items={CATEGORIAS_OFICIAIS} speed={120} />
                </div>
              </div>
            </div>

            <div className="relative z-10 flex flex-col gap-3 md:gap-4 pt-3 md:pt-6">
              {/* Botão Ver Catálogo (Mobile Only) */}
              <div className="md:hidden flex flex-col items-center gap-3">
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={scrollToLogin}
                  className="w-full bg-gradient-to-r from-violet-600 to-blue-600 text-white py-3.5 rounded-xl font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 group shadow-[0_10px_40px_rgba(139,92,246,0.3)] active:shadow-none text-[10px]"
                >
                  Ver Catálogo
                  <div className="group-hover:-translate-y-1 transition-transform duration-300">
                    <Package size={16} className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                  </div>
                </motion.button>
              </div>

              <div className="flex items-center justify-between text-[8px] md:text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                <span className="ml-[20px] md:ml-[40px]">© 2026 RK SUCATAS</span>
<span className="hidden md:inline">• GESTÃO PROFISSIONAL</span>
              </div>
            </div>
          </div>

          {/* Direita: Formulário de Acesso (Full screen no mobile) */}
          <div 
            ref={loginRef}
            className="w-full md:w-7/12 h-[100dvh] md:min-h-[550px] p-6 md:p-12 lg:p-16 flex flex-col justify-center bg-zinc-900/40 backdrop-blur-sm shrink-0 snap-start"
          >
            <div className="max-w-[320px] w-full mx-auto">
              <div className="mb-6 md:mb-8">
                <h2 className="text-xl md:text-2xl font-black text-white mb-2 tracking-tight">
                  Acesse o Painel
                </h2>
                <p className="text-zinc-400 font-medium text-[10px] md:text-xs leading-relaxed">
                  Faça login restrito com seu usuário e senha.
                </p>
              </div>
              
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] md:text-xs font-bold flex items-center gap-2"
                  >
                    <div className="w-1 h-1 bg-red-500 rounded-full shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Usuário</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-zinc-500" />
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all font-medium"
                      placeholder="seu_usuario"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Senha</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <KeyRound className="h-4 w-4 text-zinc-500" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all font-medium"
                      placeholder="••••••••"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-violet-600 to-blue-600 text-white py-3.5 rounded-xl font-black uppercase tracking-widest hover:brightness-110 transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(139,92,246,0.2)] disabled:opacity-50 text-[10px] md:text-xs"
                  >
                    {loading ? <Loader2 className="animate-spin w-4 h-4 md:w-5 md:h-5" /> : 'Entrar no Sistema'}
                  </button>
                </div>
              </form>

              <div className="mt-6 md:mt-10 pt-4 md:pt-6 border-t border-zinc-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-[6px] md:text-[9px] font-bold text-zinc-600 uppercase tracking-wider">Servidor Administrativo Privado</span>
                </div>
                <span className="text-[6px] md:text-[9px] font-bold text-zinc-800 uppercase">PB • BR • V2.6</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
