import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables read via window runtime config (injected by server in production) or Vite build-time env
const getEnvVar = (key: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string => {
  if (typeof window !== 'undefined' && (window as any).__ENV__ && (window as any).__ENV__[key]) {
    const val = String((window as any).__ENV__[key]).trim();
    if (val && !val.includes('dummy')) {
      return val;
    }
  }
  const viteVal = import.meta.env[key];
  if (viteVal && typeof viteVal === 'string') {
    const clean = viteVal.trim();
    if (clean && !clean.includes('dummy')) {
      return clean;
    }
  }
  return '';
};

const supabaseUrl =
  getEnvVar('VITE_SUPABASE_URL') ||
  'https://jwnhapdvdsvwbyumtjun.supabase.co';

const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

export const isSupabaseConfigured = Boolean(
  supabaseAnonKey &&
  supabaseAnonKey.length > 20 &&
  !supabaseAnonKey.includes('dummy')
);

if (!isSupabaseConfigured) {
  console.warn(
    '[NexusExam Supabase] VITE_SUPABASE_ANON_KEY is missing or invalid. Please configure VITE_SUPABASE_ANON_KEY in environment variables:\n' +
    'VITE_SUPABASE_URL=https://jwnhapdvdsvwbyumtjun.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=<your-anon-key>'
  );
}

// Create the singleton Supabase client
const effectiveKey = isSupabaseConfigured
  ? supabaseAnonKey
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key';

export const supabase: SupabaseClient = createClient(supabaseUrl, effectiveKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const SUPABASE_PROJECT_URL = supabaseUrl;
export const SUPABASE_PROJECT_REF = 'jwnhapdvdsvwbyumtjun';

/**
 * Returns configuration check error message if Supabase credentials are not set
 */
export function checkSupabaseConfig(): { valid: boolean; message?: string } {
  if (!isSupabaseConfigured) {
    return {
      valid: false,
      message:
        'Supabase Anon Key is not configured. Please configure VITE_SUPABASE_ANON_KEY in your environment settings to enable authentication and live database persistence.',
    };
  }
  return { valid: true };
}
