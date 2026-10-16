import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useMe } from "../hooks/useMe";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/studio", label: "Fit analysis" },
  { to: "/profile", label: "Profile" },
  { to: "/jobs", label: "Saved JDs" },
  { to: "/prompts", label: "Prompts" },
  { to: "/runs", label: "History" },
];

const adminLinks = [
  { to: "/admin/users", label: "Admin users" },
  { to: "/admin/usage", label: "Admin usage" },
];

export function Shell() {
  const { signOut } = useAuth();
  const { isAdmin, profile, ready } = useMe();
  const [menuOpen, setMenuOpen] = useState(false);
  const handle = profile?.username ? `@${profile.username}` : ready ? "" : "…";

  const navLinks = (
    <>
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === "/"}
          className={({ isActive }) => `topnav__link${isActive ? " active" : ""}`}
          onClick={() => setMenuOpen(false)}
        >
          {l.label}
        </NavLink>
      ))}
      {isAdmin &&
        adminLinks.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) => `topnav__link topnav__link--admin${isActive ? " active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            {l.label}
          </NavLink>
        ))}
    </>
  );

  return (
    <div className="app-shell">
      <header className="topnav glass">
        <div className="topnav__inner">
          <div className="topnav__brand">
            <Logo />
          </div>
          <div className="topnav__right">
            <button
              type="button"
              className="topnav__menu-btn btn btn-ghost topnav__btn"
              aria-expanded={menuOpen}
              aria-label="Toggle navigation"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
            <nav className={`topnav__links${menuOpen ? " topnav__links--open" : ""}`}>{navLinks}</nav>
            <div className="topnav__actions">
              <ThemeToggle />
              <span className="topnav__email muted">{handle}</span>
              <button type="button" className="btn btn-ghost topnav__btn" onClick={() => signOut()}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="main main--wide">
        <Outlet />
      </main>
    </div>
  );
}
