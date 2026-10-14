import type { PeiSession } from "./pei-ranking";
import type { PrecisionSession } from "./precision-store";

export type ApproachHistoryRow = {
  id: string;
  date: string;
  meters: number | null;
  pei: number | null;
};
export const mean = (values: number[]) =>
  values.length ? values.reduce((sum, n) => sum + n, 0) / values.length : null;

export function peiHistoryRows(sessions: PeiSession[]): ApproachHistoryRow[] {
  return sessions.map((s) => {
    const shots = s.shots;
    const valid =
      shots?.length &&
      shots.every(
        (shot) =>
          Number.isFinite(shot.actual) &&
          Number.isFinite(shot.target) &&
          shot.target > 0 &&
          Number.isFinite(shot.lateral),
      );
    return {
      id: s.id,
      date: s.date,
      pei: s.pei,
      meters: valid
        ? mean(shots.map((shot) => Math.hypot(shot.actual - shot.target, shot.lateral)))
        : null,
    };
  });
}

export function precisionHistoryRows(sessions: PrecisionSession[]): ApproachHistoryRow[] {
  return sessions.map((s) => {
    const shots = s.shots.filter((shot) => shot.filled && shot.target > 0);
    return {
      id: s.id,
      date: s.date,
      meters: s.avgProximity,
      pei: mean(
        shots.map(
          (shot) => (Math.hypot(shot.carry - shot.target, shot.offline) / shot.target) * 100,
        ),
      ),
    };
  });
}

export function approachHistorySummary(rows: ApproachHistoryRow[]) {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const recent = sorted.slice(-5);
  const metric = (key: "meters" | "pei") =>
    recent.length && recent.every((row) => row[key] !== null && Number.isFinite(row[key]))
      ? mean(recent.map((row) => row[key]!))
      : null;
  return {
    count: sorted.length,
    recentCount: recent.length,
    recent: { meters: metric("meters"), pei: metric("pei") },
    latest: sorted.at(-1) ?? null,
  };
}
