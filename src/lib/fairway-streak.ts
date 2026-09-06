export type FairwayStreakSession = {
  id: string;
  date: string;
  streak: number;
};

const KEY = "sg4-fairway-streak-v1";

export function loadFairwayStreakSessions(): FairwayStreakSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as FairwayStreakSession[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFairwayStreakSession(streak: number) {
  const record: FairwayStreakSession = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    streak,
  };
  const next = [...loadFairwayStreakSessions(), record];
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function fairwayStreakPb(sessions: FairwayStreakSession[]) {
  return sessions.reduce((best, s) => Math.max(best, s.streak), 0);
}
