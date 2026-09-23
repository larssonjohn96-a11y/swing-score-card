import { describe, expect, it } from "vitest";
import {
  botScore,
  distributeStrokes,
  matchStatus,
  netHole,
  parseGame,
  totals,
  type CourseGame,
} from "./short-course";
const game = (changes: Partial<CourseGame> = {}): CourseGame => ({
  mode: "friend",
  format: "match",
  names: ["John", "Fredrik"],
  holes: 6,
  allowance: 3,
  recipient: "other",
  botLevel: 1,
  rolls: Array(6).fill(0.5),
  scores: [],
  draft: { you: 3, other: 3, length: 100 },
  ...changes,
});
describe("course game", () => {
  it("spreads strokes from hole one", () => {
    expect(distributeStrokes(6, 1)).toEqual([1, 0, 0, 0, 0, 0]);
    expect(distributeStrokes(6, 2)).toEqual([1, 0, 0, 1, 0, 0]);
    expect(distributeStrokes(6, 3)).toEqual([1, 0, 1, 0, 1, 0]);
    expect(distributeStrokes(6, 6)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(distributeStrokes(6, 9)).toEqual([2, 1, 2, 1, 2, 1]);
  });
  it("preserves every allowance for every supported hole count", () => {
    for (let holes = 1; holes <= 18; holes++)
      for (let strokes = 0; strokes <= 36; strokes++) {
        const split = distributeStrokes(holes, strokes);
        expect(split.reduce((a, b) => a + b, 0)).toBe(strokes);
        expect(Math.max(...split) - Math.min(...split)).toBeLessThanOrEqual(1);
      }
  });
  it("applies match strokes only to allocated holes and leaves actual strokes intact", () => {
    const s = { you: 3, other: 4, length: 100 };
    const g = game({ scores: [s, s] });
    expect(netHole(g, s, 0).other).toBe(3);
    expect(netHole(g, s, 1).other).toBe(4);
    expect(matchStatus(g).diff).toBe(1);
    expect(s.other).toBe(4);
  });
  it("applies stroke-play allowance once to either recipient", () => {
    const scores = Array(6).fill({ you: 4, other: 4, length: 100 });
    expect(totals(game({ scores, format: "stroke" }), true)).toEqual([24, 21]);
    expect(totals(game({ scores, recipient: "you" }), true)).toEqual([21, 24]);
    expect(totals(game({ scores }))).toEqual([24, 24]);
  });
  it("scratch ignores allowance and ties stay tied", () => {
    expect(
      matchStatus(game({ allowance: 0, scores: [{ you: 3, other: 3, length: 100 }] })).diff,
    ).toBe(0);
  });
  it("recognizes an early match win while retaining remaining holes", () => {
    const status = matchStatus(
      game({ allowance: 0, scores: Array(4).fill({ you: 3, other: 4, length: 100 }) }),
    );
    expect(status).toEqual({ diff: 4, left: 2, decided: true });
  });
  it("restores draft, scores and fixed bot rolls after interruption", () => {
    const g = game({
      mode: "bot",
      awaitingNext: true,
      scores: [{ you: 5, other: 3, length: 100 }],
      draft: { you: 6, other: 3, length: 500 },
    });
    expect(parseGame(JSON.stringify(g))).toEqual(g);
    expect(parseGame(null)).toBeNull();
  });
  it("rejects damaged saved state", () => {
    for (const patch of [
      { holes: 0 },
      { allowance: -1 },
      { rolls: [] },
      { scores: [{ you: null, other: 2, length: 100 }] },
      { botLevel: 99 },
    ])
      expect(() => parseGame(JSON.stringify({ ...game(), ...patch }))).toThrow();
  });
  it("keeps bot scoring stable and responds to hole length and difficulty", () => {
    expect(botScore(100, 1, 0.5)).toBe(3);
    expect(botScore(300, 1, 0.5)).toBe(4);
    expect(botScore(500, 1, 0.5)).toBe(5);
    expect(botScore(100, 0, 0.5)).toBeGreaterThan(botScore(100, 2, 0.5));
  });
});
