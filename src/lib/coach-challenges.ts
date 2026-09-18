export type ChallengeKind = "pace" | "ladder" | "decider";
export type PuttingChallenge = {
  kind: ChallengeKind; level: number; title: string; detail: string;
  distance: number; distances: number[]; remaining: number;
  successes: number; target: number; radius?: number;
};
export const challengeGap = () => 3 + Math.floor(Math.random() * 3);
export function createChallenge(kind: ChallengeKind, level: number, random = Math.random): PuttingChallenge {
  level = Math.max(1, Math.min(3, Math.floor(level)));
  const distances = kind === "ladder"
    ? [[.5, 1.5, 2], [1, 2, 2.5], [1.5, 2, 3]][level - 1]
    : kind === "decider" ? [[1.5], [2], [3]][level - 1]
    : [6 + Math.floor(random() * 10)];
  const radius = [1.5, 1, .75][level - 1];
  return { kind, level, distances, distance: distances[0], remaining: distances.length, successes: 0,
    target: kind === "ladder" ? 2 : 1,
    title: kind === "pace" ? "Fartkontroll" : kind === "ladder" ? "Puttingstegen" : "Avgörande putten",
    detail: kind === "pace" ? `Stanna inom ${String(radius).replace(".", ",")} m på första putten. Putta sedan klart.`
      : kind === "ladder" ? "Tre hål. Sänk första putten på minst två. Spela varje hål klart."
      : "Den här är för vinsten. Sänk första putten – spela klart vid miss.",
    ...(kind === "pace" ? { radius } : {}),
  };
}
export function advanceChallenge(challenge: PuttingChallenge, strokes: number, remaining?: number) {
  const won = challenge.kind === "pace" ? remaining !== undefined && Number.isFinite(remaining) && remaining >= 0 && remaining <= challenge.radius! : strokes === 1;
  const left = challenge.remaining - 1;
  const successes = challenge.successes + Number(won);
  return { ...challenge, remaining: left, successes,
    distance: challenge.distances[challenge.distances.length - left] ?? challenge.distance };
}
export function nextChallengeLevel(level: number, streak: number, success: boolean) {
  const nextStreak = success ? Math.max(0, streak) + 1 : Math.min(0, streak) - 1;
  return Math.abs(nextStreak) >= 2
    ? { level: Math.max(1, Math.min(3, level + (success ? 1 : -1))), streak: 0 }
    : { level, streak: nextStreak };
}
