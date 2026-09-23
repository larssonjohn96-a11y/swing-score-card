import { describe, expect, it } from "vitest";
import {
  advanceBracket,
  bracketRound,
  completeFixture,
  createCompetition,
  fixtureAllowance,
  fixtureMargin,
  groupRanking,
  leagueFixtures,
  parseCompetition,
  standings,
  type Competition,
} from "./course-tournament";
const players = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ name: `Spelare ${i + 1}`, strokes: 0 }));
const create = (n = 6, system: "league" | "bracket" = "bracket") =>
  createCompetition("tournament", system, "match", 3, players(n), () => 0.5);
function winAll(c: Competition): Competition {
  for (const f of c.rounds.at(-1)!.filter((f) => !f.done)) {
    c = {
      ...c,
      rounds: c.rounds.map((r) =>
        r.map((m) =>
          m.id === f.id
            ? { ...m, scores: Array.from({ length: c.holes }, () => [3, 4] as [number, number]) }
            : m,
        ),
      ),
    };
    c = completeFixture(c, f.id);
  }
  return c;
}
describe("course competitions", () => {
  it("schedules every pair exactly once for 3–16 players", () => {
    for (let n = 3; n <= 16; n++) {
      const fs = leagueFixtures(players(n).map((_, i) => i));
      expect(fs).toHaveLength((n * (n - 1)) / 2);
      expect(new Set(fs.map((f) => [f.a, f.b].sort((a, b) => a! - b!).join("-"))).size).toBe(
        fs.length,
      );
      for (let id = 0; id < n; id++)
        expect(fs.filter((f) => f.a === id || f.b === id)).toHaveLength(n - 1);
    }
  });
  it("places each entrant once and distributes byes for every field size", () => {
    for (let n = 3; n <= 16; n++) {
      const fs = bracketRound(players(n).map((_, i) => i));
      expect(fs.flatMap((f) => (f.b === null ? [f.a] : [f.a, f.b])).sort((a, b) => a - b)).toEqual(
        players(n).map((_, i) => i),
      );
      expect(fs.filter((f) => f.b === null).every((f) => f.done && f.winner === f.a)).toBe(true);
    }
  });
  it("finishes every bracket with one champion and n-1 played matches", () => {
    for (let n = 3; n <= 16; n++) {
      let c = create(n);
      while (!c.finished) {
        c = winAll(c);
        c = advanceBracket(c);
      }
      expect(c.rounds.flat().filter((f) => f.b !== null)).toHaveLength(n - 1);
      expect(c.rounds.at(-1)![0].winner).not.toBeNull();
    }
  });
  it("requires actual sudden-death winner for tied knockout matches", () => {
    let c = create(4);
    const f = c.rounds[0][0];
    c.rounds[0][0] = {
      ...f,
      scores: [
        [3, 3],
        [3, 3],
        [3, 3],
      ],
    };
    expect(() => completeFixture(c, f.id)).toThrow();
    expect(() => completeFixture(c, f.id, 99)).toThrow();
    expect(completeFixture(c, f.id, f.b!).rounds[0][0].winner).toBe(f.b);
  });
  it("allows league draws and awards one point to each", () => {
    const c = create(3, "league");
    const f = c.league[0];
    c.league[0] = {
      ...f,
      scores: [
        [3, 3],
        [3, 3],
        [3, 3],
      ],
    };
    const next = completeFixture(c, f.id);
    expect(standings(next).filter((r) => r.points === 1)).toHaveLength(2);
    expect(next.league[0].winner).toBeNull();
  });
  it("qualifies top four seeded 1v4 and 2v3; three entrants get a final", () => {
    for (const n of [3, 4, 6, 16]) {
      let c = create(n, "league");
      c.league = c.league.map((f) => ({ ...f, done: true, winner: f.a, margin: 1 }));
      const order = standings(c).map((r) => r.id);
      c = advanceBracket(c);
      expect(c.rounds[0][0].a).toBe(order[0]);
      expect(c.rounds[0][0].b).toBe(order[n === 3 ? 1 : 3]);
      if (n > 3) expect([c.rounds[0][1].a, c.rounds[0][1].b]).toEqual([order[1], order[2]]);
    }
  });
  it("blocks advancing incomplete rounds and leagues", () => {
    expect(() => advanceBracket(create())).toThrow();
    expect(() => advanceBracket(create(6, "league"))).toThrow();
  });
  it("normalizes match extras to the difference and spreads from hole one", () => {
    const c = create();
    c.holes = 6;
    const f = c.rounds[0].find((f) => f.b !== null)!;
    c.players[f.a].strokes = 5;
    c.players[f.b!].strokes = 2;
    expect(fixtureAllowance(c, f)).toEqual({ a: [1, 0, 1, 0, 1, 0], b: [0, 0, 0, 0, 0, 0] });
    f.scores = Array(6).fill([4, 4]);
    expect(fixtureMargin(c, f)).toBe(3);
    c.format = "stroke";
    expect(fixtureMargin(c, f)).toBe(3);
  });
  it("ranks six players by net strokes while preserving gross scores", () => {
    const c = createCompetition("group", "bracket", "stroke", 1, players(6));
    c.players[5].strokes = 2;
    c.groupScores = [[4, 5, 6, 7, 8, 5]];
    expect(groupRanking(c)[0]).toEqual({ id: 5, gross: 5, net: 3 });
  });
  it("restores the exact draw, results and an in-progress edit", () => {
    let c = winAll(create(7));
    c = advanceBracket(c);
    c.players[1].userId = "saved-friend-id";
    c.editing = true;
    c.activeId = c.rounds.at(-1)![0].id;
    c.draft[0] = 7;
    expect(parseCompetition(JSON.stringify(c))).toEqual(c);
    expect(parseCompetition(null)).toBeNull();
    expect(() => parseCompetition(JSON.stringify({ ...c, seed: [0, 0] }))).toThrow();
  });
  it("restores a pending hole result without adding another score", () => {
    const c = create(4);
    c.activeId = c.rounds[0][0].id;
    c.rounds[0][0].scores = [[3, 4]];
    c.awaitingNext = true;
    const restored = parseCompetition(JSON.stringify(c))!;
    expect(restored.awaitingNext).toBe(true);
    expect(restored.rounds[0][0].scores).toEqual([[3, 4]]);
  });

});
