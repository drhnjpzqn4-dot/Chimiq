import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error(
    "VITE_SUPABASE_URL och VITE_SUPABASE_ANON_KEY måste sättas (Supabase → Settings → API).",
  );
}

/**
 * Browser / Capacitor WebView — session i localStorage, hash-tokens (lösenordsåterställning m.m.).
 */
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
