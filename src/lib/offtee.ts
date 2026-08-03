/**
 * Off the Tee Test – testlogik och beräkningar.
 *
 * 12 slag från tee, ett per hål-scenario (bred/smal fairway, par 4/5,
 * dogleg, risk/reward, kort hål med maxlandningsavstånd). Spelaren väljer
 * klubba (påverkar aldrig score) och matar in carry, totalt avstånd och
 * sidled. Alla beräkningar nedan är rena funktioner utan UI eller lagring.
 */

export type TeeClub = "Driver" | "3-trä" | "Mini driver" | "Drivingjärn" | "Hybrid";

export const TEE_CLUBS: TeeClub[] = ["Driver", "3-trä", "Mini driver", "Drivingjärn", "Hybrid"];

export type Dogleg = "left" | "right" | undefined;

export type TeeHole = {
  /** 1-baserat hålnummer, 1–12 */
  number: number;
  par: 4 | 5;
  /** hålets typ, kort etikett för UI */
  label: string;
  /** hållängd i meter */
  length: number;
  /** halva fairwaybredden i meter */
  fairwayHalfWidth: number;
  /** bredd på ruffen (meter) innan OB, räknat från fairwaykanten */
  roughDepth: number;
  /** lägsta önskade totala längd för fullt poäng (meter) */
  idealMin: number;
  /** maxlandningsavstånd i meter – överskrids det bestraffas slaget hårt */
  maxLandingDistance?: number;
  dogleg?: Dogleg;
  riskReward?: boolean;
  description: string;
};

/** De 12 hål-scenarierna, i spelordning. */
export const TEE_HOLES: TeeHole[] = [
  {
    number: 1,
    par: 5,
    label: "Par 5 – Bred",
    length: 500,
    fairwayHalfWidth: 22,
    roughDepth: 16,
    idealMin: 220,
    description: "Öppen startlinje. Bra tillfälle att slå fritt.",
  },
  {
    number: 2,
    par: 5,
    label: "Par 5 – Standard",
    length: 480,
    fairwayHalfWidth: 17,
    roughDepth: 13,
    idealMin: 220,
    description: "Normalbred fairway, kräver en rimligt rak startlinje.",
  },
  {
    number: 3,
    par: 5,
    label: "Par 5 – Smal",
    length: 510,
    fairwayHalfWidth: 12,
    roughDepth: 10,
    idealMin: 210,
    description: "Trång landningszon – precision viktigare än längd här.",
  },
  {
    number: 4,
    par: 4,
    label: "Par 4 – Bred",
    length: 360,
    fairwayHalfWidth: 24,
    roughDepth: 16,
    idealMin: 200,
    description: "Generös fairway. Passar för en aggressiv linje.",
  },
  {
    number: 5,
    par: 4,
    label: "Par 4 – Standard",
    length: 380,
    fairwayHalfWidth: 17,
    roughDepth: 13,
    idealMin: 210,
    description: "Standardbredd, klassiskt tee-slag.",
  },
  {
    number: 6,
    par: 4,
    label: "Par 4 – Smal",
    length: 350,
    fairwayHalfWidth: 11,
    roughDepth: 9,
    idealMin: 190,
    description: "Smal korridor – kräver kontroll snarare än fart.",
  },
  {
    number: 7,
    par: 4,
    label: "Kort par 4 – Maxlängd",
    length: 300,
    fairwayHalfWidth: 18,
    roughDepth: 14,
    idealMin: 180,
    maxLandingDistance: 260,
    description: "Driven kan nå för långt – överskrid inte 260 m totalt.",
  },
  {
    number: 8,
    par: 4,
    label: "Kort par 4 – Smal & maxlängd",
    length: 290,
    fairwayHalfWidth: 10,
    roughDepth: 9,
    idealMin: 170,
    maxLandingDistance: 250,
    description: "Både smalt och kort – välj klubba efter kontroll.",
  },
  {
    number: 9,
    par: 4,
    label: "Dogleg vänster",
    length: 370,
    fairwayHalfWidth: 14,
    roughDepth: 12,
    idealMin: 200,
    dogleg: "left",
    description: "Hålet kröker vänster – räta linjer straffas i ytterkurvan.",
  },
  {
    number: 10,
    par: 4,
    label: "Dogleg höger",
    length: 390,
    fairwayHalfWidth: 14,
    roughDepth: 12,
    idealMin: 210,
    dogleg: "right",
    description: "Hålet kröker höger – räta linjer straffas i ytterkurvan.",
  },
  {
    number: 11,
    par: 4,
    label: "Risk & reward",
    length: 340,
    fairwayHalfWidth: 12,
    roughDepth: 8,
    idealMin: 230,
    riskReward: true,
    description: "Kort men smal genväg – stor belöning för ett vågat, träffsäkert slag.",
  },
  {
    number: 12,
    par: 4,
    label: "Avslutande balanserat hål",
    length: 400,
    fairwayHalfWidth: 16,
    roughDepth: 13,
    idealMin: 215,
    description: "Ett representativt, balanserat avslutande tee-slag.",
  },
];

export const OFFTEE_TOTAL_SHOTS = TEE_HOLES.length;

/** Rådata för ett slag – samma form oavsett datakälla. */
export type TeeShotInput = {
  club: TeeClub;
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
  hole: TeeHole;
  filled: boolean;
};

/** Tom serie i rätt spelordning – ett slag per hål. */
export function emptyTeeShots(): TeeShot[] {
  return TEE_HOLES.map((hole, i) => ({
    index: i + 1,
    hole,
    club: "Driver" as TeeClub,
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
 * Missbedömning per slag
 * ---------------------------------------------------------------------- */

export type ShotOutcome = {
  /** true om slaget landade i fairwayn */
  inFairway: boolean;
  /** true om slaget landade i ruffen (mellan fairway och OB) */
  inRough: boolean;
  /** true om slaget är Out of Bounds */
  isOB: boolean;
  /** true om totala avståndet överskred hålets maxlandningsavstånd */
  exceededMax: boolean;
};

export function shotOutcome(shot: Pick<TeeShot, "hole" | "offline" | "total">): ShotOutcome {
  const absOffline = Math.abs(shot.offline);
  const inFairway = absOffline <= shot.hole.fairwayHalfWidth;
  const isOB = absOffline > shot.hole.fairwayHalfWidth + shot.hole.roughDepth;
  const inRough = !inFairway && !isOB;
  const exceededMax =
    shot.hole.maxLandingDistance !== undefined && shot.total > shot.hole.maxLandingDistance;
  return { inFairway, inRough, isOB, exceededMax };
}

/**
 * Basscore 0–100 utifrån var slaget landar. Platt inom fairwayn – på riktiga
 * banan spelar det ingen roll var i en fairway bollen ligger, så vi belönar
 * inte extra precision mot mitten. Sjunkande i ruffen, och lågt/platt vid OB.
 */
function tierBaseScore(offline: number, hole: TeeHole): number {
  const abs = Math.abs(offline);
  if (abs <= hole.fairwayHalfWidth) return 72;
  const roughT = Math.min(1, (abs - hole.fairwayHalfWidth) / hole.roughDepth);
  return 55 - roughT * 33;
}

/**
 * Explicit längdbonus/-avdrag. Slag som når minst idealMin ger bonus upp
 * till +28, kortare slag ger ett litet avdrag. Detta är den enda platsen
 * längd påverkar scoren – och den är oberoende av träffsäkerhet.
 */
function lengthBonus(total: number, hole: TeeHole): number {
  const diff = total - hole.idealMin;
  if (diff >= 0) return Math.min(28, diff * 0.35);
  return Math.max(-12, diff * 0.5);
}

/**
 * Score 0–100 för ett enskilt slag.
 * - OB: platt, hård bestraffning (5) – oavsett hur långt slaget gick.
 * - Överskridet maxlandningsavstånd: score cappas hårt (25).
 * - Annars: fairway/ruff-nivå + längdbonus, så en bra score alltid
 *   motsvarar ett slag som faktiskt går att spela vidare från på banan.
 */
export function teeShotScore(shot: Pick<TeeShot, "hole" | "total" | "offline">): number {
  const outcome = shotOutcome(shot);
  if (outcome.isOB) return 5;

  const score = tierBaseScore(shot.offline, shot.hole) + lengthBonus(shot.total, shot.hole);
  if (outcome.exceededMax) return Math.round(Math.max(0, Math.min(25, score)));
  return Math.round(Math.max(0, Math.min(100, score)));
}

/* -------------------------------------------------------------------------
 * Sammanställning, score och handicapskattning
 * ---------------------------------------------------------------------- */

export type TeeShotResult = {
  index: number;
  hole: TeeHole;
  club: TeeClub;
  total: number;
  carry: number;
  offline: number;
  score: number;
  outcome: ShotOutcome;
};

export type OffTeeResult = {
  /** Off the Tee Score 0–100 */
  score: number;
  /** Estimerat Off the Tee-handicap */
  handicap: number;
  shots: TeeShotResult[];
  avgTotal: number;
  avgCarry: number;
  longest: number;
  fairwayHitPct: number;
  obPct: number;
  avgOffline: number;
  leftPct: number;
  rightPct: number;
  distanceConsistency: number;
};

/** Handicap-skattning ur score 0–100, samma princip som Approach Test. */
function handicapFromScore(score: number): number {
  return Math.max(-4, Math.min(36, Math.round((100 - score) * 0.42 * 10) / 10));
}

export function handicapLabel(hcp: number): string {
  const v = Math.abs(hcp).toFixed(1).replace(".", ",");
  return hcp < 0 ? `+${v}` : v;
}

export function offTeeResult(shots: TeeShot[]): OffTeeResult {
  const filled = shots.filter((s) => s.filled);
  const results: TeeShotResult[] = filled.map((s) => ({
    index: s.index,
    hole: s.hole,
    club: s.club,
    total: s.total,
    carry: s.carry,
    offline: s.offline,
    score: teeShotScore(s),
    outcome: shotOutcome(s),
  }));

  const n = results.length || 1;
  const avgScore = results.length ? mean(results.map((r) => r.score)) : 0;
  const totals = results.map((r) => r.total);

  return {
    score: Math.round(avgScore),
    handicap: results.length ? handicapFromScore(avgScore) : 0,
    shots: results,
    avgTotal: mean(totals),
    avgCarry: mean(results.map((r) => r.carry)),
    longest: totals.length ? Math.max(...totals) : 0,
    fairwayHitPct: Math.round((results.filter((r) => r.outcome.inFairway).length / n) * 100),
    obPct: Math.round((results.filter((r) => r.outcome.isOB).length / n) * 100),
    avgOffline: mean(results.map((r) => Math.abs(r.offline))),
    leftPct: Math.round((results.filter((r) => r.offline < -1).length / n) * 100),
    rightPct: Math.round((results.filter((r) => r.offline > 1).length / n) * 100),
    distanceConsistency: results.length
      ? Math.round(100 - Math.min(100, (stdDev(totals) / (mean(totals) || 1)) * 100))
      : 0,
  };
}

/** Statistik grupperad per vald klubba – informativ, påverkar aldrig score. */
export type ClubStat = {
  club: TeeClub;
  count: number;
  avgTotal: number;
  avgScore: number;
  fairwayHitPct: number;
};

export function clubStats(result: OffTeeResult): ClubStat[] {
  return TEE_CLUBS.map((club) => {
    const shots = result.shots.filter((s) => s.club === club);
    const n = shots.length || 1;
    return {
      club,
      count: shots.length,
      avgTotal: mean(shots.map((s) => s.total)),
      avgScore: mean(shots.map((s) => s.score)),
      fairwayHitPct: shots.length
        ? Math.round((shots.filter((s) => s.outcome.inFairway).length / n) * 100)
        : 0,
    };
  }).filter((c) => c.count > 0);
}

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
 * Analys – styrkor, förbättringsområden, distanskontroll
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

  if (result.fairwayHitPct >= 65) {
    strengths.push(`Stark fairwayträff – ${result.fairwayHitPct} % av slagen i fairway.`);
  }
  if (result.avgTotal >= 230) {
    strengths.push(`Bra längd – snitt ${result.avgTotal.toFixed(0)} m totalt.`);
  }
  if (result.distanceConsistency >= 65) {
    strengths.push(`Jämn distanskontroll genom hela testet (${result.distanceConsistency}/100).`);
  }
  if (result.obPct === 0) {
    strengths.push("Inga slag Out of Bounds – bra riskhantering.");
  }
  const doglegShots = result.shots.filter((s) => s.hole.dogleg);
  if (doglegShots.length) {
    const doglegAvg = mean(doglegShots.map((s) => s.score));
    if (doglegAvg >= 65) {
      strengths.push(`Hanterar dogleg-hål väl (snitt ${Math.round(doglegAvg)}/100).`);
    }
  }
  if (!strengths.length) {
    const best = [...result.shots].sort((a, b) => b.score - a.score)[0];
    if (best) strengths.push(`Bäst på ${best.hole.label} (${best.score}/100).`);
  }

  if (result.obPct > 0) {
    improvements.push(
      `${result.obPct} % av slagen slutade Out of Bounds – det största poängtappet.`,
    );
  }
  if (result.leftPct >= 45 && result.leftPct > result.rightPct) {
    improvements.push(`Majoriteten av missarna går vänster (${result.leftPct} %).`);
  } else if (result.rightPct >= 45 && result.rightPct > result.leftPct) {
    improvements.push(`Majoriteten av missarna går höger (${result.rightPct} %).`);
  }
  const maxHoles = result.shots.filter((s) => s.hole.maxLandingDistance !== undefined);
  const exceeded = maxHoles.filter((s) => s.outcome.exceededMax);
  if (exceeded.length) {
    improvements.push(
      `${exceeded.length} av ${maxHoles.length} korta hål gick över maxlandningsavståndet.`,
    );
  }
  if (result.distanceConsistency < 50 && result.distanceConsistency > 0) {
    improvements.push("Distanskontrollen varierar mycket mellan slagen.");
  }
  if (result.avgTotal < 200) {
    improvements.push("Öka den spelbara längden – snittet ligger under en konkurrenskraftig nivå.");
  }

  return { strengths: strengths.slice(0, 3), improvements: improvements.slice(0, 3) };
}
