import { LEGACY_KEYS } from "@/lib/sessions/keys";
import { recordSessionDeleted, recordSessionSaved } from "@/lib/sessions/sync";
/**
 * Lag putt – 18 puttar, träningstest (INTE ett HCP-test).
 * Fast hålsekvens 8–22 m enligt Svenska Golfteamets lagputtest.
 * Poäng per putt är signerad, lägre totalsumma är bättre (bäst = -36).
 */

export const LAG18_DISTANCES = [
  22, 12, 18, 10, 14, 8, 22, 12, 18, 10, 14, 8, 22, 12, 18, 10, 14, 8,
] as const;

export const LAG18_TOTAL = LAG18_DISTANCES.length; // 18

export type LagScoreOption = { score: number; label: string; hint: string };

/** Poängskala: hålad = -2 ... > 3 m = +3. Lägre är bättre. */
export const LAG18_SCORES: LagScoreOption[] = [
  { score: -2, label: "Hålad", hint: "I hål" },
  { score: -1, label: "≤ 0,5 m", hint: "0–0,5 m kvar" },
  { score: 0, label: "0,5–1 m", hint: "0,5–1 m kvar" },
  { score: 1, label: "1–2 m", hint: "1–2 m kvar" },
  { score: 2, label: "2–3 m", hint: "2–3 m kvar" },
  { score: 3, label: "> 3 m", hint: "Mer än 3 m kvar" },
];

/** Referensvärden (snittscore i testet) – enbart kontext, ingen HCP-skattning. */
export const LAG18_BENCHMARKS = [
  { label: "Världsklass", score: "-10" },
  { label: "Tourspelare", score: "-4" },
  { label: "Elitamatör", score: "+4" },
  { label: "Klubbspelare", score: "+14" },
];

export type Lag18Session = {
  id: string;
  date: string;
  /** 18 signerade poäng i hålordning */
  scores: number[];
  /** summa, lägre är bättre */
  total: number;
};

const KEY = LEGACY_KEYS.lagputt18;

export function loadLag18Sessions(): Lag18Session[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is Lag18Session =>
        !!s && typeof s.total === "number" && Array.isArray(s.scores),
    );
  } catch {
    return [];
  }
}

export function saveLag18Session(scores: number[]): Lag18Session {
  const record: Lag18Session = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now()),
    date: new Date().toISOString(),
    scores,
    total: scores.reduce((a, b) => a + b, 0),
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify([...loadLag18Sessions(), record]));
    recordSessionSaved("lag-putt-18", record);
  }
  return record;
}

export function deleteLag18Session(id: string): Lag18Session[] {
  const next = loadLag18Sessions().filter((s) => s.id !== id);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    recordSessionDeleted("lag-putt-18", id);
  }
  return next;
}

export function sumRange(scores: number[], from: number, to: number): number {
  return scores.slice(from, to).reduce((a, b) => a + b, 0);
}

export type DistanceGroup = { distance: number; avg: number; total: number; count: number };

/** Snittscore per måldistans över en eller flera omgångar. Lägre = starkare. */
export function distanceGroups(sessions: number[][]): DistanceGroup[] {
  const map = new Map<number, { total: number; count: number }>();
  for (const scores of sessions) {
    scores.forEach((value, i) => {
      if (typeof value !== "number") return;
      const distance = LAG18_DISTANCES[i];
      if (distance === undefined) return;
      const entry = map.get(distance) ?? { total: 0, count: 0 };
      entry.total += value;
      entry.count += 1;
      map.set(distance, entry);
    });
  }
  return [...map.entries()]
    .map(([distance, { total, count }]) => ({ distance, total, count, avg: total / count }))
    .sort((a, b) => a.distance - b.distance);
}

export const fmtScore = (value: number) => (value > 0 ? `+${value}` : String(value));
