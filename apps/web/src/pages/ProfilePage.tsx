import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Profile = {
  display_name: string | null;
  headline: string | null;
  summary: string | null;
  skills: string[];
};

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({
    display_name: "",
    headline: "",
    summary: "",
    skills: [],
  });
  const [skillsText, setSkillsText] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
      if (p) {
        const skills = Array.isArray(p.skills) ? (p.skills as string[]) : [];
        setProfile({
          display_name: p.display_name,
          headline: p.headline,
          summary: p.summary,
          skills,
        });
        setSkillsText(skills.join(", "));
      }
    });
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const skills = skillsText.split(",").map((s) => s.trim()).filter(Boolean);
    await supabase
      .from("profiles")
      .update({
        display_name: profile.display_name,
        headline: profile.headline,
        summary: profile.summary,
        skills,
      })
      .eq("id", data.user.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <h1 style={{ margin: "0 0 0.5rem", fontSize: 22 }}>Profile</h1>
      <p className="muted">Paste or refine your profile — AI runs use this as context.</p>
      <form onSubmit={save} className="glass" style={{ padding: 1, marginTop: 1, display: "grid", gap: 0.65, maxWidth: 640 }}>
        <label>
          <span className="label">Display name</span>
          <input className="input" value={profile.display_name ?? ""} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} />
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
    </div>
  );
}
