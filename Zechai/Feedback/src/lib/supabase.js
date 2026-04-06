import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isConfigured =
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey.length > 10;

if (!isConfigured) {
  console.warn(
    '[REVUMATE] Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

// Use dummy values so createClient doesn't throw; submissions will fail gracefully.
export const supabase = createClient(
  isConfigured ? supabaseUrl     : 'https://placeholder.supabase.co',
  isConfigured ? supabaseAnonKey : 'placeholder-key'
);

export { isConfigured };
