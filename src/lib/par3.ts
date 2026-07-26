/** Approach Precision Test (Par 3) – 20 slag: 5 avstånd × 2 slag × 2 varv. */

export type Par3Distance = {
  distance: number;
  /** typisk klubba */
  club: string;
};

export const PAR3_DISTANCES: Par3Distance[] = [
  { distance: 110, club: "PW / 9-järn" },
  { distance: 125, club: "9- / 8-järn" },
  { distance: 140, club: "8- / 7-järn" },
  { distance: 155, club: "7- / 6-järn" },
  { distance: 170, club: "6- / 5-järn" },
];

export const PAR3_ROUNDS = 2;
export const PAR3_SHOTS_PER_DISTANCE = 2;
export const PAR3_TOTAL_SHOTS =
  PAR3_DISTANCES.length * PAR3_SHOTS_PER_DISTANCE * PAR3_ROUNDS;

export type Par3Shot = {
  /** varv, 1-indexerat */
  round: number;
  /** måldistans i meter */
  distance: number;
  /** slag inom avståndet, 1-indexerat */
  shot: number;
  /** avstånd till hål i meter */
  proximity: number;
};

export type Par3Session = {
  id: string;
  date: string;
  shots: Par3Shot[];
  /** medelproximity i meter för alla 20 slag */
  avgProximity: number;
  /** snitt i procent av måldistansen */
  pct: number;
  /** spridning (standardavvikelse) i meter */
  spread: number;
  notes?: string;
};

export function emptyPar3Shots(): Par3Shot[] {
  const shots: Par3Shot[] = [];
  for (let round = 1; round <= PAR3_ROUNDS; round += 1) {
    for (const { distance } of PAR3_DISTANCES) {
      for (let shot = 1; shot <= PAR3_SHOTS_PER_DISTANCE; shot += 1) {
        shots.push({ round, distance, shot, proximity: 0 });
      }
    }
  }
  return shots;
}

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

export type Par3Stat = {
  distance: number;
  club: string;
  avg: number;
  /** snittproximity i procent av måldistansen */
  pct: number;
  spread: number;
  best: number;
  count: number;
};

export function par3StatsByDistance(shots: Par3Shot[]): Par3Stat[] {
  return PAR3_DISTANCES.map(({ distance, club }) => {
    const values = shots.filter((s) => s.distance === distance).map((s) => s.proximity);
    const avg = mean(values);
    return {
      distance,
      club,
      avg,
      pct: values.length ? (avg / distance) * 100 : 0,
      spread: stdDev(values),
      best: values.length ? Math.min(...values) : 0,
      count: values.length,
    };
  });
}

/** Totalt snitt i procent (viktat per slag). */
export function par3OverallPct(shots: Par3Shot[]): number {
  if (!shots.length) return 0;
  return mean(shots.map((s) => (s.proximity / s.distance) * 100));
}

/** Bästa och sämsta avstånd i procent. */
export function par3BestWorst(shots: Par3Shot[]) {
  const withData = par3StatsByDistance(shots).filter((d) => d.count > 0);
  if (!withData.length) return { best: undefined, worst: undefined };
  const sorted = [...withData].sort((a, b) => a.pct - b.pct);
  return { best: sorted[0], worst: sorted[sorted.length - 1] };
}

const KEY = "golf-par3-sessions-v1";

export function loadPar3Sessions(): Par3Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Par3Session[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePar3Session(shots: Par3Shot[], notes?: string): Par3Session {
  const values = shots.map((s) => s.proximity);
  const record: Par3Session = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    shots,
    avgProximity: mean(values),
    pct: par3OverallPct(shots),
    spread: stdDev(values),
    notes: notes?.trim() || undefined,
  };
  window.localStorage.setItem(KEY, JSON.stringify([...loadPar3Sessions(), record]));
  return record;
}

export function deletePar3Session(id: string): Par3Session[] {
  const all = loadPar3Sessions().filter((s) => s.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(all));
  return all;
}
