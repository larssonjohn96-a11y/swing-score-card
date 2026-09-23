export type Side = "you" | "other";
export type HoleScore = { you: number; other: number; length: number };
export type CourseGame = {
  mode: "friend" | "bot";
  format: "match" | "stroke";
  names: [string, string];
  opponentId?: string;
  holes: number;
  allowance: number;
  recipient: Side;
  botLevel: number;
  rolls: number[];
  scores: HoleScore[];
  draft: HoleScore;
};
/** Spread remainder from hole one; full cycles give a stroke on every hole. */
export function distributeStrokes(holes: number, total: number): number[] {
  const result = Array(holes).fill(Math.floor(total / holes));
  const remainder = total % holes;
  for (let i = 0; i < remainder; i++) result[Math.floor((i * holes) / remainder)]++;
  return result;
}
export function netHole(game: CourseGame, score: HoleScore, index: number): HoleScore {
  const extra = distributeStrokes(game.holes, game.allowance)[index];
  return { ...score, [game.recipient]: score[game.recipient] - extra };
}
export function matchStatus(game: CourseGame) {
  const diff = game.scores.reduce((sum, score, i) => {
    const net = netHole(game, score, i);
    return sum + (net.you < net.other ? 1 : net.you > net.other ? -1 : 0);
  }, 0);
  return {
    diff,
    left: game.holes - game.scores.length,
    decided: Math.abs(diff) > game.holes - game.scores.length,
  };
}
export function totals(game: CourseGame, net = false): [number, number] {
  const sum: [number, number] = game.scores.reduce<[number, number]>(
    (a, s) => [a[0] + s.you, a[1] + s.other],
    [0, 0],
  );
  if (net) sum[game.recipient === "you" ? 0 : 1] -= game.allowance;
  return sum;
}
/** Approximate virtual score based only on distance, difficulty and a fixed roll. */
export function botScore(length: number, level: number, roll: number) {
  const baseline = length <= 200 ? 3 : length <= 400 ? 4 : 5;
  const offset =
    level === 0
      ? roll < 0.1
        ? 0
        : roll < 0.4
          ? 1
          : roll < 0.8
            ? 2
            : 3
      : level === 1
        ? roll < 0.12
          ? -1
          : roll < 0.55
            ? 0
            : roll < 0.9
              ? 1
              : 2
        : roll < 0.25
          ? -1
          : roll < 0.85
            ? 0
            : 1;
  return Math.max(1, baseline + offset);
}
export function parseGame(raw: string | null): CourseGame | null {
  if (!raw) return null;
  const g = JSON.parse(raw);
  const integer = (v: unknown, min: number, max: number) =>
    typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
  const score = (s: HoleScore) =>
    s && integer(s.you, 1, 30) && integer(s.other, 1, 30) && integer(s.length, 20, 650);
  if (
    !g ||
    !["friend", "bot"].includes(g.mode) ||
    !["match", "stroke"].includes(g.format) ||
    !Array.isArray(g.names) ||
    g.names.length !== 2 ||
    !g.names.every((n: unknown) => typeof n === "string" && n.trim()) ||
    !integer(g.holes, 1, 18) ||
    !integer(g.allowance, 0, 36) ||
    !["you", "other"].includes(g.recipient) ||
    !integer(g.botLevel, 0, 2) ||
    !Array.isArray(g.rolls) ||
    g.rolls.length !== g.holes ||
    !g.rolls.every((n: unknown) => typeof n === "number" && n >= 0 && n < 1) ||
    !Array.isArray(g.scores) ||
    g.scores.length > g.holes ||
    !g.scores.every(score) ||
    !score(g.draft)
  ) {
    throw new Error("Invalid active game");
  }
  return g;
}
