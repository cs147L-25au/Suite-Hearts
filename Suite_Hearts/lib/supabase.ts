import { createClient } from '@supabase/supabase-js';

// ============================================
// ADD YOUR SUPABASE CREDENTIALS HERE
// ============================================
// Get these from: Supabase Dashboard > Settings > API
// ============================================

const SUPABASE_URL = 'https://dfnbegemymongybprkia.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmbmJlZ2VteW1vbmd5YnBya2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMjgyNTgsImV4cCI6MjA4MDgwNDI1OH0.mcXszdfPprwrsqZ45AevKQ0fuOqWfA1YKL6g0K6hxSs';

// ============================================
// Example format:
// const SUPABASE_URL = 'https://xxxxxxxxxxxxx.supabase.co';
// const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
// ============================================

if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_PROJECT_URL') {
  throw new Error('Missing Supabase URL. Please add your Supabase project URL in lib/supabase.ts');
}

if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
  throw new Error('Missing Supabase Anon Key. Please add your Supabase anon key in lib/supabase.ts');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

