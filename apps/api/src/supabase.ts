import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config.js";

let admin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    throw new Error(
      "Supabase API keys missing. Copy livlyf/.env.example → livlyf/.env and set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (Dashboard → Project Settings → API).",
    );
  }
  if (!admin) {
    admin = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

/** @deprecated use getSupabaseAdmin() */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    return Reflect.get(getSupabaseAdmin(), prop);
  },
});
