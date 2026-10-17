import { describe, expect, it } from "vitest";
import { precisionScoreFromPei } from "./precision-score";
describe("Precision Score", () => {
  it("converts percentage miss to points with higher scores for better accuracy", () => {
    expect(precisionScoreFromPei(0)).toBe(100);
    expect(precisionScoreFromPei(8.5)).toBe(91.5);
    expect(precisionScoreFromPei(20)).toBe(80);
  });
  it("keeps extreme misses within the 0–100 scale", () => {
    expect(precisionScoreFromPei(100)).toBe(0);
    expect(precisionScoreFromPei(150)).toBe(0);
  });
});
