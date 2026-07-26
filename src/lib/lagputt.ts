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
  notes?: string;
};

const KEY = "golf-lagputt-sessions-v1";

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
  const record: LagPuttSession = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    putts,
    approved,
    pct: putts.length ? (approved / putts.length) * 100 : 0,
    avgLeft: mean(putts.map((p) => p.left)),
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
