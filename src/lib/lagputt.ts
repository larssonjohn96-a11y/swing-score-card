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

type Anchor = { hcp: number; value: number };

function interpolate(input: number, anchors: Anchor[]): number {
  const sorted = [...anchors].sort((a, b) => a.hcp - b.hcp);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (input <= first.value) return first.hcp;
  if (input >= last.value) return last.hcp;
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (input >= a.value && input <= b.value) {
      const t = (input - a.value) / (b.value - a.value);
      return a.hcp + t * (b.hcp - a.hcp);
    }
  }
  return last.hcp;
}

/**
 * Kontinuerlig mappning snittavstånd-kvar → HCP, kalibrerad för lagputt-
 * distanser (8–18 m). Ersätter den tidigare binära "andel godkänd inom 1 m"-
 * formeln, som gav 0 % (och därmed 54,0 i HCP) även om ALLA puttar landade
 * fint på 1–2 m – en helt orimlig bottennotering för en faktiskt godkänd
 * lagputt-prestation. Nu ger varje meter närmare hålet delpoäng, precis
 * som proximity-baserade formler i Bunker/Around the Green.
 */
const PROXIMITY_ANCHORS: Anchor[] = [
  { hcp: -5, value: 0 },
  { hcp: 0, value: 0.4 },
  { hcp: 8, value: 0.8 },
  { hcp: 15, value: 1.3 },
  { hcp: 25, value: 2.0 },
  { hcp: 35, value: 3.0 },
  { hcp: 48, value: 4.5 },
  { hcp: 54, value: 6.0 },
];

export function handicapFromProximity(avgLeftM: number): number {
  return Math.max(-5, Math.min(54, interpolate(avgLeftM, PROXIMITY_ANCHORS)));
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

/** Förkortad serie för Putting Test-huvudtestet: 3 representativa avstånd
 *  (8/13/18 m, kort/mellan/lång) istället för alla sex – matchar samma
 *  huvudtest/utökat-test-mönster som Approach. Samma LagPutt-typ och
 *  samma saveLagPuttSession() som den fulla sexdistansserien. */
export const LAG_PUTT_DISTANCES_MAIN = [8, 13, 18] as const;

export function emptyLagPuttsMain(): LagPutt[] {
  return shuffled(LAG_PUTT_DISTANCES_MAIN).map((distance) => ({ distance }));
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
  const avgLeft = mean(putts.map((p) => intervalMidpoint(p.interval)));
  const record: LagPuttSession = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    putts,
    approved,
    pct,
    avgLeft,
    handicap: handicapFromProximity(avgLeft),
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
