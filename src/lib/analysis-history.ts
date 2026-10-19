import { loadPeiSessions } from "./pei-ranking";
import { handicapFromPct } from "./precision";
import { FAIRWAY, offTeeResult } from "./offtee";
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

export type MetricId =
  | "hcp"
  | "avgDrive"
  | "fairwayPct"
  | "obPct"
  | "ballSpeed"
  | "pei"
  | "proximity"
  | "chipPoints"
  | "avgPutts";
export type MetricDef = {
  id: MetricId;
  label: string;
  unit: string;
  decimals: number;
  higherIsBetter: boolean;
};
const HCP_METRIC: MetricDef = { id: "hcp", label: "HCP", unit: "", decimals: 1, higherIsBetter: false };
/** Verkliga, uppmätta mätvärden per test. Endast mått som källdata faktiskt innehåller. */
export const HISTORY_METRICS: Record<HistoryKind, MetricDef[]> = {
  driving: [
    HCP_METRIC,
    { id: "avgDrive", label: "Snittlängd drive", unit: "m", decimals: 0, higherIsBetter: true },
    { id: "fairwayPct", label: "Fairwayträffar", unit: "%", decimals: 0, higherIsBetter: true },
    { id: "obPct", label: "OB", unit: "%", decimals: 0, higherIsBetter: false },
  ],
  wedge: [
    HCP_METRIC,
    { id: "proximity", label: "Snitt från flaggan", unit: "m", decimals: 1, higherIsBetter: false },
    { id: "pei", label: "PEI", unit: "%", decimals: 1, higherIsBetter: false },
  ],
  iron: [
    HCP_METRIC,
    { id: "proximity", label: "Snitt från flaggan", unit: "m", decimals: 1, higherIsBetter: false },
    { id: "pei", label: "PEI", unit: "%", decimals: 1, higherIsBetter: false },
  ],
  chipping: [
    HCP_METRIC,
    { id: "chipPoints", label: "Snittpoäng per boll", unit: "p", decimals: 1, higherIsBetter: true },
  ],
  bunker: [
    HCP_METRIC,
    { id: "proximity", label: "Snitt från hålet", unit: "m", decimals: 1, higherIsBetter: false },
  ],
  short: [
    HCP_METRIC,
    { id: "avgPutts", label: "Snittputtar per hål", unit: "puttar", decimals: 2, higherIsBetter: false },
  ],
  long: [
    HCP_METRIC,
    { id: "avgPutts", label: "Snittputtar per hål", unit: "puttar", decimals: 2, higherIsBetter: false },
  ],
  speed: [
    HCP_METRIC,
    { id: "ballSpeed", label: "Ball speed (snitt)", unit: "mph", decimals: 1, higherIsBetter: true },
  ],
};

export type AnalysisHistoryPoint = {
  time: number;
  hcp: number;
  metrics?: Partial<Record<MetricId, number>>;
};
function read(key: string): any[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
const mean = (v: number[]) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : undefined);
const fin = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
function cleanMetrics(m: Partial<Record<MetricId, number | undefined>>) {
  const out: Partial<Record<MetricId, number>> = {};
  for (const [k, v] of Object.entries(m)) if (fin(v)) out[k as MetricId] = v;
  return Object.keys(out).length ? out : undefined;
}
/** Off-tee-nyckeltal från ett testpass: längd (m), fairway = |sidled| ≤ fairwaybredd/2, OB = |sidled| > fairway + ruff. */
export function driveMetrics(shots: { distance: number; lateral: number }[]) {
  const valid = shots.filter((s) => fin(s.distance) && fin(s.lateral));
  if (!valid.length) return undefined;
  const abs = valid.map((s) => Math.abs(s.lateral));
  return cleanMetrics({
    avgDrive: mean(valid.map((s) => s.distance)),
    fairwayPct: (abs.filter((a) => a <= FAIRWAY.halfWidth).length / valid.length) * 100,
    obPct: (abs.filter((a) => a > FAIRWAY.halfWidth + FAIRWAY.roughDepth).length / valid.length) * 100,
  });
}
export function cleanHistory(rows: AnalysisHistoryPoint[]): AnalysisHistoryPoint[] {
  return rows
    .filter((r) => Number.isFinite(r.time) && r.time > 0 && Number.isFinite(r.hcp))
    .sort((a, b) => a.time - b.time);
}
export function metricValue(row: AnalysisHistoryPoint, metric: MetricId): number | undefined {
  const v = metric === "hcp" ? row.hcp : row.metrics?.[metric];
  return fin(v) ? v : undefined;
}
/** Tidsserie för valt mätvärde; pass utan värdet hoppas över (aldrig 0/NaN). */
export function metricSeries(rows: AnalysisHistoryPoint[], metric: MetricId) {
  return rows.flatMap((r) => {
    const value = metricValue(r, metric);
    return value === undefined ? [] : [{ time: r.time, value }];
  });
}
/** Snitt av de senaste `n` giltiga testpassen (per pass, inte per slag). */
export function latestAverage(rows: AnalysisHistoryPoint[], metric: MetricId, n = 5) {
  const series = metricSeries(cleanHistory(rows), metric).slice(-n);
  return { value: mean(series.map((s) => s.value)), count: series.length };
}
export function loadAnalysisHistory(
  kind: HistoryKind,
  userId: string | null,
): AnalysisHistoryPoint[] {
  if (typeof window === "undefined") return [];
  let rows: AnalysisHistoryPoint[] = [];
  if (kind === "wedge" || kind === "iron")
    rows = loadPeiSessions(kind).map((s) => {
      const shots = (s.shots ?? []).filter((x) => fin(x.actual) && fin(x.target) && fin(x.lateral));
      return {
        time: Date.parse(s.date),
        hcp: handicapFromPct(s.pei),
        metrics: cleanMetrics({
          pei: s.pei,
          proximity: mean(shots.map((x) => Math.hypot(x.actual - x.target, x.lateral))),
        }),
      };
    });
  if (kind === "bunker")
    rows = loadBunkerSessions().map((s) => ({
      time: Date.parse(s.date),
      hcp: s.handicap,
      metrics: cleanMetrics({ proximity: s.avgProximity }),
    }));
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
        metrics: driveMetrics(s.shots),
      }));
    // Legacy-data används bara när det nya 3-slagstestet saknas helt (ingen dubbelräkning).
    if (!rows.length)
      rows = loadOffTeeSessions().map((s) => ({
        time: Date.parse(s.date),
        hcp: s.handicap,
        metrics: driveMetrics(
          (s.shots ?? [])
            .filter((x) => x.filled)
            .map((x) => ({ distance: x.total, lateral: x.sidled })),
        ),
      }));
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
        return hcp === null
          ? []
          : [{ time: s.at, hcp, metrics: cleanMetrics({ avgPutts: mean(s.putts) }) }];
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
        return hcp === null
          ? []
          : [{ time: s.at, hcp, metrics: cleanMetrics({ chipPoints: mean(s.balls.flat()) }) }];
      });
  if (kind === "speed") {
    try {
      rows = parseCourse(localStorage.getItem(courseStorageKey(userId)))
        .history.filter((s) => s.holes.flat().length === 3)
        .map((s) => ({
          time: s.finishedAt,
          hcp: objectiveResult(s).handicap,
          metrics: cleanMetrics({
            ballSpeed: mean(s.holes.flat().map((x) => x.ballSpeed).filter((v) => fin(v) && v > 0)),
          }),
        }));
    } catch {}
    if (!rows.length)
      rows = loadSpeedSessions().map((s) => ({
        time: Date.parse(s.date),
        hcp: s.handicap,
        metrics: cleanMetrics({ ballSpeed: s.avgBallSpeed > 0 ? s.avgBallSpeed : undefined }),
      }));
  }
  return cleanHistory(rows);
}
