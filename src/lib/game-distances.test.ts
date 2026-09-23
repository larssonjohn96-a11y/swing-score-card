import { describe, expect, it } from "vitest";
import { GAME_DISTANCE_ZONES, generateGameDistances } from "./game-distances";
import { formatPuttingDistance, generatePuttingMatchDistances } from "./putting-match";
import { generateChipMatchDistances } from "./chip-match";

describe("fixed zoned game distances", () => {
  for (const kind of ["putt", "chip"] as const) {
    for (const length of [3, 5, 6, 7] as const) {
      it(`${kind}: ${length} holes stay balanced and minimize rematch repeats`, () => {
        const zones = GAME_DISTANCE_ZONES[kind];
        const zoneOf = (d: number) => zones.findIndex(z => (z as readonly number[]).includes(d));
        let previous: number[] = [];
        const extraZones = new Set<number>();
        for (let i = 0; i < 150; i++) {
          const distances = generateGameDistances(kind, length, previous);
          expect(distances).toHaveLength(length);
          expect(new Set(distances).size).toBe(length);
          const order = distances.map(zoneOf);
          expect(order.every(z => z >= 0)).toBe(true);
          expect(order.every((z, n) => n === 0 || z !== order[n - 1])).toBe(true);
          const counts = zones.map((_, z) => order.filter(n => n === z).length);
          expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
          if (length === 5) extraZones.add(counts.indexOf(1));
          if (length === 7) extraZones.add(counts.indexOf(3));
          if (previous.length) expect(order).not.toEqual(previous.map(zoneOf));
          for (let z = 0; z < zones.length; z++) {
            const fresh = zones[z].filter(d => !previous.includes(d)).length;
            const repeated = distances.filter(d => zoneOf(d) === z && previous.includes(d)).length;
            expect(repeated).toBe(Math.max(0, counts[z] - fresh));
          }
          previous = distances;
        }
        if (length === 5 || length === 7) expect(extraZones.size).toBe(3);
      });
    }
  }
  it("preserves half meters in match labels and shares the same generator", () => {
    expect(formatPuttingDistance(2.5)).toBe("2,5 m");
    expect(formatPuttingDistance(12)).toBe("12 m");
    expect(generatePuttingMatchDistances(7).every(d => d >= 1 && d <= 12)).toBe(true);
    expect(generateChipMatchDistances(7).every(d => d >= 8 && d <= 18)).toBe(true);
  });
});
