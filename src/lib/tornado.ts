import { LEGACY_KEYS } from "@/lib/sessions/keys";
import { recordSessionDeleted, recordSessionSaved } from "@/lib/sessions/sync";
/** Tornado drill – 10 puttar runt hålet: 3 × 1 m, 4 × 2 m, 3 × 3 m. 10 poäng per isatt putt. */
export const TORNADO_PLAN: { distance: number; count: number }[] = [
  { distance: 1, count: 3 },
  { distance: 2, count: 4 },
  { distance: 3, count: 3 },
];

export const TORNADO_TOTAL = TORNADO_PLAN.reduce((sum, p) => sum + p.count, 0);
export const POINTS_PER_PUTT = 10;

/** Klockpositioner runt hålet så varje putt tas från olika håll. */
export const CLOCK_POSITIONS = [
  "kl 12",
  "kl 1",
  "kl 2",
  "kl 3",
  "kl 4",
  "kl 5",
  "kl 6",
  "kl 7",
  "kl 8",
  "kl 9",
  "kl 10",
  "kl 11",
] as const;

export type TornadoPutt = {
  /** avstånd i meter */
  distance: number;
  /** position runt hålet */
  position: string;
  holed: boolean;
};

export type TornadoSession = {
  id: string;
  date: string;
  putts: TornadoPutt[];
  /** antal isatta puttar */
  holed: number;
  /** poäng 0–100 */
  points: number;
  notes?: string;
};

const KEY = LEGACY_KEYS.tornado;

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Slumpad ordning på avstånden och slumpade, unika positioner runt hålet. */
export function randomTornadoPutts(): TornadoPutt[] {
  const distances = shuffle(
    TORNADO_PLAN.flatMap((p) => Array.from({ length: p.count }, () => p.distance)),
  );
  const positions = shuffle([...CLOCK_POSITIONS]).slice(0, distances.length);
  return distances.map((distance, i) => ({
    distance,
    position: positions[i],
    holed: false,
  }));
}

export type TornadoStat = {
  distance: number;
  holed: number;
  count: number;
  pct: number;
};

export function tornadoStats(putts: TornadoPutt[]): TornadoStat[] {
  return TORNADO_PLAN.map(({ distance }) => {
    const rows = putts.filter((p) => p.distance === distance);
    const holed = rows.filter((p) => p.holed).length;
    return {
      distance,
      holed,
      count: rows.length,
      pct: rows.length ? (holed / rows.length) * 100 : 0,
    };
  });
}

export function loadTornadoSessions(): TornadoSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as TornadoSession[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTornadoSession(putts: TornadoPutt[], notes?: string): TornadoSession {
  const holed = putts.filter((p) => p.holed).length;
  const record: TornadoSession = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    putts,
    holed,
    points: holed * POINTS_PER_PUTT,
    notes: notes?.trim() || undefined,
  };
  window.localStorage.setItem(KEY, JSON.stringify([...loadTornadoSessions(), record]));
  recordSessionSaved("tornado", record);
  return record;
}

export function deleteTornadoSession(id: string): TornadoSession[] {
  const all = loadTornadoSessions().filter((s) => s.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(all));
  recordSessionDeleted("tornado", id);
  return all;
}

/** Sammanställer alla sparade pass per avstånd över tid. */
export function tornadoOverallStats(sessions: TornadoSession[]): TornadoStat[] {
  return tornadoStats(sessions.flatMap((s) => s.putts));
}

/** Bästa och sämsta avstånd sett över all historik. */
export function tornadoBestWorst(sessions: TornadoSession[]) {
  const stats = tornadoOverallStats(sessions).filter((s) => s.count > 0);
  if (!stats.length) return null;
  const sorted = [...stats].sort((a, b) => b.pct - a.pct);
  return { best: sorted[0], worst: sorted[sorted.length - 1], stats };
}
