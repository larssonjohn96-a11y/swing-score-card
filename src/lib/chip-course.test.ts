import { describe, it, expect } from "vitest";
import {
  COURSE_DISTANCES,
  courseDistances,
  courseHandicap,
  liveStars,
  beatsScore,
  courseRecord,
  courseStorageKey,
  emptyCourse,
  holeStars,
  holeTargets,
  parseCourse,
  reduceCourse,
  roundStars,
  segmentScore,
  type CourseState,
} from "./chip-course";
import type { ChipPoints } from "./chip-stations";
const start = (state = emptyCourse(), id = "round-1") =>
  reduceCourse(state, { type: "start", id, at: 100 });
const scoreHole = (state: CourseState, points: ChipPoints[] = [3, 3, 3]) =>
  points.reduce((s, p) => reduceCourse(s, { type: "score", points: p }), state);
const next = (state: CourseState) => reduceCourse(state, { type: "next", at: 200 });
function front(state = start(), points: ChipPoints[] = [3, 3, 3]) {
  for (let i = 0; i < 3; i++) state = next(scoreHole(state, points));
  return state;
}
function full(state = front(), points: ChipPoints[] = [3, 3, 3]) {
  state = reduceCourse(state, { type: "continue" });
  for (let i = 0; i < 3; i++) state = next(scoreHole(state, points));
  return reduceCourse(state, { type: "save", at: 300 });
}

describe("six-hole course flow", () => {
  it("always starts at 8m and follows exactly 8,12,16,10,14,18 without locks", () => {
    let p = start();
    const played: number[] = [];
    for (let i = 0; i < 6; i++) {
      played.push(COURSE_DISTANCES[p.active!.holes.length - 1]);
      p = next(scoreHole(p, [0, 0, 0]));
      if (i === 2) {
        expect(p.active?.phase).toBe("halfway");
        p = reduceCourse(p, { type: "continue" });
      }
    }
    expect(played).toEqual([8, 12, 16, 10, 14, 18]);
    expect(p.active?.phase).toBe("bonus");
    p = reduceCourse(p, { type: "save", at: 300 });
    expect(p.active).toBeNull();
    expect(p.history[0].status).toBe("full");
    expect(roundStars(p.history[0])).toBe(0);
    p = start(p, "round-2");
    expect(p.active?.holes).toEqual([[]]);
  });
  it("cannot skip a hole or change lie during a round", () => {
    const p = start();
    expect(next(p)).toBe(p);
    expect(reduceCourse(p, { type: "continue" })).toBe(p);
    expect(reduceCourse(p, { type: "lie", lie: "Ruff" })).toBe(p);
    expect(reduceCourse(p, { type: "start", id: "replacement", at: 2 })).toBe(p);
  });
  it("records only three balls and ignores a fourth or invalid values", () => {
    const p = scoreHole(start());
    expect(p.active?.phase).toBe("result");
    expect(reduceCourse(p, { type: "score", points: 4 })).toBe(p);
    for (const points of [-1, 5, NaN, 1.2]) {
      const draft = start();
      expect(reduceCourse(draft, { type: "score", points: points as ChipPoints })).toBe(draft);
    }
  });
  it("stops at halfway after nine balls and offers a valid completed front round", () => {
    let p = front();
    expect(p.active?.phase).toBe("halfway");
    expect(p.active?.holes.flat()).toHaveLength(9);
    expect(p.history).toHaveLength(0);
    expect(next(p)).toBe(p);
    p = reduceCourse(p, { type: "finish", at: 300 });
    expect(p.active?.phase).toBe("bonus");
    p = reduceCourse(p, { type: "save", at: 300 });
    expect(p.history).toHaveLength(1);
    expect(p.history[0].status).toBe("front");
    expect(p.active).toBeNull();
    expect(courseRecord(p.history, "Fairway", "front")).not.toBeNull();
    expect(courseRecord(p.history, "Fairway", "full")).toBeNull();
    expect(courseRecord(p.history, "Fairway", "back")).toBeNull();
  });
  it("continues to 10m and ends with eighteen shots, not a separate back round", () => {
    let p = reduceCourse(front(), { type: "continue" });
    expect(p.active?.holes).toHaveLength(4);
    expect(p.active?.holes.at(-1)).toEqual([]);
    for (let i = 0; i < 3; i++) p = next(scoreHole(p));
    p = reduceCourse(p, { type: "save", at: 300 });
    expect(p.history).toHaveLength(1);
    expect(p.history[0].holes.flat()).toHaveLength(18);
    expect(segmentScore(p.history[0], "back")).not.toBeNull();
    expect(reduceCourse(p, { type: "finish", at: 999 })).toBe(p);
  });
  it("allows correction before advancing without duplicated holes or stale stars", () => {
    let p = scoreHole(start(), [4, 4, 4]);
    expect(roundStars(p.active!)).toBe(3);
    p = reduceCourse(p, { type: "undo" });
    expect(roundStars(p.active!)).toBe(0);
    expect(p.active?.holes[0]).toEqual([4, 4]);
    p = reduceCourse(p, { type: "score", points: 0 });
    expect(p.active?.holes).toEqual([[4, 4, 0]]);
    expect(roundStars(p.active!)).toBe(2);
  });
  it("discards incomplete holes when ending early and excludes partial segments from records", () => {
    let p = next(scoreHole(start()));
    p = reduceCourse(p, { type: "score", points: 4 });
    p = reduceCourse(p, { type: "finish", at: 300 });
    expect(p.active?.phase).toBe("bonus");
    p = reduceCourse(p, { type: "save", at: 300 });
    expect(p.history[0].holes).toHaveLength(1);
    expect(p.history[0].status).toBe("partial");
    expect(courseRecord(p.history, "Fairway", "front")).toBeNull();
    expect(reduceCourse(start(), { type: "finish", at: 300 }).history).toEqual([]);
  });
});
describe("stars and comparable records", () => {
  it("awards up to three stars per hole and eighteen for a full round", () => {
    const p = full(front(start(), [4, 4, 4]), [4, 4, 4]);
    expect(roundStars(p.history[0])).toBe(18);
    expect(segmentScore(p.history[0], "front")).toEqual({ stars: 9, points: 36 });
    expect(segmentScore(p.history[0], "back")).toEqual({ stars: 9, points: 36 });
    for (let i = 0; i < 6; i++)
      for (const lie of ["Fairway", "Ruff"] as const) {
        const t = holeTargets(i, lie);
        expect(t).toHaveLength(3);
        expect(t[0]).toBeLessThan(t[1]);
        expect(t[1]).toBeLessThan(t[2]);
        expect(t[2]).toBeLessThanOrEqual(12);
      }
  });
  it("resets stars for every round while retaining previous course records", () => {
    let p = full(front(start(), [4, 4, 4]), [4, 4, 4]);
    p = start(p, "new");
    expect(roundStars(p.active!)).toBe(0);
    expect(courseRecord(p.history, "Fairway", "full")?.stars).toBe(18);
  });
  it("uses points to break equal-star ties, never announces a tie as a record", () => {
    expect(beatsScore({ stars: 5, points: 18 }, { stars: 5, points: 17 })).toBe(true);
    expect(beatsScore({ stars: 5, points: 17 }, { stars: 5, points: 17 })).toBe(false);
    expect(beatsScore({ stars: 4, points: 36 }, { stars: 5, points: 17 })).toBe(false);
  });
  it("compares the same underlay and same segment only", () => {
    const p = full();
    expect(courseRecord(p.history, "Ruff", "full")).toBeNull();
    const r = p.history[0];
    expect(segmentScore(r, "full")?.stars).toBe(
      segmentScore(r, "front")!.stars + segmentScore(r, "back")!.stars,
    );
  });
  it("uses hole-relative thresholds on back three, not front-three thresholds", () => {
    const r = full().history[0];
    const expected = r.holes.slice(3).reduce((n, h, i) => n + holeStars(h, i + 3, r.lie), 0);
    expect(segmentScore(r, "back")?.stars).toBe(expected);
  });
});
describe("pause, persistence and data isolation", () => {
  it("restores partial entry, result, halfway, back and completed history", () => {
    const stages = [
      reduceCourse(start(), { type: "score", points: 2 }),
      scoreHole(start()),
      front(),
      reduceCourse(front(), { type: "continue" }),
      full(),
    ];
    for (const state of stages) expect(parseCourse(JSON.stringify(state))).toEqual(state);
  });
  it("does not convert legacy station records into fixed-course high scores", () => {
    expect(
      parseCourse(JSON.stringify({ version: 1, rounds: [{ distance: 8, shots: [4, 4, 4] }] })),
    ).toEqual(emptyCourse());
    expect(courseStorageKey(null)).not.toBe(courseStorageKey("user"));
  });
  it("deduplicates finished rounds and refuses active rounds already in history", () => {
    const p = full();
    const parsed = parseCourse(
      JSON.stringify({
        ...p,
        history: [...p.history, ...p.history],
        active: { id: p.history[0].id, lie: "Fairway", startedAt: 100, holes: [[]], phase: "play" },
      }),
    );
    expect(parsed.history).toHaveLength(1);
    expect(parsed.active).toBeNull();
    expect(start(p, p.history[0].id)).toBe(p);
  });
  it("rejects malformed history and incomplete middle holes", () => {
    const p = full();
    p.history.push({ ...p.history[0], id: "bad", holes: [[4], [4, 4, 4]] });
    expect(parseCourse(JSON.stringify(p)).history).toHaveLength(1);
    expect(parseCourse("{bad")).toEqual(emptyCourse());
  });
});

describe("live stars, bonus and round HCP", () => {
  it("fills stars continuously with one whole star at three points", () => {
    expect(liveStars(2)).toEqual([2 / 3, 0, 0]);
    expect(liveStars(3)).toEqual([1, 0, 0]);
    expect(liveStars(5)).toEqual([1, 2 / 3, 0]);
    expect(liveStars(9)).toEqual([1, 1, 1]);
    expect(liveStars(12)).toEqual([1, 1, 1]);
    expect(holeStars([1, 1, 1], 0, "Fairway")).toBe(1);
    expect(holeStars([2, 2, 2], 2, "Ruff")).toBe(2);
    expect(holeStars([3, 3, 3], 5, "Fairway")).toBe(3);
  });
  it("stores one bonus independently after stopping at halfway", () => {
    const p = reduceCourse(front(), { type: "finish", at: 300 });
    expect(p.active?.phase).toBe("bonus");
    const restored = parseCourse(JSON.stringify(p));
    expect(restored).toEqual(p);
    const saved = reduceCourse(restored, {
      type: "save",
      at: 400,
      bonus: { leave: 0.8, holed: false },
    });
    expect(saved.history[0].holes.flat()).toHaveLength(9);
    expect(saved.history[0].bonus).toEqual({ leave: 0.8, holed: false });
    expect(roundStars(saved.history[0])).toBe(9);
    expect(reduceCourse(saved, { type: "save", at: 401, bonus: { leave: 0, holed: true } })).toBe(
      saved,
    );
  });
  it("rejects malformed bonus distances and bypassing bonus phase", () => {
    const draft = start();
    expect(reduceCourse(draft, { type: "save", at: 200 })).toBe(draft);
    const p = reduceCourse(front(), { type: "finish", at: 300 });
    for (const bonus of [
      { leave: -1, holed: false },
      { leave: NaN, holed: false },
      { leave: 1, holed: true },
      { leave: 0, holed: false },
    ])
      expect(reduceCourse(p, { type: "save", at: 400, bonus })).toBe(p);
    const saved = reduceCourse(p, { type: "save", at: 400, bonus: { leave: 0, holed: true } });
    expect(parseCourse(JSON.stringify(saved))).toEqual(saved);
  });
  it("estimates HCP from shots rather than stars and excludes bonus", () => {
    const good = full().history[0],
      bad = full(front(start(), [0, 0, 0]), [0, 0, 0]).history[0];
    expect(courseHandicap(good)).toBeLessThan(courseHandicap(bad)!);
    expect(courseHandicap({ ...good, bonus: { leave: 0, holed: true } } as typeof good)).toBe(
      courseHandicap(good),
    );
    expect(courseHandicap({ ...good, holes: [[]] })).toBeNull();
    expect(courseHandicap({ ...good, holes: [...good.holes, [4]] })).toBe(courseHandicap(good));
  });
  it("preserves old distances and stars without mixing course records", () => {
    const record = { ...full().history[0], model: 1 as const };
    const p = parseCourse(JSON.stringify({ ...emptyCourse(), history: [record] }));
    expect(courseDistances(record.model)).toEqual([8, 10, 12, 14, 16, 20]);
    expect(roundStars(p.history[0])).toBe(11);
    expect(courseRecord(p.history, "Fairway", "full")).toBeNull();
    expect(courseRecord(p.history, "Fairway", "full", 1)?.stars).toBe(11);
  });
});
