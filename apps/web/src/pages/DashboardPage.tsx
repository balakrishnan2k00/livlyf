import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { apiGet } from "../lib/api";
import { useTheme } from "../hooks/useTheme";

const Scene3D = lazy(() => import("../components/Scene3D").then((m) => ({ default: m.Scene3D })));

type Role = { key: string; label: string; description: string };
type Run = { id: string; role_key: string; status: string; created_at: string };

export function DashboardPage() {
  const { theme } = useTheme();
  const [roles, setRoles] = useState<Role[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.from("role_definitions").select("key, label, description").order("sort_order").then(({ data }) => {
      setRoles(data ?? []);
    });
    apiGet<{ runs: Run[] }>("/api/runs").then((r) => setRuns(r.runs ?? [])).catch(() => {});
    apiGet<{ isAdmin: boolean }>("/api/me").then((m) => setIsAdmin(m.isAdmin)).catch(() => {});
  }, []);

  return (
    <div>
      <section className="hero-3d">
        <Suspense fallback={null}>
          <Scene3D className="hero-3d__canvas" theme={theme} />
        </Suspense>
        <div className="hero-3d__copy">
          <h2>Your career command center</h2>
          <p className="muted" style={{ margin: 0, fontSize: "1rem" }}>
            Profiles, job descriptions, and role-aware AI — in one calm workspace.
          </p>
        </div>
      </section>

      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "2rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-lead">
            Pick a role lens, run AI on your materials, and track results.
            {isAdmin && <span className="tag" style={{ marginLeft: 10 }}>Admin — free runs</span>}
          </p>
        </div>
        <Link to="/studio" className="btn btn-primary">New fit analysis</Link>
      </header>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2 className="section-title">Role lenses</h2>
        <div className="grid-roles">
          {roles.map((r) => (
            <Link key={r.key} to={`/studio?role=${r.key}`} className="glass card-role">
              <h3>{r.label}</h3>
              <p>{r.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title">Recent runs</h2>
        <div className="glass" style={{ overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Status</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 && (
                <tr>
                  <td colSpan={3} className="muted">No runs yet — open AI Studio to get started.</td>
                </tr>
              )}
              {runs.map((run) => (
                <tr key={run.id}>
                  <td style={{ fontWeight: 600 }}>{run.role_key.replace(/_/g, " ")}</td>
                  <td><span className="tag">{run.status}</span></td>
                  <td className="muted">{new Date(run.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link to="/runs" className="muted" style={{ fontSize: "0.9rem", display: "inline-block", marginTop: "0.75rem" }}>
          View all history →
        </Link>
      </section>
    </div>
  );
}
