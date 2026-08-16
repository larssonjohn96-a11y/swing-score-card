/**
 * Approach Precision Test – testlogik och beräkningar.
 *
 * 5 slag: 5 målavstånd × 1 varv. Spelaren matar in carry och sidled
 * (manuellt eller, i framtiden, automatiskt från en launch monitor).
 * Alla beräkningar nedan är rena funktioner utan UI eller lagring.
 */

/** Målavstånd i meter, i den ordning de spelas. */
export const PRECISION_TARGETS = [50, 75, 100, 125, 150] as const;
export const PRECISION_ROUNDS = 1;
export const PRECISION_TOTAL_SHOTS = PRECISION_TARGETS.length * PRECISION_ROUNDS;

/** Utökat test – för erfarna spelare som vill ha ett djupare underlag: de
 *  ursprungliga nio avstånden, två varv, 18 slag totalt. */
export const EXTENDED_PRECISION_TARGETS = [55, 64, 73, 82, 91, 110, 128, 146, 165] as const;
export const EXTENDED_PRECISION_ROUNDS = 2;
export const EXTENDED_PRECISION_TOTAL_SHOTS =
  EXTENDED_PRECISION_TARGETS.length * EXTENDED_PRECISION_ROUNDS;

/** Rådata för ett slag – samma form oavsett datakälla. */
export type ShotInput = {
  /** carry i meter */
  carry: number;
  /** sidled i meter, negativt = vänster, positivt = höger */
  offline: number;
};

export type PrecisionShot = ShotInput & {
  /** 1-baserat slagnummer */
  index: number;
  round: number;
  target: number;
  /** true när slaget är registrerat */
  filled: boolean;
};

/** Tom serie i rätt spelordning. Utan argument: huvudtestet (5 slag).
 *  Skicka EXTENDED_PRECISION_TARGETS/EXTENDED_PRECISION_ROUNDS för det
 *  utökade 18-slagstestet. */
export function emptyPrecisionShots(
  targets: readonly number[] = PRECISION_TARGETS,
  rounds: number = PRECISION_ROUNDS,
): PrecisionShot[] {
  const shots: PrecisionShot[] = [];
  let index = 0;
  for (let round = 1; round <= rounds; round += 1) {
    for (const target of targets) {
      index += 1;
      shots.push({ index, round, target, carry: 0, offline: 0, filled: false });
    }
  }
  return shots;
}

/** Längdfel i meter. Negativt = kort, positivt = långt. */
export function lengthError(shot: Pick<PrecisionShot, "carry" | "target">): number {
  return shot.carry - shot.target;
}

/** Avstånd från flaggan: √(längdfel² + sidled²). */
export function proximity(shot: Pick<PrecisionShot, "carry" | "target" | "offline">): number {
  const dz = lengthError(shot);
  return Math.sqrt(dz * dz + shot.offline * shot.offline);
}

export function sideLabel(offline: number): string {
  if (Math.abs(offline) < 0.05) return "rakt på";
  return `${Math.abs(offline).toFixed(1)} m ${offline < 0 ? "vänster" : "höger"}`;
}

export function lengthLabel(shot: Pick<PrecisionShot, "carry" | "target">): string {
  const d = lengthError(shot);
  if (Math.abs(d) < 0.05) return "på måldistans";
  return `${d > 0 ? "+" : ""}${d.toFixed(1)} m ${d < 0 ? "(kort)" : "(långt)"}`;
}

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

export type PrecisionSummary = {
  count: number;
  avgProximity: number;
  medianProximity: number;
  best?: PrecisionShot;
  worst?: PrecisionShot;
  /** snitt av längdfel (tecken behålls) */
  avgLengthError: number;
  /** snitt av sidled (tecken behålls) */
  avgSideError: number;
  /** snitt av absolut sidled */
  avgAbsSideError: number;
  /** spridning i proximity */
  spread: number;
  /** 0–100, högre = jämnare slag */
  consistency: number;
};

/** Konsistenspoäng 0–100 baserad på variationen mellan slagen. */
export function consistencyScore(shots: PrecisionShot[]): number {
  const filled = shots.filter((s) => s.filled);
  if (filled.length < 2) return 0;
  const sd = stdDev(filled.map(proximity));
  const avg = mean(filled.map(proximity));
  if (avg <= 0) return 100;
  const cv = sd / avg;
  return Math.max(0, Math.min(100, Math.round(100 - cv * 100)));
}

export function summarize(shots: PrecisionShot[]): PrecisionSummary {
  const filled = shots.filter((s) => s.filled);
  const prox = filled.map(proximity);
  const sorted = [...filled].sort((a, b) => proximity(a) - proximity(b));
  return {
    count: filled.length,
    avgProximity: mean(prox),
    medianProximity: median(prox),
    best: sorted[0],
    worst: sorted[sorted.length - 1],
    avgLengthError: mean(filled.map(lengthError)),
    avgSideError: mean(filled.map((s) => s.offline)),
    avgAbsSideError: mean(filled.map((s) => Math.abs(s.offline))),
    spread: stdDev(prox),
    consistency: consistencyScore(shots),
  };
}

export type TargetStat = {
  target: number;
  shots: (PrecisionShot | undefined)[];
  /** medelproximity för avståndet */
  avg: number;
  count: number;
};

/** Resultat per avstånd, ett värde per varv plus medel. Härleder både
 *  vilka avstånd och hur många varv som förekommer ur SJÄLVA slagdatan
 *  (inte de fasta PRECISION_TARGETS/PRECISION_ROUNDS-konstanterna), så
 *  funktionen fungerar korrekt både för huvudtestet (5 slag) och det
 *  utökade testet (18 slag, andra avstånd). */
export function statsByTarget(shots: PrecisionShot[]): TargetStat[] {
  const targets = Array.from(new Set(shots.map((s) => s.target))).sort((a, b) => a - b);
  const maxRound = shots.reduce((m, s) => Math.max(m, s.round), 1);
  return targets.map((target) => {
    const rounds = Array.from({ length: maxRound }, (_, i) =>
      shots.find((s) => s.target === target && s.round === i + 1 && s.filled),
    );
    const filled = rounds.filter(Boolean) as PrecisionShot[];
    return {
      target,
      shots: rounds,
      avg: mean(filled.map(proximity)),
      count: filled.length,
    };
  });
}

export function bestWorstTarget(stats: TargetStat[]) {
  const withData = stats.filter((s) => s.count > 0);
  if (!withData.length) return { best: undefined, worst: undefined };
  const sorted = [...withData].sort((a, b) => a.avg - b.avg);
  return { best: sorted[0], worst: sorted[sorted.length - 1] };
}

/* -------------------------------------------------------------------------
 * Score, handicapskattning och analys
 * ---------------------------------------------------------------------- */

/** Avstånd till flaggan i procent av slaglängden. */
export function proximityPct(shot: Pick<PrecisionShot, "carry" | "target" | "offline">): number {
  if (!shot.target) return 0;
  return (proximity(shot) / shot.target) * 100;
}

/** 0–100 utifrån proximity i procent. 3 % ≈ 100, 20 % ≈ 0. */
export function scoreFromPct(pct: number): number {
  return Math.max(0, Math.min(100, Math.round(100 - (pct - 3) * 6)));
}

/** Grov handicapskattning utifrån proximity i procent. Negativt = plushandicap. */
export function handicapFromPct(pct: number): number {
  return Math.max(-6, Math.min(36, Math.round((pct - 6.7) * 2.2 * 10) / 10));
}

/** Samma skattning, men utgår direkt från en 0–100-score (t.ex. per avståndszon). */
export function handicapFromScore(score: number): number {
  const pct = 3 + (100 - score) / 6;
  return handicapFromPct(pct);
}

/** Handicap som text, t.ex. "+2,4" för plushandicap. */
export function handicapLabel(hcp: number): string {
  const v = Math.abs(hcp).toFixed(1).replace(".", ",");
  return hcp < 0 ? `+${v}` : v;
}

/** Skala som visar hur handicap uppskattas ur närhet i procent. */
export const HANDICAP_SCALE = [
  { pct: "≤ 4 %", hcp: "+6 till +1", note: "Tourprecision" },
  { pct: "4–7 %", hcp: "+1 till 1", note: "Elit / scratch" },
  { pct: "7–10 %", hcp: "1–8", note: "Låg handicap" },
  { pct: "10–14 %", hcp: "8–16", note: "Medelgod klubbspelare" },
  { pct: "14–20 %", hcp: "16–30", note: "Utvecklingsnivå" },
  { pct: "> 20 %", hcp: "30+", note: "Nybörjare" },
] as const;

export type PrecisionResult = {
  /** Approach Score 0–100 */
  score: number;
  handicap: number;
  avgProximity: number;
  avgProximityPct: number;
  consistency: number;
  perTarget: {
    target: number;
    count: number;
    avgProximity: number;
    avgPct: number;
    score: number;
    handicap: number;
  }[];
  strongest?: { target: number; score: number };
  weakest?: { target: number; score: number };
};

export function precisionResult(shots: PrecisionShot[]): PrecisionResult {
  const filled = shots.filter((s) => s.filled);
  const targets = Array.from(new Set(shots.map((s) => s.target))).sort((a, b) => a - b);
  const perTarget = targets.map((target) => {
    const t = filled.filter((s) => s.target === target);
    const avgPct = mean(t.map(proximityPct));
    return {
      target,
      count: t.length,
      avgProximity: mean(t.map(proximity)),
      avgPct,
      score: t.length ? scoreFromPct(avgPct) : 0,
      handicap: t.length ? handicapFromPct(avgPct) : 0,
    };
  });
  const withData = perTarget.filter((t) => t.count > 0);
  const sorted = [...withData].sort((a, b) => b.score - a.score);
  const avgPct = mean(filled.map(proximityPct));
  return {
    score: filled.length ? scoreFromPct(avgPct) : 0,
    handicap: filled.length ? handicapFromPct(avgPct) : 0,
    avgProximity: mean(filled.map(proximity)),
    avgProximityPct: avgPct,
    consistency: consistencyScore(shots),
    perTarget,
    strongest: sorted[0] ? { target: sorted[0].target, score: sorted[0].score } : undefined,
    weakest: sorted.length
      ? { target: sorted[sorted.length - 1].target, score: sorted[sorted.length - 1].score }
      : undefined,
  };
}

/** Referensnivåer i proximity-procent. */
export const PRECISION_BENCHMARKS = [
  { label: "PGA Tour", pct: 5 },
  { label: "Scratch", pct: 8 },
  { label: "Hcp 10", pct: 12 },
  { label: "Hcp 20", pct: 17 },
] as const;

export function benchmarkLabel(pct: number): string {
  if (pct <= 5) return "PGA Tour-nivå";
  if (pct <= 8) return "Scratch-nivå";
  if (pct <= 12) return "Ungefär hcp 10";
  if (pct <= 17) return "Ungefär hcp 20";
  return "Nybörjarnivå";
}

/** Personlig träningsrekommendation baserad på svagaste avstånd. */
export function precisionAdvice(result: PrecisionResult): string {
  const w = result.weakest;
  if (!w) return "Genomför testet för att få en personlig rekommendation.";
  const low = Math.max(40, w.target - 15);
  const high = w.target + 15;
  return `Ditt största förbättringsområde är inspel mellan ${low}–${high} meter (score ${w.score}/100 på ${w.target} m). Om du förbättrar det området kommer det sannolikt ha störst effekt på både din Approach Score och ditt handicap.`;
}

/* -------------------------------------------------------------------------
 * Missmönster, styrkor och rekommendationer
 * ---------------------------------------------------------------------- */

export type MissPattern = {
  /** andel slag som missar kort (0–100) */
  shortPct: number;
  longPct: number;
  leftPct: number;
  rightPct: number;
  /** dominerande tendens i längd/sidled, om någon */
  lengthBias?: "kort" | "långt";
  sideBias?: "vänster" | "höger";
};

export function missPattern(shots: PrecisionShot[]): MissPattern {
  const filled = shots.filter((s) => s.filled);
  const n = filled.length || 1;
  const pct = (c: number) => Math.round((c / n) * 100);
  const shortPct = pct(filled.filter((s) => lengthError(s) < -1).length);
  const longPct = pct(filled.filter((s) => lengthError(s) > 1).length);
  const leftPct = pct(filled.filter((s) => s.offline < -1).length);
  const rightPct = pct(filled.filter((s) => s.offline > 1).length);
  return {
    shortPct,
    longPct,
    leftPct,
    rightPct,
    lengthBias:
      shortPct >= 55 && shortPct > longPct
        ? "kort"
        : longPct >= 55 && longPct > shortPct
          ? "långt"
          : undefined,
    sideBias:
      leftPct >= 55 && leftPct > rightPct
        ? "vänster"
        : rightPct >= 55 && rightPct > leftPct
          ? "höger"
          : undefined,
  };
}

export type PrecisionAnalysis = {
  strengths: string[];
  improvements: string[];
  /** Behålls för historiksidan – tomt i nya rapporten. */
  focus: string[];
};

/**
 * Automatisk, datadriven analys. Alla punkter bygger på faktiska värden i
 * testet – inga generiska standardtexter.
 */
export function analysePrecision(
  shots: PrecisionShot[],
  result: PrecisionResult = precisionResult(shots),
): PrecisionAnalysis {
  const filled = shots.filter((s) => s.filled);
  const m = missPattern(shots);
  const d = dispersionStats(shots);
  const strengths: string[] = [];
  const improvements: string[] = [];

  if (!filled.length) {
    return { strengths: ["Genomför testet för att få din analys."], improvements: [], focus: [] };
  }

  const groups = groupScores(result).filter((g) => g.count > 0);
  const bestGroup = [...groups].sort((a, b) => b.score - a.score)[0];
  const worstGroup = [...groups].sort((a, b) => a.score - b.score)[0];

  const within5 = filled.filter((s) => proximity(s) < 5).length;
  const within5Pct = Math.round((within5 / filled.length) * 100);
  const greenPct = Math.round((d.greens / filled.length) * 100);
  const absLength = mean(filled.map((s) => Math.abs(lengthError(s))));
  const absSide = mean(filled.map((s) => Math.abs(s.offline)));

  /* ---------------- Styrkor ---------------- */
  if (bestGroup && bestGroup.score >= 55) {
    strengths.push(`Stark precision från ${bestGroup.label} (${bestGroup.score}/100).`);
  }
  if (within5Pct >= 25) {
    strengths.push(`${within5Pct} % av slagen inom 5 meter – gott om birdiechanser.`);
  }
  if (greenPct >= 60) {
    strengths.push(`${greenPct} % greenträffar i testet.`);
  }
  if (absLength <= 6 && absLength < absSide) {
    strengths.push(`Stabil längdkontroll – i snitt ${absLength.toFixed(1)} m längdfel.`);
  }
  if (absSide <= 5 && absSide <= absLength) {
    strengths.push(`Rak startlinje – i snitt bara ${absSide.toFixed(1)} m sidled.`);
  }
  if (result.consistency >= 65) {
    strengths.push(`Jämna slag genom hela testet (konsistens ${result.consistency}/100).`);
  }
  if (!strengths.length && bestGroup) {
    strengths.push(`${bestGroup.label} är ditt bästa intervall (${bestGroup.score}/100).`);
  }

  /* ---------------- Förbättringsområden ---------------- */
  if (worstGroup && bestGroup && worstGroup.label !== bestGroup.label && worstGroup.score < 60) {
    improvements.push(`Svagast från ${worstGroup.label} (${worstGroup.score}/100).`);
  }
  if (m.lengthBias === "kort") {
    improvements.push(`${m.shortPct} % av slagen landar kort om flaggan.`);
  } else if (m.lengthBias === "långt") {
    improvements.push(`${m.longPct} % av slagen går långt över flaggan.`);
  }
  if (m.sideBias) {
    improvements.push(
      `Majoriteten av missarna ligger ${m.sideBias} (${m.sideBias === "vänster" ? m.leftPct : m.rightPct} %).`,
    );
  }
  const shortG = groups.filter((g) => g.max <= 100);
  const longG = groups.filter((g) => g.min >= 125);
  if (shortG.length && longG.length) {
    const sAvg = mean(shortG.map((g) => g.score));
    const lAvg = mean(longG.map((g) => g.score));
    if (sAvg - lAvg >= 20) {
      improvements.push("Spridningen ökar tydligt på de längre inspelen.");
    }
  }
  if (greenPct >= 60 && within5Pct < 15) {
    improvements.push("Hög greenträff men få slag inom 5 m – sikta tightare mot flaggan.");
  }
  if (absSide - absLength >= 4) {
    improvements.push(
      `Bra längdkontroll men stor sidledsspridning (${absSide.toFixed(1)} m i snitt).`,
    );
  }

  const trimmed = result.score >= 95 ? improvements.slice(0, 1) : improvements.slice(0, 3);
  return { strengths: strengths.slice(0, 3), improvements: trimmed, focus: [] };
}

/** Färgnivå för score: grön/gul/röd. */
export function scoreGrade(score: number): "good" | "mid" | "poor" {
  if (score >= 70) return "good";
  if (score >= 45) return "mid";
  return "poor";
}

/* -------------------------------------------------------------------------
 * Scorenivåer och avståndsgrupper
 * ---------------------------------------------------------------------- */

export type ScoreBand = {
  key: "low" | "mid" | "ok" | "great" | "elite";
  label: string;
  emoji: string;
  /** Tailwind-klasser byggda på designtokens */
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

/** Färgkodad nivå för en score 0–100. */
export function scoreBand(score: number): ScoreBand {
  if (score >= 90) return SCORE_BANDS[4];
  if (score >= 75) return SCORE_BANDS[3];
  if (score >= 60) return SCORE_BANDS[2];
  if (score >= 40) return SCORE_BANDS[1];
  return SCORE_BANDS[0];
}

/** Avståndsintervall som resultaten grupperas i (ett per målavstånd). */
export const DISTANCE_GROUPS = [
  { label: "50 m", min: 50, max: 50 },
  { label: "75 m", min: 75, max: 75 },
  { label: "100 m", min: 100, max: 100 },
  { label: "125 m", min: 125, max: 125 },
  { label: "150 m", min: 150, max: 150 },
] as const;

export type GroupScore = {
  label: string;
  min: number;
  max: number;
  count: number;
  score: number;
  avgProximity: number;
};

/** Score per avståndsgrupp, viktat på antal slag. */
export function groupScores(result: PrecisionResult): GroupScore[] {
  return DISTANCE_GROUPS.map((g) => {
    const inGroup = result.perTarget.filter(
      (t) => t.count > 0 && t.target >= g.min && t.target <= g.max,
    );
    const shots = inGroup.reduce((a, t) => a + t.count, 0);
    const pct = shots ? inGroup.reduce((a, t) => a + t.avgPct * t.count, 0) / shots : 0;
    return {
      label: g.label,
      min: g.min,
      max: g.max,
      count: shots,
      score: shots ? scoreFromPct(pct) : 0,
      avgProximity: shots ? inGroup.reduce((a, t) => a + t.avgProximity * t.count, 0) / shots : 0,
    };
  });
}

/* -------------------------------------------------------------------------
 * Spridningsanalys – fast skala i meter
 * ---------------------------------------------------------------------- */

/** Standardgreen som används i spridningsbilden (meter) – smal och djup. */
export const GREEN_HALF_WIDTH = 9.5;
export const GREEN_HALF_DEPTH = 16;
/** Halva bredden på visualiseringen i meter (±40 m från flaggan). */
export const DISPERSION_RANGE = 40;
/** Fasta avståndsringar i meter. */
export const DISTANCE_RINGS = [5, 10, 15] as const;

/** True om slaget hamnar innanför standardgreenen. */
export function onGreen(shot: Pick<PrecisionShot, "carry" | "target" | "offline">): boolean {
  const dz = lengthError(shot) / GREEN_HALF_DEPTH;
  const dx = shot.offline / GREEN_HALF_WIDTH;
  return dx * dx + dz * dz <= 1;
}

export type DispersionStats = {
  count: number;
  avg: number;
  median: number;
  best: number;
  worst: number;
  /** avstånd mellan närmaste och längsta slag */
  spread: number;
  greens: number;
  /** slag inom 5 m */
  birdieChances: number;
  within10: number;
  missLeft: number;
  missRight: number;
  missShort: number;
  missLong: number;
};

/** Statistik under spridningsbilden. */
export function dispersionStats(shots: PrecisionShot[]): DispersionStats {
  const filled = shots.filter((s) => s.filled);
  const prox = filled.map(proximity);
  const best = prox.length ? Math.min(...prox) : 0;
  const worst = prox.length ? Math.max(...prox) : 0;
  return {
    count: filled.length,
    avg: mean(prox),
    median: median(prox),
    best,
    worst,
    spread: worst - best,
    greens: filled.filter(onGreen).length,
    birdieChances: prox.filter((p) => p < 5).length,
    within10: prox.filter((p) => p <= 10).length,
    missLeft: filled.filter((s) => s.offline < -1).length,
    missRight: filled.filter((s) => s.offline > 1).length,
    missShort: filled.filter((s) => lengthError(s) < -1).length,
    missLong: filled.filter((s) => lengthError(s) > 1).length,
  };
}

/* -------------------------------------------------------------------------
 * Tolkning för resultatsidan (endast slutsatser som datan stödjer)
 * ---------------------------------------------------------------------- */

/** Inversen av handicapFromPct – vilken proximity-% en handicapnivå motsvarar. */
export function pctForHandicap(hcp: number): number {
  return hcp / 2.2 + 6.7;
}

/** Referensnivåer för den lilla jämförelsesektionen. */
export const COMPARE_LEVELS = [0, 5, 10, 20] as const;

export type DispersionVerdict = {
  lengthControl: string;
  side: string;
  spread: string;
};

/**
 * Tre korta tolkningar av spridningen. Saknas underlag för en slutsats
 * returneras "Ingen tydlig tendens" i stället för ett påhittat mönster.
 */
export function dispersionVerdict(shots: PrecisionShot[]): DispersionVerdict {
  const filled = shots.filter((s) => s.filled);
  if (!filled.length) {
    return { lengthControl: "–", side: "–", spread: "–" };
  }
  const absLength = mean(filled.map((s) => Math.abs(lengthError(s))));
  const lengthControl =
    absLength <= 5
      ? "Mycket bra"
      : absLength <= 8
        ? "Bra"
        : absLength <= 12
          ? "Medel"
          : "Utvecklingsområde";

  const m = missPattern(shots);
  const side = m.sideBias ? `Tendens ${m.sideBias}` : "Ingen tydlig tendens";

  const pct = mean(filled.map(proximityPct));
  const spread = `HCP ${handicapLabel(handicapFromPct(pct))}-nivå`;
  return { lengthControl, side, spread };
}

export type PrecisionInsight = {
  kind: "strength" | "improvement" | "pattern";
  title: string;
  text: string;
};

/**
 * Max tre korta insikter: största styrka, största förbättringsområde och
 * missmönster. 18 slag är ett litet underlag – saknas ett tydligt mönster
 * skrivs det ut i stället för att en svaghet tvingas fram.
 */
export function precisionInsights(
  shots: PrecisionShot[],
  result: PrecisionResult = precisionResult(shots),
): PrecisionInsight[] {
  const filled = shots.filter((s) => s.filled);
  if (!filled.length) return [];

  const groups = groupScores(result).filter((g) => g.count > 0);
  const best = [...groups].sort((a, b) => b.score - a.score)[0];
  const worst = [...groups].sort((a, b) => a.score - b.score)[0];
  const insights: PrecisionInsight[] = [];

  if (best) {
    insights.push({
      kind: "strength",
      title: `Starkast från ${best.label}`,
      text: `Där håller du ${best.score}/100 och i snitt ${best.avgProximity.toFixed(1).replace(".", ",")} m till flaggan.`,
    });
  }

  if (worst && best && worst.label !== best.label && best.score - worst.score >= 8) {
    insights.push({
      kind: "improvement",
      title: `Du tappar mest från ${worst.label}`,
      text: `${worst.score}/100 mot ${best.score}/100 på ditt bästa intervall – störst effekt att träna här.`,
    });
  }

  const m = missPattern(shots);
  if (m.lengthBias || m.sideBias) {
    const parts: string[] = [];
    if (m.lengthBias)
      parts.push(
        `${m.lengthBias === "kort" ? m.shortPct : m.longPct} % av slagen går ${m.lengthBias === "kort" ? "kort" : "långt"}`,
      );
    if (m.sideBias)
      parts.push(
        `${m.sideBias === "vänster" ? m.leftPct : m.rightPct} % missar ${m.sideBias === "vänster" ? "vänster" : "höger"}`,
      );
    insights.push({
      kind: "pattern",
      title: "Missmönster",
      text: `${parts.join(" och ")}.`,
    });
  } else {
    insights.push({
      kind: "pattern",
      title: "Ingen tydlig tendens",
      text: "Missarna är relativt jämnt fördelade – inget systematiskt fel i det här testet.",
    });
  }

  return insights.slice(0, 3);
}

/* -------------------------------------------------------------------------
 * Normalfördelning av handicap – underlag till bellcurven på resultatsidan
 * ---------------------------------------------------------------------- */

/** Ungefärlig fördelning av handicap bland golfare (normalfördelad). */
export const HCP_DISTRIBUTION_MEAN = 20;
export const HCP_DISTRIBUTION_SD = 8;

/** Täthetsfunktion (ej normerad i y) för handicap-fördelningen. */
export function hcpDensity(hcp: number): number {
  const z = (hcp - HCP_DISTRIBUTION_MEAN) / HCP_DISTRIBUTION_SD;
  return Math.exp(-0.5 * z * z);
}

/** Andel golfare (0–100) som har HÖGRE handicap än det angivna, dvs som du slår. */
export function hcpPercentile(hcp: number): number {
  const z = (hcp - HCP_DISTRIBUTION_MEAN) / HCP_DISTRIBUTION_SD;
  // Abramowitz & Stegun-approximation av normalfördelningens CDF.
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  let p =
    d * t * (1.330274 * t ** 4 - 1.821256 * t ** 3 + 1.781478 * t * t - 0.356538 * t + 0.319381);
  if (z > 0) p = 1 - p;
  // p = andel med lägre hcp än du → andelen du slår är resten.
  return Math.max(1, Math.min(99, Math.round((1 - p) * 100)));
}

/** Kort etikett för var i fördelningen spelaren ligger. */
export function hcpCohortLabel(hcp: number): string {
  if (hcp <= 0) return "Elitnivå";
  if (hcp <= 5) return "Toppspelare";
  if (hcp <= 12) return "Låg handicap";
  if (hcp <= 20) return "Klubbspelare";
  if (hcp <= 28) return "Utvecklingsnivå";
  return "Nybörjarnivå";
}
