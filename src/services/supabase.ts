import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jwnhapdvdsvwbyumtjun.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseAnonKey) {
  console.warn('[NexusExam Supabase] VITE_SUPABASE_ANON_KEY is not configured in client environment.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SUPABASE_PROJECT_URL = supabaseUrl;
export const SUPABASE_PROJECT_REF = 'jwnhapdvdsvwbyumtjun';
