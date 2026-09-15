import { loadSessions, saveSession, type TrainingSession } from "@/lib/training/core";
import { recordPuttingSession } from "@/lib/shot-bank";

export const CLOCK_PUTTING_TEST_ID = "clock-putting";
export const CLOCK_PUTTING_ROLLING_WINDOW = 20;
export const CLOCK_DIRECTIONS = ["12", "3", "6", "9"] as const;
export const CLOCK_DISTANCES = [1, 2, 3] as const;

export type ClockDirection = (typeof CLOCK_DIRECTIONS)[number];
export type ClockDistance = (typeof CLOCK_DISTANCES)[number];

export type ClockPutt = {
  direction: ClockDirection;
  distance: ClockDistance;
  points: 1 | 2;
};

export const CLOCK_PUTTS: ClockPutt[] = CLOCK_DIRECTIONS.flatMap((direction) =>
  CLOCK_DISTANCES.map((distance) => ({
    direction,
    distance,
    points: distance === 3 ? 2 : 1,
  })),
);

export const CLOCK_MAX_SCORE = CLOCK_PUTTS.reduce((sum, putt) => sum + putt.points, 0); // 16

export type ClockDistanceStat = {
  distance: ClockDistance;
  made: number;
  attempts: number;
  pct: number;
};

export function loadClockPuttingSessions(): TrainingSession[] {
  return loadSessions(CLOCK_PUTTING_TEST_ID);
}

/**
 * Varje lagrat shot-värde är poängen för en satt putt (1 eller 2), annars 0.
 * Därmed blir TrainingSession.total exakt testets viktade totalpoäng.
 */
export function saveClockPuttingSession(made: boolean[]): TrainingSession {
  const shots = CLOCK_PUTTS.map((putt, index) => (made[index] ? putt.points : 0));
  const record = saveSession(CLOCK_PUTTING_TEST_ID, shots);
  recordPuttingSession({
    session_id: record.id,
    source: "clock_putting",
    activity_type: "test",
    played_at: record.date,
    default_context: { independent_attempt: true, progression_format: false, format_id: "clock_putting" },
    attempts: CLOCK_PUTTS.map((putt, index) => ({
      distance_m: putt.distance,
      first_putt_holed: (record.shots[index] ?? 0) > 0,
      context: { direction: putt.direction },
    })),
  });
  return record;
}

export function clockDistanceStats(sessions: TrainingSession[]): ClockDistanceStat[] {
  return CLOCK_DISTANCES.map((distance) => {
    let attempts = 0;
    let made = 0;
    sessions.forEach((session) => {
      CLOCK_PUTTS.forEach((putt, index) => {
        if (putt.distance !== distance || index >= session.shots.length) return;
        attempts += 1;
        if ((session.shots[index] ?? 0) > 0) made += 1;
      });
    });
    return {
      distance,
      made,
      attempts,
      pct: attempts ? (made / attempts) * 100 : 0,
    };
  });
}

export function recentClockAverage(
  sessions: TrainingSession[],
  window = CLOCK_PUTTING_ROLLING_WINDOW,
): number {
  const sample = sessions.slice(-window);
  if (!sample.length) return 0;
  return sample.reduce((sum, session) => sum + session.total, 0) / sample.length;
}

export function bestClockScore(sessions: TrainingSession[]): number | null {
  return sessions.length ? Math.max(...sessions.map((session) => session.total)) : null;
}

export function formatClockAverage(value: number): string {
  return value.toFixed(2).replace(".", ",");
}
