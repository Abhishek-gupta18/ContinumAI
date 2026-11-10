import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// import.meta.env is populated by Vite; plain node (tests) does not have it.
const viteEnv: Record<string, string | undefined> =
  ((import.meta as { env?: Record<string, string | undefined> }).env as Record<string, string | undefined>) ?? {};

const supabaseUrl = String(viteEnv.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = String(viteEnv.VITE_SUPABASE_ANON_KEY ?? '').trim();

export const supabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;
