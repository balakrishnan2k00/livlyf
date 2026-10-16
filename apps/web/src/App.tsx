import type { ReactNode } from "react";
import { Link, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { MeProvider, useMe } from "./hooks/MeProvider";
import { Shell } from "./components/Shell";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProfilePage } from "./pages/ProfilePage";
import { JobDescriptionsPage } from "./pages/JobDescriptionsPage";
import { StudioPage } from "./pages/StudioPage";
import { PromptsPage } from "./pages/PromptsPage";
import { RunsPage } from "./pages/RunsPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { AdminUsagePage } from "./pages/AdminUsagePage";
function RequireAuth() {
  const { session, loading } = useAuth();
  if (loading) return <div className="main muted">Loading…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin, ready, profile } = useMe();
  if (!ready) return <div className="main muted">Checking admin access…</div>;
  if (!isAdmin) {
    return (
      <div className="glass" style={{ padding: "1.5rem", maxWidth: 520 }}>
        <h1 className="page-title">Admin access required</h1>
        <p className="page-lead" style={{ marginTop: "0.75rem" }}>
          {profile?.username
            ? `Signed in as @${profile.username}. This account is not an administrator yet.`
            : "Your account is not an administrator yet."}
        </p>
        <p className="muted" style={{ fontSize: "0.9rem", lineHeight: 1.55 }}>
          In Supabase → <code>profiles</code>, set <code>is_admin</code> to true for your row, or add your username or
          email to <code>LIVLYF_ADMIN_EMAILS</code> in <code>livlyf/.env</code> on the API, then sign out and sign in
          again.
        </p>
        <Link to="/profile" className="btn btn-primary" style={{ marginTop: "1.25rem", display: "inline-block" }}>
          Back to profile
        </Link>
      </div>
    );
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<MeProvider />}>
          <Route element={<Shell />}>
          <Route index element={<DashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="jobs" element={<JobDescriptionsPage />} />
          <Route path="studio" element={<StudioPage />} />
          <Route path="prompts" element={<PromptsPage />} />
          <Route path="runs" element={<RunsPage />} />
          <Route
            path="admin/users"
            element={
              <AdminOnly>
                <AdminUsersPage />
              </AdminOnly>
            }
          />
          <Route
            path="admin/usage"
            element={
              <AdminOnly>
                <AdminUsagePage />
              </AdminOnly>
            }
          />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
