import { describe, expect, it } from "vitest";
import {
  approximateShotLevel,
  comparePuttingShot,
  expectedPutts,
  expectedStrokes,
  formatRange,
  getExpectedStrokePoints,
  puttingShotValue,
  referenceKey,
  roundImpactText,
  SHOT_VALUE_SCENARIOS,
  shotValue,
  shotValueLabel,
} from "@/lib/shot-value";

describe("Shot Value putting model", () => {
  it("interpolates expected putts between reference points", () => {
    const atOne = expectedPutts("hcp10", 0.9);
    const atTwo = expectedPutts("hcp10", 1.2);
    const middle = expectedPutts("hcp10", 1.05);
    expect(middle).toBeGreaterThan(atOne);
    expect(middle).toBeLessThan(atTwo);
  });

  it("uses the externally published HCP10 anchor at 5 ft", () => {
    expect(expectedPutts("hcp10", 1.524)).toBeCloseTo(1.48, 5);
  });

  it("uses the externally published HCP10 anchor at 60 ft", () => {
    expect(expectedPutts("hcp10", 18.288)).toBeCloseTo(2.49, 5);
  });

  it("rewards a holed putt and penalizes a miss that leaves distance", () => {
    const made = puttingShotValue(2, true, 0, "hcp10");
    const missed = puttingShotValue(2, false, 1, "hcp10");
    expect(made).toBeGreaterThan(0);
    expect(missed).toBeLessThan(0);
    expect(made).toBeGreaterThan(missed);
  });

  it("compares the same shot against every benchmark level", () => {
    const rows = comparePuttingShot(5, false, 0.5);
    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.level)).toEqual(["hcp20", "hcp10", "scratch", "tour"]);
  });

  it("returns the benchmark closest to neutral as approximate shot level", () => {
    const level = approximateShotLevel(comparePuttingShot(5, false, 1));
    expect(level).not.toBeNull();
    expect(typeof level?.label).toBe("string");
  });

  it("groups similar saved references into the same key", () => {
    expect(referenceKey(10.1, false, 0.9)).toBe(referenceKey(10.2, false, 1.1));
  });

  it("uses broad language bands instead of fake precision", () => {
    expect(shotValueLabel(0.4)).toBe("Mycket bra");
    expect(shotValueLabel(0)).toBe("Normalt");
    expect(shotValueLabel(-0.4)).toBe("Mycket kostsamt");
  });
});

describe("Generic expected-strokes model", () => {
  it("stores data as category > level > lie > distance", () => {
    const points = getExpectedStrokePoints("putting", "hcp10", "green");
    expect(points?.length).toBeGreaterThan(0);
  });

  it("returns null when a category/lie table is not populated yet", () => {
    expect(expectedStrokes("approach", "hcp10", "fairway", 150)).toBeNull();
  });

  it("uses the same generic formula for a putt", () => {
    const generic = shotValue(
      { category: "putting", level: "hcp10", lie: "green", distanceM: 2 },
      { category: "putting", lie: "green", distanceM: 1 },
    );
    expect(generic).toBeCloseTo(puttingShotValue(2, false, 1, "hcp10"), 8);
  });
});

describe("Shot Value reference scenarios", () => {
  it("contains browsable scenarios for all four categories", () => {
    expect(new Set(SHOT_VALUE_SCENARIOS.map((scenario) => scenario.category))).toEqual(
      new Set(["offtee", "approach", "around", "putting"]),
    );
  });

  it("keeps scenario and round-impact values as ranges", () => {
    for (const scenario of SHOT_VALUE_SCENARIOS) {
      expect(scenario.difference[0]).toBeLessThanOrEqual(scenario.difference[1]);
      if (scenario.roundImpact) expect(scenario.roundImpact[0]).toBeLessThanOrEqual(scenario.roundImpact[1]);
    }
  });

  it("formats educational ranges without false decimal precision", () => {
    expect(formatRange([2, 4])).toBe("2–4");
    expect(formatRange([0.4, 0.8])).toBe("0,4–0,8");
  });

  it("creates broad round-impact copy from a scenario", () => {
    const scenario = SHOT_VALUE_SCENARIOS.find((item) => item.id === "around-bunker-shortside");
    expect(scenario).toBeDefined();
    expect(roundImpactText(scenario!)).toContain("2–4 slag");
  });
});
