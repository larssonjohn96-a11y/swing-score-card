import { describe, expect, it } from "vitest";
import {
  completeTotal,
  courseKey,
  emptyShortCourses,
  holeWinner,
  matchStatus,
  parseShortCourses,
  personalBest,
  shortBotScores,
  validCourse,
  type ShortCourse,
  type ShortRound,
} from "./short-course";
const course: ShortCourse = {
  id: "c",
  name: "Par 3",
  holes: Array.from({ length: 6 }, () => ({ par: 3, metres: 100 })),
};
const round = (scores = Array.from({ length: 6 }, () => ({ you: 3, other: 4 }))): ShortRound => ({
  id: "r",
  course,
  mode: "friend",
  format: "stroke",
  names: ["John", "Fredrik"],
  botLevel: 1,
  botScores: [],
  scores,
  started: "2026-09-23",
  finished: "2026-09-23",
});
describe("short course scores and persistence", () => {
  it("allows par-three courses and validates hole settings", () => {
    expect(validCourse(course)).toBe(true);
    expect(validCourse({ ...course, name: " " })).toBe(false);
    expect(validCourse({ ...course, holes: [{ par: 3, metres: 0 }] })).toBe(false);
  });
  it("only recognizes full holed-out totals", () => {
    expect(completeTotal(round())).toBe(18);
    expect(completeTotal(round(), "other")).toBe(24);
    expect(completeTotal(round([{ you: 3, other: 4 }]))).toBeNull();
    const r = round();
    r.scores[0].you = null;
    expect(completeTotal(r)).toBeNull();
  });
  it("keeps records specific to the saved layout and player", () => {
    const best = round();
    const worse = {
      ...round(),
      id: "w",
      scores: Array.from({ length: 6 }, () => ({ you: 5, other: 1 })),
    };
    expect(personalBest([worse, best], course)?.id).toBe("r");
    expect(personalBest([best], { ...course, id: "other" })).toBeNull();
    expect(courseKey(course)).not.toBe(courseKey({ ...course, holes: [{ par: 4, metres: 100 }] }));
  });
  it("does not award records for unfinished or conceded rounds", () => {
    const r = round();
    r.scores[0].you = null;
    expect(personalBest([r], course)).toBeNull();
    expect(personalBest([{ ...round(), finished: undefined }], course)).toBeNull();
  });
  it("handles tied and conceded holes", () => {
    expect(holeWinner({ you: 3, other: 3 })).toBe("tie");
    expect(holeWinner({ you: null, other: 5 })).toBe("other");
    expect(holeWinner({ you: 5, other: null })).toBe("you");
    expect(holeWinner({ you: null, other: null })).toBe("tie");
  });
  it("recognizes an early match win but allows all holes to count", () => {
    const r = round(Array.from({ length: 4 }, () => ({ you: 3, other: 4 })));
    r.format = "match";
    expect(matchStatus(r)).toMatchObject({ diff: 4, left: 2, decided: true, leader: "John" });
    expect(completeTotal(r)).toBeNull();
    r.scores.push({ you: 3, other: 4 }, { you: 3, other: 4 });
    expect(completeTotal(r)).toBe(18);
  });
  it("keeps a tied match tied", () =>
    expect(
      matchStatus(round(Array.from({ length: 6 }, () => ({ you: 3, other: 3 })))),
    ).toMatchObject({ diff: 0, left: 0, leader: null }));
  it("round-trips paused scores and saved courses", () => {
    const active = { ...round([{ you: 2, other: 4 }]), finished: undefined };
    const store = { courses: [course], history: [round()], active };
    expect(parseShortCourses(JSON.stringify(store))).toEqual(store);
    expect(parseShortCourses(null)).toEqual(emptyShortCourses());
  });
  it("rejects corrupted saved state", () => {
    expect(() => parseShortCourses('{"courses":[]}')).toThrow();
    expect(() =>
      parseShortCourses(JSON.stringify({ ...emptyShortCourses(), courses: [{ name: "bad" }] })),
    ).toThrow();
  });
  it("simulates fixed bot results from hole properties and difficulty", () => {
    const easy = shortBotScores(course, 0, () => 0.6);
    const hard = shortBotScores(course, 2, () => 0.6);
    expect(easy).toHaveLength(6);
    expect(easy.every((n, i) => n > hard[i])).toBe(true);
    expect(shortBotScores(course, 1, () => 0).every((n) => n >= 1)).toBe(true);
  });
});
