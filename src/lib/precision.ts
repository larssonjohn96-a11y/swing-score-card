/**
 * Approach Precision Test – testlogik och beräkningar.
 *
 * 18 slag: 9 målavstånd × 2 varv. Spelaren matar in carry och sidled
 * (manuellt eller, i framtiden, automatiskt från en launch monitor).
 * Alla beräkningar nedan är rena funktioner utan UI eller lagring.
 */

/** Målavstånd i meter, i den ordning de spelas. */
export const PRECISION_TARGETS = [55, 64, 73, 82, 91, 110, 128, 146, 165] as const;
export const PRECISION_ROUNDS = 2;
export const PRECISION_TOTAL_SHOTS = PRECISION_TARGETS.length * PRECISION_ROUNDS;

/** Rådata för ett slag – samma form oavsett datakälla. */
export type ShotInput = {
  /** carry i meter */
  carry: number;
  /** sidled i meter, negativt = vänster, positivt = höger */
  offline: number;
};

export type PrecisionShot = ShotInput & {
  /** 1-baserat slagnummer, 1–18 */
  index: number;
  round: number;
  target: number;
  /** true när slaget är registrerat */
  filled: boolean;
};

/** Tom serie i rätt spelordning. */
export function emptyPrecisionShots(): PrecisionShot[] {
  const shots: PrecisionShot[] = [];
  let index = 0;
  for (let round = 1; round <= PRECISION_ROUNDS; round += 1) {
    for (const target of PRECISION_TARGETS) {
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

/** Resultat per avstånd, ett värde per varv plus medel. */
export function statsByTarget(shots: PrecisionShot[]): TargetStat[] {
  return PRECISION_TARGETS.map((target) => {
    const rounds = Array.from({ length: PRECISION_ROUNDS }, (_, i) =>
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
  const perTarget = PRECISION_TARGETS.map((target) => {
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
