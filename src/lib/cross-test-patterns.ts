import { loadPrecisionSessions } from "@/lib/precision-store";
import { loadOffTeeSessions } from "@/lib/offtee-store";
import { loadSpeedSessions } from "@/lib/speed";
import { loadShortGameSessions } from "@/lib/shortgame";
import { loadBunkerSessions } from "@/lib/bunker";
import { loadShortPuttSessions } from "@/lib/shortputt";
import { loadLagPuttSessions } from "@/lib/lagputt";
import { computeCategoryHandicaps, CATEGORY_LABELS, type CategorySlug } from "@/lib/sg-handicap";

/**
 * Ren, faktabaserad mönsteranalys över alla sju tester. INGEN rådgivning,
 * inga övningsförslag, inga "du bör"-formuleringar – bara vad datan visar.
 * Användaren drar sina egna slutsatser om vad mönstret betyder och vad de
 * i så fall vill göra åt det.
 */

export type PatternFact = {
  id: string;
  title: string;
  body: string;
};

/* -------------------------------------------------------------------------
 * 1. Konsekvens: vilket test ger mest resp. minst stabila resultat
 * Mäts som spridning (standardavvikelse) i handicap mellan sessioner,
 * samma enhet för alla sju tester så de går att jämföra rakt av.
 * ---------------------------------------------------------------------- */

type TestConsistency = { id: string; title: string; stdDev: number; n: number };

function stdDev(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function computeConsistencyRanking(): PatternFact | undefined {
  const sources: { id: string; title: string; handicaps: number[] }[] = [
    { id: "offtee", title: "Off the Tee", handicaps: loadOffTeeSessions().map((s) => s.handicap) },
    { id: "speed", title: "Speed", handicaps: loadSpeedSessions().map((s) => s.handicap) },
    {
      id: "approach",
      title: "Approach",
      handicaps: loadPrecisionSessions()
        .map((s) => s.handicap)
        .filter((v): v is number => typeof v === "number"),
    },
    { id: "narspel", title: "Närspel", handicaps: loadShortGameSessions().map((s) => s.handicap) },
    { id: "bunker", title: "Bunker", handicaps: loadBunkerSessions().map((s) => s.handicap) },
    {
      id: "kortputt",
      title: "Kortputt",
      handicaps: loadShortPuttSessions().map((s) => s.handicap),
    },
    { id: "lagputt", title: "Lag Putt", handicaps: loadLagPuttSessions().map((s) => s.handicap) },
  ];

  const ranked: TestConsistency[] = sources
    .filter((s) => s.handicaps.length >= 3)
    .map((s) => ({
      id: s.id,
      title: s.title,
      stdDev: Math.round(stdDev(s.handicaps.slice(-6)) * 10) / 10,
      n: s.handicaps.length,
    }));

  if (ranked.length < 2) return undefined;

  const sorted = [...ranked].sort((a, b) => a.stdDev - b.stdDev);
  const mostConsistent = sorted[0];
  const leastConsistent = sorted[sorted.length - 1];
  if (mostConsistent.id === leastConsistent.id) return undefined;

  return {
    id: "consistency",
    title: "Störst skillnad i stabilitet mellan testerna",
    body: `${mostConsistent.title} har din jämnaste HCP mellan tester (± ${mostConsistent.stdDev.toFixed(1)}). ${leastConsistent.title} varierar mest (± ${leastConsistent.stdDev.toFixed(1)}).`,
  };
}

/* -------------------------------------------------------------------------
 * 2. Kategoriförändring: vilken av de fyra huvudkategorierna har rört sig
 * mest respektive minst sedan ditt första test, ren skillnad i HCP-tal.
 * ---------------------------------------------------------------------- */

const MAIN_CATEGORIES: CategorySlug[] = ["driving", "approach", "around-the-green", "puttning"];

function earliestSessionDate(): Date | undefined {
  const dates = [
    ...loadPrecisionSessions().map((s) => s.date),
    ...loadOffTeeSessions().map((s) => s.date),
    ...loadSpeedSessions().map((s) => s.date),
    ...loadShortGameSessions().map((s) => s.date),
    ...loadBunkerSessions().map((s) => s.date),
    ...loadShortPuttSessions().map((s) => s.date),
    ...loadLagPuttSessions().map((s) => s.date),
  ].sort();
  return dates.length ? new Date(dates[0]) : undefined;
}

export function computeCategoryMovement(): PatternFact | undefined {
  const start = earliestSessionDate();
  if (!start) return undefined;

  const startCats = computeCategoryHandicaps(start);
  const nowCats = computeCategoryHandicaps();

  const moves = MAIN_CATEGORIES.map((slug) => {
    const then = startCats.find((c) => c.slug === slug)?.handicap;
    const now = nowCats.find((c) => c.slug === slug)?.handicap;
    if (then === undefined || now === undefined) return undefined;
    return { slug, title: CATEGORY_LABELS[slug], delta: Math.round((then - now) * 10) / 10 };
  }).filter((v): v is { slug: CategorySlug; title: string; delta: number } => v !== undefined);

  if (moves.length < 2) return undefined;

  const sorted = [...moves].sort((a, b) => b.delta - a.delta);
  const most = sorted[0];
  const least = sorted[sorted.length - 1];
  if (most.slug === least.slug) return undefined;

  return {
    id: "movement",
    title: "Störst och minst rörelse sedan ditt första test",
    body: `${most.title} har rört sig mest (${most.delta > 0 ? "↓" : "↑"} ${Math.abs(most.delta)} HCP). ${least.title} har rört sig minst (${least.delta > 0 ? "↓" : least.delta < 0 ? "↑" : "±"} ${Math.abs(least.delta)} HCP).`,
  };
}

/** Samlar alla mönster som faktiskt har tillräckligt med data att visas. */
export function computeAllPatterns(): PatternFact[] {
  return [computeConsistencyRanking(), computeCategoryMovement()].filter(
    (v): v is PatternFact => v !== undefined,
  );
}
