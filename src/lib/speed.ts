/**
 * Speed Test – strukturerat test i samma anda som Off the Tee Test.
 *
 * Spelaren väljer först var mätningen görs (simulator eller range) och med
 * vilken maskin, eftersom olika system mäter olika högt – ett viktigt
 * sammanhang för att tolka resultatet rätt. Sedan slås 6 drives. Ball
 * speed är obligatoriskt, club head speed valfritt per slag.
 *
 * Speed HCP är kalibrerat mot verklig Trackman-data (ball speed, driver,
 * herrar) sammanställd av Golf Korea / Trackman Golf Report:
 *   Tour-snitt ≈ 168 mph, Scratch (HCP 0) ≈ 161 mph, HCP 5 ≈ 147 mph,
 *   HCP 10 ≈ 138 mph, HCP 15 ≈ 133 mph, HCP 18 ≈ 131 mph.
 * Extrapolerat linjärt i båda ändar för plus-handicap och höga handicap.
 */

export type MeasurementContext = "simulator" | "range";

export const SIMULATOR_DEVICES = [
  "Trackman",
  "Foresight (GC Quad/Hawk)",
  "Garmin R10",
  "Square Golf",
  "SkyTrak",
  "Annan simulator",
] as const;

export const RANGE_DEVICES = ["Toptracer Range", "Trackman Range", "Annan range"] as const;

export type Device = (typeof SIMULATOR_DEVICES)[number] | (typeof RANGE_DEVICES)[number];

export const SPEED_TOTAL_SHOTS = 6;

export type SpeedShot = {
  index: number;
  /** bollhastighet i mph */
  ballSpeed: number;
  /** klubbhuvudshastighet i mph, valfritt */
  clubSpeed?: number;
};

export function emptySpeedShots(): SpeedShot[] {
  return Array.from({ length: SPEED_TOTAL_SHOTS }, (_, i) => ({ index: i + 1, ballSpeed: 0 }));
}

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/* -------------------------------------------------------------------------
 * Piecewise-linjär interpolation, samma mönster som offtee.ts
 * ---------------------------------------------------------------------- */

type Anchor = { hcp: number; value: number };

function interpolate(input: number, anchors: Anchor[]): number {
  const sorted = [...anchors].sort((a, b) => a.hcp - b.hcp);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (input >= first.value) return first.hcp;
  if (input <= last.value) return last.hcp;
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (input <= a.value && input >= b.value) {
      const t = (a.value - input) / (a.value - b.value);
      return a.hcp + t * (b.hcp - a.hcp);
    }
  }
  return last.hcp;
}

/** Ball speed (mph) → handicap, kalibrerat mot Trackman-data (se filkommentar). */
const BALL_SPEED_ANCHORS: Anchor[] = [
  { hcp: -8, value: 172 },
  { hcp: -6, value: 168 },
  { hcp: 0, value: 161 },
  { hcp: 5, value: 147 },
  { hcp: 10, value: 138 },
  { hcp: 15, value: 133 },
  { hcp: 18, value: 131 },
  { hcp: 30, value: 122 },
  { hcp: 40, value: 115 },
];

export function handicapFromBallSpeed(avgBallSpeed: number): number {
  return Math.max(-8, Math.min(40, interpolate(avgBallSpeed, BALL_SPEED_ANCHORS)));
}

/** Handicap → 0–100 score, samma skala (-8..40) som Off the Tee Test. */
function scoreFromHandicap(hcp: number): number {
  return Math.round(Math.max(0, Math.min(100, 100 - (hcp + 8) * (100 / 48))));
}

export function handicapLabel(hcp: number): string {
  const v = Math.abs(hcp).toFixed(1).replace(".", ",");
  return hcp < 0 ? `+${v}` : v;
}

/** Kort, lättillgängligt nivåord som komplement till HCP-talet. */
export function speedLevelLabel(score: number): string {
  if (score >= 85) return "Elitnivå";
  if (score >= 70) return "Stark nivå";
  if (score >= 50) return "Bra nivå";
  if (score >= 30) return "Grundnivå";
  return "Nybörjarnivå";
}

/* -------------------------------------------------------------------------
 * Sammanställning
 * ---------------------------------------------------------------------- */

export type SpeedResult = {
  count: number;
  avgBallSpeed: number;
  topBallSpeed: number;
  avgClubSpeed?: number;
  topClubSpeed?: number;
  avgSmash?: number;
  handicap: number;
  score: number;
  analysis: string;
};

export function computeSpeedResult(shots: SpeedShot[]): SpeedResult {
  const played = shots.filter((s) => s.ballSpeed > 0);
  const count = played.length;
  const balls = played.map((s) => s.ballSpeed);
  const clubs = played.map((s) => s.clubSpeed).filter((v): v is number => typeof v === "number");

  const avgBallSpeed = mean(balls);
  const topBallSpeed = balls.length ? Math.max(...balls) : 0;
  const avgClubSpeed = clubs.length ? mean(clubs) : undefined;
  const topClubSpeed = clubs.length ? Math.max(...clubs) : undefined;

  const smashValues = played
    .filter((s) => s.clubSpeed)
    .map((s) => s.ballSpeed / (s.clubSpeed as number));
  const avgSmash = smashValues.length ? mean(smashValues) : undefined;

  const handicap = count ? handicapFromBallSpeed(avgBallSpeed) : 0;
  const score = count ? scoreFromHandicap(handicap) : 0;

  const analysis = buildAnalysis(avgBallSpeed, topBallSpeed, avgSmash);

  return {
    count,
    avgBallSpeed,
    topBallSpeed,
    avgClubSpeed,
    topClubSpeed,
    avgSmash,
    handicap,
    score,
    analysis,
  };
}

function buildAnalysis(avg: number, top: number, smash?: number): string {
  if (!avg) return "Genomför testet för att få din analys.";
  const parts: string[] = [];
  const spread = top - avg;
  if (spread >= 6) {
    parts.push(
      `Din snabbaste putt (${top.toFixed(0)} mph) ligger ${spread.toFixed(0)} mph över snittet – stor variation mellan slagen tyder på inkonsekvent kontakt.`,
    );
  } else {
    parts.push(`Jämn nivå mellan slagen, bara ${spread.toFixed(0)} mph mellan snitt och topp.`);
  }
  if (smash !== undefined) {
    if (smash >= 1.48) {
      parts.push(
        `Smash factor ${smash.toFixed(2)} är mycket bra – du får ut nästan max energi ur svinghastigheten.`,
      );
    } else if (smash < 1.4) {
      parts.push(
        `Smash factor ${smash.toFixed(2)} är lågt – bättre träffkvalitet (center-träff) kan ge mer bollhastighet utan att svinga hårdare.`,
      );
    } else {
      parts.push(`Smash factor ${smash.toFixed(2)} är en solid nivå för din svinghastighet.`);
    }
  }
  return parts.join(" ");
}

/* -------------------------------------------------------------------------
 * Sessioner
 * ---------------------------------------------------------------------- */

export type SpeedSession = {
  id: string;
  date: string;
  context: MeasurementContext;
  device: Device;
  shots: SpeedShot[];
  avgBallSpeed: number;
  topBallSpeed: number;
  avgClubSpeed?: number;
  handicap: number;
  score: number;
  notes?: string;
};

const KEY = "golf-speed-sessions-v2";

export function loadSpeedSessions(): SpeedSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as SpeedSession[]) : [];
    if (!Array.isArray(parsed)) return [];
    return [...parsed].sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

function persist(sessions: SpeedSession[]) {
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  window.localStorage.setItem(KEY, JSON.stringify(sorted));
  return sorted;
}

export function saveSpeedSession(
  shots: SpeedShot[],
  context: MeasurementContext,
  device: Device,
  notes?: string,
): SpeedSession {
  const r = computeSpeedResult(shots);
  const session: SpeedSession = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    context,
    device,
    shots,
    avgBallSpeed: r.avgBallSpeed,
    topBallSpeed: r.topBallSpeed,
    avgClubSpeed: r.avgClubSpeed,
    handicap: r.handicap,
    score: r.score,
    notes: notes?.trim() || undefined,
  };
  persist([...loadSpeedSessions(), session]);
  return session;
}

export function deleteSpeedSession(id: string): SpeedSession[] {
  return persist(loadSpeedSessions().filter((s) => s.id !== id));
}
