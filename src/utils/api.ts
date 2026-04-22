import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  
  // Custom Local JWT via SQLite setup
  try {
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {
    console.error("Failed to read local token", e);
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include'
  });
  
  const isLoginRoute = endpoint.includes('/login');
  
  if (response.status === 401 && !isLoginRoute) {
    throw new Error('Sessão expirada ou não autorizada. Faça login novamente.');
  }
  
  return response.json();
}

export const api = {
  get: (endpoint: string) => apiRequest(endpoint),
  post: (endpoint: string, data: any) => apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  put: (endpoint: string, data: any) => apiRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (endpoint: string) => apiRequest(endpoint, { method: 'DELETE' })
};
