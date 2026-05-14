import React, { useEffect, useMemo, useRef, useState, memo } from 'react';
import { cn } from '../utils';
import { Bike, ChevronRight, Edit, Trash2, Loader2 } from 'lucide-react';

// MotoCard.tsx - Card de exibição de moto no modo "card"

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
  'Verde Militar': '#365314',
};

// converte string de cor (ex: "preta") para hex
const getMotoColor = (colorName: string) => {
  if (!colorName) return 'transparent';
  const normalized = colorName.trim().charAt(0).toUpperCase() + colorName.trim().slice(1).toLowerCase();
  return MOTO_COLORS[normalized] || 'transparent';
};

export const MotoCard = memo(function MotoCard({
  item,
  theme,
  onSelectItem,
  handleEditMoto,
  setItemToDelete,
  setIsDeleteConfirmOpen,
  getStatusColor,
  readOnly = false,
}: any) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imgLoading, setImgLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // monta lista de imagens (imagem única ou lista)
  const images = useMemo(() => {
    const imgs = item?.imagens && item.imagens.length > 0 ? item.imagens : (item?.imagem ? [item.imagem] : []);
    return imgs.filter(Boolean);
  }, [item?.imagens, item?.imagem]);

  // Precarrega imagens (melhora UX)
  useEffect(() => {
    if (images.length === 0) return;
    images.forEach((src: string) => {
      const img = new Image();
      img.src = src;
    });
  }, [images]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    // roda com wheel/touch quando existem múltiplas imagens
    const handleWheel = (e: WheelEvent) => {
      if (images.length <= 1) return;
      if (e.deltaY !== 0) {
        e.preventDefault();
        e.stopPropagation();
        setCurrentImageIndex((prev) => {
          const next = e.deltaY > 0 ? prev + 1 : prev - 1;
          const mod = ((next % images.length) + images.length) % images.length;
          return mod;
        });
      }
    };

    let touchStartX = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0]?.clientX ?? 0;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (images.length <= 1) return;
      const touchEndX = e.changedTouches[0]?.clientX ?? 0;
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 50) {
        setCurrentImageIndex((prev) => {
          const next = diff > 0 ? prev + 1 : prev - 1;
          const mod = ((next % images.length) + images.length) % images.length;
          return mod;
        });
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

  const investment = useMemo(() => {
    // exibe valor como número (caso venha string)
    const n = Number(item?.valor ?? 0);
    if (Number.isNaN(n)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  }, [item?.valor]);

  return (
    <div
      ref={cardRef}
      onClick={() => onSelectItem?.(item)}
      className={cn(
        'group relative border rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer flex flex-col h-full',
        theme === 'dark'
          ? 'bg-zinc-900/40 border-zinc-800/50 hover:border-violet-500/50 hover:shadow-[0_8px_30px_rgba(139,92,246,0.1)]'
          : 'bg-white border-zinc-200 hover:border-violet-500/50 hover:shadow-lg',
        item?.status === 'Vendida' && 'opacity-60 grayscale-[0.5] brightness-75'
      )}
    >
      {/* Container das imagens */}
      <div className={cn('aspect-[4/3] relative overflow-hidden', theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-100')}>
        {images.length > 0 ? (
          <div className="w-full h-full relative">
            {imgLoading && (
              <div className={cn('absolute inset-0 flex items-center justify-center', theme === 'dark' ? 'bg-zinc-900' : 'bg-zinc-100')}>
                <Loader2 size={24} className="animate-spin text-violet-500/50" />
              </div>
            )}

            <div
              className="flex transition-transform duration-500 ease-out h-full"
              style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
            >
              {images.map((src: string, idx: number) => (
                <div key={src + idx} className="w-full h-full flex-shrink-0 relative">
                  <img
                    loading="lazy"
                    src={src}
                    onLoad={() => {
                      if (idx === currentImageIndex) setImgLoading(false);
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (idx === currentImageIndex) {
                        target.style.display = 'none';
                      } else {
                        target.style.display = 'none';
                      }
                    }}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />

                  {/* Fallback caso a imagem falhe */}
                  <div
                    className={cn(
                      'absolute inset-0 -z-10 flex flex-col items-center justify-center text-zinc-400',
                      theme === 'dark' ? 'bg-zinc-900/50' : 'bg-zinc-100'
                    )}
                  >
                    <Bike size={48} strokeWidth={1} className="opacity-20" />
                    <span className="text-[10px] uppercase font-bold tracking-tighter mt-2 opacity-40">Erro ao carregar</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Indicadores */}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 px-2">
                {images.map((_: any, idx: number) => (
                  <div
                    key={idx}
                    className={cn(
                      'h-1 rounded-full transition-all duration-300 shadow-sm',
                      idx === currentImageIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className={cn('w-full h-full flex flex-col items-center justify-center text-zinc-400', theme === 'dark' ? 'bg-zinc-900/50' : 'bg-zinc-100')}>
            <Bike size={48} strokeWidth={1} className="opacity-20" />
            <span className="text-[10px] uppercase font-bold tracking-tighter mt-2 opacity-40">Sem Imagem</span>
          </div>
        )}

        {/* Ações rápidas */}
        {!readOnly && (
          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditMoto?.(item);
              }}
              className="p-2.5 rounded-xl bg-white/90 backdrop-blur-sm text-zinc-900 hover:bg-violet-500 hover:text-white transition-all shadow-xl border border-zinc-200/50"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setItemToDelete?.(item?.id);
                setIsDeleteConfirmOpen?.(true);
              }}
              className="p-2.5 rounded-xl bg-white/90 backdrop-blur-sm text-zinc-900 hover:bg-rose-500 hover:text-white transition-all shadow-xl border border-zinc-200/50"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}

        {/* Ponto de cor (visual) */}
        <div className="absolute top-3 left-3">
          <div
            className={cn(
              'w-2.5 h-2.5 md:w-3 md:h-3 rounded-full border shadow-inner',
              theme === 'dark' ? 'border-zinc-700' : 'border-zinc-300'
            )}
            style={{ backgroundColor: getMotoColor(item?.cor) }}
          />
        </div>
      </div>

      {/* Corpo do card */}
      <div className="p-3 md:p-5 flex-1 flex flex-col justify-between space-y-2 md:space-y-4">
        <div className="space-y-1 md:space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[8px] md:text-[10px] font-bold text-violet-500 uppercase tracking-widest">
                {item?.marca}
              </span>
            </div>
            <span className={cn('text-[8px] md:text-[10px] font-mono text-zinc-500 px-1 md:px-1.5 py-0.5 rounded', theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100')}>
              {item?.rk_id}
            </span>
          </div>

          <div>
            <h3
              className={cn(
                'font-black text-sm md:text-xl leading-tight line-clamp-2 tracking-tight',
                theme === 'dark' ? 'text-white' : 'text-zinc-900'
              )}
            >
              {item?.nome && item?.nome !== '-' ? item.nome : (item?.modelo && item.modelo !== '-' ? item.modelo : 'Moto sem Nome')}
            </h3>
            {item?.nome && item?.nome !== '-' && item?.modelo && item?.modelo !== '-' && item.nome !== item.modelo && (
              <p className="text-[10px] md:text-xs text-zinc-500 font-medium mt-0.5 line-clamp-1">{item.modelo}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-y-1 md:gap-y-2 gap-x-2 md:gap-x-3 pt-1">
            {!readOnly && item?.lote && (
              <div
                className={cn(
                  'flex items-center gap-1 md:gap-1.5 text-[9px] md:text-xs text-zinc-500 px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg border',
                  theme === 'dark' ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                )}
              >
                <span className="font-bold">Lote: {item.lote}</span>
              </div>
            )}

            <div
              className={cn(
                'flex items-center gap-1 md:gap-1.5 text-[9px] md:text-xs text-zinc-500 px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg border',
                theme === 'dark' ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              )}
            >
              <span>{item?.ano}</span>
            </div>

            {item?.cilindrada && item?.cilindrada !== '-' && (
              <div
                className={cn(
                  'flex items-center gap-1 md:gap-1.5 text-[9px] md:text-xs text-zinc-500 px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg border',
                  theme === 'dark' ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                )}
              >
                <span>{item.cilindrada}cc</span>
              </div>
            )}
          </div>
        </div>

        <div className={cn('pt-2 md:pt-4 border-t flex items-center justify-between', theme === 'dark' ? 'border-zinc-800' : 'border-zinc-100')}>
          <div className="flex flex-col">
            <span className="text-[8px] md:text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
              {readOnly ? 'Valor' : 'Investimento'}
            </span>
            <span className="text-sm md:text-xl font-black text-violet-500">{investment}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500 group-hover:bg-violet-500 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-violet-500/20">
            <ChevronRight size={20} />
          </div>
        </div>
      </div>
    </div>
  );
});

