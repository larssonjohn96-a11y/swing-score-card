import { CATEGORIES, type CategoryTest } from "@/lib/categories";
import { loadSessions } from "@/lib/drill";
import { loadBunkerSessions } from "@/lib/bunker";
import { loadSpeedEntries } from "@/lib/speed";
import { loadLongDriveSessions, sessionBest } from "@/lib/longdrive";
import { loadFairwaySessions } from "@/lib/fairway";
import { loadTeeSessions } from "@/lib/teeshot";
import { loadPrecisionSessions } from "@/lib/precision-store";

import { loadPitchSessions } from "@/lib/pitch";
import { loadChipSessions } from "@/lib/chip";
import { loadShortPuttSessions } from "@/lib/shortputt";
import { loadLagPuttSessions } from "@/lib/lagputt";
import { loadTornadoSessions } from "@/lib/tornado";

export type ProgressPoint = {
  date: string;
  value: number;
};

export type ProgressTest = {
  /** url-vänligt id, används i /framsteg/$slug/$test */
  id: string;
  title: string;
  categorySlug: string;
  /** route till själva testet */
  to: CategoryTest["to"];
  /** vad värdet betyder */
  metric: string;
  unit: string;
  higherIsBetter: boolean;
  decimals: number;
  load: () => ProgressPoint[];
};

const day = (iso: string) => (iso.length > 10 ? iso.slice(0, 10) : iso);
const byDate = (a: ProgressPoint, b: ProgressPoint) => a.date.localeCompare(b.date);

export const PROGRESS_TESTS: ProgressTest[] = [
  {
    id: "speed",
    title: "Speed test",
    categorySlug: "driving",
    to: "/speed",
    metric: "Ball speed",
    unit: "mph",
    higherIsBetter: true,
    decimals: 1,
    load: () =>
      loadSpeedEntries()
        .map((e) => ({ date: day(e.date), value: e.ballSpeed }))
        .sort(byDate),
  },
  {
    id: "longdrive",
    title: "Long drive",
    categorySlug: "driving",
    to: "/longdrive",
    metric: "Längsta carry",
    unit: "",
    higherIsBetter: true,
    decimals: 0,
    load: () =>
      loadLongDriveSessions()
        .map((s) => ({ date: day(s.date), value: sessionBest(s) }))
        .sort(byDate),
  },
  {
    id: "fairway",
    title: "Fairway challenge",
    categorySlug: "driving",
    to: "/fairway",
    metric: "Totalpoäng",
    unit: "p",
    higherIsBetter: true,
    decimals: 0,
    load: () =>
      loadFairwaySessions()
        .map((s) => ({ date: day(s.date), value: s.points }))
        .sort(byDate),
  },
  {
    id: "teeshot",
    title: "Landningsytor från tee",
    categorySlug: "driving",
    to: "/teeshot",
    metric: "Godkända slag",
    unit: "/ 9",
    higherIsBetter: true,
    decimals: 0,
    load: () =>
      loadTeeSessions()
        .map((s) => ({ date: day(s.date), value: s.points }))
        .sort(byDate),
  },
  {
    id: "drill",
    title: "18 bollar",
    categorySlug: "approach",
    to: "/drill",
    metric: "Score",
    unit: "/ 3.0",
    higherIsBetter: true,
    decimals: 1,
    load: () =>
      loadSessions()
        .map((s) => ({ date: day(s.date), value: s.score }))
        .sort(byDate),
  },
  {
    id: "precision",
    title: "Approach Precision Test",
    categorySlug: "approach",
    to: "/precision",
    metric: "Snitt till flaggan",
    unit: "m",
    higherIsBetter: false,
    decimals: 2,
    load: () =>
      loadPrecisionSessions()
        .map((s) => ({ date: day(s.date), value: s.avgProximity }))
        .sort(byDate),
  },
  {
    id: "bunker",
    title: "Bunkerslag",
    categorySlug: "around-the-green",
    to: "/bunker",
    metric: "Snitt till hål",
    unit: "fot",
    higherIsBetter: false,
    decimals: 1,
    load: () =>
      loadBunkerSessions()
        .map((s) => ({ date: day(s.date), value: s.avgFeet }))
        .sort(byDate),
  },
  {
    id: "pitch",
    title: "Pitch",
    categorySlug: "around-the-green",
    to: "/pitch",
    metric: "Snitt till hål",
    unit: "m",
    higherIsBetter: false,
    decimals: 1,
    load: () =>
      loadPitchSessions()
        .map((s) => ({ date: day(s.date), value: s.avgProximity }))
        .sort(byDate),
  },
  {
    id: "chip",
    title: "Chippar",
    categorySlug: "around-the-green",
    to: "/chip",
    metric: "Snitt till hål",
    unit: "fot",
    higherIsBetter: false,
    decimals: 1,
    load: () =>
      loadChipSessions()
        .map((s) => ({ date: day(s.date), value: s.avgFeet }))
        .sort(byDate),
  },
  {
    id: "kortputt",
    title: "Kortputt",
    categorySlug: "puttning",
    to: "/kortputt",
    metric: "Isatta puttar",
    unit: "%",
    higherIsBetter: true,
    decimals: 0,
    load: () =>
      loadShortPuttSessions()
        .map((s) => ({ date: day(s.date), value: s.pct }))
        .sort(byDate),
  },
  {
    id: "tornado",
    title: "Tornado drill",
    categorySlug: "puttning",
    to: "/tornado",
    metric: "Poäng",
    unit: "p",
    higherIsBetter: true,
    decimals: 0,
    load: () =>
      loadTornadoSessions()
        .map((s) => ({ date: day(s.date), value: s.points }))
        .sort(byDate),
  },
  {
    id: "lagputt",
    title: "Lagputt",
    categorySlug: "puttning",
    to: "/lagputt",
    metric: "Godkända puttar",
    unit: "%",
    higherIsBetter: true,
    decimals: 0,
    load: () =>
      loadLagPuttSessions()
        .map((s) => ({ date: day(s.date), value: s.pct }))
        .sort(byDate),
  },
];

export function testsForCategory(slug: string) {
  return PROGRESS_TESTS.filter((t) => t.categorySlug === slug);
}

export function findProgressTest(categorySlug: string, id: string) {
  return PROGRESS_TESTS.find((t) => t.categorySlug === categorySlug && t.id === id);
}

export type ProgressSummary = {
  test: ProgressTest;
  points: ProgressPoint[];
  latest?: number;
  best?: number;
  first?: number;
  /** förändring senaste vs första, positiv = bättre */
  delta?: number;
};

export function summarize(test: ProgressTest): ProgressSummary {
  const points = test.load();
  if (!points.length) return { test, points };
  const values = points.map((p) => p.value);
  const latest = values[values.length - 1];
  const first = values[0];
  const best = test.higherIsBetter ? Math.max(...values) : Math.min(...values);
  const raw = latest - first;
  return { test, points, latest, first, best, delta: test.higherIsBetter ? raw : -raw };
}

export type CategoryProgress = {
  slug: string;
  title: string;
  subtitle: string;
  summaries: ProgressSummary[];
  sessions: number;
};

export function categoryProgress(): CategoryProgress[] {
  return CATEGORIES.map((c) => {
    const summaries = testsForCategory(c.slug).map(summarize);
    return {
      slug: c.slug,
      title: c.title,
      subtitle: c.subtitle,
      summaries,
      sessions: summaries.reduce((sum, s) => sum + s.points.length, 0),
    };
  });
}
