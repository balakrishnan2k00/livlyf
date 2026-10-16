import { Fragment, useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import { RunResults } from "../components/RunResults";

type UsageRow = {
  id: string;
  role_key: string;
  status: string;
  cost_cents: number;
  created_at: string;
  output_text: string | null;
  user: { username: string; display_name: string | null; login_removed: boolean };
};

export function AdminUsagePage() {
  const [runs, setRuns] = useState<UsageRow[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ runs: UsageRow[] }>("/api/admin/usage").then((r) => setRuns(r.runs));
  }, []);

  const totalCost = runs.reduce((s, r) => s + (r.cost_cents ?? 0), 0);

  return (
    <div>
      <h1 className="page-title">Admin — usage</h1>
      <p className="page-lead">
        All fit analyses across users ({runs.length} recent). Total recorded cost: ${(totalCost / 100).toFixed(2)}
      </p>

      <div className="glass" style={{ marginTop: "1.5rem", overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>When</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <Fragment key={run.id}>
                <tr>
                  <td>
                    @{run.user.username}
                    {run.user.login_removed && <span className="tag" style={{ marginLeft: 6 }}>login off</span>}
                  </td>
                  <td>{run.role_key}</td>
                  <td><span className="tag">{run.status}</span></td>
                  <td className="muted">{new Date(run.created_at).toLocaleString()}</td>
                  <td>
                    <button type="button" className="btn btn-ghost" onClick={() => setExpanded(expanded === run.id ? null : run.id)}>
                      {expanded === run.id ? "Hide" : "View"}
                    </button>
                  </td>
                </tr>
                {expanded === run.id && run.output_text && (
                  <tr>
                    <td colSpan={5} style={{ padding: "0 1rem 1rem" }}>
                      <RunResults output={run.output_text} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {runs.length === 0 && <p className="muted" style={{ padding: "1rem" }}>No usage yet.</p>}
      </div>
    </div>
  );
}
