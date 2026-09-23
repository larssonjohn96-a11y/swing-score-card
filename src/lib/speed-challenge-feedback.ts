import { type CourseRound, validShot } from "./speed-course";
/** Friend ranking uses every shot in the last five completed tests, never a single PB. */
export function speedRankingAverage(history: CourseRound[]) {
  const tests = history
    .filter(
      (r) => r.status === "full" && r.holes.flat().length === 3 && r.holes.flat().every(validShot),
    )
    .slice()
    .sort((a, b) => b.finishedAt - a.finishedAt)
    .slice(0, 5);
  const shots = tests.flatMap((r) => r.holes.flat());
  return {
    count: tests.length,
    average: shots.length ? shots.reduce((s, v) => s + v.ballSpeed, 0) / shots.length : null,
  };
}
/** Both unusually high and low readings need confirmation. All values are canonical mph. */
export function unusualSpeed(value: number, average: number | null, pb: number | null) {
  return (
    (average !== null && Math.abs(value - average) >= Math.max(20, average * 0.2)) ||
    (pb !== null && value - pb >= Math.max(10, pb * 0.1))
  );
}
