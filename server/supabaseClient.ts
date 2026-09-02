import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://jwnhapdvdsvwbyumtjun.supabase.co';

const supabaseKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

export const isSupabaseConfigured = Boolean(
  supabaseKey &&
  supabaseKey.trim().length > 20 &&
  !supabaseKey.includes('dummy')
);

if (!isSupabaseConfigured) {
  console.warn('[Supabase Server] Notice: Supabase key (VITE_SUPABASE_ANON_KEY, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY) is not set.');
}

const effectiveKey = isSupabaseConfigured
  ? supabaseKey
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_server_key';

// Server-side administrative / public client for database operations
export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, effectiveKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const supabasePublic: SupabaseClient = supabaseAdmin;

export const SUPABASE_PROJECT_URL = supabaseUrl;
export const SUPABASE_REF = 'jwnhapdvdsvwbyumtjun';
