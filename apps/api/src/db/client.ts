import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

// En modo test, permite inyectar un cliente mock desde globalThis.
const mocked = (globalThis as any).__NatyMockSupabase as SupabaseClient | undefined;

export const supabase: SupabaseClient =
  mocked ??
  createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

