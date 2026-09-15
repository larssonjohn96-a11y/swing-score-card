export type FriendMatchLength = 3 | 5 | 7;
export type FriendMatchSkill = "putting" | "chip";
export type FriendMatchWinner = "blue" | "red" | "tie";

export type FriendMatchHistoryEntry = {
  id: string;
  playedAt: string;
  selfKey: string;
  opponentKey: string;
  selfName: string;
  opponentName: string;
  category: string;
  length: FriendMatchLength;
  winner: FriendMatchWinner;
  finalText: string;
};

const HISTORY_KEY = "sg4-friend-match-history-v1";
const HISTORY_LIMIT = 80;

export function getFriendMatchPacing(length: FriendMatchLength) {
  if (length === 3) return { label: "Snabb", transitionMs: 260, resultCelebrationMs: 1800, pressureBoost: 0.9 } as const;
  if (length === 5) return { label: "Standard", transitionMs: 340, resultCelebrationMs: 2200, pressureBoost: 1 } as const;
  return { label: "Lång", transitionMs: 390, resultCelebrationMs: 2400, pressureBoost: 1.12 } as const;
}

export function getPlannedDistanceBand(skill: FriendMatchSkill, plannedDistance: number) {
  if (skill === "putting") {
    if (plannedDistance <= 7) return { min: 1, max: 7 } as const;
    if (plannedDistance <= 14) return { min: 8, max: 14 } as const;
    return { min: 15, max: 22 } as const;
  }
  if (plannedDistance <= 14) return { min: 8, max: 14 } as const;
  if (plannedDistance <= 22) return { min: 15, max: 22 } as const;
  return { min: 23, max: 30 } as const;
}

export function allowedDistancesInsideBand(skill: FriendMatchSkill, plannedDistance: number, previousDistance?: number) {
  const band = getPlannedDistanceBand(skill, plannedDistance);
  const all = Array.from({ length: band.max - band.min + 1 }, (_, i) => band.min + i);
  if (typeof previousDistance !== "number") return all;
  const minGap = skill === "putting" ? 5 : 6;
  const varied = all.filter((distance) => Math.abs(distance - previousDistance) >= minGap);
  return varied.length ? varied : all;
}

function readHistory(): FriendMatchHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HISTORY_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordFriendMatchHistory(entry: FriendMatchHistoryEntry) {
  if (typeof window === "undefined") return;
  const current = readHistory();
  if (current.some((item) => item.id === entry.id)) return;
  try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...current].slice(0, HISTORY_LIMIT))); } catch {}
}

export function summarizeFriendHeadToHead(entries: FriendMatchHistoryEntry[], selfKey: string, opponentKey: string) {
  const relevant = entries.filter((entry) => entry.selfKey === selfKey && entry.opponentKey === opponentKey);
  return relevant.reduce((summary, entry) => {
    summary.played += 1;
    if (entry.winner === "blue") summary.wins += 1;
    else if (entry.winner === "red") summary.losses += 1;
    else summary.ties += 1;
    return summary;
  }, { played: 0, wins: 0, losses: 0, ties: 0 });
}

export function getFriendHeadToHead(selfKey: string, opponentKey: string) {
  return summarizeFriendHeadToHead(readHistory(), selfKey, opponentKey);
}

export function getMostPlayedOpponentKey(selfKey: string) {
  const relevant = readHistory().filter((entry) => entry.selfKey === selfKey && entry.opponentKey);
  if (!relevant.length) return null;
  const summary = new Map<string, { count: number; latest: number }>();
  for (const entry of relevant) {
    const previous = summary.get(entry.opponentKey) ?? { count: 0, latest: 0 };
    summary.set(entry.opponentKey, {
      count: previous.count + 1,
      latest: Math.max(previous.latest, Date.parse(entry.playedAt) || 0),
    });
  }
  return [...summary.entries()].sort((a, b) => b[1].count - a[1].count || b[1].latest - a[1].latest)[0]?.[0] ?? null;
}
