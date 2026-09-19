import { describe, it, expect } from "vitest";
import {
  BUNKER_ZONES,
  emptyCourse,
  reduceCourse,
  parseCourse,
  holeStars,
  roundStars,
  roundPoints,
  bunkerAverage,
  bunkerBests,
  bunkerGoal,
  courseHandicap,
  starLevel,
  type CourseRound,
} from "./bunker-course";
const round = (id: string, points = 1, finishedAt = 1): CourseRound => ({
  id,
  model: 1,
  startedAt: 0,
  finishedAt,
  status: "full",
  holes: [
    [points, points, points],
    [points, points, points],
  ],
});
describe("Bunkerrundan", () => {
  it("awards 4/3/2/1/0 with zero outside green and fills continuously", () => {
    expect(BUNKER_ZONES.map((z) => z.points)).toEqual([4, 3, 2, 1, 0]);
    expect(holeStars([1])).toBeCloseTo(1 / 3);
    expect(holeStars([1, 1, 1])).toBe(1);
    expect(holeStars([2, 2, 2])).toBe(2);
    expect(holeStars([3, 3, 3])).toBe(3);
    expect(holeStars([4, 4, 4])).toBe(3);
    expect(holeStars([0, 0, 0])).toBe(0);
    expect(roundStars(round("perfect", 4))).toBe(6);
    expect(roundPoints(round("perfect", 4))).toBe(24);
  });
  it("requires two sets of three balls, no halfway, and saves exactly once", () => {
    let s = reduceCourse(emptyCourse(), { type: "start", id: "game", at: 1 });
    for (let i = 0; i < 6; i++) {
      s = reduceCourse(s, { type: "score", points: 3 });
      if (i % 3 === 2) {
        expect(s.active?.phase).toBe("result");
        expect(reduceCourse(s, { type: "score", points: 4 })).toBe(s);
        s = reduceCourse(s, { type: "next", at: i + 2 });
      } else expect(reduceCourse(s, { type: "next", at: 2 })).toBe(s);
    }
    expect(s.active).toBeNull();
    expect(s.history[0].holes).toEqual([
      [3, 3, 3],
      [3, 3, 3],
    ]);
    expect(s.history[0].status).toBe("full");
    expect(reduceCourse(s, { type: "finish", at: 20 }).history).toHaveLength(1);
  });
  it("supports undo and preserves current ball on reload", () => {
    let s = reduceCourse(emptyCourse(), { type: "start", id: "r", at: 1 });
    for (const points of [1, 2, 3]) s = reduceCourse(s, { type: "score", points });
    s = reduceCourse(s, { type: "undo" });
    expect(s.active?.phase).toBe("play");
    expect(s.active?.holes).toEqual([[1, 2]]);
    expect(parseCourse(JSON.stringify(s))).toEqual(s);
  });
  it("keeps incomplete sets out of saved totals and partial rounds out of records", () => {
    let s = reduceCourse(emptyCourse(), { type: "start", id: "half", at: 1 });
    for (let i = 0; i < 3; i++) s = reduceCourse(s, { type: "score", points: 4 });
    s = reduceCourse(s, { type: "next", at: 2 });
    s = reduceCourse(s, { type: "score", points: 4 });
    s = reduceCourse(s, { type: "finish", at: 3 });
    expect(s.history[0].holes).toEqual([[4, 4, 4]]);
    expect(s.history[0].status).toBe("partial");
    expect(bunkerAverage(s.history).count).toBe(0);
    expect(bunkerBests(s.history).points).toBeNull();
  });
  it("uses latest five complete rounds for friend averages", () => {
    const history = [
      round("old", 4, 0),
      ...Array.from({ length: 5 }, (_, i) => round("r" + i, 2, i + 1)),
    ];
    expect(bunkerAverage(history)).toEqual({ count: 5, points: 12, stars: 4 });
    expect(bunkerBests(history)).toEqual({ points: 24, stars: 6 });
  });
  it("rejects invalid data and unrelated six-hole rounds", () => {
    const data = {
      version: 1,
      history: [
        {
          ...round("bad"),
          holes: [
            [0, 1, 5],
            [1, 2, 3],
          ],
        },
        { ...round("long"), holes: Array.from({ length: 6 }, () => [2]) },
        round("valid"),
        round("valid"),
      ],
    };
    expect(parseCourse(JSON.stringify(data)).history.map((r) => r.id)).toEqual(["valid"]);
    expect(parseCourse("{")).toEqual(emptyCourse());
  });
  it("only offers reachable goals and bases estimate on results, not invented start distances", () => {
    const a = {
      id: "live",
      model: 1 as const,
      startedAt: 1,
      phase: "play" as const,
      holes: [
        [1, 1, 1],
        [1, 1],
      ],
    };
    expect(bunkerGoal(a, [round("best", 4)])).toBeNull();
    expect(bunkerGoal(a, [round("best", 1)])).toContain("2 poäng");
    expect(courseHandicap({ holes: [[]] })).toBeNull();
    expect(courseHandicap(round("good", 3))!).toBeLessThan(courseHandicap(round("bad", 0))!);
    expect([1, 2, 3, 4, 5, 6].map(starLevel)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
