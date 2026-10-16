import type { CSSProperties } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { parseFitAnalysis } from "../lib/parseRunOutput";

export function RunResults({ output }: { output: string }) {
  const fit = parseFitAnalysis(output);

  if (!fit) {
    return (
      <div className="glass" style={{ padding: "1.25rem" }}>
        <h3 className="section-title">Analysis output</h3>
        <div className="markdown-out" style={{ maxHeight: "none" }}>{output}</div>
      </div>
    );
  }

  const chartData = fit.categoryScores.map((c) => ({ name: c.label, score: c.score }));

  return (
    <div className="results-grid">
      <article className="glass candidate-card">
        <div className="score-ring" style={{ "--score": fit.overallScore } as CSSProperties}>
          <span className="score-ring__value">{fit.overallScore}</span>
          <span className="score-ring__label">Fit score</span>
        </div>
        <div>
          <h3 className="candidate-card__name">{fit.candidate.name || "Candidate"}</h3>
          <p className="candidate-card__headline">{fit.candidate.headline}</p>
          <p className="muted" style={{ margin: "0.5rem 0" }}>
            <strong>{fit.role.title}</strong>
            {fit.role.company ? ` · ${fit.role.company}` : ""}
          </p>
          <p style={{ margin: "0.75rem 0" }}>{fit.summary}</p>
          <p className="tag" style={{ display: "inline-block" }}>{fit.recommendation}</p>
          <div className="skill-chips">
            {fit.candidate.topSkills.slice(0, 8).map((s) => (
              <span key={s} className="skill-chip">{s}</span>
            ))}
          </div>
        </div>
      </article>

      <article className="glass" style={{ padding: "1.25rem" }}>
        <h3 className="section-title">Category scores</h3>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--panel-border)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "var(--panel)", border: "1px solid var(--panel-border)", borderRadius: 8 }}
              />
              <Bar dataKey="score" fill="var(--accent)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="glass skills-panel">
        <h3 className="section-title">Skills map</h3>
        <SkillGroup title="Matched" items={fit.skills.matched} tone="match" />
        <SkillGroup title="Partial" items={fit.skills.partial} tone="partial" />
        <SkillGroup title="Missing" items={fit.skills.missing} tone="miss" />
        <SkillGroup title="Transferable" items={fit.skills.transferable} tone="transfer" />
      </article>

      <article className="glass" style={{ padding: "1.25rem" }}>
        <h3 className="section-title">Strengths & gaps</h3>
        <div className="two-col">
          <div>
            <h4 className="muted" style={{ margin: "0 0 0.5rem" }}>Strengths</h4>
            <ul className="bullet-list">{fit.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
          <div>
            <h4 className="muted" style={{ margin: "0 0 0.5rem" }}>Gaps</h4>
            <ul className="bullet-list">{fit.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
          </div>
        </div>
        <h4 className="muted" style={{ margin: "1rem 0 0.5rem" }}>Interview focus</h4>
        <ul className="bullet-list">{fit.interviewFocus.map((q) => <li key={q}>{q}</li>)}</ul>
      </article>
    </div>
  );
}

function SkillGroup({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "match" | "partial" | "miss" | "transfer";
}) {
  if (!items.length) return null;
  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <h4 className={`skill-group-title skill-group-title--${tone}`}>{title}</h4>
      <div className="skill-chips">
        {items.map((s) => (
          <span key={s} className={`skill-chip skill-chip--${tone}`}>{s}</span>
        ))}
      </div>
    </div>
  );
}
