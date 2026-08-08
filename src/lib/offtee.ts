/**
 * Off the Tee Test – testlogik och beräkningar.
 *
 * Standardiserat test: 6 drives mot samma fairway. Spelaren matar bara in
 * tre tal per slag – carry, totalt avstånd och sidled från mitten. Ingen
 * klubba, inga varierande hål. Driving Handicap byggs av tre delar –
 * längd, wayward-andel (OB) och konsekvens – där längd och wayward-andel
 * är kalibrerade mot Arccos "Driving Distance Report" (2026 edition,
 * ~10 miljoner tee-slag): https://uploads.mygolfspy.com/uploads/2026/05/ArccosDrivingDistanceReport_2026Edition.pdf
 *
 * Nyckeltal därifrån (män, alla åldrar):
 * - HCP 0–4,9: snitt 244 yards (~223 m) totalt
 * - Alla golfare (snitt): 224,1 yards (~205 m)
 * - HCP 30+: snitt 181 yards (~165 m)
 * - "Wayward"-andel (OB/plugg/tvingad layup): ~12 % för scratch, ~45 % för 30+ hcp
 *   – en betydligt starkare skiljelinje mellan nivåer än ren fairwayträff (bara 10 pp).
 *
 * Alla beräkningar nedan är rena funktioner utan UI eller lagring.
 */

/** Standardiserad fairway – samma för alla 6 slag. */
export const FAIRWAY = {
  /** halva fairwaybredden i meter (≈ 32 m fairway totalt) */
  halfWidth: 16,
  /** ruffens bredd i meter innan OB, räknat från fairwaykanten */
  roughDepth: 12,
};

export const OFFTEE_TOTAL_SHOTS = 6;

/** Rådata för ett slag. */
export type TeeShotInput = {
  /** carry i meter */
  carry: number;
  /** totalt avstånd (carry + rull) i meter */
  total: number;
  /** sidled i meter, negativt = vänster, positivt = höger */
  offline: number;
};

export type TeeShot = TeeShotInput & {
  /** 1-baserat slagnummer, 1–12 */
  index: number;
  filled: boolean;
};

/** Tom serie i rätt spelordning. */
export function emptyTeeShots(): TeeShot[] {
  return Array.from({ length: OFFTEE_TOTAL_SHOTS }, (_, i) => ({
    index: i + 1,
    carry: 0,
    total: 0,
    offline: 0,
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

/* -------------------------------------------------------------------------
 * Missbedömning per slag – mot den standardiserade fairwayn
 * ---------------------------------------------------------------------- */

export type ShotOutcome = {
  inFairway: boolean;
  inRough: boolean;
  isOB: boolean;
};

export function shotOutcome(offline: number): ShotOutcome {
  const abs = Math.abs(offline);
  const inFairway = abs <= FAIRWAY.halfWidth;
  const isOB = abs > FAIRWAY.halfWidth + FAIRWAY.roughDepth;
  const inRough = !inFairway && !isOB;
  return { inFairway, inRough, isOB };
}

/* -------------------------------------------------------------------------
 * Piecewise-linjär interpolation mellan handicap-ankare
 * ---------------------------------------------------------------------- */

type Anchor = { hcp: number; value: number };

/** Generisk interpolation: `value` kan öka eller minska monotont med hcp. */
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

/** Yards → meter. */
const YD = 0.9144;

/**
 * Längd → handicap, kalibrerat mot verklig data i båda ändar:
 * - PGA Tour-snitt 2025: 302,8 yards → cirka +6 hcp (Tour-spelare ligger
 *   normalt runt +5 till +7)
 * - Topp-hitters på Tour (~320 yd, t.ex. Cameron Champ 321,4 yd 2022)
 *   extrapoleras naturligt till cirka +8
 * - Amatördata från Arccos 2026: HCP 0–4,9 ≈ 244 yd, snitt alla golfare
 *   ≈ 224,1 yd, HCP 30+ ≈ 181 yd
 */
const DISTANCE_ANCHORS: Anchor[] = [
  { hcp: -8, value: 292.0 },
  { hcp: -6, value: 302.8 * YD },
  { hcp: 2.5, value: 244 * YD },
  { hcp: 15, value: 224.1 * YD },
  { hcp: 32, value: 181 * YD },
  { hcp: 40, value: 147.0 },
];

function distanceToHandicap(avgTotalMeters: number): number {
  return interpolate(avgTotalMeters, DISTANCE_ANCHORS, true);
}

/**
 * Wayward-andel (OB) → handicap. Arccos-rapporten: scratch-golfare har
 * ~12 % wayward-slag, 30+ hcp ~45 %. Betydligt starkare skiljelinje mellan
 * nivåer än ren fairwayträff, så den väger tungt i modellen. Högre andel
 * OB → högre handicap.
 */
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

/**
 * Fairway-träff % → handicap, egen kategori skild från OB. Arccos-rapporten:
 * scratch-golfare träffar fairway ~50 % av gångerna, 30+ hcp ~40 %. PGA
 * Tour-snittet ligger på ~60 %. En riktig miss i ruffen kostar historiskt
 * betydligt mindre än en OB (Broadie: ~0,3–0,5 slag mot 2+ slag för OB),
 * så den här kategorin väger klart lägre än OB-andelen.
 */
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

/**
 * Jämnhet (spridning i både totalt avstånd OCH sidled mellan slagen) →
 * handicap. Ingen extern datakälla för detta – en rimlig egen skattning:
 * jämnare kontakt ger mindre variation i både längd och riktning slag för
 * slag. Kombinerar de två spridningsmåtten till ett medelvärde i meter.
 */
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

/** Handicap → 0–100 Off the Tee Score, för rubrik/kort. Spänner -8 till 40. */
function scoreFromHandicap(hcp: number): number {
  return Math.round(Math.max(0, Math.min(100, 100 - (hcp + 8) * (100 / 48))));
}

export function handicapLabel(hcp: number): string {
  const v = Math.abs(hcp).toFixed(1).replace(".", ",");
  return hcp < 0 ? `+${v}` : v;
}

/* -------------------------------------------------------------------------
 * Sammanställning
 * ---------------------------------------------------------------------- */

export type TeeShotResult = TeeShotInput & {
  index: number;
  outcome: ShotOutcome;
};

export type OffTeeResult = {
  /** Off the Tee Score 0–100, härlett ur Driving Handicap */
  score: number;
  /** Estimerat Driving Handicap */
  handicap: number;
  /** de fyra delarna som bygger handicapet, för transparens i rapporten */
  breakdown: { distanceHcp: number; waywardHcp: number; fairwayHcp: number; evennessHcp: number };
  shots: TeeShotResult[];
  avgTotal: number;
  avgCarry: number;
  longest: number;
  fairwayHitPct: number;
  waywardPct: number;
  avgOffline: number;
  leftPct: number;
  rightPct: number;
  /** spridning i totalt avstånd mellan slagen, meter (lägre = jämnare) */
  distanceSpread: number;
  /** spridning i sidled mellan slagen, meter (lägre = jämnare) */
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
    carry: s.carry,
    offline: s.offline,
    outcome: shotOutcome(s.offline),
  }));

  const n = results.length || 1;
  const totals = results.map((r) => r.total);
  const offlines = results.map((r) => r.offline);
  const avgTotal = mean(totals);
  const waywardPct = Math.round((results.filter((r) => r.outcome.isOB).length / n) * 100);
  const fairwayHitPct = Math.round((results.filter((r) => r.outcome.inFairway).length / n) * 100);
  const distanceSd = stdDev(totals);
  const lateralSd = stdDev(offlines);
  const combinedSd = (distanceSd + lateralSd) / 2;

  const distanceHcp = results.length ? distanceToHandicap(avgTotal) : 0;
  const waywardHcp = results.length ? waywardToHandicap(waywardPct) : 0;
  const fairwayHcp = results.length ? fairwayToHandicap(fairwayHitPct) : 0;
  const evennessHcp = results.length >= 2 ? evennessToHandicap(combinedSd) : distanceHcp;

  const handicap = results.length
    ? Math.round(
        Math.max(
          -8,
          Math.min(
            40,
            distanceHcp * DISTANCE_WEIGHT +
              waywardHcp * WAYWARD_WEIGHT +
              fairwayHcp * FAIRWAY_WEIGHT +
              evennessHcp * EVENNESS_WEIGHT,
          ),
        ) * 10,
      ) / 10
    : 0;

  return {
    score: results.length ? scoreFromHandicap(handicap) : 0,
    handicap,
    breakdown: {
      distanceHcp: Math.round(distanceHcp * 10) / 10,
      waywardHcp: Math.round(waywardHcp * 10) / 10,
      fairwayHcp: Math.round(fairwayHcp * 10) / 10,
      evennessHcp: Math.round(evennessHcp * 10) / 10,
    },
    shots: results,
    avgTotal,
    avgCarry: mean(results.map((r) => r.carry)),
    longest: totals.length ? Math.max(...totals) : 0,
    fairwayHitPct,
    waywardPct,
    avgOffline: mean(results.map((r) => Math.abs(r.offline))),
    leftPct: Math.round((results.filter((r) => r.offline < -1).length / n) * 100),
    rightPct: Math.round((results.filter((r) => r.offline > 1).length / n) * 100),
    distanceSpread: Math.round(distanceSd * 10) / 10,
    lateralSpread: Math.round(lateralSd * 10) / 10,
  };
}

/** Snittgolfarens speldistans, i meter. */
export const AVERAGE_GOLFER_METERS = Math.round(224.1 * YD * 10) / 10;

/** PGA Tour-snitt driving distance, i meter. */
export const PGA_TOUR_AVERAGE_METERS = Math.round(302.8 * YD * 10) / 10;

/** Färgnivå för score: grön/gul/röd, delar skala med Approach Test. */
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

/* -------------------------------------------------------------------------
 * Analys – styrkor och förbättringsområden
 * ---------------------------------------------------------------------- */

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
  if (!strengths.length) {
    strengths.push(`Längsta drive ${result.longest.toFixed(0)} m i testet.`);
  }

  if (result.waywardPct >= 25) {
    improvements.push(
      `${result.waywardPct} % av slagen slutade Out of Bounds – det största poängtappet.`,
    );
  }
  if (result.leftPct >= 45 && result.leftPct > result.rightPct) {
    improvements.push(`Majoriteten av missarna går vänster (${result.leftPct} %).`);
  } else if (result.rightPct >= 45 && result.rightPct > result.leftPct) {
    improvements.push(`Majoriteten av missarna går höger (${result.rightPct} %).`);
  }
  if (result.breakdown.evennessHcp >= 20) {
    improvements.push(
      `Spridningen varierar mycket mellan slagen (±${result.distanceSpread.toFixed(0)} m längd, ±${result.lateralSpread.toFixed(0)} m sidled) – jobba på jämnare kontakt.`,
    );
  }
  if (result.fairwayHitPct < 40) {
    improvements.push(
      `Fairway-träffen (${result.fairwayHitPct} %) ligger under snittet – fler slag i fairway ger enklare andraslag.`,
    );
  }
  if (result.avgTotal < AVERAGE_GOLFER_METERS) {
    const gap = AVERAGE_GOLFER_METERS - result.avgTotal;
    improvements.push(
      `${gap.toFixed(0)} m kortare än snittgolfaren – mer fart eller bättre center-träff kan hjälpa.`,
    );
  }

  // Även starka resultat ska ge något att jobba vidare på, om det inte redan är perfekt.
  if (!improvements.length && result.score < 97) {
    const weakest = (["distanceHcp", "waywardHcp", "fairwayHcp", "evennessHcp"] as const).reduce(
      (a, b) => (result.breakdown[b] > result.breakdown[a] ? b : a),
    );
    if (weakest === "distanceHcp") {
      improvements.push("Redan starkt – lite mer längd kan sänka handicapet ytterligare.");
    } else if (weakest === "waywardHcp") {
      improvements.push(
        "Redan starkt – fortsätt hålla nere OB-andelen, det väger tyngst efter längd.",
      );
    } else if (weakest === "fairwayHcp") {
      improvements.push("Redan starkt – något högre fairway-träff kan finslipa resultatet.");
    } else {
      improvements.push(
        "Redan starkt – jämnare spridning i längd och sidled kan finslipa resultatet.",
      );
    }
  }

  return { strengths: strengths.slice(0, 3), improvements: improvements.slice(0, 3) };
}
