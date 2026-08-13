import { INTERVALS, type IntervalKey } from "@/lib/shortgame";

/** Lagputt – 6 puttar från 8–18 m, i slumpad ordning varje test. Registreras
 *  som ett intervall (samma som Närspelstest/Bunkerslag) istället för att
 *  skriva in exakt avstånd. Allt inom 1 m från hålet är godkänt. Spelaren
 *  uppmanas gå en annan riktning från hålet för varje putt, så testet inte
 *  blir en enda upprepad linje. */
export const LAG_PUTT_DISTANCES = [8, 10, 12, 14, 16, 18] as const;
/** Godkänt-gräns i meter */
export const LAG_OK_LIMIT = 1;

const INTERVAL_MIDPOINT: Record<IntervalKey, number> = Object.fromEntries(
  INTERVALS.map((i) => [i.key, i.midpoint]),
) as Record<IntervalKey, number>;

export type LagPutt = {
  /** måldistans i meter */
  distance: number;
  /** registrerat intervall – kvar till hålet */
  interval?: IntervalKey;
};

export type LagPuttSession = {
  id: string;
  date: string;
  putts: LagPutt[];
  /** antal puttar inom 1 m */
  approved: number;
  /** procent godkända */
  pct: number;
  /** snittavstånd kvar i meter, ur intervallens mittpunkter */
  avgLeft: number;
  /** punktskattning av Lagputt-HCP, ur godkänd-procenten */
  handicap: number;
  notes?: string;
};

/** Linjär mappning godkänd-procent → HCP, kalibrerad så att 0 % godkänt
 *  motsvarar WHS maxgräns (54,0) och 100 % godkänt motsvarar en elitnivå
 *  (+5, dvs HCP −5). Ett enskilt test är bara 6 puttar och därför ett litet
 *  stickprov – se combinedPuttingSeries i sg-handicap.ts som därför
 *  använder ett rullande snitt av de senaste testerna för det stabila
 *  kategori-HCP:et, snarare än att lita på ett enda testresultat. */
export function ratingToHandicap(pct: number): number {
  return Math.max(-5, Math.min(54, 54 - pct * 0.59));
}

const KEY = "golf-lagputt-sessions-v3";

function shuffled<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Ny, slumpad ordning på de sex avstånden varje gång testet startas om. */
export function emptyLagPutts(): LagPutt[] {
  return shuffled(LAG_PUTT_DISTANCES).map((distance) => ({ distance }));
}

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function intervalMidpoint(interval?: IntervalKey): number {
  return interval ? INTERVAL_MIDPOINT[interval] : 0;
}

export function isApproved(putt: LagPutt): boolean {
  return intervalMidpoint(putt.interval) <= LAG_OK_LIMIT;
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
    avgLeft: mean(putts.map((p) => intervalMidpoint(p.interval))),
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
