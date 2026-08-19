/**
 * Off the Tee Test HCP-modell v3 — "shot-level model".
 *
 * Historik (för framtida underhåll):
 * v1/v2 delade in varje slag i fairway/rough/OB (kategoriskt) och vägde
 * ihop fyra separata komponenter (längd 45%, wayward% 30%, fairway% 15%,
 * jämnhet 10%) plus ett artificiellt golv (handicap >= distanceHcp - 8)
 * för att förhindra att bra riktning "köpte tillbaka" för mycket poäng
 * från ett kort slag. Granskning visade två problem: (1) en spelare med
 * perfekt riktning men måttlig längd kunde tvingas från ett rimligt
 * viktat resultat (~12) upp till 24 av golvet – en förändring på över
 * 12 slag, och (2) en spelare med 100% slag OB men lång längd kunde få
 * BÄTTRE HCP än en kort-men-perfekt spelare – en ren invertering, eftersom
 * kategoriseringen (fairway/rough/OB) inte skiljde en stabil ensidig miss
 * (t.ex. +15,+16,+14,+15,+17,+14 m) från en stor tvåvägsspridning
 * (-15,+16,-14,+15,-17,+14 m) – båda gav samma |sidled|-baserade straff
 * trots att den senare är ett betydligt sämre mönster.
 *
 * v3 löser båda: varje slag får ett eget shotHcp (kontinuerlig funktion
 * av längd OCH sidled, inget hink-hopp vid fairwaykanten), sedan läggs en
 * liten korrigering på för konsekvent bias (samma riktning varje gång,
 * mildare straff) och en större för dispersion (spretande båda hållen,
 * hårdare straff). Inget artificiellt golv behövs – avvägningen mellan
 * längd och träffsäkerhet ligger redan i varje enskilt slags 55/45-vikt.
 */

/** Standardiserad fairway – samma för alla 6 slag. Används för shotOutcome
 *  (fairway/rough/OB, ren rapport-statistik, bygger inte längre HCP:t) och
 *  som referensskala för accuracyToHandicap. */
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

/** Ren rapport-statistik (fairway/rough/OB-andelar visas fortfarande i
 *  resultatet), bygger INTE längre Driving HCP i v3. */
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

/** Längd-HCP för ETT enskilt slag – samma ankare som tidigare, oförändrade. */
export function distanceToHandicap(avgTotalMeters: number): number {
  return interpolate(avgTotalMeters, DISTANCE_ANCHORS, true);
}

const ACCURACY_ANCHORS: Anchor[] = [
  { hcp: -6, value: 0 },
  { hcp: 2.5, value: FAIRWAY.halfWidth },
  { hcp: 20, value: FAIRWAY.halfWidth + FAIRWAY.roughDepth / 2 },
  { hcp: 40, value: FAIRWAY.halfWidth + FAIRWAY.roughDepth },
];

/** Träffsäkerhets-HCP för ETT enskilt slag – kontinuerlig funktion av
 *  |sidled|, inget hopp vid fairwaykanten (27,9 m och 28,1 m ger nästan
 *  identiskt värde). */
function accuracyToHandicap(sidledMeters: number): number {
  return interpolate(Math.abs(sidledMeters), ACCURACY_ANCHORS, false);
}

/**
 * HCP-motsvarighet för ETT enskilt slag – kärnan i v4-modellen. 55% längd,
 * 45% träffsäkerhet (rawShotHcp), plus två tillägg som täpper till de två
 * kvarvarande svagheterna som identifierades vid granskning av v3:
 *
 * 1. Soft distance protection (softDistanceProtection): utan den kunde
 *    extremt korta men perfekt raka slag (t.ex. 50 m, 0 m sidled) "köpa
 *    tillbaka" nästan hela längdstraffet med bara träffsäkerhet – sex sådana
 *    slag gav tidigare Driving HCP ~19, alldeles för bra. Det är INTE
 *    samma sak som v1/v2:s gamla hårda golv (handicap >= distanceHcp - 8,
 *    applicerat EFTER viktning på aggregatnivå) – den nya skyddet är
 *    kontinuerligt, PER SLAG, och graderat efter hur dåligt distanceHcp
 *    faktiskt är (obegränsat vid bra/normal längd, gradvis mer begränsat
 *    ju kortare slaget är).
 *
 * 2. Severe miss penalty (severeMissPenalty): accuracyToHandicap:s ankare
 *    slutar vid 28 m (fairwaykant + ruff), så tidigare kunde 30 m offline
 *    och 100 m offline ge nästan identisk träffsäkerhets-HCP – sex slag på
 *    300 m/100 m offline gav tidigare Driving HCP ~15-16, alldeles för
 *    bra för en så extrem miss. Straffet är kontinuerligt och BÖRJAR
 *    exakt där accuracyToHandicap redan planar ut (28 m), så det finns
 *    fortfarande inget hopp vid fairwaykanten (27,9 m och 28,1 m ger
 *    fortfarande nästan identiskt resultat) – det är bara det att
 *    missar bortom det inte längre behandlas som "lika dåliga".
 *
 * Interna mellanvärden avrundas INTE – bara det slutgiltiga handicapet
 * (och andra UI-visade tal) avrundas, för att undvika att sex separata
 * avrundningar ackumulerar en liten men onödig snedvridning.
 */

/** Hur många HCP-enheter får träffsäkerhet som mest "köpa tillbaka" från
 *  ett dåligt distanceHcp? Obegränsat (i praktiken) vid bra/normal längd,
 *  gradvis mer begränsat mot den sämsta änden av skalan. */
function maxAccuracyBuyBack(distanceHcp: number): number {
  if (distanceHcp <= 15) return 20;
  if (distanceHcp >= 38) return 3;
  const t = (distanceHcp - 15) / (38 - 15);
  return 20 - t * (20 - 3);
}

function softDistanceProtection(distanceHcp: number, rawShotHcp: number): number {
  const floor = distanceHcp - maxAccuracyBuyBack(distanceHcp);
  return Math.max(rawShotHcp, floor);
}

/** Kontinuerligt tilläggsstraff för extrema missar bortom där
 *  accuracyToHandicap redan planar ut (28 m). Noll upp till exakt 28 m
 *  (ingen påverkan på den redan verifierade kontinuiteten där), sedan
 *  stegvis brantare: 28–40 m växer snabbast, 40–60 m fortsätter växa,
 *  60 m+ planar ut igen (hårt men takat straff, inte oändligt). */
function severeMissPenalty(sidledMeters: number): number {
  const a = Math.abs(sidledMeters);
  if (a <= 28) return 0;
  if (a <= 40) return ((a - 28) / (40 - 28)) * 8;
  if (a <= 60) return 8 + ((a - 40) / (60 - 40)) * 8;
  return 16 + Math.min(4, ((a - 60) / 20) * 4);
}

export function shotHandicap(shot: { total: number; sidled: number }): number {
  const distanceHcp = distanceToHandicap(shot.total);
  const accuracyHcp = accuracyToHandicap(shot.sidled);
  const raw = distanceHcp * 0.55 + accuracyHcp * 0.45;
  const protectedHcp = softDistanceProtection(distanceHcp, raw);
  return protectedHcp + severeMissPenalty(shot.sidled);
}

/**
 * Bias-korrigering: |medelvärdet av signerade sidled-värden|. Dödzon 0–5 m
 * (ett konsekvent litet mönster kostar inget extra – redan fångat i varje
 * slags egen accuracyHcp), sedan gradvis straff, takat vid 2 HCP. Ett
 * stabilt ensidigt mönster är reproducerbart och ska inte straffas hårt.
 */
function biasPenalty(biasMeters: number): number {
  const b = Math.abs(biasMeters);
  if (b <= 5) return 0;
  return Math.min(2, ((b - 5) / 15) * 2);
}

/**
 * Dispersion-korrigering: standardavvikelsen på de SIGNERADE sidled-
 * värdena. Dödzon 0–3 m, sedan gradvis straff, takat vid 4 HCP – tyngre
 * än bias-straffet, eftersom en spelare som spretar åt båda hållen är
 * svårare att spela runt än en med ett stabilt, förutsägbart mönster.
 * Det här är vad som skiljer +15,+16,+14,+15,+17,+14 m (låg dispersion,
 * bara bias) från -15,+16,-14,+15,-17,+14 m (hög dispersion) trots att
 * |sidled| är likvärdigt slag för slag i bägge fallen.
 */
function dispersionPenalty(dispersionMeters: number): number {
  if (dispersionMeters <= 3) return 0;
  return Math.min(4, ((dispersionMeters - 3) / 17) * 4);
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

/** Positivt = höger, negativt = vänster. Äldre sessioner saknar direction
 *  och behandlas som höger – bevarar deras gamla dispersion-tecken så
 *  bias/dispersion-beräkningen fortfarande ger ett sammanhängande resultat
 *  för migrerad data, om än inte nödvändigtvis numeriskt identiskt med
 *  v1/v2 (helt annan formel). */
function signedSidled(shot: TeeShotInput): number {
  const amount = Math.abs(shot.sidled);
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
  /** medelvärdet av alla shotHcp_i, innan bias/dispersion-korrigering */
  baseHcp: number;
  /** |medelvärdet av signerade sidled-värden|, i meter */
  bias: number;
  /** standardavvikelse på signerade sidled-värden, i meter */
  dispersion: number;
  biasPenalty: number;
  dispersionPenalty: number;
  shots: TeeShotResult[];
  avgTotal: number;
  longest: number;
  /** rena rapport-procenttal, bygger inte HCP:t i v3 */
  fairwayHitPct: number;
  waywardPct: number;
  /** genomsnittligt absolut avstånd från mittlinjen */
  avgSidled: number;
  distanceSpread: number;
  /** = dispersion, kvar för bakåtkompatibel namngivning i UI */
  lateralSpread: number;
};

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
  const signedSidleds = filled.map(signedSidled);
  const avgTotal = mean(totals);

  const waywardCount = results.filter((r) => r.outcome.isOB).length;
  const fairwayCount = results.filter((r) => r.outcome.inFairway).length;
  const waywardPct = n ? Math.round((waywardCount / n) * 100) : 0;
  const fairwayHitPct = n ? Math.round((fairwayCount / n) * 100) : 0;

  const shotHcps = filled.map((s) => shotHandicap({ total: s.total, sidled: s.sidled }));
  const baseHcp = n ? mean(shotHcps) : 0;
  const bias = n ? Math.abs(mean(signedSidleds)) : 0;
  const dispersion = n >= 2 ? stdDev(signedSidleds) : 0;
  const bp = biasPenalty(bias);
  const dp = dispersionPenalty(dispersion);

  const handicap = n ? Math.round(Math.max(-8, Math.min(40, baseHcp + bp + dp)) * 10) / 10 : 0;

  return {
    score: n ? scoreFromHandicap(handicap) : 0,
    handicap,
    baseHcp: Math.round(baseHcp * 10) / 10,
    bias: Math.round(bias * 10) / 10,
    dispersion: Math.round(dispersion * 10) / 10,
    biasPenalty: Math.round(bp * 10) / 10,
    dispersionPenalty: Math.round(dp * 10) / 10,
    shots: results,
    avgTotal,
    longest: totals.length ? Math.max(...totals) : 0,
    fairwayHitPct,
    waywardPct,
    avgSidled: mean(absoluteSidleds),
    distanceSpread: Math.round(stdDev(totals) * 10) / 10,
    lateralSpread: Math.round(dispersion * 10) / 10,
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
  {
    key: "low",
    label: "Låg",
    emoji: "🔴",
    text: "text-destructive",
    bg: "bg-destructive/10",
    bar: "bg-destructive",
  },
  { key: "mid", label: "Medel", emoji: "🟠", text: "text-sand", bg: "bg-sand/10", bar: "bg-sand" },
  { key: "ok", label: "Bra", emoji: "🟡", text: "text-flag", bg: "bg-flag/10", bar: "bg-flag" },
  {
    key: "great",
    label: "Mycket bra",
    emoji: "🟢",
    text: "text-primary",
    bg: "bg-primary/10",
    bar: "bg-primary",
  },
  {
    key: "elite",
    label: "Exceptionell",
    emoji: "⭐",
    text: "text-chart-4",
    bg: "bg-chart-4/10",
    bar: "bg-chart-4",
  },
];

export function scoreBand(score: number): ScoreBand {
  if (score >= 90) return SCORE_BANDS[4];
  if (score >= 75) return SCORE_BANDS[3];
  if (score >= 60) return SCORE_BANDS[2];
  if (score >= 40) return SCORE_BANDS[1];
  return SCORE_BANDS[0];
}
