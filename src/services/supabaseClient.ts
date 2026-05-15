// src/services/supabaseClient.ts - Supabase Admin/Server client (usado por storageService e rotas server)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';

// Se as variáveis de ambiente não estiverem setadas, evitamos crash no `npm run dev`.
// (O site pode rodar sem Supabase; rotas que dependem dele falham depois.)
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as any);


