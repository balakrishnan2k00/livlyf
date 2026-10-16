import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/studio", label: "AI Studio" },
  { to: "/profile", label: "Profile" },
  { to: "/jobs", label: "Job descriptions" },
  { to: "/prompts", label: "Custom prompts" },
  { to: "/runs", label: "History" },
];

export function Shell({ children }: { children: ReactNode }) {
  const { session, signOut } = useAuth();
  return (
    <div className="layout">
      <aside className="sidebar glass" style={{ borderRadius: 0, boxShadow: "none" }}>
        <img src="/livlyf-logo.svg" alt="Livlyf" width={140} height={36} style={{ marginBottom: 0.5 }} />
        <p className="muted" style={{ margin: "0 0 0.75rem", fontSize: 11 }}>
          Live your career story
        </p>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === "/"} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ fontSize: 11, marginTop: "auto" }}>
          <div className="muted" style={{ marginBottom: 0.35 }}>{session?.user.email}</div>
          <button type="button" className="btn btn-ghost" onClick={() => signOut()}>Sign out</button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
