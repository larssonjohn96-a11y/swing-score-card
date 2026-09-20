import { describe, it, expect } from "vitest";
import {
  emptyCourse,
  reduceCourse,
  parseCourse,
  referenceSpeed,
  holeStars,
  roundStars,
  roundPoints,
  speedBests,
  speedAverage,
  courseHandicap,
  toMph,
  fromMph,
  validShot,
  type CourseRound,
} from "./speed-course";
const round = (id = "r", reference = 150, speed = 150, finishedAt = 1): CourseRound => ({
  id,
  model: 1,
  reference,
  startedAt: 0,
  finishedAt,
  status: "full",
  holes: Array.from({ length: 6 }, () => [{ ballSpeed: speed }]),
});
const calibrated = () =>
  [140, 150, 160].reduce(
    (s, length) => reduceCourse(s, { type: "calibrate", length }),
    emptyCourse(),
  );
describe("speed round", () => {
  it("calibrates three valid measurements and freezes the reference", () => {
    let s = emptyCourse();
    expect(reduceCourse(s, { type: "start", id: "x", at: 1 })).toBe(s);
    for (const length of [0, -1, NaN, Infinity, 251])
      expect(reduceCourse(s, { type: "calibrate", length })).toBe(s);
    s = calibrated();
    expect(referenceSpeed(s)).toBe(150);
    s = reduceCourse(s, { type: "start", id: "x", at: 1 });
    expect(s.active?.reference).toBe(150);
    expect(reduceCourse(s, { type: "calibrate", length: 170 })).toBe(s);
  });
  it("awards stars by personal speed, including half stars", () => {
    for (const [ballSpeed, stars] of [
      [79, 0],
      [80, 1],
      [90, 1.5],
      [95, 2],
      [98, 2.5],
      [100, 3],
      [110, 3],
    ])
      expect(holeStars([{ ballSpeed }], 0, 100)).toBe(stars);
  });
  it("keeps raw speed records distinct above the objective score ceiling", () => {
    const a = round("a", 180, 180),
      b = round("b", 190, 190);
    expect(roundPoints(a)).toBe(100);
    expect(roundPoints(b)).toBe(100);
    expect(speedBests([a, b]).top).toBe(190);
  });
  it("converts km/h to the same stored mph value without mixing club and ball speed", () => {
    expect(toMph(241.4016, "km/h")).toBeCloseTo(150, 8);
    expect(fromMph(150, "km/h")).toBeCloseTo(241.4016, 8);
    expect(validShot({ clubSpeed: 100 })).toBe(false);
    expect(validShot({ ballSpeed: 0 })).toBe(false);
    expect(validShot({ ballSpeed: NaN })).toBe(false);
  });
  it("objective score and speed HCP do not depend on the personal reference", () => {
    const a = round("a", 100, 100),
      b = round("b", 170, 170);
    expect(roundStars(a)).toBe(18);
    expect(roundStars(b)).toBe(18);
    expect(roundPoints(b)).toBeGreaterThan(roundPoints(a));
    const changedReference = { ...a, reference: 200 };
    expect(roundPoints(changedReference)).toBe(roundPoints(a));
    expect(courseHandicap(changedReference)).toBe(courseHandicap(a));
  });
  it("records exactly six shots with halfway, undo and reload; excludes incomplete rounds from rankings", () => {
    let s = reduceCourse(calibrated(), { type: "start", id: "six", at: 1 });
    for (let i = 0; i < 6; i++) {
      s = reduceCourse(s, { type: "score", shot: { ballSpeed: 147 } });
      expect(reduceCourse(s, { type: "score", shot: { ballSpeed: 200 } })).toBe(s);
      if (i === 0) {
        s = reduceCourse(s, { type: "undo" });
        expect(s.active?.holes[0]).toEqual([]);
        s = reduceCourse(s, { type: "score", shot: { ballSpeed: 147 } });
      }
      s = parseCourse(JSON.stringify(s));
      expect(s.active?.reference).toBe(150);
      s = reduceCourse(s, { type: "next", at: 10 + i });
      if (i === 2) {
        expect(s.active?.phase).toBe("halfway");
        expect(speedAverage(reduceCourse(s, { type: "finish", at: 20 }).history).count).toBe(0);
        s = reduceCourse(s, { type: "continue" });
      }
    }
    expect(s.active).toBeNull();
    expect(roundStars(s.history[0])).toBe(15);
    expect(referenceSpeed(s)).toBe(147);
    expect(s.history[0].reference).toBe(150);
  });
  it("averages only the latest five complete rounds and rejects incompatible data", () => {
    const history = Array.from({ length: 6 }, (_, i) =>
      round(String(i), 150, i === 0 ? 200 : 150, i),
    );
    expect(speedAverage(history).points).toBe(roundPoints(history[1]));
    expect(speedAverage(history).count).toBe(5);
    expect(
      parseCourse(JSON.stringify({ version: 1, history: [{ ...round(), reference: undefined }] }))
        .history,
    ).toHaveLength(0);
    expect(
      parseCourse(
        JSON.stringify({
          ...calibrated(),
          history: [{ ...round(), holes: [[{ actualDistance: 150, lateral: 0, side: "center" }]] }],
        }),
      ).history,
    ).toHaveLength(0);
  });
});
