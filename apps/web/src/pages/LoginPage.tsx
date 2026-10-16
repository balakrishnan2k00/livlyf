import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && session) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        setError("Check your email to confirm, then sign in.");
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 1.5 }}>
      <div className="glass" style={{ width: "min(400px, 100%)", padding: "1.25rem 1.35rem" }}>
        <img src="/livlyf-logo.svg" alt="Livlyf" width={160} height={40} />
        <p className="muted" style={{ marginTop: 0.35 }}>Sign in to run role-aware AI on your profile and JDs.</p>
        {!supabaseConfigured && (
          <p style={{ color: "var(--danger)", fontSize: 12, margin: "0.5rem 0 0" }}>
            Supabase env missing. Copy <code>livlyf/.env.example</code> → <code>livlyf/.env</code>, set{" "}
            <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then restart <code>npm run dev</code>.
          </p>
        )}
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 0.65, marginTop: 1 }}>
          <label>
            <span className="label">Email</span>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            <span className="label">Password</span>
            <input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p style={{ color: "var(--danger)", margin: 0, fontSize: 12 }}>{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ width: "100%", marginTop: 0.65 }}
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
