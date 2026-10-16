import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { deleteMyAccount } from "../lib/authApi";
import { apiGet } from "../lib/api";
import { useMe } from "../hooks/useMe";

type Profile = {
  username: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  display_name: string | null;
  headline: string | null;
  summary: string | null;
  skills: string[];
};

export function ProfilePage() {
  const { isAdmin, ready: meReady } = useMe();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [skillsText, setSkillsText] = useState("");
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    apiGet<{ profile: Profile }>("/api/me").then((r) => {
      const p = r.profile;
      if (!p) return;
      const skills = Array.isArray(p.skills) ? (p.skills as string[]) : [];
      setProfile({ ...p, skills });
      setSkillsText(skills.join(", "));
    });
  }, []);

  if (!profile) {
    return <p className="muted">Loading profile…</p>;
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const skills = skillsText.split(",").map((s) => s.trim()).filter(Boolean);
    await supabase
      .from("profiles")
      .update({
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone: profile.phone,
        display_name: profile.display_name,
        headline: profile.headline,
        summary: profile.summary,
        skills,
      })
      .eq("id", data.user.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function onDeleteAccount() {
    const typed = prompt(`Type your username "${profile.username}" to permanently delete your account:`);
    if (typed !== profile.username) return;
    if (!confirm("This cannot be undone. Delete account and all runs?")) return;
    setDeleting(true);
    try {
      await deleteMyAccount();
      window.location.href = "/login";
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
      setDeleting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Profile</h1>
      <p className="page-lead">
        Signed in as <strong>@{profile.username}</strong>
        {meReady && isAdmin ? (
          <span className="profile-admin-badge"> · Administrator</span>
        ) : meReady ? (
          <span className="muted"> · Standard account</span>
        ) : null}{" "}
        — career fields feed fit analysis when you do not upload a file.
      </p>
      <form onSubmit={save} className="glass" style={{ padding: "1.5rem", marginTop: "1.5rem", display: "grid", gap: "1rem", maxWidth: 720 }}>
        <label>
          <span className="label">Username</span>
          <input className="input" value={profile.username} disabled />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <label>
            <span className="label">First name</span>
            <input
              className="input"
              value={profile.first_name ?? ""}
              onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
            />
          </label>
          <label>
            <span className="label">Last name</span>
            <input
              className="input"
              value={profile.last_name ?? ""}
              onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
            />
          </label>
        </div>
        <label>
          <span className="label">Email (optional)</span>
          <input
            className="input"
            type="email"
            value={profile.email ?? ""}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
          />
        </label>
        <label>
          <span className="label">Phone (optional)</span>
          <input
            className="input"
            value={profile.phone ?? ""}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          />
        </label>
        <label>
          <span className="label">Display name</span>
          <input
            className="input"
            value={profile.display_name ?? ""}
            onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
          />
        </label>
        <label>
          <span className="label">Headline</span>
          <input className="input" value={profile.headline ?? ""} onChange={(e) => setProfile({ ...profile, headline: e.target.value })} />
        </label>
        <label>
          <span className="label">Summary</span>
          <textarea className="input" rows={5} value={profile.summary ?? ""} onChange={(e) => setProfile({ ...profile, summary: e.target.value })} />
        </label>
        <label>
          <span className="label">Skills (comma-separated)</span>
          <input className="input" value={skillsText} onChange={(e) => setSkillsText(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary" style={{ width: "fit-content" }}>
          {saved ? "Saved" : "Save profile"}
        </button>
      </form>

      <section className="glass" style={{ padding: "1.5rem", marginTop: "1.5rem", maxWidth: 720 }}>
        <h2 className="section-title">Delete account</h2>
        <p className="muted" style={{ marginTop: 0 }}>Removes your login only. Fit analysis and usage history stay for admin reporting.</p>
        <button type="button" className="btn btn-ghost" style={{ color: "var(--danger)" }} disabled={deleting} onClick={onDeleteAccount}>
          {deleting ? "Deleting…" : "Delete my account"}
        </button>
      </section>
    </div>
  );
}
