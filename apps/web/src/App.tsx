import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
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
import { useMe } from "./hooks/useMe";

function Private({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="main muted">Loading…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin, ready } = useMe();
  if (!ready) return <div className="main muted">Loading…</div>;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <Private>
            <Shell>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/jobs" element={<JobDescriptionsPage />} />
                <Route path="/studio" element={<StudioPage />} />
                <Route path="/prompts" element={<PromptsPage />} />
                <Route path="/runs" element={<RunsPage />} />
                <Route path="/admin/users" element={<AdminOnly><AdminUsersPage /></AdminOnly>} />
                <Route path="/admin/usage" element={<AdminOnly><AdminUsagePage /></AdminOnly>} />
              </Routes>
            </Shell>
          </Private>
        }
      />
    </Routes>
  );
}
