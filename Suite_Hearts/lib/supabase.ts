import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dfnbegemymongybprkia.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmbmJlZ2VteW1vbmd5YnBya2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMjgyNTgsImV4cCI6MjA4MDgwNDI1OH0.mcXszdfPprwrsqZ45AevKQ0fuOqWfA1YKL6g0K6hxSs';

if (!SUPABASE_URL || SUPABASE_URL.trim() === '' || SUPABASE_URL.includes('xxxxxxxxxxxxx')) {
  throw new Error('Missing Supabase URL. Set SUPABASE_URL in lib/supabase.ts');
}

if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.trim() === '' || SUPABASE_ANON_KEY.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')) {
  throw new Error('Missing Supabase Anon Key. Set SUPABASE_ANON_KEY in lib/supabase.ts');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

