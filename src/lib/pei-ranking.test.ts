import { describe, expect, it } from "vitest";
import { IRON_TARGETS, WEDGE_TARGETS, peiRankingAverage, type PeiSession } from "./pei-ranking";
const session = (
  pei: number,
  date: string,
  targets: readonly number[] = WEDGE_TARGETS,
): PeiSession => ({
  id: date,
  date,
  pei,
  shots: targets.map((target) => ({ target, actual: target, lateral: 0 })),
});
describe("PEI leaderboard", () => {
  it("keeps wedge and iron tests separate, excludes incomplete and older random tests", () => {
    const history = [
      session(4, "2026-10-14"),
      session(3, "2026-10-13", IRON_TARGETS),
      session(2, "2026-10-12", WEDGE_TARGETS.slice(0, 8)),
      session(1, "2026-10-11", [31, 41, 51, 61, 71, 81, 91, 101, 111]),
    ];
    expect(peiRankingAverage(history, "wedge")).toEqual({ count: 1, average: 4, best: 4 });
    expect(peiRankingAverage(history, "iron")).toEqual({ count: 1, average: 3, best: 3 });
  });
  it("averages the latest five tests by date and retains the all-time best", () => {
    const history = [
      session(0, "2026-10-01"),
      ...[2, 3, 4, 5, 6].map((n) => session(n, `2026-10-${10 + n}`)),
    ].reverse();
    expect(peiRankingAverage(history, "wedge")).toEqual({ count: 5, average: 4, best: 0 });
  });
  it("handles no results, perfect shots, and invalid scores", () => {
    expect(peiRankingAverage([], "wedge")).toEqual({ count: 0, average: null, best: null });
    expect(
      peiRankingAverage(
        [session(0, "2026-10-14"), session(NaN, "2026-10-13"), session(-1, "2026-10-12")],
        "wedge",
      ),
    ).toEqual({ count: 1, average: 0, best: 0 });
  });
  it("preserves the agreed iron and wedge distances", () => {
    expect(IRON_TARGETS).toEqual([120, 125, 135, 140, 150, 155, 165, 170, 175]);
    expect(WEDGE_TARGETS).toEqual([30, 40, 50, 60, 70, 80, 90, 100, 110]);
  });
});
