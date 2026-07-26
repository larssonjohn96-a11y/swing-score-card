/** Wedge matrix – 20 slag: 5 avstånd × 2 slag × 2 varv. */
export const WEDGE_DISTANCES = [40, 60, 80, 100, 120] as const;
export const WEDGE_ROUNDS = 2;
export const SHOTS_PER_DISTANCE = 2;
export const WEDGE_TOTAL_SHOTS =
  WEDGE_DISTANCES.length * SHOTS_PER_DISTANCE * WEDGE_ROUNDS;

export type WedgeShot = {
  /** varv, 1-indexerat */
  round: number;
  /** måldistans i meter */
  distance: number;
  /** slag inom avståndet, 1-indexerat */
  shot: number;
  /** avstånd till hål i meter */
  proximity: number;
};

export type WedgeSession = {
  id: string;
  date: string;
  shots: WedgeShot[];
  /** medelproximity i meter för alla 20 slag */
  avgProximity: number;
  /** spridning (standardavvikelse) i meter */
  spread: number;
  notes?: string;
};

const KEY = "golf-wedge-sessions-v1";

/** Tom slagordning: varv 1 (40→120), varv 2 (40→120). */
export function emptyWedgeShots(): WedgeShot[] {
  const shots: WedgeShot[] = [];
  for (let round = 1; round <= WEDGE_ROUNDS; round += 1) {
    for (const distance of WEDGE_DISTANCES) {
      for (let shot = 1; shot <= SHOTS_PER_DISTANCE; shot += 1) {
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

/** Standardavvikelse (populations-) i samma enhet. */
export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

export type DistanceStat = {
  distance: number;
  avg: number;
  spread: number;
  best: number;
  count: number;
};

export function wedgeStatsByDistance(shots: WedgeShot[]): DistanceStat[] {
  return WEDGE_DISTANCES.map((distance) => {
    const values = shots.filter((s) => s.distance === distance).map((s) => s.proximity);
    return {
      distance,
      avg: mean(values),
      spread: stdDev(values),
      best: values.length ? Math.min(...values) : 0,
      count: values.length,
    };
  });
}

export function loadWedgeSessions(): WedgeSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as WedgeSession[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveWedgeSession(shots: WedgeShot[], notes?: string): WedgeSession {
  const values = shots.map((s) => s.proximity);
  const record: WedgeSession = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    shots,
    avgProximity: mean(values),
    spread: stdDev(values),
    notes: notes?.trim() || undefined,
  };
  window.localStorage.setItem(KEY, JSON.stringify([...loadWedgeSessions(), record]));
  return record;
}

export function deleteWedgeSession(id: string): WedgeSession[] {
  const all = loadWedgeSessions().filter((s) => s.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(all));
  return all;
}
