import { useCallback, useEffect, useState } from "react";
import { apiDelete, apiGet } from "../lib/api";
import { RunResults } from "../components/RunResults";

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
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(() => {
    apiGet<{ runs: Run[] }>("/api/runs").then((r) => setRuns(r.runs ?? []));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string) {
    if (!confirm("Delete this run permanently?")) return;
    setDeleting(id);
    try {
      await apiDelete(`/api/runs/${id}`);
      setRuns((prev) => prev.filter((r) => r.id !== id));
      if (expanded === id) setExpanded(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <h1 className="page-title">Run history</h1>
      <p className="page-lead">Open a run to see the full fit report, or delete entries you no longer need.</p>
      <div className="glass" style={{ marginTop: "1.5rem" }}>
        {runs.map((run) => (
          <div key={run.id} className="history-row">
            <button
              type="button"
              className="history-row__main btn btn-ghost"
              onClick={() => setExpanded(expanded === run.id ? null : run.id)}
            >
              <span>
                <strong>{run.role_key.replace(/_/g, " ")}</strong> <span className="tag">{run.status}</span>
              </span>
              <span className="muted">{new Date(run.created_at).toLocaleString()}</span>
            </button>
            <button
              type="button"
              className="btn btn-ghost history-row__delete"
              disabled={deleting === run.id}
              onClick={() => remove(run.id)}
            >
              {deleting === run.id ? "…" : "Delete"}
            </button>
            {expanded === run.id && run.output_text && (
              <div style={{ padding: "0 1rem 1.25rem" }}>
                <RunResults output={run.output_text} />
              </div>
            )}
          </div>
        ))}
        {runs.length === 0 && <p className="muted" style={{ padding: "1.25rem" }}>No runs yet — start in Fit analysis.</p>}
      </div>
    </div>
  );
}
