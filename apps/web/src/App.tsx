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

function Private({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="main muted">Loading…</div>;
  if (!session) return <Navigate to="/login" replace />;
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
              </Routes>
            </Shell>
          </Private>
        }
      />
    </Routes>
  );
}
