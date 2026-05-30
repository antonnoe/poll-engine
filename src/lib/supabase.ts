import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Anon-client: leest uitsluitend OPEN polls/vragen (RLS-afgedwongen).
// Bruikbaar in server components voor publieke rendering.
export function anonClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY ontbreken.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// Service-role client: server-only. Omzeilt RLS bewust voor vote/results/export/admin.
// Mag NOOIT in client-bundels belanden — gebruik alleen in route handlers / server code.
export function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ontbreken.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
