import { z } from "zod";
import { distributeStrokes } from "./short-course";
const playerSchema = z.object({
  name: z.string().trim().min(1).max(40),
  userId: z.string().optional(),
  strokes: z.number().int().min(0).max(36),
});
const fixtureSchema = z.object({
  id: z.string(),
  a: z.number().int().min(0),
  b: z.number().int().min(0).nullable(),
  scores: z.array(z.tuple([z.number().int().min(1).max(30), z.number().int().min(1).max(30)])),
  done: z.boolean(),
  winner: z.number().int().min(0).nullable(),
  margin: z.number(),
});
const competitionSchema = z.object({
  kind: z.enum(["group", "tournament"]),
  system: z.enum(["bracket", "league"]),
  format: z.enum(["stroke", "match"]),
  holes: z.number().int().min(1).max(18),
  players: z.array(playerSchema).min(2).max(16),
  seed: z.array(z.number().int().min(0)),
  league: z.array(fixtureSchema),
  rounds: z.array(z.array(fixtureSchema)),
  groupScores: z.array(z.array(z.number().int().min(1).max(30))),
  draft: z.array(z.number().int().min(1).max(30)),
  activeId: z.string().nullable(),
  finished: z.boolean(),
  editing: z.boolean().default(false),
});
export type Player = z.infer<typeof playerSchema>;
export type Fixture = z.infer<typeof fixtureSchema>;
export type Competition = z.infer<typeof competitionSchema>;
export function parseCompetition(raw: string | null): Competition | null {
  if (!raw) return null;
  const c = competitionSchema.parse(JSON.parse(raw));
  const n = c.players.length;
  if (
    c.seed.length !== n ||
    new Set(c.seed).size !== n ||
    c.seed.some((i) => i >= n) ||
    c.draft.length !== n ||
    c.groupScores.length > c.holes ||
    c.groupScores.some((s) => s.length !== n) ||
    c.rounds
      .flat()
      .concat(c.league)
      .some(
        (f) =>
          f.a >= n ||
          (f.b !== null && (f.b >= n || f.a === f.b)) ||
          (f.winner !== null && f.winner !== f.a && f.winner !== f.b) ||
          f.scores.length > c.holes,
      ) ||
    (c.activeId !== null &&
      !c.rounds
        .flat()
        .concat(c.league)
        .some((f) => f.id === c.activeId && !f.done))
  )
    throw new Error("Invalid competition");
  return c;
}
export function shuffle<T>(items: T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
const fixture = (id: string, a: number, b: number | null): Fixture => ({
  id,
  a,
  b,
  scores: [],
  done: b === null,
  winner: b === null ? a : null,
  margin: 0,
});
/** Circle schedule: every pair once, with a rest slot for odd fields. */
export function leagueFixtures(seed: number[]): Fixture[] {
  const ring: (number | null)[] = [...seed];
  if (ring.length % 2) ring.push(null);
  const result: Fixture[] = [];
  for (let r = 0; r < ring.length - 1; r++) {
    for (let i = 0; i < ring.length / 2; i++) {
      const a = ring[i],
        b = ring[ring.length - 1 - i];
      if (a !== null && b !== null) result.push(fixture(`league-${r}-${i}`, a, b));
    }
    ring.splice(1, 0, ring.pop()!);
  }
  return result;
}
/** Seed positions keep the top seeds apart and distribute byes. */
export function bracketRound(seed: number[], round = 0): Fixture[] {
  let size = 2;
  while (size < seed.length) size *= 2;
  let slots = [1, 2];
  while (slots.length < size) {
    const sum = slots.length * 2 + 1;
    slots = slots.flatMap((s) => [s, sum - s]);
  }
  const result: Fixture[] = [];
  for (let i = 0; i < slots.length; i += 2) {
    const a = seed[slots[i] - 1],
      b = seed[slots[i + 1] - 1];
    result.push(
      fixture(`bracket-${round}-${i / 2}`, a ?? b, a === undefined || b === undefined ? null : b),
    );
  }
  return result;
}
export function createCompetition(
  kind: Competition["kind"],
  system: Competition["system"],
  format: Competition["format"],
  holes: number,
  players: Player[],
  random = Math.random,
): Competition {
  const seed = shuffle(
    players.map((_, i) => i),
    random,
  );
  return {
    kind,
    system,
    format: kind === "group" ? "stroke" : format,
    holes,
    players,
    seed,
    league: kind === "tournament" && system === "league" ? leagueFixtures(seed) : [],
    rounds: kind === "tournament" && system === "bracket" ? [bracketRound(seed)] : [],
    groupScores: [],
    draft: players.map(() => 3),
    activeId: null,
    finished: false,
    editing: false,
  };
}
export function fixtureAllowance(c: Competition, f: Fixture) {
  const difference = c.players[f.a].strokes - c.players[f.b!].strokes;
  return {
    a: difference > 0 ? distributeStrokes(c.holes, difference) : Array(c.holes).fill(0),
    b: difference < 0 ? distributeStrokes(c.holes, -difference) : Array(c.holes).fill(0),
  };
}
export function fixtureMargin(c: Competition, f: Fixture) {
  const extra = fixtureAllowance(c, f);
  if (c.format === "match")
    return f.scores.reduce(
      (sum, s, i) => sum + Math.sign(s[1] - extra.b[i] - (s[0] - extra.a[i])),
      0,
    );
  const gross = f.scores.reduce((sum, s) => sum + s[1] - s[0], 0);
  return gross + c.players[f.a].strokes - c.players[f.b!].strokes;
}
export function standings(c: Competition) {
  const rows = c.seed.map((id) => ({ id, played: 0, points: 0, difference: 0 }));
  for (const f of c.league.filter((f) => f.done)) {
    const a = rows.find((r) => r.id === f.a)!,
      b = rows.find((r) => r.id === f.b)!;
    a.played++;
    b.played++;
    a.difference += f.margin;
    b.difference -= f.margin;
    if (f.winner === null) {
      a.points++;
      b.points++;
    } else if (f.winner === f.a) a.points += 2;
    else b.points += 2;
  }
  return rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.difference - a.difference ||
      c.seed.indexOf(a.id) - c.seed.indexOf(b.id),
  );
}
export function completeFixture(
  c: Competition,
  id: string,
  suddenDeathWinner?: number,
): Competition {
  const f = [...c.league, ...c.rounds.flat()].find((f) => f.id === id);
  if (!f || f.done || f.b === null || f.scores.length !== c.holes)
    throw new Error("Match is not ready");
  const margin = fixtureMargin(c, f);
  const playoff = id.startsWith("bracket");
  if (playoff && margin === 0 && suddenDeathWinner !== f.a && suddenDeathWinner !== f.b)
    throw new Error("Sudden death required");
  const winner = margin > 0 ? f.a : margin < 0 ? f.b : playoff ? suddenDeathWinner! : null;
  const replace = (m: Fixture) => (m.id === id ? { ...m, done: true, winner, margin } : m);
  return {
    ...c,
    league: c.league.map(replace),
    rounds: c.rounds.map((r) => r.map(replace)),
    activeId: null,
  };
}
export function advanceBracket(c: Competition): Competition {
  if (!c.rounds.length) {
    if (!c.league.length || !c.league.every((f) => f.done))
      throw new Error("League is not complete");
    const qualifiers = standings(c)
      .slice(0, c.players.length >= 4 ? 4 : 2)
      .map((r) => r.id);
    return { ...c, rounds: [bracketRound(qualifiers)] };
  }
  const last = c.rounds[c.rounds.length - 1];
  if (!last.every((f) => f.done && f.winner !== null)) throw new Error("Round is not complete");
  if (last.length === 1) return { ...c, finished: true };
  const next: Fixture[] = [];
  for (let i = 0; i < last.length; i += 2)
    next.push(fixture(`bracket-${c.rounds.length}-${i / 2}`, last[i].winner!, last[i + 1].winner!));
  return { ...c, rounds: [...c.rounds, next] };
}
export function groupRanking(c: Competition) {
  return c.players
    .map((p, id) => ({
      id,
      gross: c.groupScores.reduce((sum, s) => sum + s[id], 0),
      net: c.groupScores.reduce((sum, s) => sum + s[id], 0) - p.strokes,
    }))
    .sort((a, b) => a.net - b.net);
}
