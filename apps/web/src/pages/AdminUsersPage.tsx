import { FormEvent, useEffect, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "../lib/api";

type UserRow = {
  id: string;
  username: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  is_admin: boolean;
  login_removed: boolean;
  hasLogin: boolean;
  created_at: string;
};

export function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [form, setForm] = useState({
    username: "",
    password: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    isAdmin: false,
  });
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiGet<{ users: UserRow[] }>("/api/admin/users").then((r) => setUsers(r.users));
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiPost("/api/admin/users", {
        username: form.username,
        password: form.password,
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        isAdmin: form.isAdmin,
      });
      setForm({ username: "", password: "", firstName: "", lastName: "", email: "", phone: "", isAdmin: false });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function saveUser(u: UserRow) {
    await apiPatch(`/api/admin/users/${u.id}`, {
      username: u.username,
      isAdmin: u.is_admin,
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      phone: u.phone,
    });
    load();
  }

  async function removeLogin(id: string) {
    if (!confirm("Remove login for this user? Usage history will stay.")) return;
    await apiDelete(`/api/admin/users/${id}/login`);
    load();
  }

  return (
    <div>
      <h1 className="page-title">Admin — users</h1>
      <p className="page-lead">Add users, edit usernames and admin flag, remove login without deleting usage data.</p>

      <form onSubmit={create} className="glass" style={{ padding: "1.25rem", marginTop: "1.5rem", display: "grid", gap: "0.75rem", maxWidth: 720 }}>
        <h2 className="section-title">Add user</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <label>
            <span className="label">Username *</span>
            <input className="input" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </label>
          <label>
            <span className="label">Password *</span>
            <input className="input" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
        </div>
        <label>
          <input type="checkbox" checked={form.isAdmin} onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })} />
          <span className="label" style={{ display: "inline", marginLeft: 8 }}>Admin</span>
        </label>
        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
        <button type="submit" className="btn btn-primary" style={{ width: "fit-content" }}>Create user</button>
      </form>

      <div className="glass" style={{ marginTop: "1.5rem", overflow: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Login</th>
              <th>Admin</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <input
                    className="input"
                    style={{ minWidth: 140 }}
                    value={u.username}
                    onChange={(e) =>
                      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, username: e.target.value } : x)))
                    }
                  />
                </td>
                <td>{u.hasLogin ? <span className="tag">Active</span> : <span className="muted">Removed</span>}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={u.is_admin}
                    onChange={(e) =>
                      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, is_admin: e.target.checked } : x)))
                    }
                  />
                </td>
                <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="btn btn-ghost" onClick={() => saveUser(users.find((x) => x.id === u.id)!)}>Save</button>
                  {u.hasLogin && (
                    <button type="button" className="btn btn-ghost" style={{ color: "var(--danger)" }} onClick={() => removeLogin(u.id)}>
                      Remove login
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
