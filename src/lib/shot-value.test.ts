import { describe, expect, it } from "vitest";
import { approximateShotLevel, comparePuttingShot, expectedPutts, puttingShotValue, referenceKey, shotValueLabel } from "@/lib/shot-value";

describe("Shot Value putting model", () => {
  it("interpolates expected putts between reference points", () => {
    const atOne = expectedPutts("hcp10", 0.9);
    const atTwo = expectedPutts("hcp10", 1.2);
    const middle = expectedPutts("hcp10", 1.05);
    expect(middle).toBeGreaterThan(atOne);
    expect(middle).toBeLessThan(atTwo);
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
