import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  SPEED_LEVELS,
  formatAnimatedSpeedValue,
  formatPositiveSpeedGap,
  formatSpeedValue,
  nextLevelMessage,
  speedLevelProgress,
} from "./speed-levels";

const numeric = (text: string) => Number(text.replace(",", "."));

describe("speed level progression", () => {
  it("uses strictly increasing, explicit mph benchmarks", () => {
    assert.deepEqual(SPEED_LEVELS.map((level) => level.mph), [90, 126, 143, 150, 161, 171, 180, 190, 200, 220]);
    assert.equal(new Set(SPEED_LEVELS.map((level) => level.id)).size, SPEED_LEVELS.length);
  });
  for (const [index, level] of SPEED_LEVELS.entries()) {
    it(`does not reach ${level.id} prematurely`, () => {
      const result = speedLevelProgress(level.mph - 0.001)!;
      assert.equal(result.next?.id, level.id);
      assert.equal(result.achieved?.id ?? null, SPEED_LEVELS[index - 1]?.id ?? null);
      assert.ok(result.gapMph! > 0);
    });
    it(`reaches ${level.id} at its exact threshold`, () => {
      const result = speedLevelProgress(level.mph)!;
      assert.equal(result.achieved?.id, level.id);
      assert.equal(result.next?.id ?? null, SPEED_LEVELS[index + 1]?.id ?? null);
    });
    it(`stays in ${level.id} just above its threshold`, () => {
      assert.equal(speedLevelProgress(level.mph + 0.001)?.achieved?.id, level.id);
    });
  }
  it("identifies only the two historical tour averages as sourced statistics", () => {
    const tour = SPEED_LEVELS.filter((level) => level.source.kind === "trackman-tour-average");
    assert.deepEqual(tour.map((level) => level.mph), [143, 171]);
    for (const level of tour) {
      assert.equal(level.source.kind === "trackman-tour-average" && level.source.season, 2023);
    }
    assert.equal(SPEED_LEVELS.at(-1)?.source.kind, "sg4");
  });
  it("keeps milestone units explicit even in a km/h interface", () => {
    for (const mph of [180, 190, 200]) {
      assert.ok(SPEED_LEVELS.find((level) => level.mph === mph)?.label.includes(`${mph} mph`));
    }
  });
  for (const invalid of [NaN, Infinity, -Infinity, 0, -1]) {
    it(`rejects invalid speed ${invalid}`, () => {
      assert.equal(speedLevelProgress(invalid), null);
      assert.equal(nextLevelMessage(invalid, "mph"), null);
    });
  }
  it("uses encouraging wording at, but not beyond, the six-mph window", () => {
    assert.equal(nextLevelMessage(165, "mph"), "Bara 6,0 mph till PGA-snittet");
    assert.equal(nextLevelMessage(168, "mph"), "Bara 3,0 mph till PGA-snittet");
    assert.equal(nextLevelMessage(164.9, "mph"), "Nästa mål · 6,1 mph till PGA-snittet");
    assert.equal(speedLevelProgress(164.999)?.nearMiss, false);
  });
  it("corrects subtraction noise without showing an extra tenth", () => {
    assert.equal(formatPositiveSpeedGap(171 - 164.9, "mph"), "6,1 mph");
    assert.equal(formatPositiveSpeedGap(171 - 170.9, "mph"), "0,1 mph");
  });
  it("converts the remaining gap, not rounded endpoints", () => {
    assert.equal(formatPositiveSpeedGap(3, "km/h"), "4,9 km/h");
    assert.equal(nextLevelMessage(168, "km/h"), "Bara 4,9 km/h till PGA-snittet");
  });
  it("never shows zero for a positive gap", () => {
    for (const unit of ["mph", "km/h"] as const) {
      for (const gap of [Number.MIN_VALUE, 0.000001, 0.01]) {
        assert.equal(formatPositiveSpeedGap(gap, unit), `<0,1 ${unit}`);
      }
    }
    for (const invalid of [0, -1, NaN, Infinity]) assert.equal(formatPositiveSpeedGap(invalid, "mph"), null);
  });
  it("distinguishes reaching the highest milestone from exceeding it", () => {
    assert.equal(nextLevelMessage(220, "mph"), "Högsta hastighetsmilstolpen uppnådd");
    assert.equal(nextLevelMessage(250, "mph"), "Över högsta hastighetsmilstolpen");
    assert.deepEqual(speedLevelProgress(250), { achieved: SPEED_LEVELS.at(-1), next: null, gapMph: null, nearMiss: false });
  });
  it("preserves measured mph decimals and converts km/h", () => {
    assert.equal(formatSpeedValue(170.9, "mph"), "170,9");
    assert.equal(formatSpeedValue(170.99, "mph"), "170,99");
    assert.equal(formatSpeedValue(100, "km/h"), "160,9");
    assert.equal(formatSpeedValue(250, "mph"), "250,0");
  });
  it("does not round a displayed value across any unreached threshold", () => {
    for (const level of SPEED_LEVELS) {
      for (const unit of ["mph", "km/h"] as const) {
        const factor = unit === "mph" ? 1 : 1.609344;
        const input = level.mph - 0.00001;
        assert.ok(numeric(formatSpeedValue(input, unit)) < level.mph * factor);
        assert.ok(numeric(formatAnimatedSpeedValue(input, unit)) <= input * factor);
      }
    }
  });
  it("retains ordered levels and positive gaps throughout the valid range", () => {
    for (let n = 1; n <= 25000; n += 1) {
      const speed = n / 100;
      const result = speedLevelProgress(speed)!;
      if (result.achieved) assert.ok(result.achieved.mph <= speed);
      if (result.next) { assert.ok(result.next.mph > speed); assert.ok(result.gapMph! > 0); }
    }
  });
});
