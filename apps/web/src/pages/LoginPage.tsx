import { FormEvent, lazy, Suspense, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabaseConfigured } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import { loginWithIdentifier, signUpAccount } from "../lib/authApi";

const Scene3D = lazy(() => import("../components/Scene3D").then((m) => ({ default: m.Scene3D })));

const SITE_ABOUT =
  "Livlyf is your pay-per-use AI career workspace — build a sharp profile, upload job descriptions, get fit scores and insights, and run role-aware prompts when you need them.";

export function LoginPage() {
  const { theme } = useTheme();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && session) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const res = await signUpAccount({
          username,
          password,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          email: email || undefined,
          phone: phone || undefined,
        });
        if (res.message && !res.access_token) setInfo(res.message);
      } else {
        await loginWithIdentifier(identifier, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <Suspense fallback={null}>
        <Scene3D className="login-page__canvas" theme={theme} />
      </Suspense>

      <header className="login-page__header">
        <Logo className="logo--lg" />
      </header>

      <div className="login-page__theme">
        <ThemeToggle />
      </div>

      <div className="login-page__layout">
        <div className="login-page__panel">
        <div className="login-card glass">
          <h1 className="login-card__title">{mode === "signin" ? "Welcome back" : "Create account"}</h1>
          <p className="login-card__about">{SITE_ABOUT}</p>

          {!supabaseConfigured && (
            <p className="login-card__warn">
              Supabase env missing — set <code>VITE_SUPABASE_*</code> and API <code>SUPABASE_ANON_KEY</code>.
            </p>
          )}

          <form className="login-card__form" onSubmit={onSubmit}>
            {mode === "signin" ? (
              <label>
                <span className="label">Username or email</span>
                <input
                  className="input"
                  required
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="jane_doe or jane@company.com"
                />
              </label>
            ) : (
              <>
                <label>
                  <span className="label">Username *</span>
                  <input
                    className="input"
                    required
                    minLength={3}
                    maxLength={24}
                    pattern="[a-zA-Z0-9_]+"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="letters, numbers, underscore"
                  />
                </label>
                <div className="login-card__name-row">
                  <label>
                    <span className="label">First name (optional)</span>
                    <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </label>
                  <label>
                    <span className="label">Last name (optional)</span>
                    <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </label>
                </div>
                <label>
                  <span className="label">Email (optional)</span>
                  <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
                <label>
                  <span className="label">Phone (optional)</span>
                  <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </label>
              </>
            )}
            <label>
              <span className="label">Password *</span>
              <input
                className="input"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && <p className="login-card__error">{error}</p>}
            {info && <p className="login-card__info">{info}</p>}
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            type="button"
            className="btn btn-ghost login-card__switch"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setInfo(null);
            }}
          >
            {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
