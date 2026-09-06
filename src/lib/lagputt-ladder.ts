export const LAG_PUTT_LADDER_DISTANCES = [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30] as const;

export type LagPuttLadderAttempt = {
  distance: number;
  putts: 1 | 2 | 3;
};

export type LagPuttLadderSession = {
  id: string;
  date: string;
  attempts: LagPuttLadderAttempt[];
  clearedDistance: number;
  failedDistance?: number;
};

const KEY = "sg4-lagputt-ladder-v1";

export function loadLagPuttLadderSessions(): LagPuttLadderSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as LagPuttLadderSession[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLagPuttLadderSession(attempts: LagPuttLadderAttempt[]): LagPuttLadderSession[] {
  const failed = attempts.find((a) => a.putts === 3);
  const cleared = attempts.filter((a) => a.putts <= 2);
  const record: LagPuttLadderSession = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    attempts,
    clearedDistance: cleared.length ? Math.max(...cleared.map((a) => a.distance)) : 0,
    failedDistance: failed?.distance,
  };
  const next = [...loadLagPuttLadderSessions(), record];
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function lagPuttLadderPb(sessions: LagPuttLadderSession[]): number {
  return sessions.length ? Math.max(...sessions.map((s) => s.clearedDistance)) : 0;
}
