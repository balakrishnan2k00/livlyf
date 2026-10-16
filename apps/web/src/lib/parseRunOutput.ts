export type FitAnalysis = {
  candidate: { name: string; headline: string; topSkills: string[] };
  role: { title: string; company: string };
  overallScore: number;
  categoryScores: { label: string; score: number }[];
  summary: string;
  skills: {
    matched: string[];
    partial: string[];
    missing: string[];
    transferable: string[];
  };
  strengths: string[];
  gaps: string[];
  recommendation: string;
  interviewFocus: string[];
};

export function parseFitAnalysis(raw: string): FitAnalysis | null {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as FitAnalysis;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as FitAnalysis;
    } catch {
      return null;
    }
  }
}
