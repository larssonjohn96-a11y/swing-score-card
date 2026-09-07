import { CLOCK_PUTTS, loadClockPuttingSessions } from "@/lib/clock-putting";
import { loadFiftyPuttSessions } from "@/lib/fifty-putts";
import { loadLag18Sessions, LAG18_DISTANCES } from "@/lib/lagputt18";
import { loadLagPuttLadderSessions } from "@/lib/lagputt-ladder";
import { PUTTING_STREAK_DISTANCES, loadPuttingStreakSessions } from "@/lib/putting-streak";
import { loadShortPuttSessions } from "@/lib/shortputt";
import { loadSessions } from "@/lib/training/core";

const PGA_PUTT_DISTANCES = [1.5, 12, 0.6, 4, 1.2, 16, 8, 3, 6, 9, 0.9, 7, 2.1, 3.5, 10, 1.8, 5, 2.4] as const;

export const RECENT_PUTT_SAMPLE = 100;

export type PuttStart = {
  source: string;
  date: string;
  distance: number;
  firstPuttHoled: boolean;
  strokesToHole?: number;
};

export type DistanceMakeStat = {
  distance: number;
  made: number;
  attempts: number;
  pct: number;
  sources: number;
};

function byDate<T extends { date: string }>(a: T, b: T) {
  return Date.parse(a.date) - Date.parse(b.date);
}

export function latestRows<T extends { date: string }>(rows: T[], limit = RECENT_PUTT_SAMPLE): T[] {
  return [...rows].sort(byDate).slice(-limit);
}

export function collectPuttStarts(): PuttStart[] {
  const rows: PuttStart[] = [];

  for (const session of loadClockPuttingSessions()) {
    CLOCK_PUTTS.forEach((putt, index) => {
      if (index >= session.shots.length) return;
      rows.push({ source: "Klockan", date: session.date, distance: putt.distance, firstPuttHoled: (session.shots[index] ?? 0) > 0 });
    });
  }

  for (const session of loadShortPuttSessions()) {
    session.putts.forEach((putt) => rows.push({ source: "Putting HCP", date: session.date, distance: putt.distance, firstPuttHoled: putt.holed }));
  }

  for (const session of loadFiftyPuttSessions()) {
    session.entries.forEach((entry) => rows.push({
      source: "25-bollar",
      date: session.createdAt,
      distance: entry.distance,
      firstPuttHoled: entry.strokes === 1,
      strokesToHole: entry.strokes,
    }));
  }

  for (const session of loadSessions("pga-tour-18-puttar")) {
    session.shots.forEach((strokes, index) => {
      const distance = PGA_PUTT_DISTANCES[index];
      if (distance === undefined) return;
      rows.push({ source: "PGA Tour 18", date: session.date, distance, firstPuttHoled: strokes === 1, strokesToHole: strokes });
    });
  }

  for (const session of loadPuttingStreakSessions()) {
    PUTTING_STREAK_DISTANCES.slice(0, session.cleared).forEach((distance) =>
      rows.push({ source: "Putting Streak", date: session.date, distance, firstPuttHoled: true, strokesToHole: 1 }),
    );
    if (session.cleared < PUTTING_STREAK_DISTANCES.length) {
      rows.push({ source: "Putting Streak", date: session.date, distance: session.failedDistance, firstPuttHoled: false });
    }
  }

  return rows.sort(byDate);
}

export function puttingMakeStats(rows = collectPuttStarts()): DistanceMakeStat[] {
  const map = new Map<number, { made: number; attempts: number; sources: Set<string> }>();
  rows.forEach((row) => {
    const stat = map.get(row.distance) ?? { made: 0, attempts: 0, sources: new Set<string>() };
    stat.attempts += 1;
    if (row.firstPuttHoled) stat.made += 1;
    stat.sources.add(row.source);
    map.set(row.distance, stat);
  });
  return [...map.entries()]
    .map(([distance, stat]) => ({ distance, made: stat.made, attempts: stat.attempts, pct: stat.attempts ? (stat.made / stat.attempts) * 100 : 0, sources: stat.sources.size }))
    .sort((a, b) => a.distance - b.distance);
}

export type LagHoleOutStart = { date: string; distance: number; strokes: number };
export type LagHoleOutStat = { distance: number; attempts: number; avgPutts: number; onePuttPct: number; threePuttPct: number };
export type LagRangeStat = LagHoleOutStat & { label: string; min: number; max: number };

export function collectLagHoleOutStarts(): LagHoleOutStart[] {
  const rows: LagHoleOutStart[] = [];
  loadLagPuttLadderSessions().forEach((session) => session.attempts.forEach((attempt) => rows.push({ date: session.date, distance: attempt.distance, strokes: attempt.putts })));
  loadSessions("pga-tour-18-puttar").forEach((session) => session.shots.forEach((strokes, index) => {
    const distance = PGA_PUTT_DISTANCES[index];
    if (distance !== undefined && distance >= 7) rows.push({ date: session.date, distance, strokes });
  }));
  return rows.sort(byDate);
}

export function lagHoleOutStats(rows = collectLagHoleOutStarts()): LagHoleOutStat[] {
  const map = new Map<number, number[]>();
  rows.forEach(({ distance, strokes }) => {
    const values = map.get(distance) ?? [];
    values.push(strokes);
    map.set(distance, values);
  });
  return [...map.entries()].map(([distance, values]) => ({
    distance,
    attempts: values.length,
    avgPutts: values.reduce((a, b) => a + b, 0) / values.length,
    onePuttPct: (values.filter((v) => v === 1).length / values.length) * 100,
    threePuttPct: (values.filter((v) => v >= 3).length / values.length) * 100,
  })).sort((a, b) => a.distance - b.distance);
}

const LAG_RANGES = [
  { min: 7, max: 10, label: "7–10 m" },
  { min: 10, max: 14, label: "10–14 m" },
  { min: 14, max: 18, label: "14–18 m" },
  { min: 18, max: 22, label: "18–22 m" },
  { min: 22, max: 30, label: "22–30 m" },
] as const;

export function groupedLagHoleOutStats(rows = collectLagHoleOutStarts()): LagRangeStat[] {
  return LAG_RANGES.map((range, index) => {
    const selected = rows.filter((row) => index === 0 ? row.distance >= range.min && row.distance <= range.max : row.distance > range.min && row.distance <= range.max);
    const values = selected.map((row) => row.strokes);
    return {
      ...range,
      distance: (range.min + range.max) / 2,
      attempts: values.length,
      avgPutts: values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      onePuttPct: values.length ? (values.filter((v) => v === 1).length / values.length) * 100 : 0,
      threePuttPct: values.length ? (values.filter((v) => v >= 3).length / values.length) * 100 : 0,
    };
  });
}

export type LagProximityStart = { date: string; distance: number; score: number };
export type LagProximityStat = { distance: number; attempts: number; holedPct: number; within1mPct: number; avgScore: number };
export type LagProximityRangeStat = LagProximityStat & { label: string; min: number; max: number };

export function collectLagProximityStarts(): LagProximityStart[] {
  const rows: LagProximityStart[] = [];
  loadLag18Sessions().forEach((session) => session.scores.forEach((score, index) => {
    const distance = LAG18_DISTANCES[index];
    if (distance !== undefined) rows.push({ date: session.date, distance, score });
  }));
  return rows.sort(byDate);
}

export function lagProximityStats(rows = collectLagProximityStarts()): LagProximityStat[] {
  const map = new Map<number, number[]>();
  rows.forEach(({ distance, score }) => {
    const values = map.get(distance) ?? [];
    values.push(score);
    map.set(distance, values);
  });
  return [...map.entries()].map(([distance, values]) => ({
    distance,
    attempts: values.length,
    holedPct: (values.filter((v) => v === -2).length / values.length) * 100,
    within1mPct: (values.filter((v) => v <= 0).length / values.length) * 100,
    avgScore: values.reduce((a, b) => a + b, 0) / values.length,
  })).sort((a, b) => a.distance - b.distance);
}

export function groupedLagProximityStats(rows = collectLagProximityStarts()): LagProximityRangeStat[] {
  return LAG_RANGES.map((range, index) => {
    const selected = rows.filter((row) => index === 0 ? row.distance >= range.min && row.distance <= range.max : row.distance > range.min && row.distance <= range.max);
    const values = selected.map((row) => row.score);
    return {
      ...range,
      distance: (range.min + range.max) / 2,
      attempts: values.length,
      holedPct: values.length ? (values.filter((v) => v === -2).length / values.length) * 100 : 0,
      within1mPct: values.length ? (values.filter((v) => v <= 0).length / values.length) * 100 : 0,
      avgScore: values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0,
    };
  });
}
