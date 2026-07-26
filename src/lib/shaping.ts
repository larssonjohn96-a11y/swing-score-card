/** Shot shaping test – 9-järn, 3 varv × (draw, rak, fade) = 9 slag. */

export const SHAPES = ["Draw", "Rak", "Fade"] as const;
export type Shape = (typeof SHAPES)[number];

export const SHAPING_ROUNDS = 3;
export const SHAPING_TOTAL_SHOTS = SHAPING_ROUNDS * SHAPES.length;

export type ShapingShot = {
  /** varv, 1-indexerat */
  round: number;
  shape: Shape;
  /** godkänt slag = 1 poäng */
  ok: boolean;
};

export type ShapingSession = {
  id: string;
  date: string;
  shots: ShapingShot[];
  /** antal godkända 0–9 */
  score: number;
  /** score i procent 0–100 */
  pct: number;
  notes?: string;
};

/** Tom slagordning: varv 1–3, draw → rak → fade. */
export function emptyShapingShots(): ShapingShot[] {
  const shots: ShapingShot[] = [];
  for (let round = 1; round <= SHAPING_ROUNDS; round += 1) {
    for (const shape of SHAPES) {
      shots.push({ round, shape, ok: false });
    }
  }
  return shots;
}

export function shapingScore(shots: ShapingShot[]): number {
  return shots.filter((s) => s.ok).length;
}

export function shapingPct(shots: ShapingShot[]): number {
  if (!shots.length) return 0;
  return (shapingScore(shots) / shots.length) * 100;
}

export type ShapeStat = {
  shape: Shape;
  ok: number;
  count: number;
  pct: number;
};

/** Träffsäkerhet per bollflykt. */
export function statsByShape(shots: ShapingShot[]): ShapeStat[] {
  return SHAPES.map((shape) => {
    const own = shots.filter((s) => s.shape === shape);
    const ok = own.filter((s) => s.ok).length;
    return { shape, ok, count: own.length, pct: own.length ? (ok / own.length) * 100 : 0 };
  });
}

const KEY = "golf-shaping-sessions-v1";

export function loadShapingSessions(): ShapingSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as ShapingSession[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveShapingSession(shots: ShapingShot[], notes?: string): ShapingSession {
  const record: ShapingSession = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    shots,
    score: shapingScore(shots),
    pct: shapingPct(shots),
    notes: notes?.trim() || undefined,
  };
  window.localStorage.setItem(KEY, JSON.stringify([...loadShapingSessions(), record]));
  return record;
}

export function deleteShapingSession(id: string): ShapingSession[] {
  const all = loadShapingSessions().filter((s) => s.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(all));
  return all;
}
