export const parseJson = async (res: Response) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error(`❌ Erro ao parsear JSON de ${res.url}. Conteúdo recebido:`, text.substring(0, 200));
    throw new Error(`Resposta inválida de ${res.url}`);
  }
};

const BASE_URL = 'https://rk-sucatas-987595911324.southamerica-east1.run.app';

export const fetchWithRetry = async (url: string, init?: RequestInit, retries = 8) => {
  const isInternal = url.startsWith('/') || url.startsWith(window.location.origin) || url.startsWith(BASE_URL);
  let localToken = null;
  
  const targetUrl = url.startsWith('http') ? url : `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;

  if (isInternal) {
    try {
      localToken = localStorage.getItem('auth_token');
    } catch (e) {
      console.error('Failed to get local token for fetchWithRetry', e);
    }
  }

  const headers: HeadersInit = {
    ...(init?.headers || {}),
    ...(localToken ? { Authorization: `Bearer ${localToken}` } : {}),
  };

  console.log(`🔍 Fetching ${targetUrl} with method ${init?.method || 'GET'} and headers:`, headers);

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(targetUrl, { ...init, headers });

      if (res.status === 503 || res.status === 502) {
        throw new Error('Servidor indisponível (iniciando)');
      }

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
        return res;
      }

      if (!res.ok) throw new Error(`Status ${res.status}`);

      return res;
    } catch (err) {
      if (err instanceof Error && err.message.includes('Sessão expirada')) {
        throw err;
      }

      if (i === retries) {
        console.error(`❌ Falha definitiva ao buscar ${url}:`, err);
        throw err;
      }

      const delay = 3000 * (i + 1);
      console.warn(
        `⚠️ Tentativa ${i + 1} falhou para ${url}: ${err instanceof Error ? err.message : String(err)}. Tentando novamente em ${delay}ms...`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error('Falha após retentativas');
};
