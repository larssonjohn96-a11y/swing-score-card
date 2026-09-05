import { loadPrecisionSessions } from "@/lib/precision-store";
import { loadOffTeeSessions } from "@/lib/offtee-store";
import { loadBunkerSessions } from "@/lib/bunker";
import { loadShortPuttSessions } from "@/lib/shortputt";
import { loadLagPuttSessions } from "@/lib/lagputt";
import { loadSpeedSessions } from "@/lib/speed";
import { loadShortGameSessions } from "@/lib/shortgame";
import {
  CATEGORY_LABELS,
  loadRealHandicap,
  type CategoryHandicap,
  type CategorySlug,
} from "@/lib/sg-handicap";

type Point = { date: string; handicap: number; score?: number };

const INDEX_WINDOW = 20;
const BEST_COUNT = 8;
const MAX_IMPROVEMENT_PER_TEST = 1.5;
const MAX_WORSENING_PER_TEST = 0.8;
const LAG_WINDOW = 5;

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function byDate<T extends { date: string }>(items: T[]) {
  return [...items].sort((a, b) => a.date.localeCompare(b.date));
}

function upTo<T extends { date: string }>(items: T[], asOf?: Date) {
  if (!asOf) return byDate(items);
  const cutoff = asOf.toISOString();
  return byDate(items).filter((item) => item.date <= cutoff);
}

/**
 * Gemensam SG4-indexmotor för alla HCP-grundande kategorier.
 *
 * - senaste 20 testresultaten
 * - bästa 8 räknas när tillräckligt med data finns
 * - innan 8 tester fylls underlaget med spelarens riktiga HCP som startankare
 * - högst 1,5 HCP förbättring per nytt test
 * - högst 0,8 HCP försämring per nytt test
 *
 * Testets egna HCP visas fortfarande på testresultatet. Den här motorn styr
 * kategori-HCP i profil, spindel, hem och utveckling.
 */
export function buildCategoryIndexSeries(raw: number[], baseline?: number): number[] {
  if (!raw.length) return [];
  const result: number[] = [];
  let previous = baseline;

  for (let i = 0; i < raw.length; i += 1) {
    const recent = raw.slice(Math.max(0, i + 1 - INDEX_WINDOW), i + 1);
    const sample = [...recent];

    // Under uppbyggnadsfasen fungerar verkligt HCP som "virtuella rundor" så
    // ett enda extremt test inte kan flytta profilen flera HCP direkt.
    if (baseline !== undefined && sample.length < BEST_COUNT) {
      while (sample.length < BEST_COUNT) sample.push(baseline);
    }

    const take = Math.min(BEST_COUNT, sample.length);
    const best = [...sample].sort((a, b) => a - b).slice(0, take);
    const target = best.reduce((sum, value) => sum + value, 0) / best.length;

    if (previous === undefined) {
      previous = round1(target);
    } else {
      const lowerBound = previous - MAX_IMPROVEMENT_PER_TEST;
      const upperBound = previous + MAX_WORSENING_PER_TEST;
      previous = round1(Math.max(lowerBound, Math.min(upperBound, target)));
    }
    result.push(previous);
  }

  return result;
}

function trendOf(values: number[], n = 5): number | undefined {
  if (values.length < 2) return undefined;
  const window = values.slice(-n);
  return round1(window[window.length - 1] - window[0]);
}

function combinedPuttingSeries(asOf?: Date): Point[] {
  const shortEvents = upTo(loadShortPuttSessions(), asOf).map((s) => ({
    date: s.date,
    kind: "short" as const,
    handicap: s.handicap,
    score: s.score,
  }));
  const lagEvents = upTo(loadLagPuttSessions(), asOf).map((s) => ({
    date: s.date,
    kind: "lag" as const,
    handicap: s.handicap,
    score: Math.round(s.pct),
  }));
  const events = byDate([...shortEvents, ...lagEvents]);
  let lastShort: number | undefined;
  const lagWindow: number[] = [];

  return events.map((event) => {
    if (event.kind === "short") lastShort = event.handicap;
    else {
      lagWindow.push(event.handicap);
      if (lagWindow.length > LAG_WINDOW) lagWindow.shift();
    }
    const lagAvg = lagWindow.length
      ? lagWindow.reduce((sum, value) => sum + value, 0) / lagWindow.length
      : undefined;
    const handicap =
      lastShort !== undefined && lagAvg !== undefined
        ? lastShort * 0.6 + lagAvg * 0.4
        : (lastShort ?? lagAvg ?? event.handicap);
    return { date: event.date, handicap, score: event.score };
  });
}

function combinedAroundGreenSeries(asOf?: Date): Point[] {
  const nearEvents = upTo(loadShortGameSessions(), asOf).map((s) => ({
    date: s.date,
    kind: "near" as const,
    handicap: s.handicap,
    score: s.score,
  }));
  const bunkerEvents = upTo(loadBunkerSessions(), asOf).map((s) => ({
    date: s.date,
    kind: "bunker" as const,
    handicap: s.handicap,
    score: s.score,
  }));
  const events = byDate([...nearEvents, ...bunkerEvents]);
  let lastNear: number | undefined;
  let lastBunker: number | undefined;

  return events.map((event) => {
    if (event.kind === "near") lastNear = event.handicap;
    else lastBunker = event.handicap;
    const handicap =
      lastNear !== undefined && lastBunker !== undefined
        ? lastNear * 0.65 + lastBunker * 0.35
        : (lastNear ?? lastBunker ?? event.handicap);
    return { date: event.date, handicap, score: event.score };
  });
}

function rawSeries(slug: CategorySlug, asOf?: Date): Point[] {
  switch (slug) {
    case "approach":
      return upTo(loadPrecisionSessions(), asOf)
        .filter((s) => typeof s.handicap === "number")
        .map((s) => ({ date: s.date, handicap: s.handicap as number, score: s.score }));
    case "driving":
      return upTo(loadOffTeeSessions(), asOf).map((s) => ({
        date: s.date,
        handicap: s.handicap,
        score: s.score,
      }));
    case "around-the-green":
      return combinedAroundGreenSeries(asOf);
    case "puttning":
      return combinedPuttingSeries(asOf);
    case "speed":
      return upTo(loadSpeedSessions(), asOf).map((s) => ({
        date: s.date,
        handicap: s.handicap,
        score: s.score,
      }));
  }
}

export function computeStableCategoryHandicaps(
  asOf?: Date,
  baselineHandicap?: number,
): CategoryHandicap[] {
  const baseline = baselineHandicap ?? loadRealHandicap() ?? undefined;
  const order: CategorySlug[] = ["driving", "approach", "around-the-green", "puttning", "speed"];

  return order.map((slug) => {
    const points = rawSeries(slug, asOf);
    if (!points.length) {
      return {
        slug,
        title: CATEGORY_LABELS[slug],
        count: 0,
        ...(baseline !== undefined ? { handicap: baseline, isBaseline: true } : {}),
      };
    }

    const raw = points.map((point) => point.handicap);
    const index = buildCategoryIndexSeries(raw, baseline);
    const latestRaw = raw[raw.length - 1];
    const latestIndex = index[index.length - 1];
    return {
      slug,
      title: CATEGORY_LABELS[slug],
      count: points.length,
      handicap: latestIndex,
      trend: trendOf(index),
      latestScore: points.at(-1)?.score,
      capped: Math.abs(latestIndex - latestRaw) > 0.05,
    };
  });
}

export type StableHcpTimelinePoint = {
  date: string;
  rolling?: number;
  raw?: number;
};

export function computeStableCategoryHcpTimeline(
  slug: CategorySlug,
  periodDays: number | null,
  baselineHandicap?: number,
): StableHcpTimelinePoint[] {
  const baseline = baselineHandicap ?? loadRealHandicap() ?? undefined;
  const points = rawSeries(slug);
  if (!points.length) return [];
  const index = buildCategoryIndexSeries(points.map((p) => p.handicap), baseline);
  let result = points.map((point, i) => ({
    date: point.date.slice(0, 10),
    raw: round1(point.handicap),
    rolling: index[i],
  }));
  if (periodDays) {
    const cutoff = Date.now() - periodDays * 24 * 60 * 60 * 1000;
    result = result.filter((point) => new Date(point.date).getTime() >= cutoff);
  }
  return result;
}
