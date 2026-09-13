import { describe, expect, it } from "vitest";
import {
  adaptiveTargetAfterResult,
  buildEngineDistanceSequence,
  selectNextEngineDistance,
} from "@/lib/sg4-engine";

describe("SG4 engine distance adaptation", () => {
  it("makes a zero-result chip easier instead of jumping harder", () => {
    expect(adaptiveTargetAfterResult("chip", 14, 0, 7, 30)).toBe(9);

    for (let i = 0; i < 30; i++) {
      const next = selectNextEngineDistance({
        skill: "chip",
        objective: "learning",
        min: 7,
        max: 30,
        previousDistance: 14,
        previousPerformance: 0,
      });
      expect(next).toBeGreaterThanOrEqual(9);
      expect(next).toBeLessThanOrEqual(14);
    }
  });

  it("moves difficulty upward after an excellent result without a huge jump", () => {
    expect(adaptiveTargetAfterResult("chip", 14, 1, 7, 30)).toBe(19);

    for (let i = 0; i < 30; i++) {
      const next = selectNextEngineDistance({
        skill: "chip",
        objective: "balanced",
        min: 7,
        max: 30,
        previousDistance: 14,
        previousPerformance: 1,
      });
      expect(next).toBeGreaterThanOrEqual(13);
      expect(next).toBeLessThanOrEqual(19);
    }
  });

  it("keeps prebuilt game sequences smooth and inside the requested range", () => {
    const sequence = buildEngineDistanceSequence("putting", 12, 1, 22, "fun");
    expect(sequence).toHaveLength(12);
    sequence.forEach((distance) => {
      expect(distance).toBeGreaterThanOrEqual(1);
      expect(distance).toBeLessThanOrEqual(22);
    });
    for (let i = 1; i < sequence.length; i++) {
      expect(Math.abs(sequence[i] - sequence[i - 1])).toBeLessThanOrEqual(4);
    }
  });

  it("supports the shorter distances needed when a player is struggling", () => {
    const next = adaptiveTargetAfterResult("chip", 10, 0, 7, 30);
    expect(next).toBe(7);
  });
});
