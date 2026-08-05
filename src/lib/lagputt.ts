/** Lagputt – 6 puttar från 8–18 m. Allt inom 1 m från hålet är godkänt. */
export const LAG_PUTT_DISTANCES = [8, 10, 12, 14, 16, 18] as const;
/** Godkänt-gräns i meter */
export const LAG_OK_LIMIT = 1;

export type LagPutt = {
  /** måldistans i meter */
  distance: number;
  /** kvarvarande avstånd till hål i meter */
  left: number;
};

export type LagPuttSession = {
  id: string;
  date: string;
  putts: LagPutt[];
  /** antal puttar inom 1 m */
  approved: number;
  /** procent godkända */
  pct: number;
  /** snittavstånd kvar i meter */
  avgLeft: number;
  /** punktskattning av Lagputt-HCP, ur godkänd-procenten */
  handicap: number;
  notes?: string;
};

/** Samma generella rating→handicap-omvandling som används för Around the Green m.fl. */
function ratingToHandicap(pct: number): number {
  return Math.max(-4, Math.min(36, 30 - pct * 0.34));
}

const KEY = "golf-lagputt-sessions-v2";

export function emptyLagPutts(): LagPutt[] {
  return LAG_PUTT_DISTANCES.map((distance) => ({ distance, left: 0 }));
}

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function isApproved(putt: LagPutt): boolean {
  return putt.left <= LAG_OK_LIMIT;
}

export function loadLagPuttSessions(): LagPuttSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as LagPuttSession[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLagPuttSession(putts: LagPutt[], notes?: string): LagPuttSession {
  const approved = putts.filter(isApproved).length;
  const pct = putts.length ? (approved / putts.length) * 100 : 0;
  const record: LagPuttSession = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    putts,
    approved,
    pct,
    avgLeft: mean(putts.map((p) => p.left)),
    handicap: ratingToHandicap(pct),
    notes: notes?.trim() || undefined,
  };
  window.localStorage.setItem(KEY, JSON.stringify([...loadLagPuttSessions(), record]));
  return record;
}

export function deleteLagPuttSession(id: string): LagPuttSession[] {
  const all = loadLagPuttSessions().filter((s) => s.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(all));
  return all;
}
