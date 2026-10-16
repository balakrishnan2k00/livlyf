import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type JD = { id: string; title: string; company: string | null; raw_text: string; created_at: string };

export function JobDescriptionsPage() {
  const [items, setItems] = useState<JD[]>([]);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [raw, setRaw] = useState("");

  async function load() {
    const { data } = await supabase.from("job_descriptions").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("job_descriptions").insert({
      user_id: u.user.id,
      title,
      company: company || null,
      raw_text: raw,
    });
    setTitle("");
    setCompany("");
    setRaw("");
    load();
  }

  return (
    <div>
      <h1 className="page-title">Job descriptions</h1>
      <p className="page-lead">Store JDs to pair with your profile in AI Studio.</p>

      <form onSubmit={add} className="glass" style={{ padding: "1.5rem", margin: "1.5rem 0", display: "grid", gap: "1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.5 }}>
          <label>
            <span className="label">Title</span>
            <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            <span className="label">Company</span>
            <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} />
          </label>
        </div>
        <label>
          <span className="label">Full JD text</span>
          <textarea className="input" rows={6} required value={raw} onChange={(e) => setRaw(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary" style={{ width: "fit-content" }}>Add JD</button>
      </form>

      <div className="grid-roles">
        {items.map((jd) => (
          <article key={jd.id} className="glass card-role">
            <h3>{jd.title}</h3>
            <p>{jd.company ?? "—"}</p>
            <p className="muted" style={{ marginTop: 0.35, maxHeight: 72, overflow: "hidden" }}>{jd.raw_text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
