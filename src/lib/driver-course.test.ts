import { describe, it, expect } from "vitest";
import {
  emptyCourse,
  reduceCourse,
  parseCourse,
  referenceLength,
  holeStars,
  roundStars,
  roundPoints,
  driverAverage,
  courseHandicap,
  shotPoints,
  type CourseRound,
  type CourseShot,
} from "./driver-course";
const shot = (
  actualDistance = 200,
  lateral = 0,
  side: CourseShot["side"] = "center",
): CourseShot => ({
  actualDistance,
  lateral,
  side: lateral ? (side === "center" ? "right" : side) : "center",
});
const round = (id = "r", reference = 200, distance = 200, finishedAt = 1): CourseRound => ({
  id,
  model: 1,
  reference,
  startedAt: 0,
  finishedAt,
  status: "full",
  holes: Array.from({ length: 6 }, () => [shot(distance)]),
});
const calibrated = () =>
  [180, 200, 220].reduce(
    (s, length) => reduceCourse(s, { type: "calibrate", length }),
    emptyCourse(),
  );
describe("driver personal stars and common score", () => {
  it("calibrates from three measured shots, locks the median and rejects invalid input", () => {
    const empty = emptyCourse();
    expect(reduceCourse(empty, { type: "start", id: "x", at: 1 })).toBe(empty);
    for (const length of [0, -1, Infinity, 401])
      expect(reduceCourse(empty, { type: "calibrate", length })).toBe(empty);
    const state = calibrated();
    expect(referenceLength(state)).toBe(200);
    const playing = reduceCourse(state, { type: "start", id: "x", at: 1 });
    expect(playing.active?.reference).toBe(200);
    expect(reduceCourse(playing, { type: "calibrate", length: 300 })).toBe(playing);
  });
  it("awards half stars at exact personal boundaries and zero outside the zone", () => {
    for (const [length, expected] of [
      [159.9, 1.5],
      [160, 2],
      [180, 2.5],
      [200, 3],
    ])
      expect(holeStars([shot(length, 20)], 0, 200)).toBe(expected);
    expect(holeStars([shot(300, 20.01)], 0, 200)).toBe(0);
    expect(holeStars([shot(0)], 0, 200)).toBe(0);
    expect(holeStars([shot(180)], 0, 180)).toBe(3);
  });
  it("uses a common objective scale independent of personal reference", () => {
    const short = round("a", 180, 180),
      long = round("b", 280, 280);
    expect(roundStars(short)).toBe(18);
    expect(roundStars(long)).toBe(18);
    expect(roundPoints(long)).toBeGreaterThan(roundPoints(short));
    const changed = { ...short, reference: 300 };
    expect(roundPoints(changed)).toBe(roundPoints(short));
    expect(courseHandicap(changed)).toBe(courseHandicap(short));
    expect(
      Math.abs(shotPoints(shot(250, 19.99)) - shotPoints(shot(250, 20.01))),
    ).toBeLessThanOrEqual(1);
    expect(shotPoints(shot(250, 45))).toBeLessThan(shotPoints(shot(250, 20)));
  });
  it("freezes old stars and updates only the next round reference from latest five full rounds", () => {
    const history = Array.from({ length: 6 }, (_, i) =>
      round(String(i), 200, i === 0 ? 400 : 240, i),
    );
    const state = { ...calibrated(), history };
    expect(referenceLength(state)).toBe(240);
    const oldStars = roundStars(history[0]);
    const started = reduceCourse(state, { type: "start", id: "new", at: 9 });
    expect(started.active?.reference).toBe(240);
    expect(roundStars(started.history[0])).toBe(oldStars);
    expect(driverAverage(history).count).toBe(5);
    expect(driverAverage(history).points).toBe(roundPoints(history[1]));
  });
  it("preserves six measurements, halfway, undo, reload, full vs partial rankings", () => {
    let s = reduceCourse(calibrated(), { type: "start", id: "six", at: 1 });
    for (let i = 0; i < 6; i++) {
      s = reduceCourse(s, { type: "score", shot: shot(180, 10, i % 2 ? "left" : "right") });
      const duplicate = reduceCourse(s, { type: "score", shot: shot(400) });
      expect(duplicate).toBe(s);
      if (i === 0) {
        s = reduceCourse(s, { type: "undo" });
        expect(s.active?.holes[0]).toEqual([]);
        s = reduceCourse(s, { type: "score", shot: shot(180, 10, "right") });
      }
      s = parseCourse(JSON.stringify(s));
      expect(s.active?.reference).toBe(200);
      s = reduceCourse(s, { type: "next", at: 10 + i });
      if (i === 2) {
        expect(s.active?.phase).toBe("halfway");
        const half = reduceCourse(s, { type: "finish", at: 20 });
        expect(half.history[0].status).toBe("front");
        expect(driverAverage(half.history).count).toBe(0);
        s = reduceCourse(s, { type: "continue" });
      }
    }
    expect(s.active).toBeNull();
    expect(s.history[0].holes).toHaveLength(6);
    expect(roundStars(s.history[0])).toBe(15);
    expect(s.history[0].holes[1][0].side).toBe("left");
  });
  it("rejects incompatible rounds and keeps calibration when restored", () => {
    expect(parseCourse(JSON.stringify(calibrated())).calibration).toEqual([180, 200, 220]);
    expect(
      parseCourse(JSON.stringify({ version: 1, history: [{ ...round(), reference: undefined }] }))
        .history,
    ).toHaveLength(0);
  });
});
