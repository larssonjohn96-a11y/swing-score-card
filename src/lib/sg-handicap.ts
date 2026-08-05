/**
 * Delad motor för Verkligt Handicap, Estimated SG Handicap, kategori-HCP,
 * "Din största möjlighet" och Smart Insight på startsidan.
 *
 * Ren beräkningslogik – ingen UI. Läser befintlig sessionsdata från varje
 * testtyp och gör dem jämförbara som ett handicap-liknande tal (lägre = bättre).
 */
import { loadPrecisionSessions, type PrecisionSession } from "@/lib/precision-store";
import { loadOffTeeSessions, type OffTeeSession } from "@/lib/offtee-store";
import { loadBunkerSessions } from "@/lib/bunker";
import { loadShortPuttSessions } from "@/lib/shortputt";
import { precisionResult, groupScores } from "@/lib/precision";
import { TOUR_LEVEL } from "@/lib/levels";

/* -------------------------------------------------------------------------
 * Verkligt Handicap – manuellt satt och redigerbart av spelaren
 * ---------------------------------------------------------------------- */

const REAL_HCP_KEY = "golf-real-handicap-v1";

export function loadRealHandicap(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(REAL_HCP_KEY);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function saveRealHandicap(value: number) {
  window.localStorage.setItem(REAL_HCP_KEY, String(value));
}

/* -------------------------------------------------------------------------
 * Kategori-HCP
 * ---------------------------------------------------------------------- */

export type CategorySlug = "approach" | "driving" | "around-the-green" | "puttning";

export const CATEGORY_WEIGHTS: Record<CategorySlug, number> = {
  approach: 0.4,
  driving: 0.3,
  puttning: 0.2,
  "around-the-green": 0.1,
};

export const CATEGORY_LABELS: Record<CategorySlug, string> = {
  approach: "Approach",
  driving: "Off the Tee",
  "around-the-green": "Around Green",
  puttning: "Putting",
};

/** Generisk omvandling av en 0–100-rating (högre = bättre) till ett handicap-liknande tal. */
function ratingToHandicap(rating: number): number {
  return Math.max(-4, Math.min(36, 30 - rating * 0.34));
}

/**
 * Delad, enhetlig skala för hela Utvecklingssidan: handicap (-8 till 40,
 * plus-handicap inräknat) → 0–100-rating, och tillbaka. Samma princip som
 * Off the Tee Test använder för sitt score.
 */
export function ratingFromHandicap(hcp: number): number {
  return Math.round(Math.max(0, Math.min(100, 100 - (hcp + 8) * (100 / 48))));
}

export function handicapFromRating(rating: number): number {
  return (100 - rating) * (48 / 100) - 8;
}

export const SCRATCH_HANDICAP = 0;
/** Ungefärlig elit-/Tour-nivå, samma ankare som Off the Tee Test använder för PGA Tour-snittet. */
export const ELITE_HANDICAP = -6;

/** Handicap formaterat enligt golfkonvention: plus-handicap visas med '+', aldrig '-'. */
export function hcpLabel(hcp: number): string {
  const v = Math.abs(hcp).toFixed(1).replace(".", ",");
  return hcp < 0 ? `+${v}` : v;
}

/** Jämförelsenivåer för spindeldiagrammet – handicap, inte spelare. */
export const BENCHMARK_LEVELS: { label: string; hcp: number }[] = [
  { label: "30", hcp: 30 },
  { label: "20", hcp: 20 },
  { label: "10", hcp: 10 },
  { label: "0", hcp: SCRATCH_HANDICAP },
  { label: "+3", hcp: -3 },
  { label: "Tour", hcp: ELITE_HANDICAP },
];

/** Trend = senaste värdet minus värdet i början av de senaste n testen. Negativt = förbättring. */
function trendOf(values: number[], n = 5): number | undefined {
  if (values.length < 2) return undefined;
  const window = values.slice(-n);
  const delta = window[window.length - 1] - window[0];
  return Math.round(delta * 10) / 10;
}

export type CategoryHandicap = {
  slug: CategorySlug;
  title: string;
  handicap?: number;
  /** negativt = förbättring (lägre handicap) */
  trend?: number;
  /** senaste score 0–100, om testtypen har ett sådant */
  latestScore?: number;
  count: number;
};

function byDateAsc<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.date.localeCompare(b.date));
}

/** Filtrerar sessioner till och med ett visst datum – används för historiska ögonblicksbilder. */
function upTo<T extends { date: string }>(items: T[], asOf?: Date): T[] {
  if (!asOf) return items;
  const cutoff = asOf.toISOString();
  return byDateAsc(items).filter((i) => i.date <= cutoff);
}

/**
 * Kategori-HCP, antingen just nu (utan argument) eller som de såg ut vid en
 * viss tidpunkt (asOf) – det senare används för att bygga utvecklingsgrafer
 * och "senaste 30 dagarna"-jämförelser utan att behöva egen historisk lagring.
 */
export function computeCategoryHandicaps(asOf?: Date): CategoryHandicap[] {
  const precision = upTo(loadPrecisionSessions(), asOf);
  const offtee = upTo(loadOffTeeSessions(), asOf);
  const bunker = upTo(loadBunkerSessions(), asOf);
  const putt = upTo(loadShortPuttSessions(), asOf);

  const approachHcps = precision
    .map((s) => s.handicap)
    .filter((v): v is number => typeof v === "number");
  const approach: CategoryHandicap = {
    slug: "approach",
    title: CATEGORY_LABELS.approach,
    count: precision.length,
    handicap: approachHcps.length ? approachHcps[approachHcps.length - 1] : undefined,
    trend: trendOf(approachHcps),
    latestScore: precision.length ? precision[precision.length - 1].score : undefined,
  };

  const offteeHcps = offtee.map((s) => s.handicap);
  const driving: CategoryHandicap = {
    slug: "driving",
    title: CATEGORY_LABELS.driving,
    count: offtee.length,
    handicap: offteeHcps.length ? offteeHcps[offteeHcps.length - 1] : undefined,
    trend: trendOf(offteeHcps),
    latestScore: offtee.length ? offtee[offtee.length - 1].score : undefined,
  };

  const bunkerHcps = bunker.map((s) => ratingToHandicap((TOUR_LEVEL.bunkerFeet / s.avgFeet) * 100));
  const aroundGreen: CategoryHandicap = {
    slug: "around-the-green",
    title: CATEGORY_LABELS["around-the-green"],
    count: bunker.length,
    handicap: bunkerHcps.length ? bunkerHcps[bunkerHcps.length - 1] : undefined,
    trend: trendOf(bunkerHcps),
    latestScore: undefined,
  };

  const puttHcps = putt.map((s) => ratingToHandicap(s.pct));
  const putting: CategoryHandicap = {
    slug: "puttning",
    title: CATEGORY_LABELS.puttning,
    count: putt.length,
    handicap: puttHcps.length ? puttHcps[puttHcps.length - 1] : undefined,
    trend: trendOf(puttHcps),
    latestScore: putt.length ? putt[putt.length - 1].pct : undefined,
  };

  return [approach, driving, aroundGreen, putting];
}

/** Viktat snitt av kategori-HCP som finns data för – Estimated SG Handicap. */
export function computeEstimatedHandicap(cats: CategoryHandicap[]): number | undefined {
  const available = cats.filter((c) => c.handicap !== undefined);
  if (!available.length) return undefined;
  const totalWeight = available.reduce((a, c) => a + CATEGORY_WEIGHTS[c.slug], 0);
  const weighted = available.reduce((a, c) => a + c.handicap! * CATEGORY_WEIGHTS[c.slug], 0);
  return Math.round((weighted / totalWeight) * 10) / 10;
}

/** Viktat snitt av kategoriernas trend – negativt = det totala handicapet sjunker. */
export function computeEstimatedTrend(cats: CategoryHandicap[]): number | undefined {
  const available = cats.filter((c) => c.trend !== undefined);
  if (!available.length) return undefined;
  const totalWeight = available.reduce((a, c) => a + CATEGORY_WEIGHTS[c.slug], 0);
  const weighted = available.reduce((a, c) => a + c.trend! * CATEGORY_WEIGHTS[c.slug], 0);
  return Math.round((weighted / totalWeight) * 10) / 10;
}

/* -------------------------------------------------------------------------
 * Din största möjlighet
 * ---------------------------------------------------------------------- */

export type Opportunity = {
  slug: CategorySlug;
  title: string;
  handicap: number;
  /** ungefärlig sänkning av totalhandicap vid 10 % förbättring i kategorin */
  impact: number;
};

export function computeBiggestOpportunity(cats: CategoryHandicap[]): Opportunity | undefined {
  const available = cats.filter((c) => c.handicap !== undefined && c.handicap > -3.5);
  if (!available.length) return undefined;
  const scored = available
    .map((c) => ({ ...c, weightedGap: c.handicap! * CATEGORY_WEIGHTS[c.slug] }))
    .sort((a, b) => b.weightedGap - a.weightedGap);
  const best = scored[0];
  const impact = Math.max(
    0.1,
    Math.round(best.handicap! * 0.1 * CATEGORY_WEIGHTS[best.slug] * 10) / 10,
  );
  return { slug: best.slug, title: best.title, handicap: best.handicap!, impact };
}

/* -------------------------------------------------------------------------
 * Nästa mål
 * ---------------------------------------------------------------------- */

const MILESTONES = [
  54, 36, 28, 24, 20, 18, 16, 14, 12, 10, 8, 6, 4, 2, 0, -1, -2, -3, -4, -5, -6, -7, -8,
];

export function nextMilestone(current: number): number {
  const below = MILESTONES.filter((m) => m < current - 0.05);
  return below.length ? Math.max(...below) : MILESTONES[MILESTONES.length - 1];
}

/** De 1–2 kategorierna med högst (sämst) handicap bland dem med data. */
export function categoriesToImprove(cats: CategoryHandicap[], count = 2): CategoryHandicap[] {
  return [...cats]
    .filter((c) => c.handicap !== undefined)
    .sort((a, b) => b.handicap! - a.handicap!)
    .slice(0, count);
}

/* -------------------------------------------------------------------------
 * Skill Gap – avstånd till nästa nivå per kategori
 * ---------------------------------------------------------------------- */

export type SkillGap = {
  slug: CategorySlug;
  title: string;
  current: number;
  next: number;
  gap: number;
};

export function computeSkillGaps(cats: CategoryHandicap[]): SkillGap[] {
  return cats
    .filter((c) => c.handicap !== undefined)
    .map((c) => {
      const current = ratingFromHandicap(c.handicap!);
      const next = ratingFromHandicap(nextMilestone(c.handicap!));
      return { slug: c.slug, title: c.title, current, next, gap: Math.max(0, next - current) };
    })
    .filter((g) => g.gap > 0);
}

/* -------------------------------------------------------------------------
 * Slag som tappas per kategori
 * ---------------------------------------------------------------------- */

export type StrokesLost = {
  slug: CategorySlug;
  title: string;
  strokes: number;
};

/**
 * Ungefärligt antal slag kategorin kostar per runda jämfört med scratch,
 * baserat på hur mycket kategorins handicap bidrar till helhetsbetyget.
 * En grov skattning – inte en riktig Strokes Gained-beräkning.
 */
export function computeStrokesLost(cats: CategoryHandicap[]): StrokesLost[] {
  return cats
    .filter((c) => c.handicap !== undefined)
    .map((c) => ({
      slug: c.slug,
      title: c.title,
      strokes: Math.round(Math.max(0, c.handicap!) * CATEGORY_WEIGHTS[c.slug] * 0.15 * 10) / 10,
    }))
    .sort((a, b) => b.strokes - a.strokes);
}

/* -------------------------------------------------------------------------
 * Potential Score – vad en 10-poängs förbättring skulle ge
 * ---------------------------------------------------------------------- */

export type Potential = {
  slug: CategorySlug;
  title: string;
  fromRating: number;
  toRating: number;
  impact: number;
};

export function computePotentials(cats: CategoryHandicap[]): Potential[] {
  return cats
    .filter((c) => c.handicap !== undefined)
    .map((c) => {
      const fromRating = ratingFromHandicap(c.handicap!);
      const toRating = Math.min(100, fromRating + 10);
      const toHandicap = handicapFromRating(toRating);
      const impact =
        Math.round(Math.max(0, c.handicap! - toHandicap) * CATEGORY_WEIGHTS[c.slug] * 10) / 10;
      return { slug: c.slug, title: c.title, fromRating, toRating, impact };
    })
    .filter((p) => p.impact > 0)
    .sort((a, b) => b.impact - a.impact);
}

/* -------------------------------------------------------------------------
 * Utvecklingsgrafer – rating över tid, totalt och per kategori
 * ---------------------------------------------------------------------- */

export type RatingPoint = {
  date: string;
  total?: number;
  approach?: number;
  driving?: number;
  aroundGreen?: number;
  putting?: number;
};

const day = (iso: string) => (iso.length > 10 ? iso.slice(0, 10) : iso);

/** Alla datum där minst ett test genomfördes, i valfri period. */
function sessionDates(periodDays: number | null): string[] {
  const all = [
    ...loadPrecisionSessions().map((s) => s.date),
    ...loadOffTeeSessions().map((s) => s.date),
    ...loadBunkerSessions().map((s) => s.date),
    ...loadShortPuttSessions().map((s) => s.date),
  ];
  const cutoff = periodDays ? Date.now() - periodDays * 24 * 60 * 60 * 1000 : undefined;
  const filtered = cutoff ? all.filter((d) => new Date(d).getTime() >= cutoff) : all;
  return [...new Set(filtered.map(day))].sort((a, b) => a.localeCompare(b));
}

/**
 * Total Rating och kategori-rating vid varje testdatum i perioden – bygger
 * utvecklingsgraferna. Beräknar en historisk ögonblicksbild (asOf) för
 * varje datum, så ingen egen tidsseriedatabas behövs.
 */
export function computeRatingTimeline(periodDays: number | null): RatingPoint[] {
  const dates = sessionDates(periodDays);
  return dates.map((d) => {
    const asOf = new Date(`${d}T23:59:59.999Z`);
    const cats = computeCategoryHandicaps(asOf);
    const total = computeEstimatedHandicap(cats);
    const find = (slug: CategorySlug) => cats.find((c) => c.slug === slug)?.handicap;
    return {
      date: d,
      total: total !== undefined ? ratingFromHandicap(total) : undefined,
      approach: find("approach") !== undefined ? ratingFromHandicap(find("approach")!) : undefined,
      driving: find("driving") !== undefined ? ratingFromHandicap(find("driving")!) : undefined,
      aroundGreen:
        find("around-the-green") !== undefined
          ? ratingFromHandicap(find("around-the-green")!)
          : undefined,
      putting: find("puttning") !== undefined ? ratingFromHandicap(find("puttning")!) : undefined,
    };
  });
}

/** Rating "just nu" jämfört med `days` dagar sedan – för "+3 poäng senaste 30 dagarna". */
export function computeRatingChange(days: number): number | undefined {
  const now = computeEstimatedHandicap(computeCategoryHandicaps());
  const past = computeEstimatedHandicap(
    computeCategoryHandicaps(new Date(Date.now() - days * 24 * 60 * 60 * 1000)),
  );
  if (now === undefined || past === undefined) return undefined;
  return ratingFromHandicap(now) - ratingFromHandicap(past);
}

/* -------------------------------------------------------------------------
 * Historik – integrerad i Utvecklingssidan
 * ---------------------------------------------------------------------- */

export type HistoryEntry = {
  key: string;
  categorySlug: CategorySlug;
  title: string;
  date: string;
  score?: number;
  scoreUnit?: string;
  handicap?: number;
  /** länk till detaljerad graf/historik för just detta test */
  to: { slug: string; test: string };
};

export function computeHistory(filter?: CategorySlug, limit = 200): HistoryEntry[] {
  const precision = loadPrecisionSessions();
  const offtee = loadOffTeeSessions();
  const bunker = loadBunkerSessions();
  const putt = loadShortPuttSessions();
  const puttHcps = putt.map((s) => ratingToHandicap(s.pct));

  const all: HistoryEntry[] = [
    ...precision.map((s) => ({
      key: `approach-${s.id}`,
      categorySlug: "approach" as const,
      title: "Approach",
      date: s.date,
      score: s.score,
      scoreUnit: "/100",
      handicap: s.handicap,
      to: { slug: "approach", test: "precision" },
    })),
    ...offtee.map((s) => ({
      key: `offtee-${s.id}`,
      categorySlug: "driving" as const,
      title: "Off the Tee",
      date: s.date,
      score: s.score,
      scoreUnit: "/100",
      handicap: s.handicap,
      to: { slug: "driving", test: "offtee" },
    })),
    ...bunker.map((s) => ({
      key: `bunker-${s.id}`,
      categorySlug: "around-the-green" as const,
      title: "Bunkerslag",
      date: s.date,
      score: Math.round(s.avgFeet * 10) / 10,
      scoreUnit: " fot",
      handicap: undefined,
      to: { slug: "around-the-green", test: "bunker" },
    })),
    ...putt.map((s, i) => ({
      key: `putt-${s.id}`,
      categorySlug: "puttning" as const,
      title: "Kortputt",
      date: s.date,
      score: Math.round(s.pct),
      scoreUnit: "%",
      handicap: puttHcps[i],
      to: { slug: "puttning", test: "kortputt" },
    })),
  ];

  const sorted = all.sort((a, b) => b.date.localeCompare(a.date));
  return (filter ? sorted.filter((e) => e.categorySlug === filter) : sorted).slice(0, limit);
}

/* -------------------------------------------------------------------------
 * Approach- och puttningsheatmap per avstånd
 * ---------------------------------------------------------------------- */

export type HeatmapZone = {
  label: string;
  score: number;
  count: number;
};

/** Approach: score per avståndszon (50–165 m), aggregerat över alla sessioner. */
export function computeApproachHeatmap(): HeatmapZone[] {
  const sessions = loadPrecisionSessions();
  const allShots = sessions.flatMap((s) => s.shots);
  if (!allShots.length) return [];
  const result = precisionResult(allShots);
  return groupScores(result)
    .filter((g) => g.count > 0)
    .map((g) => ({ label: g.label, score: g.score, count: g.count }));
}

/** Kortputt: träffprocent per avstånd (0,5 / 1,0 / 1,5 m), aggregerat. */
export function computePuttingHeatmap(): HeatmapZone[] {
  const sessions = loadShortPuttSessions();
  const allPutts = sessions.flatMap((s) => s.putts);
  if (!allPutts.length) return [];
  const distances = [0.5, 1, 1.5];
  return distances
    .map((d) => {
      const rows = allPutts.filter((p) => p.distance === d);
      const holed = rows.filter((p) => p.holed).length;
      return {
        label: `${d.toString().replace(".", ",")} m`,
        score: rows.length ? Math.round((holed / rows.length) * 100) : 0,
        count: rows.length,
      };
    })
    .filter((z) => z.count > 0);
}

/* -------------------------------------------------------------------------
 * Senaste tester
 * ---------------------------------------------------------------------- */

export type LatestTest = {
  key: string;
  title: string;
  date: string;
  score?: number;
  scoreUnit?: string;
  handicap?: number;
  trend?: number;
};

export function computeLatestTests(limit = 3): LatestTest[] {
  const precision = loadPrecisionSessions();
  const offtee = loadOffTeeSessions();
  const putt = loadShortPuttSessions();

  const puttHcps = putt.map((s) => ratingToHandicap(s.pct));

  const all: LatestTest[] = [
    ...precision.map((s, i, arr) => ({
      key: `approach-${s.id}`,
      title: "Approach",
      date: s.date,
      score: s.score,
      scoreUnit: "/100",
      handicap: s.handicap,
      trend:
        i > 0 ? Math.round(((s.handicap ?? 0) - (arr[i - 1].handicap ?? 0)) * 10) / 10 : undefined,
    })),
    ...offtee.map((s, i, arr) => ({
      key: `offtee-${s.id}`,
      title: "Off the Tee",
      date: s.date,
      score: s.score,
      scoreUnit: "/100",
      handicap: s.handicap,
      trend: i > 0 ? Math.round((s.handicap - arr[i - 1].handicap) * 10) / 10 : undefined,
    })),
    ...putt.map((s, i) => ({
      key: `putt-${s.id}`,
      title: "Putting",
      date: s.date,
      score: Math.round(s.pct),
      scoreUnit: "%",
      handicap: puttHcps[i],
      trend: i > 0 ? Math.round((puttHcps[i] - puttHcps[i - 1]) * 10) / 10 : undefined,
    })),
  ];

  return all.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

/* -------------------------------------------------------------------------
 * Smart Insight – en rullande, datadriven insikt
 * ---------------------------------------------------------------------- */

function weakestApproachZone(session: PrecisionSession | undefined): string | undefined {
  if (!session) return undefined;
  const result = precisionResult(session.shots);
  const groups = groupScores(result).filter((g) => g.count > 0);
  if (!groups.length) return undefined;
  const worst = [...groups].sort((a, b) => a.score - b.score)[0];
  return `Approach ${worst.label} kostar flest slag just nu.`;
}

function offTeeMissBias(session: OffTeeSession | undefined): string | undefined {
  if (!session) return undefined;
  const n = session.shots.filter((s) => s.filled).length || 1;
  const left = session.shots.filter((s) => s.offline < -1).length;
  const right = session.shots.filter((s) => s.offline > 1).length;
  const leftPct = Math.round((left / n) * 100);
  const rightPct = Math.round((right / n) * 100);
  if (rightPct >= 55) return `Du missar ${rightPct} % av dina tee-slag höger.`;
  if (leftPct >= 55) return `Du missar ${leftPct} % av dina tee-slag vänster.`;
  return undefined;
}

function offTeeStreak(sessions: OffTeeSession[]): string | undefined {
  if (sessions.length < 3) return undefined;
  const last3 = sessions.slice(-3);
  const improving = last3[0].score < last3[1].score && last3[1].score < last3[2].score;
  return improving ? "Off the Tee har förbättrats tre tester i rad." : undefined;
}

function puttingLevel(cats: CategoryHandicap[]): string | undefined {
  const putting = cats.find((c) => c.slug === "puttning");
  if (!putting?.handicap) return undefined;
  return `Din putting motsvarar ungefär HCP ${putting.handicap.toFixed(1).replace(".", ",")}.`;
}

export function getSmartInsight(cats: CategoryHandicap[]): string | undefined {
  const precision = loadPrecisionSessions();
  const offtee = loadOffTeeSessions();

  const candidates = [
    offTeeMissBias(offtee[offtee.length - 1]),
    weakestApproachZone(precision[precision.length - 1]),
    puttingLevel(cats),
    offTeeStreak(offtee),
  ].filter((v): v is string => Boolean(v));

  if (!candidates.length) return undefined;
  // Roterar per timme snarare än vid varje render, men utan att kräva state.
  const slot = Math.floor(Date.now() / (1000 * 60 * 60));
  return candidates[slot % candidates.length];
}
