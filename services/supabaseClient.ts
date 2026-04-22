import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://pgseyqzdhuaewdctoxnv.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnc2V5cXpkaHVhZXdkY3RveG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjE0ODksImV4cCI6MjA5MTgzNzQ4OX0.a98k8slSD6p4WgiLqfddDdQFUX4i15TcQqL0LJIcPIU';

/**
 * Cliente Supabase para interação com o banco de dados.
 * Utiliza variáveis de ambiente para segurança, com fallbacks para facilitar o setup inicial.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
