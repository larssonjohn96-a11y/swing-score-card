import { describe, expect, it } from "vitest";
import { LEVEL_GAMES, LEVEL_GAME_ORDER, LEVELS, buildRound, earnedLevel, passesConditions, progressFrom, targetsFor, type Attempt, type LevelGameRound } from "./level-games";

const att = (ts: number[], outs: number[]): Attempt[] => ts.map((target, i) => ({ target, outcome: outs[i], outcomeLabel: "x" }));

describe("level game definitions", () => {
  it("has exactly five games with fixed attempt counts and distances", () => {
    expect(LEVEL_GAME_ORDER).toEqual(["kortputt", "langputt", "chipping", "bunker", "inspel"]);
    const counts = { kortputt: 9, langputt: 6, chipping: 9, bunker: 6, inspel: 9 };
    for (const id of LEVEL_GAME_ORDER) {
      const g = LEVEL_GAMES[id];
      expect(g.placementTargets).toHaveLength(counts[id]);
      for (const l of LEVELS) expect(g.levels[l].targets).toHaveLength(counts[id]);
    }
    for (const l of LEVELS) for (const d of LEVEL_GAMES.kortputt.levels[l].targets) expect(d >= 1 && d <= 5).toBe(true);
    expect(Math.min(...LEVEL_GAMES.langputt.placementTargets)).toBe(6);
    expect(LEVEL_GAMES.langputt.levels[5].targets.reduce((a, b) => a + b)).toBeGreaterThan(LEVEL_GAMES.langputt.levels[1].targets.reduce((a, b) => a + b));
    expect(new Set(LEVEL_GAMES.chipping.placementTargets).size).toBe(3);
    expect(LEVEL_GAMES.chipping.outcomes).toHaveLength(5);
    expect(LEVEL_GAMES.bunker.outcomes).toHaveLength(7);
    expect(LEVEL_GAMES.inspel.outcomes).toEqual(["≤3 m", "3–6 m", "6–10 m", ">10 m"]);
    expect(LEVEL_GAMES.inspel.placementTargets).toEqual([60, 60, 60, 90, 90, 90, 120, 120, 120]);
  });

  it("makes level 5 achievable with a perfect round and impossible with a poor one", () => {
    for (const id of LEVEL_GAME_ORDER) {
      const g = LEVEL_GAMES[id];
      for (const l of LEVELS) expect(passesConditions(g.levels[l].conditions, g.levels[l].targets.map(() => 0))).toBe(true);
      const worst = g.outcomes.length - 1;
      expect(passesConditions(g.levels[5].conditions, g.levels[5].targets.map(() => worst))).toBe(false);
    }
  });

  it("checks thresholds just below and at the requirement", () => {
    const k = LEVEL_GAMES.kortputt.levels[1].conditions;
    expect(passesConditions(k, [0, 0, 0, 0, 0, 0, 1, 1, 1])).toBe(true);
    expect(passesConditions(k, [0, 0, 0, 0, 0, 1, 1, 1, 1])).toBe(false);
    const lp = LEVEL_GAMES.langputt.levels[4].conditions;
    expect(passesConditions(lp, [1, 1, 1, 1, 1, 1])).toBe(true);
    expect(passesConditions(lp, [0, 1, 1, 1, 1, 2])).toBe(false);
    const b = LEVEL_GAMES.bunker;
    expect(earnedLevel(b, [5, 5, 5, 5, 5, 6], false)).toBe(1);
    expect(earnedLevel(b, [3, 3, 3, 3, 4, 4], false)).toBe(3);
  });

  it("placement compares against all levels, is preliminary and never clears a level", () => {
    const g = LEVEL_GAMES.kortputt;
    const r = buildRound(g, { kind: "placement" }, att(g.placementTargets, [0, 0, 0, 0, 0, 1, 1, 1, 1]), [], "p1", "2026-01-01");
    expect(r.earnedLevel).toBe(3);
    expect(r.recommendedLevel).toBe(4);
    expect(r.passed).toBe(false);
    expect(r.activityType).toBe("game");
    expect(r.hcpEligible).toBe(false);
    const p = progressFrom(g, [r]);
    expect(p.cleared).toEqual([]);
    expect(p.recommended).toBe(4);
  });

  it("only clears level 5 by meeting its real requirement, and stores results separately per game", () => {
    const g = LEVEL_GAMES.bunker;
    const history: LevelGameRound[] = [];
    const fail = buildRound(g, { kind: "level", level: 5 }, att(g.levels[5].targets, [3, 3, 3, 3, 3, 3]), history, "a", "d");
    expect(fail.passed).toBe(false);
    expect(progressFrom(g, [fail]).cleared).toEqual([]);
    const ok = buildRound(g, { kind: "level", level: 5, variant: "varied-lies" }, att(g.levels[5].targets, [1, 1, 1, 2, 2, 3]), [fail], "b", "d");
    expect(ok.passed).toBe(true);
    expect(targetsFor(g, { kind: "level", level: 5 }).every(t => !t.lie)).toBe(true);
    expect(progressFrom(LEVEL_GAMES.inspel, [fail, ok]).rounds).toHaveLength(0);
  });
});
