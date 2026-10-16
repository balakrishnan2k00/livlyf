import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Role = { key: string; label: string };
type UserPrompt = { id: string; role_key: string; name: string; system_prompt: string; user_prompt_template: string };

export function PromptsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [mine, setMine] = useState<UserPrompt[]>([]);
  const [roleKey, setRoleKey] = useState("");
  const [name, setName] = useState("Custom");
  const [system, setSystem] = useState("You are Livlyf. Be concise and structured in markdown.");
  const [userTpl, setUserTpl] = useState("Goal: {{goal}}\n\nProfile:\n{{profile}}\n\nJD:\n{{jd}}");

  useEffect(() => {
    supabase.from("role_definitions").select("key, label").order("sort_order").then(({ data }) => {
      setRoles(data ?? []);
      if (data?.[0]) setRoleKey(data[0].key);
    });
    supabase.from("user_prompts").select("*").then(({ data }) => setMine(data ?? []));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("user_prompts").upsert({
      user_id: u.user.id,
      role_key: roleKey,
      name,
      system_prompt: system,
      user_prompt_template: userTpl,
    });
    const { data } = await supabase.from("user_prompts").select("*");
    setMine(data ?? []);
  }

  return (
    <div>
      <h1 className="page-title">Custom prompts</h1>
      <p className="page-lead">
        Override defaults per role. Use placeholders: <code>{"{{profile}}"}</code>, <code>{"{{jd}}"}</code>,{" "}
        <code>{"{{goal}}"}</code>.
      </p>

      <form onSubmit={save} className="glass" style={{ padding: "1.5rem", marginTop: "1.5rem", display: "grid", gap: "1rem", maxWidth: 720 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.5 }}>
          <label>
            <span className="label">Role</span>
            <select className="input" value={roleKey} onChange={(e) => setRoleKey(e.target.value)}>
              {roles.map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        </div>
        <label>
          <span className="label">System prompt</span>
          <textarea className="input" rows={3} value={system} onChange={(e) => setSystem(e.target.value)} />
        </label>
        <label>
          <span className="label">User template</span>
          <textarea className="input" rows={5} value={userTpl} onChange={(e) => setUserTpl(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary" style={{ width: "fit-content" }}>Save prompt</button>
      </form>

      <h2 className="section-title" style={{ marginTop: "2rem" }}>Your prompts</h2>
      <div className="grid-roles">
        {mine.map((p) => (
          <div key={p.id} className="glass card-role">
            <h3>{p.name}</h3>
            <p><span className="tag">{p.role_key}</span></p>
          </div>
        ))}
      </div>
    </div>
  );
}
