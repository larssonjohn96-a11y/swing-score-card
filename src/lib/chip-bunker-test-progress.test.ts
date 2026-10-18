import { describe, expect, it } from "vitest";
import { chipTestStars, chipStationComplete } from "./chip-test-progress";
import { holeStars } from "./chip-course";
import { BUNKER_TEST_INTERVALS, computeBunkerResult } from "./bunker";

describe("live chip progress", () => {
  it("fills stars before the station is completed", () => {
    expect(chipTestStars([])).toBe(0);
    expect(chipTestStars([3])).toBe(1);
    expect(chipTestStars([2])).toBeCloseTo(2 / 3);
    expect(chipTestStars([3, 2])).toBeCloseTo(5 / 3);
    expect(chipStationComplete([3, 2])).toBe(false);
    expect(chipStationComplete([3, 2, 1])).toBe(true);
  });
  it("matches saved scoring at completion, including the three-star cap", () => {
    for (const shots of [[3,2,1], [4,4,4], [0,0,0]] as const) {
      expect(chipTestStars(shots)).toBe(holeStars(shots, 0, "Fairway", 4));
    }
  });
});
describe("six bunker zones", () => {
  it("offers only the requested choices", () => {
    expect(BUNKER_TEST_INTERVALS.map(z => z.label)).toEqual(["Sänkt", "Inom 1 m", "Inom 3 m", "Inom 5 m", "+5 meter", "Kom inte upp"]);
  });
  it("calculates new bins and preserves old stored bins", () => {
    const result = computeBunkerResult(BUNKER_TEST_INTERVALS.map((z, index) => ({index: index + 1, interval: z.key})));
    expect(result.avgProximity).toBe(3.92);
    expect(result.notOutCount).toBe(1);
    expect(result.within2m).toBe(2);
    expect(computeBunkerResult([{index: 1, interval: "50cm-1m"}]).avgProximity).toBe(0.75);
    expect(computeBunkerResult([{index: 1, interval: "4-6m"}]).avgProximity).toBe(5);
  });
});
