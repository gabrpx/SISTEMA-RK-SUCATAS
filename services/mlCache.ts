// services/mlCache.ts
export const mlItemCache = new Map<string, { data: any; timestamp: number }>();
export const ML_CACHE_TTL = 1000 * 60 * 30; // 30 minutos