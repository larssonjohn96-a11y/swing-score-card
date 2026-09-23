import { describe, it, expect } from "vitest";
import { speedRankingAverage, unusualSpeed } from "./speed-challenge-feedback";
import { type CourseRound } from "./speed-course";
const round = (
  id: number,
  values: number[],
  status: CourseRound["status"] = "full",
): CourseRound => ({
  id: String(id),
  model: 1,
  reference: 100,
  startedAt: 0,
  finishedAt: id,
  status,
  holes: values.map((ballSpeed) => [{ ballSpeed }]),
});
describe("speed challenge comparisons", () => {
  it("ranks by all shots in five latest completed tests, never by the highest shot", () => {
    const records = [
      round(0, [250, 250, 250]),
      ...[1, 2, 3, 4, 5].map((i) => round(i, [100, 110, 150])),
      round(6, [250], "partial"),
    ];
    expect(speedRankingAverage(records)).toEqual({ count: 5, average: 120 });
  });
  it("has no fabricated average before a completed test", () =>
    expect(speedRankingAverage([])).toEqual({ count: 0, average: null }));
  it("confirms large deviations in both directions and unusually high records", () => {
    expect(unusualSpeed(190, 150, 160)).toBe(true);
    expect(unusualSpeed(100, 150, 160)).toBe(true);
    expect(unusualSpeed(177, 165, 160)).toBe(true);
    expect(unusualSpeed(155, 150, 160)).toBe(false);
    expect(unusualSpeed(170, null, null)).toBe(false);
  });
});
