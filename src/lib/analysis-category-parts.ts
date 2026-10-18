import type { CategorySlug } from "./sg-handicap";
import { loadPeiSessions, peiRankingAverage } from "./pei-ranking";
import { handicapFromPct } from "./precision";
import { loadOffTeeSessions } from "./offtee-store";
import { distanceToHandicap, offTeeResult, shotOutcome, type TeeShot } from "./offtee";
import { buildPuttingMatchReview } from "./putting-match-review";
import { loadBunkerSessions } from "./bunker";
import { courseHandicap } from "./chip-course";
import type { ChipPoints } from "./chip-stations";

export type AnalysisPart = {
  label: string;
  hcp?: number;
  value?: string;
  count: number;
  note?: string;
};
export type AnalysisParts = Partial<Record<CategorySlug, AnalysisPart[]>>;
function stored(key: string): any[] {
  if (typeof window === "undefined") return [];
  try {
    const data = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
const average = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined;
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
export function loadAnalysisParts(): AnalysisParts {
  const approach = (["wedge", "iron"] as const).map((kind) => {
    const ranking = peiRankingAverage(loadPeiSessions(kind), kind);
    return {
      label: kind === "wedge" ? "Korta inspel · 30–110 m" : "Inspel järn · 120–175 m",
      hcp: ranking.average === null ? undefined : handicapFromPct(ranking.average),
      count: ranking.count,
    };
  });
  const putting = (["short", "long"] as const).map((mode) => {
    const values = stored(`sg4-putting-nine-hole-v1-${mode}`)
      .filter(
        (s) =>
          Array.isArray(s.putts) &&
          s.putts.length === 9 &&
          Array.isArray(s.distances) &&
          s.distances.length === 9 &&
          s.putts.every((p: unknown) => finite(p) && p >= 1) &&
          s.distances.every((d: unknown) => finite(d) && d > 0),
      )
      .sort((a, b) => a.at - b.at)
      .slice(-5)
      .map(
        (s) =>
          buildPuttingMatchReview(
            s.putts.map((p: number, i: number) => ({
              distance: s.distances[i],
              yourValue: p,
              completed: true,
            })),
          ).estimate,
      )
      .filter(finite);
    return {
      label: mode === "short" ? "Kortputt" : "Långputt",
      hcp: average(values),
      count: values.length,
    };
  });
  const recentDrivers = stored("sg4-offtee-three-shot-v1")
    .filter(
      (s) =>
        Array.isArray(s.shots) &&
        s.shots.length === 3 &&
        s.shots.every((x: any) => finite(x.distance) && x.distance > 0 && finite(x.lateral)),
    )
    .sort((a, b) => a.at - b.at)
    .slice(-5);
  const driverShots: TeeShot[] = recentDrivers.length
    ? recentDrivers.flatMap((s) =>
        s.shots.map((x: any, i: number) => ({
          index: i + 1,
          filled: true,
          total: x.distance,
          sidled: x.lateral,
          direction: x.side === "left" ? "left" : "right",
        })),
      )
    : loadOffTeeSessions()
        .slice(-5)
        .flatMap((s) => s.shots.filter((x) => x.filled));
  const length = average(driverShots.map((s) => s.total));
  const n = driverShots.length;
  const driving = [
    {
      label: "Samlat utslag",
      hcp: n ? offTeeResult(driverShots).handicap : undefined,
      count: recentDrivers.length || n,
    },
    {
      label: "Längd",
      hcp: length === undefined ? undefined : distanceToHandicap(length),
      count: n,
      note: length === undefined ? undefined : `${Math.round(length)} m snitt totallängd`,
    },
    {
      label: "Fairway",
      value: n
        ? `${Math.round((driverShots.filter((s) => shotOutcome(s.sidled).inFairway).length / n) * 100)} %`
        : undefined,
      count: n,
      note: "Testets fairway: ±16 m",
    },
    {
      label: "OB-zon",
      value: n
        ? `${Math.round((driverShots.filter((s) => shotOutcome(s.sidled).isOB).length / n) * 100)} %`
        : undefined,
      count: n,
      note: "Testets gräns: över 28 m sidled",
    },
  ];
  const chip = stored("sg4-chip-nine-shot-v1")
    .filter(
      (s) =>
        Array.isArray(s.balls) &&
        s.balls.length === 3 &&
        s.balls.every(
          (b: any) =>
            Array.isArray(b) && b.length === 3 && b.every((p: any) => [0, 1, 2, 3, 4].includes(p)),
        ),
    )
    .sort((a, b) => a.at - b.at)
    .slice(-5)
    .map((s) => courseHandicap({ holes: s.balls as ChipPoints[][], lie: "Fairway", model: 4 }))
    .filter(finite);
  const bunker = loadBunkerSessions()
    .filter((s) => s.shots.length === 6 && finite(s.handicap))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-5);
  return {
    approach,
    puttning: putting,
    driving,
    "around-the-green": [
      { label: "Chippning", hcp: average(chip), count: chip.length },
      { label: "Bunker", hcp: average(bunker.map((s) => s.handicap)), count: bunker.length },
    ],
  };
}
