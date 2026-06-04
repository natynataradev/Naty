import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function verifyConnection(): Promise<void> {
  const { error } = await supabase.from('contacts').select('id').limit(1);
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Supabase connection failed: ${error.message}`);
  }
}
