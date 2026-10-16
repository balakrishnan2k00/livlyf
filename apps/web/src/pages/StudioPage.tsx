import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { supabase } from "../lib/supabase";
import { apiGet, apiPost } from "../lib/api";
import { FileDropzone } from "../components/FileDropzone";
import { RunResults } from "../components/RunResults";

const stripePk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

export function StudioPage() {
  const [params] = useSearchParams();
  const [roleKey] = useState(params.get("role") ?? "job_seeker");
  const [jdText, setJdText] = useState("");
  const [profileText, setProfileText] = useState("");
  const [goal, setGoal] = useState("Score fit and produce a hiring-ready brief");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    apiGet<{ isAdmin: boolean }>("/api/me").then((m) => setIsAdmin(m.isAdmin)).catch(() => {});
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
      if (!p) return;
      const skills = Array.isArray(p.skills) ? (p.skills as string[]).join(", ") : "";
      const block = [
        p.display_name && `Name: ${p.display_name}`,
        p.headline && `Headline: ${p.headline}`,
        p.summary && `Summary: ${p.summary}`,
        skills && `Skills: ${skills}`,
      ]
        .filter(Boolean)
        .join("\n");
      if (block) setProfileText((prev) => (prev.trim() ? prev : block));
    });
  }, []);

  async function run(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOutput("");
    if (jdText.trim().length < 40) {
      setError("Add a job description (paste or upload, at least ~40 characters).");
      return;
    }
    if (profileText.trim().length < 40) {
      setError("Add a candidate profile (paste or upload .txt / .pdf / .docx).");
      return;
    }
    setBusy(true);
    try {
      const body = {
        roleKey,
        goal,
        jdText: jdText.trim(),
        profileText: profileText.trim(),
        fitAnalysis: true,
      };
      const res = await apiPost<{
        runId: string;
        status: string;
        clientSecret?: string;
        output?: string;
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

  return (
    <div>
      <h1 className="page-title">Fit analysis</h1>
      <p className="page-lead">
        Upload or paste a <strong>job description</strong> and <strong>candidate profile</strong> (TXT, PDF, or Word).
        Livlyf returns scores, skills match, gaps, and a candidate-style summary.
        {isAdmin ? " Admin — free runs." : ""}
      </p>

      <div className="studio-layout">
        <form onSubmit={run} className="glass studio-form">
          <FileDropzone
            label="Job description"
            hint="Role requirements, responsibilities, must-haves"
            value={jdText}
            onText={setJdText}
          />
          <FileDropzone
            label="Candidate profile"
            hint="Resume, LinkedIn export, or bio"
            value={profileText}
            onText={setProfileText}
          />
          <label>
            <span className="label">Goal (optional)</span>
            <input className="input" value={goal} onChange={(e) => setGoal(e.target.value)} />
          </label>
          {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Analyzing…" : "Run fit analysis"}
          </button>
        </form>

        <div className="studio-results">
          {output ? (
            <RunResults output={output} />
          ) : (
            <div className="glass studio-placeholder">
              <h3 className="section-title">Results preview</h3>
              <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
                You will see an overall fit score, category bar chart, candidate card, skills map (matched / missing),
                strengths, gaps, and interview focus areas.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
