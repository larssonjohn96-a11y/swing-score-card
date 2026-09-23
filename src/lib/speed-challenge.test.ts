import { describe, expect, it } from "vitest";
import {
  emptyCourse,
  fromMph,
  reduceCourse,
  speedHistoryBaseline,
  toMph,
  validShot,
  type CourseRound,
} from "./speed-course";

const round = (
  id: string,
  finishedAt: number,
  speeds: number[],
  status: CourseRound["status"] = "full",
): CourseRound => ({
  id,
  model: 1,
  reference: 140,
  startedAt: finishedAt - 100,
  finishedAt,
  holes: speeds.map((ballSpeed) => [{ ballSpeed }]),
  status,
});

describe("Ball Speed Challenge", () => {
  it("uses each completed test's best drive for the latest-five baseline", () => {
    const history = [
      round("old", 1, [90, 100, 95]),
      round("a", 2, [110, 120, 115]),
      round("b", 3, [120, 130, 125]),
      round("c", 4, [130, 140, 135]),
      round("d", 5, [140, 150, 145]),
      round("e", 6, [150, 160, 155]),
      round("partial", 7, [200], "partial"),
    ];
    expect(speedHistoryBaseline(history)).toEqual({ count: 5, average: 140, pb: 160 });
  });

  it("has no invented first-test baseline", () => {
    expect(speedHistoryBaseline([])).toEqual({ count: 0, average: null, pb: null });
  });

  it("converts canonical mph and km/h accurately and rejects invalid shots", () => {
    expect(fromMph(100, "km/h")).toBeCloseTo(160.9344);
    expect(toMph(160.9344, "km/h")).toBeCloseTo(100);
    expect(validShot({ ballSpeed: 150.5 })).toBe(true);
    for (const ballSpeed of [0, -1, 251, Number.NaN]) expect(validShot({ ballSpeed })).toBe(false);
  });

  it("freezes the baseline and saves one result after exactly three shots", () => {
    let state = emptyCourse();
    state = reduceCourse(state, {
      type: "start",
      id: "test",
      at: 1,
      baselineAverage: 145,
      baselinePb: 160,
    });
    for (let index = 0; index < 3; index += 1) {
      state = reduceCourse(state, { type: "score", shot: { ballSpeed: 150 + index } });
      state = reduceCourse(state, { type: "next", at: 10 + index });
    }
    expect(state.active).toBeNull();
    expect(state.history).toHaveLength(1);
    expect(state.history[0]).toMatchObject({
      baselineAverage: 145,
      baselinePb: 160,
      status: "full",
    });
    expect(reduceCourse(state, { type: "next", at: 99 })).toBe(state);
  });
});
