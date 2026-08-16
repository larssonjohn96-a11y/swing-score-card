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
import { loadLagPuttSessions } from "@/lib/lagputt";
import { loadSpeedSessions } from "@/lib/speed";
import { loadShortGameSessions } from "@/lib/shortgame";
import { precisionResult, groupScores } from "@/lib/precision";
import { offTeeResult, analyseOffTee } from "@/lib/offtee";

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

export type CategorySlug = "approach" | "driving" | "around-the-green" | "puttning" | "speed";

export const CATEGORY_WEIGHTS: Record<CategorySlug, number> = {
  approach: 0.35,
  driving: 0.25,
  puttning: 0.2,
  "around-the-green": 0.1,
  speed: 0.1,
};

export const CATEGORY_LABELS: Record<CategorySlug, string> = {
  approach: "Approach",
  driving: "Off the Tee",
  "around-the-green": "Around Green",
  puttning: "Putting",
  speed: "Speed",
};

/** Generisk omvandling av en 0–100-rating (högre = bättre) till ett handicap-liknande tal. */
function ratingToHandicap(rating: number): number {
  return Math.max(-4, Math.min(36, 30 - rating * 0.34));
}

/**
 * Totalt Putting HCP = Short Putting Test (1–3 m) viktat 60 % + Lagputt
 * (8–18 m) viktat 40 %. Korta, avgörande puttar väger tyngre än
 * distanskänsla på långputtar, men båda räknas in. Om bara en av dem har
 * data används den ensam.
 *
 * Lagputt-delen använder ett rullande snitt av de senaste 5 testerna,
 * inte bara det senaste – ett enskilt lagputt-test är bara 6 puttar och
 * därför ett litet, känsligt stickprov. Short Putting Test (12 puttar)
 * bedöms som stort nog att lita på ensamt.
 */
function combinePuttingHandicap(shortHcp?: number, lagHcp?: number): number | undefined {
  if (shortHcp !== undefined && lagHcp !== undefined) return shortHcp * 0.6 + lagHcp * 0.4;
  return shortHcp ?? lagHcp;
}

const LAG_PUTT_ROLLING_WINDOW = 5;

/**
 * Around the Green = Närspelstest (65 %) + Bunkerslag (35 %). Närspelstestet
 * väger tyngre eftersom det är ett fullständigt 6-slagstest över flera
 * avstånd, medan bunkerslag är ett smalare kompletterande delmoment.
 */
function combineAroundGreenHandicap(nearHcp?: number, bunkerHcp?: number): number | undefined {
  if (nearHcp !== undefined && bunkerHcp !== undefined) return nearHcp * 0.65 + bunkerHcp * 0.35;
  return nearHcp ?? bunkerHcp;
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

/**
 * Jämförelsenivåer för spindeldiagrammet – handicap, inte spelare.
 *
 * categoryHcp ger en realistisk, ojämn profil per nivå istället för samma
 * platta tal på alla axlar: tour-spelare särskiljer sig mest i längd/fart,
 * medan scratch-spelare är förhållandevis balanserade. Grundat på samma
 * kalibreringsdata som redan används för respektive tests egna HCP-skalor
 * i den här filen – en rimlig uppskattning, inte en exakt mätning.
 */
export const BENCHMARK_LEVELS: {
  label: string;
  hcp: number;
  categoryHcp: Record<CategorySlug, number>;
}[] = [
  {
    label: "30",
    hcp: 30,
    categoryHcp: { approach: 28, driving: 26, "around-the-green": 32, puttning: 30, speed: 28 },
  },
  {
    label: "20",
    hcp: 20,
    categoryHcp: { approach: 19, driving: 17, "around-the-green": 21, puttning: 19, speed: 18 },
  },
  {
    label: "10",
    hcp: 10,
    categoryHcp: { approach: 9, driving: 8, "around-the-green": 10, puttning: 9, speed: 9 },
  },
  {
    label: "0",
    hcp: SCRATCH_HANDICAP,
    categoryHcp: { approach: 0, driving: -1, "around-the-green": 1, puttning: 0, speed: 0 },
  },
  {
    label: "+3",
    hcp: -3,
    categoryHcp: { approach: -3, driving: -4, "around-the-green": -2, puttning: -3, speed: -4 },
  },
  {
    label: "Tour",
    hcp: ELITE_HANDICAP,
    categoryHcp: { approach: -6, driving: -7, "around-the-green": -5, puttning: -6, speed: -8 },
  },
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
  /** true = inget test gjort än, siffran är en uppskattning ur ditt satta HCP */
  isBaseline?: boolean;
  /** true = senaste testets råa förbättring var större än vad skyddsmekanismen
   *  tillät slå igenom direkt (se applyHandicapCap) */
  capped?: boolean;
};

/**
 * WHS-inspirerad skyddsmekanism (soft cap / hard cap): en enskild session
 * får inte ensam sänka en kategoris HCP mer än så här jämfört med de
 * senaste sessionernas lägsta (bästa) värde:
 *   ≤3.0 bättre  → slår igenom direkt
 *   3.0–5.0 bättre → bara halva överskjutande delen slår igenom ("soft cap")
 *   >5.0 bättre  → låst vid exakt 5.0 bättre än referensen ("hard cap")
 * Skyddar mot att ett enstaka lyckträff- eller felmätt test ger ett
 * orimligt hopp i den visade siffran, precis som riktiga WHS gör mot
 * enstaka exceptionella golfrundor.
 */
function applyHandicapCap(rawHcps: number[]): { series: number[]; lastCapped: boolean } {
  if (rawHcps.length === 0) return { series: [], lastCapped: false };
  const series: number[] = [rawHcps[0]];
  let lastCapped = false;

  for (let i = 1; i < rawHcps.length; i++) {
    const raw = rawHcps[i];
    const referenceLow = Math.min(...series.slice(Math.max(0, i - 6), i));
    const improvement = referenceLow - raw; // positivt = bättre än referensen
    let value = raw;
    let capped = false;

    if (improvement > 5) {
      value = referenceLow - 5;
      capped = true;
    } else if (improvement > 3) {
      value = referenceLow - 3 - (improvement - 3) * 0.5;
      capped = true;
    }

    series.push(Math.round(value * 10) / 10);
    if (i === rawHcps.length - 1) lastCapped = capped;
  }

  return { series, lastCapped };
}

function byDateAsc<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.date.localeCompare(b.date));
}

/** Filtrerar sessioner till och med ett visst datum – används för historiska ögonblicksbilder. */
function upTo<T extends { date: string }>(items: T[], asOf?: Date): T[] {
  if (!asOf) return items;
  const cutoff = asOf.toISOString();
  return byDateAsc(items).filter((i) => i.date <= cutoff);
}

/** Kombinerad HCP-tidsserie: varje test-tillfälle (kort- eller lagputt) med senast kända
 *  HCP från BÅDA testtyperna vid den tidpunkten, viktade ihop till ett totalt Putting HCP. */
function combinedPuttingSeries(asOf?: Date): { date: string; handicap: number }[] {
  const shortEvents = upTo(loadShortPuttSessions(), asOf).map((s) => ({
    date: s.date,
    kind: "short" as const,
    handicap: s.handicap,
  }));
  const lagEvents = upTo(loadLagPuttSessions(), asOf).map((s) => ({
    date: s.date,
    kind: "lag" as const,
    handicap: s.handicap,
  }));
  const events = byDateAsc([...shortEvents, ...lagEvents]);

  let lastShort: number | undefined;
  const lagWindow: number[] = [];
  return events.map((e) => {
    if (e.kind === "short") {
      lastShort = e.handicap;
    } else {
      lagWindow.push(e.handicap);
      if (lagWindow.length > LAG_PUTT_ROLLING_WINDOW) lagWindow.shift();
    }
    const lagAvg = lagWindow.length
      ? lagWindow.reduce((a, b) => a + b, 0) / lagWindow.length
      : undefined;
    return { date: e.date, handicap: combinePuttingHandicap(lastShort, lagAvg) ?? e.handicap };
  });
}

/** Samma princip som combinedPuttingSeries, men för Around the Green (Närspel + Bunker). */
function combinedAroundGreenSeries(asOf?: Date): { date: string; handicap: number }[] {
  const nearEvents = upTo(loadShortGameSessions(), asOf).map((s) => ({
    date: s.date,
    kind: "near" as const,
    handicap: s.handicap,
  }));
  const bunkerEvents = upTo(loadBunkerSessions(), asOf).map((s) => ({
    date: s.date,
    kind: "bunker" as const,
    handicap: s.handicap,
  }));
  const events = byDateAsc([...nearEvents, ...bunkerEvents]);

  let lastNear: number | undefined;
  let lastBunker: number | undefined;
  return events.map((e) => {
    if (e.kind === "near") lastNear = e.handicap;
    else lastBunker = e.handicap;
    return {
      date: e.date,
      handicap: combineAroundGreenHandicap(lastNear, lastBunker) ?? e.handicap,
    };
  });
}

/**
 * Kategori-HCP, antingen just nu (utan argument) eller som de såg ut vid en
 * viss tidpunkt (asOf) – det senare används för att bygga utvecklingsgrafer
 * och "senaste 30 dagarna"-jämförelser utan att behöva egen historisk lagring.
 */
/**
 * @param baselineHandicap Om satt: kategorier utan ett enda test visar detta
 * värde som en märkt uppskattning (isBaseline: true) istället för att sakna
 * data helt. Lämna odefinierad för att bevara tidigare beteende där
 * kategorier utan tester saknar handicap.
 */
export function computeCategoryHandicaps(
  asOf?: Date,
  baselineHandicap?: number,
): CategoryHandicap[] {
  const precision = upTo(loadPrecisionSessions(), asOf);
  const offtee = upTo(loadOffTeeSessions(), asOf);
  const bunker = upTo(loadBunkerSessions(), asOf);
  const putt = upTo(loadShortPuttSessions(), asOf);

  const baseline = (count: number): Pick<CategoryHandicap, "handicap" | "isBaseline"> =>
    count === 0 && baselineHandicap !== undefined
      ? { handicap: baselineHandicap, isBaseline: true }
      : {};

  const approachRaw = precision
    .map((s) => s.handicap)
    .filter((v): v is number => typeof v === "number");
  const approachCap = applyHandicapCap(approachRaw);
  const approach: CategoryHandicap = {
    slug: "approach",
    title: CATEGORY_LABELS.approach,
    count: precision.length,
    handicap: approachCap.series.length
      ? approachCap.series[approachCap.series.length - 1]
      : undefined,
    trend: trendOf(approachCap.series),
    latestScore: precision.length ? precision[precision.length - 1].score : undefined,
    capped: approachCap.lastCapped,
    ...baseline(precision.length),
  };

  const offteeRaw = offtee.map((s) => s.handicap);
  const offteeCap = applyHandicapCap(offteeRaw);
  const driving: CategoryHandicap = {
    slug: "driving",
    title: CATEGORY_LABELS.driving,
    count: offtee.length,
    handicap: offteeCap.series.length ? offteeCap.series[offteeCap.series.length - 1] : undefined,
    trend: trendOf(offteeCap.series),
    latestScore: offtee.length ? offtee[offtee.length - 1].score : undefined,
    capped: offteeCap.lastCapped,
    ...baseline(offtee.length),
  };

  const aroundGreenSeries = combinedAroundGreenSeries(asOf);
  const aroundGreenRaw = aroundGreenSeries.map((p) => p.handicap);
  const aroundGreenCap = applyHandicapCap(aroundGreenRaw);
  const nearCount = upTo(loadShortGameSessions(), asOf).length;
  const aroundGreenCount = bunker.length + nearCount;
  const aroundGreen: CategoryHandicap = {
    slug: "around-the-green",
    title: CATEGORY_LABELS["around-the-green"],
    count: aroundGreenCount,
    handicap: aroundGreenCap.series.length
      ? aroundGreenCap.series[aroundGreenCap.series.length - 1]
      : undefined,
    trend: trendOf(aroundGreenCap.series),
    latestScore: nearCount ? upTo(loadShortGameSessions(), asOf).at(-1)?.score : undefined,
    capped: aroundGreenCap.lastCapped,
    ...baseline(aroundGreenCount),
  };

  const puttingSeries = combinedPuttingSeries(asOf);
  const puttingRaw = puttingSeries.map((p) => p.handicap);
  const puttingCap = applyHandicapCap(puttingRaw);
  const lagCount = upTo(loadLagPuttSessions(), asOf).length;
  const puttingCount = putt.length + lagCount;
  const putting: CategoryHandicap = {
    slug: "puttning",
    title: CATEGORY_LABELS.puttning,
    count: puttingCount,
    handicap: puttingCap.series.length
      ? puttingCap.series[puttingCap.series.length - 1]
      : undefined,
    trend: trendOf(puttingCap.series),
    latestScore: putt.length ? putt[putt.length - 1].score : undefined,
    capped: puttingCap.lastCapped,
    ...baseline(puttingCount),
  };

  const speedSessions = upTo(loadSpeedSessions(), asOf);
  const speedRaw = speedSessions.map((s) => s.handicap);
  const speedCap = applyHandicapCap(speedRaw);
  const speed: CategoryHandicap = {
    slug: "speed",
    title: CATEGORY_LABELS.speed,
    count: speedSessions.length,
    handicap: speedCap.series.length ? speedCap.series[speedCap.series.length - 1] : undefined,
    trend: trendOf(speedCap.series),
    latestScore: speedSessions.length ? speedSessions[speedSessions.length - 1].score : undefined,
    capped: speedCap.lastCapped,
    ...baseline(speedSessions.length),
  };

  return [approach, driving, aroundGreen, putting, speed];
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
  /** "missing" = kategorin saknar helt test/score ännu, "lowest" = lägst score bland fullständigt testade kategorier */
  reason: "missing" | "lowest";
};

export function computeBiggestOpportunity(cats: CategoryHandicap[]): Opportunity | undefined {
  // Prioritera kategorier utan ett enda test – viktigare att fylla luckor än att
  // finslipa en kategori man redan har data för.
  const missing = cats.filter((c) => c.count === 0);
  if (missing.length) {
    const pick = [...missing].sort(
      (a, b) => CATEGORY_WEIGHTS[b.slug] - CATEGORY_WEIGHTS[a.slug],
    )[0];
    return { slug: pick.slug, title: pick.title, handicap: 0, impact: 0, reason: "missing" };
  }

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
  return { slug: best.slug, title: best.title, handicap: best.handicap!, impact, reason: "lowest" };
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
  speed?: number;
};

const day = (iso: string) => (iso.length > 10 ? iso.slice(0, 10) : iso);

/** Alla datum där minst ett test genomfördes, i valfri period. */
function sessionDates(periodDays: number | null): string[] {
  const all = [
    ...loadPrecisionSessions().map((s) => s.date),
    ...loadOffTeeSessions().map((s) => s.date),
    ...loadBunkerSessions().map((s) => s.date),
    ...loadShortGameSessions().map((s) => s.date),
    ...loadShortPuttSessions().map((s) => s.date),
    ...loadLagPuttSessions().map((s) => s.date),
    ...loadSpeedSessions().map((s) => s.date),
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
      speed: find("speed") !== undefined ? ratingFromHandicap(find("speed")!) : undefined,
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
  const near = loadShortGameSessions();
  const putt = loadShortPuttSessions();
  const lag = loadLagPuttSessions();

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
    ...near.map((s) => ({
      key: `near-${s.id}`,
      categorySlug: "around-the-green" as const,
      title: "Närspelstest",
      date: s.date,
      score: s.score,
      scoreUnit: "/100",
      handicap: s.handicap,
      to: { slug: "around-the-green", test: "narspel" },
    })),
    ...bunker.map((s) => ({
      key: `bunker-${s.id}`,
      categorySlug: "around-the-green" as const,
      title: "Bunkerslag",
      date: s.date,
      score: s.score,
      scoreUnit: "/100",
      handicap: s.handicap,
      to: { slug: "around-the-green", test: "bunker" },
    })),
    ...putt.map((s) => ({
      key: `putt-${s.id}`,
      categorySlug: "puttning" as const,
      title: "Short Putting Test",
      date: s.date,
      score: s.score,
      scoreUnit: "/100",
      handicap: s.handicap,
      to: { slug: "puttning", test: "kortputt" },
    })),
    ...lag.map((s) => ({
      key: `lag-${s.id}`,
      categorySlug: "puttning" as const,
      title: "Lagputt",
      date: s.date,
      score: Math.round(s.pct),
      scoreUnit: "%",
      handicap: s.handicap,
      to: { slug: "puttning", test: "lagputt" },
    })),
    ...loadSpeedSessions().map((s) => ({
      key: `speed-${s.id}`,
      categorySlug: "speed" as const,
      title: "Speed Test",
      date: s.date,
      score: s.score,
      scoreUnit: "/100",
      handicap: s.handicap,
      to: { slug: "driving", test: "speed" },
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
/** Approach: score per avståndszon, snitt av de senaste 5 testerna. */
export function computeApproachHeatmap(): HeatmapZone[] {
  const sessions = loadPrecisionSessions().slice(-5);
  const allShots = sessions.flatMap((s) => s.shots);
  if (!allShots.length) return [];
  const result = precisionResult(allShots);
  return groupScores(result)
    .filter((g) => g.count > 0)
    .map((g) => ({ label: g.label, score: g.score, count: g.count }));
}

/** Short Putting Test: träffprocent per avstånd (1 / 2 / 3 m), snitt av de senaste 5 testerna. */
export function computePuttingHeatmap(): HeatmapZone[] {
  const sessions = loadShortPuttSessions().slice(-5);
  const allPutts = sessions.flatMap((s) => s.putts);
  if (!allPutts.length) return [];
  const distances = [1, 2, 3];
  return distances
    .map((d) => {
      const rows = allPutts.filter((p) => p.distance === d);
      const holed = rows.filter((p) => p.holed).length;
      return {
        label: `${d} m`,
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
    ...putt.map((s, i, arr) => ({
      key: `putt-${s.id}`,
      title: "Putting",
      date: s.date,
      score: s.score,
      scoreUnit: "/100",
      handicap: s.handicap,
      trend: i > 0 ? Math.round((s.handicap - arr[i - 1].handicap) * 10) / 10 : undefined,
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
    weakestApproachZone(precision[precision.length - 1]),
    puttingLevel(cats),
    offTeeStreak(offtee),
  ].filter((v): v is string => Boolean(v));

  if (!candidates.length) return undefined;
  // Roterar per timme snarare än vid varje render, men utan att kräva state.
  const slot = Math.floor(Date.now() / (1000 * 60 * 60));
  return candidates[slot % candidates.length];
}

/* -------------------------------------------------------------------------
 * Kategoridetaljer – styrka/begränsning, nyckeltal, styrkor/förbättringar
 * ---------------------------------------------------------------------- */

type CategoryDetailData = {
  strength?: string;
  limitation?: string;
  keyMetrics: { label: string; value: string }[];
  strengths: string[];
  improvements: string[];
  heatmap: HeatmapZone[];
};

function approachDetailData(): CategoryDetailData {
  const sessions = loadPrecisionSessions();
  const last = sessions[sessions.length - 1];
  const heatmap = computeApproachHeatmap();
  let strength: string | undefined;
  let limitation: string | undefined;
  if (heatmap.length) {
    strength = [...heatmap].sort((a, b) => b.score - a.score)[0].label;
    limitation = [...heatmap].sort((a, b) => a.score - b.score)[0].label;
  }
  const keyMetrics = last
    ? [
        { label: "Senaste score", value: `${last.score ?? "–"}/100` },
        { label: "Est. HCP", value: last.handicap !== undefined ? hcpLabel(last.handicap) : "–" },
        { label: "Snitt närhet", value: `${last.avgProximity.toFixed(1)} m` },
        { label: "Konsekvens", value: `${last.consistency.toFixed(0)}/100` },
      ]
    : [];
  const strengths = strength ? [`Starkast på ${strength}.`] : [];
  const improvements = limitation ? [`${limitation} kostar flest slag just nu.`] : [];
  return { strength, limitation, keyMetrics, strengths, improvements, heatmap };
}

const OFFTEE_DIMENSIONS = [
  { key: "distanceHcp", label: "Längd" },
  { key: "waywardHcp", label: "OB-kontroll" },
  { key: "fairwayHcp", label: "Fairway-träff" },
  { key: "evennessHcp", label: "Jämnhet" },
] as const;

function drivingDetailData(): CategoryDetailData {
  const sessions = loadOffTeeSessions();
  const last = sessions[sessions.length - 1];
  if (!last) return { keyMetrics: [], strengths: [], improvements: [], heatmap: [] };
  const result = offTeeResult(last.shots);
  const analysis = analyseOffTee(result);
  const sorted = [...OFFTEE_DIMENSIONS].sort(
    (a, b) => result.breakdown[a.key] - result.breakdown[b.key],
  );
  const strength = sorted[0]?.label;
  const limitation = sorted[sorted.length - 1]?.label;
  const keyMetrics = [
    { label: "Senaste score", value: `${result.score}/100` },
    { label: "Driving HCP", value: hcpLabel(result.handicap) },
    { label: "Snitt totalt", value: `${result.avgTotal.toFixed(0)} m` },
    { label: "Fairway-träff", value: `${result.fairwayHitPct} %` },
  ];
  return {
    strength,
    limitation,
    keyMetrics,
    strengths: analysis.strengths,
    improvements: analysis.improvements,
    heatmap: [],
  };
}

function aroundGreenDetailData(): CategoryDetailData {
  const nearSessions = loadShortGameSessions();
  const lastNear = nearSessions[nearSessions.length - 1];
  const bunkerSessions = loadBunkerSessions();
  const lastBunker = bunkerSessions[bunkerSessions.length - 1];

  const keyMetrics = [
    ...(lastNear
      ? [
          { label: "Närspel HCP", value: hcpLabel(lastNear.handicap) },
          { label: "Snitt från hål", value: `${lastNear.avgProximity.toFixed(2)} m` },
        ]
      : []),
    ...(lastBunker
      ? [
          { label: "Bunker HCP", value: hcpLabel(lastBunker.handicap) },
          { label: "Bunker snitt från hål", value: `${lastBunker.avgProximity.toFixed(2)} m` },
        ]
      : []),
  ];

  const strengths: string[] = [];
  const improvements: string[] = [];
  if (lastNear && lastNear.avgProximity <= 1.5) {
    strengths.push(
      `Stark närspelskontroll – snitt ${lastNear.avgProximity.toFixed(2)} m från hål i Närspelstestet.`,
    );
  } else if (lastNear) {
    improvements.push(
      `Snitt ${lastNear.avgProximity.toFixed(2)} m från hål i Närspelstestet – störst chans att sänka HCP snabbt.`,
    );
  }
  if (lastBunker && lastBunker.avgProximity <= 2) {
    strengths.push(`Stabilt ur bunkern – snitt ${lastBunker.avgProximity.toFixed(2)} m från hål.`);
  } else if (lastBunker) {
    improvements.push(
      `Bunker snitt ${lastBunker.avgProximity.toFixed(2)} m från hål – ett tydligt förbättringsområde.`,
    );
  }

  return {
    strength: strengths[0],
    limitation: improvements[0],
    keyMetrics,
    strengths,
    improvements,
    heatmap: [],
  };
}

function puttingDetailData(): CategoryDetailData {
  const sessions = loadShortPuttSessions();
  const last = sessions[sessions.length - 1];
  const lagSessions = loadLagPuttSessions();
  const lastLag = lagSessions[lagSessions.length - 1];
  const heatmap = computePuttingHeatmap();
  let strength: string | undefined;
  let limitation: string | undefined;
  if (heatmap.length) {
    strength = [...heatmap].sort((a, b) => b.score - a.score)[0].label;
    limitation = [...heatmap].sort((a, b) => a.score - b.score)[0].label;
  }
  const keyMetrics = [
    ...(last
      ? [
          { label: "Short Putting Score", value: `${last.score}/100` },
          { label: "Short Putting HCP", value: hcpLabel(last.handicap) },
        ]
      : []),
    ...(lastLag
      ? [
          { label: "Lagputt godkända", value: `${Math.round(lastLag.pct)} %` },
          { label: "Lagputt HCP", value: hcpLabel(lastLag.handicap) },
        ]
      : []),
  ];
  const strengths = strength ? [`Stark på ${strength} i Short Putting Test.`] : [];
  const improvements = limitation
    ? [`${limitation} har lägst träffprocent i Short Putting Test just nu.`]
    : [];
  return { strength, limitation, keyMetrics, strengths, improvements, heatmap };
}

function speedDetailData(): CategoryDetailData {
  const sessions = loadSpeedSessions();
  const last = sessions[sessions.length - 1];
  if (!last) return { keyMetrics: [], strengths: [], improvements: [], heatmap: [] };

  const keyMetrics = [
    { label: "Snitt ball speed", value: `${last.avgBallSpeed.toFixed(1)} mph` },
    { label: "Topp ball speed", value: `${last.topBallSpeed.toFixed(1)} mph` },
    { label: "Speed HCP", value: hcpLabel(last.handicap) },
    ...(last.avgClubSpeed !== undefined
      ? [{ label: "Snitt clubhead", value: `${last.avgClubSpeed.toFixed(1)} mph` }]
      : []),
  ];

  const spread = last.topBallSpeed - last.avgBallSpeed;
  const strengths =
    spread < 6 ? [`Jämn ball speed mellan slagen (±${spread.toFixed(0)} mph).`] : [];
  const improvements =
    spread >= 6
      ? [
          `Stor variation mellan slagen (${spread.toFixed(0)} mph topp mot snitt) – jobba på konsekvent kontakt.`,
        ]
      : [];

  return {
    strength: strengths[0],
    limitation: improvements[0],
    keyMetrics,
    strengths,
    improvements,
    heatmap: [],
  };
}

function categoryDetailData(slug: CategorySlug): CategoryDetailData {
  switch (slug) {
    case "approach":
      return approachDetailData();
    case "driving":
      return drivingDetailData();
    case "around-the-green":
      return aroundGreenDetailData();
    case "puttning":
      return puttingDetailData();
    case "speed":
      return speedDetailData();
  }
}

/** Full detaljvy för en kategori: /utveckling/$slug. */
export type CategoryDetail = {
  slug: CategorySlug;
  title: string;
  handicap?: number;
  trend?: number;
  score: number;
  keyMetrics: { label: string; value: string }[];
  strengths: string[];
  improvements: string[];
  heatmap: HeatmapZone[];
  history: HistoryEntry[];
};

export function computeCategoryDetail(slug: CategorySlug): CategoryDetail {
  const cats = computeCategoryHandicaps();
  const cat = cats.find((c) => c.slug === slug);
  const detail = categoryDetailData(slug);
  return {
    slug,
    title: cat?.title ?? CATEGORY_LABELS[slug],
    handicap: cat?.handicap,
    trend: cat?.trend,
    score: cat?.handicap !== undefined ? ratingFromHandicap(cat.handicap) : 0,
    keyMetrics: detail.keyMetrics,
    strengths: detail.strengths,
    improvements: detail.improvements,
    heatmap: detail.heatmap,
    history: computeHistory(slug, 50),
  };
}

/* -------------------------------------------------------------------------
 * Kategorikort med rullande HCP-snitt (för "Stats per kategori")
 * ---------------------------------------------------------------------- */

type CategorySessionPoint = { date: string; handicap: number };

/** Varje kategoris sessioner omvandlade till {date, handicap}, kronologisk ordning. */
function categorySessionSeries(): Record<CategorySlug, CategorySessionPoint[]> {
  const precision = loadPrecisionSessions()
    .filter((s): s is PrecisionSession & { handicap: number } => typeof s.handicap === "number")
    .map((s) => ({ date: s.date, handicap: s.handicap }));
  const offtee = loadOffTeeSessions().map((s) => ({ date: s.date, handicap: s.handicap }));
  const speed = loadSpeedSessions().map((s) => ({ date: s.date, handicap: s.handicap }));
  return {
    approach: byDateAsc(precision),
    driving: byDateAsc(offtee),
    "around-the-green": byDateAsc(combinedAroundGreenSeries()),
    puttning: byDateAsc(combinedPuttingSeries()),
    speed: byDateAsc(speed),
  };
}

/** Rullande snitt av de senaste `window` (3–5) värdena. */
function rollingAverage(values: number[], window = 5): number | undefined {
  if (!values.length) return undefined;
  const slice = values.slice(-Math.min(window, values.length));
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function rollingAverageAsOf(
  points: CategorySessionPoint[],
  asOf: Date | undefined,
  window = 5,
): number | undefined {
  const filtered = asOf ? points.filter((p) => p.date <= asOf.toISOString()) : points;
  return rollingAverage(
    filtered.map((p) => p.handicap),
    window,
  );
}

export type CategoryCardStat = {
  slug: CategorySlug;
  title: string;
  hasData: boolean;
  /** senaste enskilda testets HCP (efter skyddsmekanismen), aldrig 0 vid tomt data */
  estHcp?: number;
  /** förändring i estHcp över vald period; negativt = förbättring (lägre HCP) */
  change?: number;
  strongest?: string;
  improve?: string;
  /** true = inget test gjort än, siffran är en uppskattning ur ditt satta HCP */
  isBaseline?: boolean;
  /** true = senaste testets råa förbättring var större än vad skyddsmekanismen tillät */
  capped?: boolean;
};

/** De fyra klickbara kategorikorten – rullande HCP-snitt, förändring över `periodDays`. */
export function computeCategoryCardStats(
  periodDays: number,
  baselineHandicap?: number,
): CategoryCardStat[] {
  const series = categorySessionSeries();
  return (Object.keys(CATEGORY_LABELS) as CategorySlug[]).map((slug) => {
    const title = CATEGORY_LABELS[slug];
    const points = series[slug];
    if (!points.length) {
      if (baselineHandicap === undefined) return { slug, title, hasData: false };
      return { slug, title, hasData: true, estHcp: baselineHandicap, isBaseline: true };
    }

    // Samma värde som computeCategoryHandicaps() (startsidan, detaljsidan): senaste
    // enskilda testets HCP (efter skyddsmekanismen) – inte ett rullande snitt – så
    // samma kategori alltid visar samma siffra oavsett var i appen man tittar.
    const rawHcps = points.map((p) => p.handicap).filter((v): v is number => v !== undefined);
    const { series: cappedSeries, lastCapped } = applyHandicapCap(rawHcps);
    const estHcp = cappedSeries.length ? cappedSeries[cappedSeries.length - 1] : undefined;
    const cutoff = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const pastEst = rollingAverageAsOf(points, cutoff);
    const change =
      estHcp !== undefined && pastEst !== undefined
        ? Math.round((estHcp - pastEst) * 10) / 10
        : undefined;
    const detail = categoryDetailData(slug);

    return {
      slug,
      title,
      hasData: true,
      estHcp: estHcp !== undefined ? Math.round(estHcp * 10) / 10 : undefined,
      change,
      strongest: detail.strength,
      improve: detail.limitation,
      capped: lastCapped,
    };
  });
}

/** En punkt i HCP-över-tid-grafen: rullande snitt (linje) + enskilt testresultat (punkt). */
export type HcpTimelinePoint = {
  date: string;
  rolling?: number;
  raw?: number;
};

/** HCP över tid för en kategori – rullande snitt som linje, varje test som egen datapunkt. */
export function computeCategoryHcpTimeline(
  slug: CategorySlug,
  periodDays: number | null,
): HcpTimelinePoint[] {
  const points = categorySessionSeries()[slug];
  if (!points.length) return [];

  const withRolling = points.map((p, i) => {
    const window = points.slice(Math.max(0, i - 4), i + 1).map((x) => x.handicap);
    const rolling = window.reduce((a, b) => a + b, 0) / window.length;
    return {
      date: p.date.slice(0, 10),
      raw: Math.round(p.handicap * 10) / 10,
      rolling: Math.round(rolling * 10) / 10,
    };
  });

  if (!periodDays) return withRolling;
  const cutoff = Date.now() - periodDays * 24 * 60 * 60 * 1000;
  return withRolling.filter((p) => new Date(p.date).getTime() >= cutoff);
}
