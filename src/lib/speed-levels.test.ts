import { describe, expect, it } from "vitest";
import {
  SPEED_LEVELS,
  formatPositiveSpeedGap,
  nextLevelMessage,
  speedLevelProgress,
} from "./speed-levels";

describe("speed level progression", () => {
  it("keeps every threshold strictly increasing", () => {
    expect(SPEED_LEVELS.map((level) => level.mph)).toEqual([100, 120, 143, 150, 161, 171, 180, 190, 200]);
  });

  it.each(SPEED_LEVELS)("handles just below, exactly at and above $label", (level) => {
    expect(speedLevelProgress(level.mph - 0.01)?.achieved?.mph ?? 0).toBeLessThan(level.mph);
    expect(speedLevelProgress(level.mph)?.achieved?.id).toBe(level.id);
    expect(speedLevelProgress(level.mph + 0.01)?.achieved?.id).toBe(level.id);
  });

  it("uses the next higher level at an exact threshold", () => {
    const progress = speedLevelProgress(171);
    expect(progress?.achieved?.id).toBe("pga-average");
    expect(progress?.next?.id).toBe("club-180");
    expect(progress?.gapMph).toBe(9);
  });

  it("uses near-miss wording only within six mph", () => {
    expect(nextLevelMessage(168, "mph")).toBe("Bara 3,0 mph till PGA-snittet");
    expect(nextLevelMessage(164.9, "mph")).toBe("Nästa mål · 6,1 mph till PGA-snittet");
  });

  it("converts and rounds positive gaps without showing zero early", () => {
    expect(formatPositiveSpeedGap(3, "km/h")).toBe("4,9 km/h");
    expect(formatPositiveSpeedGap(0.01, "mph")).toBe("0,1 mph");
    expect(formatPositiveSpeedGap(0, "mph")).toBeNull();
  });

  it("does not clip values above the highest level or return a negative gap", () => {
    expect(speedLevelProgress(212)).toMatchObject({
      achieved: { id: "club-200" },
      next: null,
      gapMph: null,
      nearMiss: false,
    });
    expect(nextLevelMessage(212, "km/h")).toBe("Över högsta hastighetsmilstolpen");
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 0, -1])("rejects invalid speed %s", (speed) => {
    expect(speedLevelProgress(speed)).toBeNull();
    expect(nextLevelMessage(speed, "mph")).toBeNull();
  });
});