import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";

type Run = {
  id: string;
  role_key: string;
  status: string;
  cost_cents: number;
  created_at: string;
  output_text: string | null;
};

export function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ runs: Run[] }>("/api/runs").then((r) => setRuns(r.runs ?? []));
  }, []);

  return (
    <div>
      <h1 style={{ margin: "0 0 0.5rem", fontSize: 22 }}>Run history</h1>
      <p className="muted">All AI runs for your account.</p>
      <div className="glass" style={{ marginTop: 1 }}>
        {runs.map((run) => (
          <div key={run.id} style={{ borderBottom: "1px solid var(--panel-border)", padding: "0.55rem 0.75rem" }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between" }}
              onClick={() => setExpanded(expanded === run.id ? null : run.id)}
            >
              <span>
                <strong>{run.role_key}</strong> <span className="tag">{run.status}</span>
              </span>
              <span className="muted">{new Date(run.created_at).toLocaleString()}</span>
            </button>
            {expanded === run.id && run.output_text && (
              <div className="markdown-out" style={{ marginTop: 0.5 }}>{run.output_text}</div>
            )}
          </div>
        ))}
        {runs.length === 0 && <p className="muted" style={{ padding: "0.75rem" }}>No runs yet.</p>}
      </div>
    </div>
  );
}
