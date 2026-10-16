import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { supabase } from "../lib/supabase";
import { apiGet, apiPost } from "../lib/api";

type Role = { key: string; label: string };
type JD = { id: string; title: string };
type UserPrompt = { id: string; name: string; role_key: string };

const stripePk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

export function StudioPage() {
  const [params] = useSearchParams();
  const [roles, setRoles] = useState<Role[]>([]);
  const [jds, setJds] = useState<JD[]>([]);
  const [prompts, setPrompts] = useState<UserPrompt[]>([]);
  const [roleKey, setRoleKey] = useState(params.get("role") ?? "job_seeker");
  const [jdId, setJdId] = useState("");
  const [userPromptId, setUserPromptId] = useState("");
  const [goal, setGoal] = useState("Maximize fit for this role");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.from("role_definitions").select("key, label").order("sort_order").then(({ data }) => setRoles(data ?? []));
    supabase.from("job_descriptions").select("id, title").then(({ data }) => setJds(data ?? []));
    supabase.from("user_prompts").select("id, name, role_key").then(({ data }) => setPrompts(data ?? []));
    apiGet<{ isAdmin: boolean }>("/api/me").then((m) => setIsAdmin(m.isAdmin)).catch(() => {});
  }, []);

  async function run(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOutput("");
    setBusy(true);
    try {
      const body = {
        roleKey,
        goal,
        jobDescriptionId: jdId || undefined,
        userPromptId: userPromptId || undefined,
      };
      const res = await apiPost<{
        runId: string;
        status: string;
        clientSecret?: string;
        output?: string;
        amountCents?: number;
      }>("/api/runs", body);

      if (res.output) {
        setOutput(res.output);
        return;
      }

      if (res.clientSecret && stripePk) {
        const stripe = await loadStripe(stripePk);
        if (!stripe) throw new Error("Stripe failed to load");
        const { error: payErr } = await stripe.confirmPayment({
          clientSecret: res.clientSecret,
          confirmParams: { return_url: window.location.href },
          redirect: "if_required",
        });
        if (payErr) throw new Error(payErr.message);
        const done = await apiPost<{ output?: string }>("/api/runs/confirm", { runId: res.runId });
        setOutput(done.output ?? "");
      } else if (!isAdmin) {
        throw new Error("Payment not configured (VITE_STRIPE_PUBLISHABLE_KEY)");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run failed");
    } finally {
      setBusy(false);
    }
  }

  const filteredPrompts = prompts.filter((p) => p.role_key === roleKey);

  return (
    <div>
      <h1 style={{ margin: "0 0 0.5rem", fontSize: 22 }}>AI Studio</h1>
      <p className="muted">
        Pay-per-use AI run {isAdmin ? "(admin — free)" : "— card charged per run"}.
      </p>

      <form onSubmit={run} className="glass" style={{ padding: 1, marginTop: 1, display: "grid", gap: 0.5, maxWidth: 720 }}>
        <label>
          <span className="label">Role</span>
          <select className="input" value={roleKey} onChange={(e) => setRoleKey(e.target.value)}>
            {roles.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Job description (optional)</span>
          <select className="input" value={jdId} onChange={(e) => setJdId(e.target.value)}>
            <option value="">— None —</option>
            {jds.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Custom prompt (optional)</span>
          <select className="input" value={userPromptId} onChange={(e) => setUserPromptId(e.target.value)}>
            <option value="">Default Livlyf prompt</option>
            {filteredPrompts.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Goal</span>
          <input className="input" value={goal} onChange={(e) => setGoal(e.target.value)} />
        </label>
        {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: "fit-content" }}>
          {busy ? "Running…" : "Run Livlyf AI"}
        </button>
      </form>

      {output && (
        <section style={{ marginTop: 1 }}>
          <h2 style={{ fontSize: 14 }}>Output</h2>
          <div className="markdown-out">{output}</div>
        </section>
      )}
    </div>
  );
}
