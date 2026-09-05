/**
 * Bunkerslag – samma format som Närspelstest: 6 slag, ett i taget, med
 * avstånd-från-hål registrerat som intervall (återanvänder samma
 * intervallskala som Närspelstest) istället för att skriva in exakta fot.
 *
 * Sex likvärdiga bunkerslag – inget separat läge att välja, bollen läggs
 * bara upp på nytt i bunkern inför varje slag.
 *
 * Ett extra alternativ, "Kom inte upp ur bunker", täcker det vanligaste
 * misslyckandet och straffas som ett långt avstånd i beräkningen.
 *
 * Bunker HCP är kalibrerat mot verklig proximity-data för greenside
 * bunkerslag: Shot Scope (2 hcp ≈ 12,5 fot, 26 hcp ≈ 17,7 fot), Galvin
 * Green (14 hcp ≈ 16 fot) och Pelz/PGA Tour ShotLink (proffs < 10 fot).
 */

import { LEGACY_KEYS } from "@/lib/sessions/keys";
import { recordSessionDeleted, recordSessionSaved } from "@/lib/sessions/sync";
import {
  INTERVALS as SHORTGAME_INTERVALS,
  type IntervalKey as ShortGameIntervalKey,
} from "@/lib/shortgame";

export type BunkerIntervalKey = ShortGameIntervalKey | "not-out";

/** Samma avståndsintervall som Närspelstest, plus "Kom inte upp ur bunker". */
export const BUNKER_INTERVALS: { key: BunkerIntervalKey; label: string; midpoint: number }[] = [
  ...SHORTGAME_INTERVALS,
  { key: "not-out", label: "Kom inte upp ur bunker", midpoint: 10 },
];

const INTERVAL_MIDPOINT: Record<BunkerIntervalKey, number> = Object.fromEntries(
  BUNKER_INTERVALS.map((i) => [i.key, i.midpoint]),
) as Record<BunkerIntervalKey, number>;

export const BUNKER_TOTAL_SHOTS = 6;

export type BunkerShot = {
  index: number;
  interval?: BunkerIntervalKey;
};

export function emptyBunkerShots(): BunkerShot[] {
  return Array.from({ length: BUNKER_TOTAL_SHOTS }, (_, i) => ({ index: i + 1 }));
}

/* -------------------------------------------------------------------------
 * Piecewise-linjär interpolation, samma mönster som shortgame.ts/speed.ts
 * ---------------------------------------------------------------------- */

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

/** Snittproximity (meter) → handicap, kalibrerat mot bunker-proximity-data (se filkommentar). */
const PROXIMITY_ANCHORS: Anchor[] = [
  { hcp: -8, value: 1.5 },
  { hcp: -6, value: 2.9 },
  { hcp: 2, value: 3.81 },
  { hcp: 14, value: 4.88 },
  { hcp: 26, value: 5.39 },
  { hcp: 40, value: 7.5 },
  { hcp: 54, value: 9.0 },
];

export function handicapFromProximity(avgProximityM: number): number {
  return Math.max(-8, Math.min(54, interpolate(avgProximityM, PROXIMITY_ANCHORS)));
}

function scoreFromHandicap(hcp: number): number {
  return Math.round(Math.max(0, Math.min(100, 100 - (hcp + 8) * (100 / 48))));
}

export function handicapLabel(hcp: number): string {
  const v = Math.abs(hcp).toFixed(1).replace(".", ",");
  return hcp < 0 ? `+${v}` : v;
}

export function bunkerLevelLabel(score: number): string {
  if (score >= 85) return "Elitnivå";
  if (score >= 70) return "Stark nivå";
  if (score >= 50) return "Bra nivå";
  if (score >= 30) return "Grundnivå";
  return "Nybörjarnivå";
}

/* -------------------------------------------------------------------------
 * Sammanställning
 * ---------------------------------------------------------------------- */

export type BunkerResult = {
  count: number;
  avgProximity: number;
  handicap: number;
  score: number;
  notOutCount: number;
  within2m: number;
  analysis: string;
};

export function computeBunkerResult(shots: BunkerShot[]): BunkerResult {
  const played = shots.filter((s): s is BunkerShot & { interval: BunkerIntervalKey } =>
    Boolean(s.interval),
  );
  const count = played.length;
  const proximities = played.map((s) => INTERVAL_MIDPOINT[s.interval]);
  const avgProximity = count ? proximities.reduce((a, b) => a + b, 0) / count : 0;

  const handicap = count ? handicapFromProximity(avgProximity) : 0;
  const score = count ? scoreFromHandicap(handicap) : 0;

  const notOutCount = played.filter((s) => s.interval === "not-out").length;
  const within2m = proximities.filter((p) => p <= 2).length;

  const analysis = buildAnalysis(avgProximity, notOutCount, count);

  return {
    count,
    avgProximity: Math.round(avgProximity * 100) / 100,
    handicap,
    score,
    notOutCount,
    within2m,
    analysis,
  };
}

function buildAnalysis(avg: number, notOutCount: number, count: number): string {
  if (!count) return "Genomför testet för att få din analys.";
  if (notOutCount > 0) {
    return `${notOutCount} av ${count} slag kom inte upp ur bunkern – att säkra utslaget är första prioritet innan proximity ens blir relevant.`;
  }
  if (avg <= 2) {
    return `Stark bunkerkontroll – snitt ${avg.toFixed(2)} m från hål, alla slag kom upp.`;
  }
  return `Snitt ${avg.toFixed(2)} m från hål – jobba på att få bollen närmre hålet med jämnare svinglängd.`;
}

/* -------------------------------------------------------------------------
 * Sessioner
 * ---------------------------------------------------------------------- */

export type BunkerSession = {
  id: string;
  date: string;
  shots: BunkerShot[];
  avgProximity: number;
  handicap: number;
  score: number;
};

const KEY = LEGACY_KEYS.bunker;

export function loadBunkerSessions(): BunkerSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as BunkerSession[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(sessions: BunkerSession[]) {
  window.localStorage.setItem(KEY, JSON.stringify(sessions));
  return sessions;
}

export function saveBunkerSession(shots: BunkerShot[]): BunkerSession {
  const r = computeBunkerResult(shots);
  const record: BunkerSession = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    shots,
    avgProximity: r.avgProximity,
    handicap: r.handicap,
    score: r.score,
  };
  persist([...loadBunkerSessions(), record]);
  recordSessionSaved("bunker", record);
  return record;
}

export function deleteBunkerSession(id: string): BunkerSession[] {
  const next = persist(loadBunkerSessions().filter((s) => s.id !== id));
  recordSessionDeleted("bunker", id);
  return next;
}
