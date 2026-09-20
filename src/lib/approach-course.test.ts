import { describe, it, expect } from "vitest";
import {
  COURSE_DISTANCES,
  emptyCourse,
  reduceCourse,
  parseCourse,
  validShot,
  holeStars,
  roundStars,
  shotMiss,
  averageMiss,
  courseHandicap,
  approachAverage,
  approachBests,
  type CourseRound,
  type CourseShot,
} from "./approach-course";
const shot = (
  target: number,
  length = 0,
  lateral = 0,
  side: "left" | "right" = "right",
): CourseShot => ({
  actualDistance: target + length,
  lateral,
  side: lateral === 0 ? "center" : side,
});
const round = (id: string, error = 0, finishedAt = 1): CourseRound => ({
  id,
  model: 1,
  startedAt: 0,
  finishedAt,
  status: "full",
  holes: COURSE_DISTANCES.map((t) => [shot(t, error)]),
});
describe("Inspelsrundan", () => {
  it("uses agreed distances and maximum 18 stars", () => {
    expect(COURSE_DISTANCES).toEqual([125, 90, 140, 115, 155, 135]);
    expect(roundStars(round("perfect"))).toBe(18);
  });
  it("uses combined length and lateral error, equal for left and right", () => {
    for (const side of ["left", "right"] as const) {
      expect(shotMiss(shot(125, 6, 8, side), 0)).toBe(10);
      expect(holeStars([shot(125, 6, 8, side)], 0)).toBe(2);
    }
    expect(shotMiss(shot(125, -6, 8), 0)).toBe(10);
  });
  it("handles all inclusive boundaries without rounding before scoring", () => {
    for (const [error, stars] of [
      [0, 3],
      [5, 3],
      [5.001, 2],
      [10, 2],
      [10.001, 1],
      [20, 1],
      [20.001, 0],
    ])
      expect(holeStars([shot(125, error)], 0)).toBe(stars);
    expect(holeStars([shot(125, 3, 4)], 0)).toBe(3);
  });
  it("rejects contradictory directions, non-finite values, missing fields and negative lateral distance", () => {
    for (const value of [
      null,
      3,
      { actualDistance: 125, lateral: 8, side: "center" },
      { actualDistance: 125, lateral: -1, side: "left" },
      { actualDistance: NaN, lateral: 0, side: "center" },
      { actualDistance: 125, lateral: 0, side: "sideways" },
    ])
      expect(validShot(value)).toBe(false);
    expect(validShot(shot(0))).toBe(true);
  });
  it("plays six one-shot holes with halfway after three and saves each input unchanged", () => {
    let s = reduceCourse(emptyCourse(), { type: "start", id: "round", at: 1 });
    for (let i = 0; i < 6; i++) {
      const result = shot(COURSE_DISTANCES[i], 6, 8, i % 2 ? "left" : "right");
      s = reduceCourse(s, { type: "score", shot: result });
      expect(s.active?.phase).toBe("result");
      expect(reduceCourse(s, { type: "score", shot: result })).toBe(s);
      s = reduceCourse(s, { type: "next", at: i + 2 });
      if (i === 2) {
        expect(s.active?.phase).toBe("halfway");
        s = reduceCourse(s, { type: "continue" });
      }
    }
    expect(s.active).toBeNull();
    expect(roundStars(s.history[0])).toBe(12);
    expect(averageMiss(s.history[0])).toBe(10);
    expect(parseCourse(JSON.stringify(s))).toEqual(s);
    expect(s.history[0].holes[1][0].side).toBe("left");
  });
  it("restores current play, undo and partial history without treating it as a full record", () => {
    let s = reduceCourse(emptyCourse(), { type: "start", id: "r", at: 1 });
    s = reduceCourse(s, { type: "score", shot: shot(125) });
    s = reduceCourse(s, { type: "undo" });
    expect(s.active?.holes).toEqual([[]]);
    s = reduceCourse(s, { type: "score", shot: shot(125, 20) });
    expect(parseCourse(JSON.stringify(s))).toEqual(s);
    s = reduceCourse(s, { type: "finish", at: 3 });
    expect(s.history[0].status).toBe("partial");
    expect(approachAverage(s.history).count).toBe(0);
    expect(approachBests(s.history).stars).toBeNull();
  });
  it("uses latest five complete rounds and preserves best stars and precision", () => {
    const h = [
      round("old", 0, 0),
      ...Array.from({ length: 5 }, (_, i) => round("r" + i, 10, i + 1)),
    ];
    expect(approachAverage(h)).toEqual({ count: 5, points: 12, stars: 12 });
    expect(approachBests(h)).toEqual({ stars: 18, miss: 0 });
  });
  it("estimates handicap from proportional errors without substituting star score", () => {
    expect(courseHandicap({ holes: [[shot(125)]] })).toBeNull();
    expect(courseHandicap(round("good", 5))!).toBeLessThan(courseHandicap(round("bad", 20))!);
    expect(
      parseCourse(
        JSON.stringify({ version: 1, history: [{ ...round("bad"), holes: [[1], [2], [3]] }] }),
      ).history,
    ).toEqual([]);
  });
});
