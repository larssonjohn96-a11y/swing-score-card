/**
 * Generisk motor för SG4:s träningstester (INTE HCP-tester).
 * Varje test sparar sessioner i localStorage under sitt eget id.
 */

export type ScoreOption = { value: number; label: string; hint?: string };

export type Prompt = { primary: string; secondary?: string; tag?: string };

export type TrainingSession = {
  id: string;
  date: string;
  /** valfri variant, t.ex. "draw" / "fade" */
  variant?: string;
  /** ett värde per slag, i ordning */
  shots: number[];
  total: number;
};

const key = (testId: string) => `sg4-training-${testId}-v1`;

export function loadSessions(testId: string): TrainingSession[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key(testId)) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is TrainingSession =>
        !!s && typeof s.total === "number" && Array.isArray(s.shots),
    );
  } catch {
    return [];
  }
}

export function saveSession(
  testId: string,
  shots: number[],
  variant?: string,
): TrainingSession {
  const record: TrainingSession = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now()),
    date: new Date().toISOString(),
    shots,
    total: shots.reduce((a, b) => a + b, 0),
    ...(variant ? { variant } : {}),
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      key(testId),
      JSON.stringify([...loadSessions(testId), record]),
    );
  }
  return record;
}

export function deleteSession(testId: string, id: string): TrainingSession[] {
  const next = loadSessions(testId).filter((s) => s.id !== id);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key(testId), JSON.stringify(next));
  }
  return next;
}

export type Metric = { label: string; value: string; hint?: string };

export type AnalysisRow = { label: string; value: string; ratio?: number };

export type AnalysisSection = { title: string; rows: AnalysisRow[]; note?: string };

export type Analysis = {
  headline: Metric;
  metrics: Metric[];
  sections: AnalysisSection[];
};

export const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });

export const pct = (part: number, total: number) =>
  total ? `${Math.round((part / total) * 100)} %` : "0 %";
