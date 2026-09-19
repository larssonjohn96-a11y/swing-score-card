import {
  totalPutts,
  reviewRound,
  puttStats,
  puttsLabel,
  roundPuttCategory,
  STAR_STEPS,
  starLevel,
} from "./putt-course";
import { describe, it, expect } from "vitest";
import {
  COURSE_DISTANCES,
  emptyCourse,
  reduceCourse,
  holeStars,
  maxStars,
  roundStars,
  parseCourse,
  puttAverage,
  puttGoal,
  courseHandicap,
  type CourseRound,
} from "./putt-course";
const round = (id: string, putts = 2, finishedAt = 1): CourseRound => ({
  id,
  model: 1,
  startedAt: 0,
  finishedAt,
  status: "full",
  holes: COURSE_DISTANCES.map(() => [putts]),
});
describe("Puttrundan fixed course", () => {
  it("awards exactly 16 for six one-putts with 2 stars on short holes", () => {
    expect(COURSE_DISTANCES).toEqual([2, 8, 4, 10, 3, 12]);
    expect(COURSE_DISTANCES.map((_, i) => maxStars(i))).toEqual([2, 3, 3, 3, 2, 3]);
    expect(roundStars(round("perfect", 1))).toBe(16);
  });
  it("awards two-putts one star below 8m and two above; 3+ zero", () => {
    expect(COURSE_DISTANCES.map((_, i) => holeStars([2], i))).toEqual([1, 2, 1, 2, 1, 2]);
    for (let i = 0; i < 6; i++) {
      expect(holeStars([3], i)).toBe(0);
      expect(holeStars([4], i)).toBe(0);
      expect(holeStars([], i)).toBe(0);
    }
  });
  it("plays six holes with a halfway pause, blocks duplicate entry, supports undo, saves once", () => {
    let s = reduceCourse(emptyCourse(), { type: "start", id: "a", at: 1 });
    for (let i = 0; i < 6; i++) {
      s = reduceCourse(s, { type: "score", putts: 1 });
      expect(reduceCourse(s, { type: "score", putts: 2 })).toBe(s);
      if (i === 0) {
        s = reduceCourse(s, { type: "undo" });
        expect(s.active?.holes[0]).toEqual([]);
        s = reduceCourse(s, { type: "score", putts: 1 });
      }
      s = reduceCourse(s, { type: "next", at: 2 + i });
      if (i === 2) {
        expect(s.active?.phase).toBe("halfway");
        s = reduceCourse(s, { type: "continue" });
      }
    }
    expect(s.active).toBeNull();
    expect(roundStars(s.history[0])).toBe(16);
    expect(reduceCourse(s, { type: "finish", at: 9 }).history).toHaveLength(1);
  });
  it("keeps partial rounds out of averages and only uses latest five full rounds", () => {
    const history = [
      round("old", 1, 0),
      ...Array.from({ length: 5 }, (_, i) => round(`r${i}`, 2, i + 1)),
      { ...round("half", 1, 99), status: "front" as const, holes: [[1], [1], [1]] },
    ];
    expect(puttAverage(history)).toEqual({ count: 5, stars: 9, points: 9 });
  });
  it("rejects corrupt scores and chip data, restores completed hole without rescoring", () => {
    const s = reduceCourse(reduceCourse(emptyCourse(), { type: "start", id: "x", at: 0 }), {
      type: "score",
      putts: 2,
    });
    expect(parseCourse(JSON.stringify(s))).toEqual(s);
    expect(
      parseCourse(
        JSON.stringify({
          version: 1,
          history: [
            { ...round("bad"), holes: [[0]] },
            { ...round("chip"), model: 4 },
          ],
        }),
      ).history,
    ).toEqual([]);
    expect(reduceCourse(s, { type: "score", putts: 0 })).toBe(s);
  });
  it("shows average pressure only after four holes and if achievable", () => {
    const a = {
      id: "live",
      model: 1 as const,
      startedAt: 3,
      phase: "play" as const,
      holes: [[2], [2], [2], []],
    };
    expect(puttGoal(a, [round("old")], true)).toBeNull();
    expect(puttGoal({ ...a, holes: [[2], [2], [2], [2], []] }, [round("old")], true)?.need).toBe(4);
    expect(puttGoal({ ...a, holes: [[3], [3], [3], [3], []] }, [round("old", 1)], true)).toBeNull();
  });
  it("uses distance-aware existing putting HCP model and requires three holes", () => {
    expect(courseHandicap(round("full"))).not.toBeNull();
    expect(courseHandicap({ ...round("short"), holes: [[1]] })).toBeNull();
    expect(courseHandicap(round("one", 1))!).toBeLessThan(courseHandicap(round("three", 3))!);
  });
});

describe("putt totals and updated analysis", () => {
  it("keeps all putts, including more than four, through save and reload", () => {
    let s = reduceCourse(emptyCourse(), { type: "start", id: "counts", at: 1 });
    for (const putts of [3, 1, 2, 1, 5, 1]) {
      s = reduceCourse(s, { type: "score", putts });
      s = reduceCourse(s, { type: "next", at: 2 });
      if (s.active?.phase === "halfway") s = reduceCourse(s, { type: "continue" });
    }
    const saved = parseCourse(JSON.stringify(s)).history[0];
    expect(saved.model).toBe(2);
    expect(totalPutts(saved)).toBe(13);
    expect(reviewRound(saved).rows).toHaveLength(6);
    expect(puttStats([saved]).best).toBe(13);
  });
  it("excludes capped legacy totals and partial rounds from putt records and mean", () => {
    expect(puttsLabel(round("old", 4))).toBe("≥ 24");
    expect(puttStats([round("old", 4)])).toEqual({ count: 0, best: null, average: null });
    const exact = { ...round("new", 4), model: 2 as const };
    expect(
      puttStats([exact, round("better", 2), { ...round("half", 1), status: "front" as const }]),
    ).toEqual({ count: 2, best: 12, average: 18 });
  });
  it("classifies costly short putts as Stort tapp and long three-putts as Svagt", () => {
    for (const d of [2, 3]) expect(roundPuttCategory(d, 3, -1).label).toBe("Stort tapp");
    for (const d of [4, 8, 10, 12]) {
      expect(roundPuttCategory(d, 3, -1).label).toBe("Svagt");
      expect(roundPuttCategory(d, 4, -1).label).toBe("Stort tapp");
      expect(roundPuttCategory(d, 7, -1).label).toBe("Stort tapp");
    }
  });
  it("has six milestones and only advances after crossing a new threshold", () => {
    expect(STAR_STEPS).toEqual([3, 6, 9, 11, 13, 16]);
    expect(starLevel(10)).toBe(starLevel(9));
    expect(starLevel(11)).toBe(4);
    expect(starLevel(16)).toBe(6);
  });
  it("lower putt totals are better and latest five are used", () => {
    const history = Array.from({ length: 6 }, (_, i) => ({
      ...round(String(i), i === 0 ? 1 : 2, i),
      model: 2 as const,
    }));
    expect(puttStats(history)).toEqual({ count: 5, average: 12, best: 6 });
  });
});
