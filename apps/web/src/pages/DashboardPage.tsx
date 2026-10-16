import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { apiGet } from "../lib/api";

type Role = { key: string; label: string; description: string };
type Run = { id: string; role_key: string; status: string; created_at: string };

export function DashboardPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.from("role_definitions").select("key, label, description").order("sort_order").then(({ data }) => {
      setRoles(data ?? []);
    });
    apiGet<{ runs: Run[]; isAdmin?: boolean }>("/api/runs").then((r) => setRuns(r.runs ?? [])).catch(() => {});
    apiGet<{ isAdmin: boolean }>("/api/me").then((m) => setIsAdmin(m.isAdmin)).catch(() => {});
  }, []);

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 1 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Dashboard</h1>
          <p className="muted" style={{ margin: "0.25rem 0 0" }}>
            Compact view of roles, recent runs, and quick actions.
            {isAdmin && <span className="tag" style={{ marginLeft: 8 }}>Admin — free runs</span>}
          </p>
        </div>
        <Link to="/studio" className="btn btn-primary">New AI run</Link>
      </header>

      <section style={{ marginBottom: 1.25 }}>
        <h2 style={{ fontSize: 14, margin: "0 0 0.5rem" }}>Roles</h2>
        <div className="grid-dense">
          {roles.map((r) => (
            <Link key={r.key} to={`/studio?role=${r.key}`} className="glass card-compact" style={{ color: "inherit" }}>
              <h3>{r.label}</h3>
              <p>{r.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 14, margin: "0 0 0.5rem" }}>Recent runs</h2>
        <div className="glass" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr className="muted" style={{ textAlign: "left" }}>
                <th style={{ padding: "0.5rem 0.75rem" }}>Role</th>
                <th>Status</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: "0.75rem", color: "var(--muted)" }}>No runs yet — open AI Studio.</td>
                </tr>
              )}
              {runs.map((run) => (
                <tr key={run.id} style={{ borderTop: "1px solid var(--panel-border)" }}>
                  <td style={{ padding: "0.45rem 0.75rem" }}>{run.role_key}</td>
                  <td><span className="tag">{run.status}</span></td>
                  <td className="muted">{new Date(run.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link to="/runs" className="muted" style={{ fontSize: 11, display: "inline-block", marginTop: 0.5 }}>View all history →</Link>
      </section>
    </div>
  );
}
