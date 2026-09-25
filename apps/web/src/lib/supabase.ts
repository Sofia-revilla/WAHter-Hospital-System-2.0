import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Supabase projects created after mid-2025 hand out a "publishable" key instead
// of the old anon key, so we accept either. No keys at all is a normal state
// for local dev. Callers get null and fall back to mock data.
//
// TODO(Phase 8): the master plan routes every call through Kong. Once the
// gateway is up, DataContext should read from there and this file can go.
function createSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return createClient(url, key);
}

export const supabase = createSupabaseClient();
