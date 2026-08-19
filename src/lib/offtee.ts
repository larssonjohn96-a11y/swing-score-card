/** Standardiserat Off the Tee-test: 6 drives mot samma fairway. */
export const FAIRWAY = {
  halfWidth: 16,
  roughDepth: 12,
};

export const OFFTEE_TOTAL_SHOTS = 6;

export type ShotDirection = "left" | "right";

export type TeeShotInput = {
  /** totalt avstånd i meter */
  total: number;
  /** absolut sidled i meter */
  sidled: number;
  /** valfri för bakåtkompatibilitet med äldre sparade tester */
  direction?: ShotDirection;
};

export type TeeShot = TeeShotInput & {
  index: number;
  filled: boolean;
};

export function emptyTeeShots(): TeeShot[] {
  return Array.from({ length: OFFTEE_TOTAL_SHOTS }, (_, i) => ({
    index: i + 1,
    total: 0,
    sidled: 0,
    direction: "right" as const,
    filled: false,
  }));
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

export type ShotOutcome = {
  inFairway: boolean;
  inRough: boolean;
  isOB: boolean;
};

export function shotOutcome(sidled: number): ShotOutcome {
  const absolute = Math.abs(sidled);
  const inFairway = absolute <= FAIRWAY.halfWidth;
  const isOB = absolute > FAIRWAY.halfWidth + FAIRWAY.roughDepth;
  const inRough = !inFairway && !isOB;
  return { inFairway, inRough, isOB };
}

type Anchor = { hcp: number; value: number };

function interpolate(input: number, anchors: Anchor[], decreasing: boolean): number {
  const sorted = [...anchors].sort((a, b) => a.hcp - b.hcp);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  if (decreasing) {
    if (input >= first.value) return first.hcp;
    if (input <= last.value) return last.hcp;
  } else {
    if (input <= first.value) return first.hcp;
    if (input >= last.value) return last.hcp;
  }

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const within = decreasing
      ? input <= a.value && input >= b.value
      : input >= a.value && input <= b.value;
    if (within) {
      const t = (input - a.value) / (b.value - a.value);
      return a.hcp + t * (b.hcp - a.hcp);
    }
  }
  return last.hcp;
}

const YD = 0.9144;

const DISTANCE_ANCHORS: Anchor[] = [
  { hcp: -8, value: 292.0 },
  { hcp: -6, value: 302.8 * YD },
  { hcp: 2.5, value: 244 * YD },
  { hcp: 15, value: 224.1 * YD },
  { hcp: 32, value: 181 * YD },
  { hcp: 40, value: 147.0 },
];

export function distanceToHandicap(avgTotalMeters: number): number {
  return interpolate(avgTotalMeters, DISTANCE_ANCHORS, true);
}

const ACCURACY_ANCHORS: Anchor[] = [
  { hcp: -6, value: 0 },
  { hcp: 2.5, value: FAIRWAY.halfWidth },
  { hcp: 20, value: FAIRWAY.halfWidth + FAIRWAY.roughDepth / 2 },
  { hcp: 40, value: FAIRWAY.halfWidth + FAIRWAY.roughDepth },
];

function accuracyToHandicap(sidledMeters: number): number {
  return interpolate(Math.abs(sidledMeters), ACCURACY_ANCHORS, false);
}

export function shotHandicap(shot: { total: number; sidled: number }): number {
  const distanceHcp = distanceToHandicap(shot.total);
  const accuracyHcp = accuracyToHandicap(shot.sidled);
  return Math.round((distanceHcp * 0.5 + accuracyHcp * 0.5) * 10) / 10;
}

const AGE_DRIVING_HCP_BRACKETS: { maxAge: number; mean: number; sd: number }[] = [
  { maxAge: 25, mean: 14, sd: 9 },
  { maxAge: 35, mean: 11, sd: 8 },
  { maxAge: 45, mean: 12, sd: 8 },
  { maxAge: 55, mean: 15, sd: 8 },
  { maxAge: 65, mean: 19, sd: 9 },
  { maxAge: 200, mean: 24, sd: 9 },
];

export function drivingHcpDistributionForAge(age: number): { mean: number; sd: number } {
  const bracket = AGE_DRIVING_HCP_BRACKETS.find((b) => age <= b.maxAge);
  return bracket ?? AGE_DRIVING_HCP_BRACKETS[AGE_DRIVING_HCP_BRACKETS.length - 1];
}

export const ALL_GOLFERS_DRIVING_HCP = { mean: 17, sd: 8 };

const WAYWARD_ANCHORS: Anchor[] = [
  { hcp: -8, value: 1 },
  { hcp: -6, value: 2 },
  { hcp: 2.5, value: 12 },
  { hcp: 32, value: 45 },
  { hcp: 40, value: 71 },
];

function waywardToHandicap(waywardPct: number): number {
  return interpolate(waywardPct, WAYWARD_ANCHORS, false);
}

const FAIRWAY_ANCHORS: Anchor[] = [
  { hcp: -8, value: 65 },
  { hcp: -6, value: 60 },
  { hcp: 2.5, value: 50 },
  { hcp: 32, value: 40 },
  { hcp: 40, value: 30 },
];

function fairwayToHandicap(fairwayHitPct: number): number {
  return interpolate(fairwayHitPct, FAIRWAY_ANCHORS, true);
}

const EVENNESS_ANCHORS: Anchor[] = [
  { hcp: -8, value: 2 },
  { hcp: -6, value: 3 },
  { hcp: 3, value: 6 },
  { hcp: 15, value: 12 },
  { hcp: 32, value: 22 },
  { hcp: 40, value: 30 },
];

function evennessToHandicap(combinedSdMeters: number): number {
  return interpolate(combinedSdMeters, EVENNESS_ANCHORS, false);
}

/**
 * Jeffreys smoothing för binomiala andelar. Med bara 6 slag är råa
 * procentsatser mycket grova (0, 16,7, 33,3 ...). Den här uppskattningen
 * används endast internt i HCP-modellen; UI/resultat fortsätter visa rådata.
 */
function jeffreysRate(successes: number, attempts: number): number {
  if (attempts <= 0) return 0;
  return ((successes + 0.5) / (attempts + 1)) * 100;
}

function signedSidled(shot: TeeShotInput): number {
  const amount = Math.abs(shot.sidled);
  // Äldre sessioner saknar direction. Positivt värde bevarar deras gamla
  // dispersion och gör migreringen bakåtkompatibel.
  if (shot.direction === "left") return -amount;
  return amount;
}

function scoreFromHandicap(hcp: number): number {
  return Math.round(Math.max(0, Math.min(100, 100 - (hcp + 8) * (100 / 48))));
}

export function handicapLabel(hcp: number): string {
  const v = Math.abs(hcp).toFixed(1).replace(".", ",");
  return hcp < 0 ? `+${v}` : v;
}

export type TeeShotResult = TeeShotInput & {
  index: number;
  outcome: ShotOutcome;
};

export type OffTeeResult = {
  score: number;
  handicap: number;
  breakdown: {
    distanceHcp: number;
    waywardHcp: number;
    fairwayHcp: number;
    evennessHcp: number;
  };
  shots: TeeShotResult[];
  avgTotal: number;
  longest: number;
  /** råa observerade procenttal, inte de smoothing-justerade modellvärdena */
  fairwayHitPct: number;
  waywardPct: number;
  /** genomsnittligt absolut avstånd från mittlinjen */
  avgSidled: number;
  distanceSpread: number;
  /** standardavvikelse på signed vänster/höger-position */
  lateralSpread: number;
};

const DISTANCE_WEIGHT = 0.45;
const WAYWARD_WEIGHT = 0.3;
const FAIRWAY_WEIGHT = 0.15;
const EVENNESS_WEIGHT = 0.1;

export function offTeeResult(shots: TeeShot[]): OffTeeResult {
  const filled = shots.filter((s) => s.filled);
  const results: TeeShotResult[] = filled.map((s) => ({
    index: s.index,
    total: s.total,
    sidled: Math.abs(s.sidled),
    direction: s.direction,
    outcome: shotOutcome(s.sidled),
  }));

  const n = results.length;
  const totals = results.map((r) => r.total);
  const absoluteSidleds = results.map((r) => Math.abs(r.sidled));
  const signedSidleds = results.map(signedSidled);
  const avgTotal = mean(totals);

  const waywardCount = results.filter((r) => r.outcome.isOB).length;
  const fairwayCount = results.filter((r) => r.outcome.inFairway).length;

  const waywardPct = n ? Math.round((waywardCount / n) * 100) : 0;
  const fairwayHitPct = n ? Math.round((fairwayCount / n) * 100) : 0;

  const modelWaywardPct = jeffreysRate(waywardCount, n);
  const modelFairwayPct = jeffreysRate(fairwayCount, n);

  const distanceSd = stdDev(totals);
  const lateralSd = stdDev(signedSidleds);
  const combinedSd = (distanceSd + lateralSd) / 2;

  const distanceHcp = n ? distanceToHandicap(avgTotal) : 0;
  const waywardHcp = n ? waywardToHandicap(modelWaywardPct) : 0;
  const fairwayHcp = n ? fairwayToHandicap(modelFairwayPct) : 0;
  const evennessHcp = n >= 2 ? evennessToHandicap(combinedSd) : distanceHcp;

  const weighted =
    distanceHcp * DISTANCE_WEIGHT +
    waywardHcp * WAYWARD_WEIGHT +
    fairwayHcp * FAIRWAY_WEIGHT +
    evennessHcp * EVENNESS_WEIGHT;

  // Behåll befintligt distance floor oförändrat i denna iteration.
  const floored = Math.max(weighted, distanceHcp - 8);
  const handicap = n ? Math.round(Math.max(-8, Math.min(40, floored)) * 10) / 10 : 0;

  return {
    score: n ? scoreFromHandicap(handicap) : 0,
    handicap,
    breakdown: {
      distanceHcp: Math.round(distanceHcp * 10) / 10,
      waywardHcp: Math.round(waywardHcp * 10) / 10,
      fairwayHcp: Math.round(fairwayHcp * 10) / 10,
      evennessHcp: Math.round(evennessHcp * 10) / 10,
    },
    shots: results,
    avgTotal,
    longest: totals.length ? Math.max(...totals) : 0,
    fairwayHitPct,
    waywardPct,
    avgSidled: mean(absoluteSidleds),
    distanceSpread: Math.round(distanceSd * 10) / 10,
    lateralSpread: Math.round(lateralSd * 10) / 10,
  };
}

export const AVERAGE_GOLFER_METERS = Math.round(224.1 * YD * 10) / 10;
export const PGA_TOUR_AVERAGE_METERS = Math.round(302.8 * YD * 10) / 10;

export function scoreGrade(score: number): "good" | "mid" | "poor" {
  if (score >= 70) return "good";
  if (score >= 45) return "mid";
  return "poor";
}

export type ScoreBand = {
  key: "low" | "mid" | "ok" | "great" | "elite";
  label: string;
  emoji: string;
  text: string;
  bg: string;
  bar: string;
};

const SCORE_BANDS: ScoreBand[] = [
  { key: "low", label: "Låg", emoji: "🔴", text: "text-destructive", bg: "bg-destructive/10", bar: "bg-destructive" },
  { key: "mid", label: "Medel", emoji: "🟠", text: "text-sand", bg: "bg-sand/10", bar: "bg-sand" },
  { key: "ok", label: "Bra", emoji: "🟡", text: "text-flag", bg: "bg-flag/10", bar: "bg-flag" },
  { key: "great", label: "Mycket bra", emoji: "🟢", text: "text-primary", bg: "bg-primary/10", bar: "bg-primary" },
  { key: "elite", label: "Exceptionell", emoji: "⭐", text: "text-chart-4", bg: "bg-chart-4/10", bar: "bg-chart-4" },
];

export function scoreBand(score: number): ScoreBand {
  if (score >= 90) return SCORE_BANDS[4];
  if (score >= 75) return SCORE_BANDS[3];
  if (score >= 60) return SCORE_BANDS[2];
  if (score >= 40) return SCORE_BANDS[1];
  return SCORE_BANDS[0];
}

export type OffTeeAnalysis = {
  strengths: string[];
  improvements: string[];
};

export function analyseOffTee(result: OffTeeResult): OffTeeAnalysis {
  const strengths: string[] = [];
  const improvements: string[] = [];

  if (!result.shots.length) {
    return { strengths: ["Genomför testet för att få din analys."], improvements: [] };
  }

  if (result.avgTotal >= PGA_TOUR_AVERAGE_METERS) {
    strengths.push(
      `Snittlängden (${result.avgTotal.toFixed(0)} m) matchar PGA Tour-snittet (${PGA_TOUR_AVERAGE_METERS.toFixed(0)} m).`,
    );
  } else if (result.avgTotal >= AVERAGE_GOLFER_METERS) {
    strengths.push(`Snittlängden (${result.avgTotal.toFixed(0)} m) slår snittgolfaren.`);
  }

  if (result.fairwayHitPct >= 55) {
    strengths.push(`Stark fairwayträff – ${result.fairwayHitPct} % av slagen i fairway.`);
  }
  if (result.waywardPct === 0) {
    strengths.push("Inga slag Out of Bounds – bra riskhantering.");
  } else if (result.waywardPct <= 15) {
    strengths.push(`Låg OB-andel (${result.waywardPct} %) – nära scratch-nivå.`);
  }
  if (result.breakdown.evennessHcp <= 10) {
    strengths.push(
      `Jämnt slag för slag – både längd (±${result.distanceSpread.toFixed(0)} m) och sidled (±${result.lateralSpread.toFixed(0)} m).`,
    );
  }
  if (!strengths.length) strengths.push(`Längsta drive ${result.longest.toFixed(0)} m i testet.`);

  if (result.waywardPct >= 25) {
    improvements.push(`${result.waywardPct} % av slagen slutade Out of Bounds – det största poängtappet.`);
  }
  if (result.breakdown.evennessHcp >= 20) {
    improvements.push(
      `Spridningen varierar mycket mellan slagen (±${result.distanceSpread.toFixed(0)} m längd, ±${result.lateralSpread.toFixed(0)} m sidled) – jobba på jämnare kontakt.`,
    );
  }
  if (result.fairwayHitPct < 40) {
    improvements.push(`Fairway-träffen (${result.fairwayHitPct} %) ligger under snittet – fler slag i fairway ger enklare andraslag.`);
  }
  if (result.avgTotal < AVERAGE_GOLFER_METERS) {
    const gap = AVERAGE_GOLFER_METERS - result.avgTotal;
    improvements.push(`${gap.toFixed(0)} m kortare än snittgolfaren – mer fart eller bättre center-träff kan hjälpa.`);
  }

  if (!improvements.length && result.score < 97) {
    const weakest = (["distanceHcp", "waywardHcp", "fairwayHcp", "evennessHcp"] as const).reduce(
      (a, b) => (result.breakdown[b] > result.breakdown[a] ? b : a),
    );
    if (weakest === "distanceHcp") {
      improvements.push("Redan starkt – lite mer längd kan sänka handicapet ytterligare.");
    } else if (weakest === "waywardHcp") {
      improvements.push("Redan starkt – fortsätt hålla nere OB-andelen, det väger tyngst efter längd.");
    } else if (weakest === "fairwayHcp") {
      improvements.push("Redan starkt – något högre fairway-träff kan finslipa resultatet.");
    } else {
      improvements.push("Redan starkt – jämnare spridning i längd och sidled kan finslipa resultatet.");
    }
  }

  return { strengths: strengths.slice(0, 3), improvements: improvements.slice(0, 3) };
}
