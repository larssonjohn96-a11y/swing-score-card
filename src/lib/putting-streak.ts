export const PUTTING_STREAK_DISTANCES = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 10] as const;

export type PuttingStreakSession = {
  id: string;
  date: string;
  cleared: number;
  clearedDistance: number;
  failedDistance: number;
};

const KEY = "sg4-putting-streak-v1";

export function loadPuttingStreakSessions(): PuttingStreakSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as PuttingStreakSession[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePuttingStreakSession(input: Omit<PuttingStreakSession, "id" | "date">) {
  const record: PuttingStreakSession = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    ...input,
  };
  const next = [...loadPuttingStreakSessions(), record];
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function puttingStreakPb(sessions: PuttingStreakSession[]) {
  return sessions.reduce((best, s) => Math.max(best, s.clearedDistance), 0);
}
