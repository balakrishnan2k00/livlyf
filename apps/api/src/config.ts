import "./loadEnv.js";

export const config = {
  port: Number(process.env.PORT ?? 3001),
  corsOrigin: process.env.CORS_ORIGIN ?? process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "",
  azure: {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT ?? "",
    apiKey: process.env.AZURE_OPENAI_API_KEY ?? "",
    apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21",
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-6-luna",
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    pricePerRunCents: Number(process.env.STRIPE_PRICE_PER_RUN_CENTS ?? 99),
  },
  /** Comma-separated usernames and/or emails (see LIVLYF_ADMIN_EMAILS). */
  adminEmails: (process.env.LIVLYF_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
};

export function isAdminEmail(email: string): boolean {
  return config.adminEmails.includes(email.toLowerCase());
}

export function validateConfig(): void {
  const missing = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((k) => !process.env[k]?.trim());
  const anon = process.env.SUPABASE_ANON_KEY?.trim() || process.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!anon) {
    console.warn("SUPABASE_ANON_KEY missing — username login/signup API will not work.");
  }
  if (missing.length) {
    throw new Error(
      `Missing env in livlyf/.env: ${missing.join(", ")}. Get keys from Supabase → Project LivLyf → Settings → API (service_role is secret).`,
    );
  }
}
