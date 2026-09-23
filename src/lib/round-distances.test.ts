import { describe, it, expect } from "vitest";
import { generateRoundDistances } from "./round-distances";
import * as chip from "./chip-course";
import * as putt from "./putt-course";
import * as approach from "./approach-course";

describe("randomized solo round distances", () => {
  it("varies targets and order while preserving coverage, unique holes and putting's ceiling", () => {
    for (const kind of ["chip", "putt", "approach"] as const) {
      const sequences = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const d = generateRoundDistances(kind, String(i));
        expect(new Set(d).size).toBe(6);
        expect(d).toEqual(generateRoundDistances(kind, String(i)));
        expect(generateRoundDistances(kind, String(i), d)).not.toEqual(d);
        sequences.add(d.join(","));
        if (kind === "putt") {
          expect(d.filter((n) => n <= 3)).toHaveLength(2);
          expect(d.filter((n) => n >= 4 && n <= 7)).toHaveLength(2);
          expect(d.filter((n) => n >= 8 && n <= 12)).toHaveLength(2);
          expect(putt.roundStars({ holes: d.map(() => [1]), distances: d })).toBe(16);
        } else {
          const bands =
            kind === "chip"
              ? [
                  [8, 10],
                  [11, 14],
                  [15, 18],
                ]
              : [
                  [90, 110],
                  [115, 135],
                  [140, 155],
                ];
          for (const [min, max] of bands)
            expect(d.filter((n) => n >= min && n <= max)).toHaveLength(2);
        }
      }
      expect(sequences.size).toBeGreaterThan(95);
    }
  });
  it("retains distances through scoring, undo, resume, finish and cloud round serialization", () => {
    for (const api of [chip, putt, approach]) {
      // Exercise the same lifecycle through all three independent reducers.
      const reduce = api.reduceCourse as (s: any, a: any) => any;
      let state = reduce(api.emptyCourse(), { type: "start", id: "new-round", at: 1 });
      const distances = [...state.active.distances];
      const score = {
        type: "score",
        points: 3,
        putts: 1,
        shot: { actualDistance: distances[0], lateral: 0, side: "center" },
      };
      state = reduce(state, score);
      state = reduce(state, { type: "undo" });
      state = api.parseCourse(JSON.stringify(state));
      expect(state.active.distances).toEqual(distances);
      for (let i = 0; i < (api === chip ? 3 : 1); i++) state = reduce(state, score);
      state = reduce(state, { type: "finish", at: 2 });
      state = api.parseCourse(JSON.stringify(state));
      expect(state.history[0].distances).toEqual(distances);
      state = reduce(state, { type: "start", id: "next-round", at: 3 });
      expect(state.active.distances).not.toEqual(distances);
    }
  });
  it("scores and analyzes actual randomized targets and retains legacy fallback", () => {
    const distances = [150, 95, 120, 145, 105, 130];
    const r = {
      distances,
      holes: distances.map((actualDistance) => [
        { actualDistance, lateral: 0, side: "center" as const },
      ]),
    };
    expect(approach.roundStars(r)).toBe(18);
    expect(approach.averageMiss(r)).toBe(0);
    expect(
      putt
        .reviewRound({ distances: [12, 2, 9, 4, 3, 10], holes: [[1], [2]] })
        .rows.map((h) => h.distance),
    ).toEqual([12, 2]);
    expect(putt.courseDistances({})).toEqual(putt.COURSE_DISTANCES);
    expect(approach.courseDistances({})).toEqual(approach.COURSE_DISTANCES);
    expect(chip.courseDistances(1, {})).toEqual([8, 10, 12, 14, 16, 20]);
  });
});
