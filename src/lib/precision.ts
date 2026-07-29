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
