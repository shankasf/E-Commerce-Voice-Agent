/**
 * Server-only Supabase client
 * This file should ONLY be imported in API routes and server components
 * Uses the service role key for admin operations
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-only environment variables (no NEXT_PUBLIC_ prefix)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

// Support both old and new env var names for backward compatibility
// DEPRECATED: NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY - use SUPABASE_SERVICE_ROLE_KEY instead
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
  || '';

if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    'DEPRECATION WARNING: NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY is deprecated. ' +
    'Rename to SUPABASE_SERVICE_ROLE_KEY in your .env file for security.'
  );
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase server credentials not configured. Check your .env file.');
}

// Create supabase client with service role key to bypass RLS
export const supabaseServer: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`
    }
  }
});

export { supabaseUrl, supabaseServiceKey };
