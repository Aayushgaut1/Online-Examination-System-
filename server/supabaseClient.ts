import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://jwnhapdvdsvwbyumtjun.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseServiceKey) {
  console.warn('[Supabase Server] Warning: Neither SUPABASE_SERVICE_ROLE_KEY nor SUPABASE_ANON_KEY is provided.');
}

export const isSupabaseConfigured = Boolean(
  (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.trim().length > 0) ||
  (process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY.trim().length > 0)
);

const effectiveKey = (supabaseServiceKey || supabaseAnonKey) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

// Server-side privileged administrative client for database operations,
// grading, secure exam transactions, and user management
export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, effectiveKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Standard client with anon key
export const supabasePublic: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey || effectiveKey, {
  auth: {
    persistSession: false
  }
});

export const SUPABASE_PROJECT_URL = supabaseUrl;
export const SUPABASE_REF = 'jwnhapdvdsvwbyumtjun';
