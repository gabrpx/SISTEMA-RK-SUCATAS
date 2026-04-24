// api: helper com métodos REST reutilizando fetchWithRetry
// usado por componentes legados como AdminUsers e RegistroModal
export const api = {
  // request interno que monta init e parseia JSON
  _request: async (url: string, method: string, body?: any) => {
    const res = await fetchWithRetry(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      const text = await res.text().catch(() => 'Erro desconhecido');
      let errMsg = `Erro ${res.status}`;
      try {
        const parsed = JSON.parse(text);
        errMsg = parsed.error || parsed.message || errMsg;
      } catch { /* não é JSON */ }
      throw new Error(errMsg);
    }
    return parseJson(res);
  },
  get: async (url: string) => api._request(url, 'GET'),
  post: async (url: string, body?: any) => api._request(url, 'POST', body),
  put: async (url: string, body?: any) => api._request(url, 'PUT', body),
  delete: async (url: string) => api._request(url, 'DELETE')
};

// parseJson: converte resposta fetch em JSON com tratamento de erro detalhado
export const parseJson = async (res: Response) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error(`❌ Erro ao parsear JSON de ${res.url}. Conteúdo recebido:`, text.substring(0, 200));
    throw new Error(`Resposta inválida de ${res.url}`);
  }
};

// fetchWithRetry: fetch com retentativas automáticas e tratamento de erro
// url: endpoint | init: config fetch | retries: número máximo de tentativas
export const fetchWithRetry = async (url: string, init?: RequestInit, retries = 8) => {
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

  console.log(`🔍 Fetching ${url} with method ${init?.method || 'GET'} and headers:`, headers);

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

