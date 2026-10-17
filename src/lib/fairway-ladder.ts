export const FAIRWAY_SIDES = [20, 15, 10, 5, 4, 3, 2, 1] as const;
export const CARRY_OPTIONS = Array.from({ length: 31 }, (_, i) => 50 + i * 10);
export type FairwayOutcome = "hit" | "left" | "right" | "short";
export type FairwayRound = { id: string; date: string; carry: number; shots: FairwayOutcome[] };
export function fairwayProgress(shots: FairwayOutcome[]) {
  const cleared = shots.filter(s => s === "hit").length;
  const lives = Math.max(0, 3 - shots.filter(s => s !== "hit").length);
  return { cleared, lives, won: cleared === FAIRWAY_SIDES.length, finished: cleared === FAIRWAY_SIDES.length || lives === 0, side: FAIRWAY_SIDES[Math.min(cleared, FAIRWAY_SIDES.length - 1)] };
}
export function addFairwayShot(shots: FairwayOutcome[], outcome: FairwayOutcome) {
  return fairwayProgress(shots).finished ? shots : [...shots, outcome];
}
export function fairwayHighScores(rounds: FairwayRound[], carry: number) {
  return rounds.filter(r => r.carry === carry && fairwayProgress(r.shots).finished).sort((a, b) => {
    const x = fairwayProgress(a.shots), y = fairwayProgress(b.shots);
    return y.cleared - x.cleared || y.lives - x.lives || a.shots.length - b.shots.length || b.date.localeCompare(a.date);
  });
}
const KEY = "sg4-fairway-ladder-v1";
export function loadFairwayRounds(): FairwayRound[] {
  if (typeof window === "undefined") return [];
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((r): r is FairwayRound => {
      if (!r || typeof r.id !== "string" || typeof r.date !== "string" || !CARRY_OPTIONS.includes(r.carry) || !Array.isArray(r.shots) || !r.shots.length) return false;
      const prefix: FairwayOutcome[] = [];
      for (const shot of r.shots) {
        if (!["hit", "left", "right", "short"].includes(shot) || fairwayProgress(prefix).finished) return false;
        prefix.push(shot);
      }
      return fairwayProgress(prefix).finished;
    });
  } catch { return []; }
}
// Separate game records: never included in handicap tests or the shot bank.
export function storeFairwayRound(round: FairwayRound) {
  const rounds = loadFairwayRounds().filter(r => r.id !== round.id);
  if (fairwayProgress(round.shots).finished) rounds.push(round);
  localStorage.setItem(KEY, JSON.stringify(rounds));
  return rounds;
}
