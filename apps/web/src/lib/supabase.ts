import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

export const supabaseConfigured = Boolean(url && anon);

if (!supabaseConfigured) {
  console.warn(
    "[Livlyf] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add them to livlyf/.env and restart npm run dev.",
  );
}

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anon || "placeholder-anon-key",
);
