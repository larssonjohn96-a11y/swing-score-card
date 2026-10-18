import { loadPeiSessions } from "./pei-ranking";
import { handicapFromPct } from "./precision";
import { offTeeResult } from "./offtee";
import { loadOffTeeSessions } from "./offtee-store";
import { buildPuttingMatchReview } from "./putting-match-review";
import { loadBunkerSessions } from "./bunker";
import { courseHandicap as chipHandicap } from "./chip-course";
import { courseStorageKey, parseCourse, objectiveResult } from "./speed-course";
import { loadSpeedSessions } from "./speed";
export const HISTORY_OPTIONS = [
  ["driving", "Utslag"],
  ["wedge", "Korta inspel"],
  ["iron", "Inspel järn"],
  ["chipping", "Chippning"],
  ["bunker", "Bunker"],
  ["short", "Kortputt"],
  ["long", "Långputt"],
  ["speed", "Ball Speed"],
] as const;
export type HistoryKind = (typeof HISTORY_OPTIONS)[number][0];
export type AnalysisHistoryPoint = { time: number; hcp: number };
function read(key: string): any[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function cleanHistory(rows: AnalysisHistoryPoint[]): AnalysisHistoryPoint[] {
  return rows
    .filter((r) => Number.isFinite(r.time) && r.time > 0 && Number.isFinite(r.hcp))
    .sort((a, b) => a.time - b.time);
}
export function loadAnalysisHistory(
  kind: HistoryKind,
  userId: string | null,
): AnalysisHistoryPoint[] {
  if (typeof window === "undefined") return [];
  let rows: AnalysisHistoryPoint[] = [];
  if (kind === "wedge" || kind === "iron")
    rows = loadPeiSessions(kind).map((s) => ({
      time: Date.parse(s.date),
      hcp: handicapFromPct(s.pei),
    }));
  if (kind === "bunker")
    rows = loadBunkerSessions().map((s) => ({ time: Date.parse(s.date), hcp: s.handicap }));
  if (kind === "driving") {
    rows = read("sg4-offtee-three-shot-v1")
      .filter(
        (s) =>
          Array.isArray(s.shots) &&
          s.shots.length === 3 &&
          s.shots.every((x: any) => Number.isFinite(x.distance) && Number.isFinite(x.lateral)),
      )
      .map((s) => ({
        time: s.at,
        hcp: offTeeResult(
          s.shots.map((x: any, i: number) => ({
            index: i + 1,
            filled: true,
            total: x.distance,
            sidled: x.lateral,
            direction: x.side === "left" ? "left" : "right",
          })),
        ).handicap,
      }));
    if (!rows.length)
      rows = loadOffTeeSessions().map((s) => ({ time: Date.parse(s.date), hcp: s.handicap }));
  }
  if (kind === "short" || kind === "long")
    rows = read(`sg4-putting-nine-hole-v1-${kind}`)
      .filter(
        (s) =>
          Array.isArray(s.putts) &&
          s.putts.length === 9 &&
          Array.isArray(s.distances) &&
          s.distances.length === 9 &&
          s.putts.every((x: any) => Number.isFinite(x) && x >= 1) &&
          s.distances.every((x: any) => Number.isFinite(x) && x > 0),
      )
      .flatMap((s) => {
        const hcp = buildPuttingMatchReview(
          s.putts.map((p: number, i: number) => ({
            distance: s.distances[i],
            yourValue: p,
            completed: true,
          })),
        ).estimate;
        return hcp === null ? [] : [{ time: s.at, hcp }];
      });
  if (kind === "chipping")
    rows = read("sg4-chip-nine-shot-v1")
      .filter(
        (s) =>
          Array.isArray(s.balls) &&
          s.balls.length === 3 &&
          s.balls.every(
            (b: any) =>
              Array.isArray(b) &&
              b.length === 3 &&
              b.every((p: any) => [0, 1, 2, 3, 4].includes(p)),
          ),
      )
      .flatMap((s) => {
        const hcp = chipHandicap({ holes: s.balls, lie: "Fairway", model: 4 });
        return hcp === null ? [] : [{ time: s.at, hcp }];
      });
  if (kind === "speed") {
    try {
      rows = parseCourse(localStorage.getItem(courseStorageKey(userId)))
        .history.filter((s) => s.holes.flat().length === 3)
        .map((s) => ({ time: s.finishedAt, hcp: objectiveResult(s).handicap }));
    } catch {}
    if (!rows.length)
      rows = loadSpeedSessions().map((s) => ({ time: Date.parse(s.date), hcp: s.handicap }));
  }
  return cleanHistory(rows);
}
