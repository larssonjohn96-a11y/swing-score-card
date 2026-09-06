import { CLOCK_PUTTS, loadClockPuttingSessions } from "@/lib/clock-putting";
import { loadFiftyPuttSessions } from "@/lib/fifty-putts";
import { loadLag18Sessions, LAG18_DISTANCES } from "@/lib/lagputt18";
import { loadLagPuttLadderSessions } from "@/lib/lagputt-ladder";
import { PUTTING_STREAK_DISTANCES, loadPuttingStreakSessions } from "@/lib/putting-streak";
import { loadShortPuttSessions } from "@/lib/shortputt";
import { loadSessions } from "@/lib/training/core";

const PGA_PUTT_DISTANCES = [1.5, 12, 0.6, 4, 1.2, 16, 8, 3, 6, 9, 0.9, 7, 2.1, 3.5, 10, 1.8, 5, 2.4] as const;

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

export function collectPuttStarts(): PuttStart[] {
  const rows: PuttStart[] = [];

  for (const session of loadClockPuttingSessions()) {
    CLOCK_PUTTS.forEach((putt, index) => {
      if (index >= session.shots.length) return;
      rows.push({
        source: "Klockan",
        date: session.date,
        distance: putt.distance,
        firstPuttHoled: (session.shots[index] ?? 0) > 0,
      });
    });
  }

  for (const session of loadShortPuttSessions()) {
    session.putts.forEach((putt) =>
      rows.push({
        source: "Putting HCP",
        date: session.date,
        distance: putt.distance,
        firstPuttHoled: putt.holed,
      }),
    );
  }

  for (const session of loadFiftyPuttSessions()) {
    session.entries.forEach((entry) =>
      rows.push({
        source: "25-bollar",
        date: session.createdAt,
        distance: entry.distance,
        firstPuttHoled: entry.strokes === 1,
        strokesToHole: entry.strokes,
      }),
    );
  }

  for (const session of loadSessions("pga-tour-18-puttar")) {
    session.shots.forEach((strokes, index) => {
      const distance = PGA_PUTT_DISTANCES[index];
      if (distance === undefined) return;
      rows.push({
        source: "PGA Tour 18",
        date: session.date,
        distance,
        firstPuttHoled: strokes === 1,
        strokesToHole: strokes,
      });
    });
  }

  for (const session of loadPuttingStreakSessions()) {
    PUTTING_STREAK_DISTANCES.slice(0, session.cleared).forEach((distance) =>
      rows.push({ source: "Putting Streak", date: session.date, distance, firstPuttHoled: true, strokesToHole: 1 }),
    );
    if (session.cleared < PUTTING_STREAK_DISTANCES.length) {
      rows.push({
        source: "Putting Streak",
        date: session.date,
        distance: session.failedDistance,
        firstPuttHoled: false,
      });
    }
  }

  return rows;
}

export function puttingMakeStats(): DistanceMakeStat[] {
  const rows = collectPuttStarts();
  const map = new Map<number, { made: number; attempts: number; sources: Set<string> }>();
  rows.forEach((row) => {
    const stat = map.get(row.distance) ?? { made: 0, attempts: 0, sources: new Set<string>() };
    stat.attempts += 1;
    if (row.firstPuttHoled) stat.made += 1;
    stat.sources.add(row.source);
    map.set(row.distance, stat);
  });
  return [...map.entries()]
    .map(([distance, stat]) => ({
      distance,
      made: stat.made,
      attempts: stat.attempts,
      pct: stat.attempts ? (stat.made / stat.attempts) * 100 : 0,
      sources: stat.sources.size,
    }))
    .sort((a, b) => a.distance - b.distance);
}

export type LagHoleOutStat = {
  distance: number;
  attempts: number;
  avgPutts: number;
  onePuttPct: number;
  threePuttPct: number;
};

export function lagHoleOutStats(): LagHoleOutStat[] {
  const map = new Map<number, number[]>();
  const add = (distance: number, strokes: number) => {
    const values = map.get(distance) ?? [];
    values.push(strokes);
    map.set(distance, values);
  };

  loadLagPuttLadderSessions().forEach((session) =>
    session.attempts.forEach((attempt) => add(attempt.distance, attempt.putts)),
  );
  loadSessions("pga-tour-18-puttar").forEach((session) =>
    session.shots.forEach((strokes, index) => {
      const distance = PGA_PUTT_DISTANCES[index];
      if (distance !== undefined && distance >= 7) add(distance, strokes);
    }),
  );

  return [...map.entries()]
    .map(([distance, values]) => ({
      distance,
      attempts: values.length,
      avgPutts: values.reduce((a, b) => a + b, 0) / values.length,
      onePuttPct: (values.filter((v) => v === 1).length / values.length) * 100,
      threePuttPct: (values.filter((v) => v >= 3).length / values.length) * 100,
    }))
    .sort((a, b) => a.distance - b.distance);
}

export type LagProximityStat = {
  distance: number;
  attempts: number;
  holedPct: number;
  within1mPct: number;
  avgScore: number;
};

export function lagProximityStats(): LagProximityStat[] {
  const map = new Map<number, number[]>();
  loadLag18Sessions().forEach((session) =>
    session.scores.forEach((score, index) => {
      const distance = LAG18_DISTANCES[index];
      if (distance === undefined) return;
      const values = map.get(distance) ?? [];
      values.push(score);
      map.set(distance, values);
    }),
  );

  return [...map.entries()]
    .map(([distance, values]) => ({
      distance,
      attempts: values.length,
      holedPct: (values.filter((v) => v === -2).length / values.length) * 100,
      within1mPct: (values.filter((v) => v <= 0).length / values.length) * 100,
      avgScore: values.reduce((a, b) => a + b, 0) / values.length,
    }))
    .sort((a, b) => a.distance - b.distance);
}
