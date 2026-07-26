export const LONG_DRIVE_ATTEMPTS = 6;

export type LongDriveUnit = "m" | "yds";

export type LongDriveSession = {
  id: string;
  /** ISO-datum, YYYY-MM-DD */
  date: string;
  /** carry per försök, 6 st */
  carries: number[];
  unit: LongDriveUnit;
  note?: string;
};

const KEY = "golf-longdrive-sessions-v1";

export function loadLongDriveSessions(): LongDriveSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as LongDriveSession[]) : [];
    if (!Array.isArray(parsed)) return [];
    return [...parsed].sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

function persist(sessions: LongDriveSession[]) {
  window.localStorage.setItem(KEY, JSON.stringify(sessions));
  return [...sessions].sort((a, b) => a.date.localeCompare(b.date));
}

export function saveLongDriveSession(input: Omit<LongDriveSession, "id">): LongDriveSession[] {
  const session: LongDriveSession = { ...input, id: crypto.randomUUID() };
  return persist([...loadLongDriveSessions(), session]);
}

export function deleteLongDriveSession(id: string): LongDriveSession[] {
  return persist(loadLongDriveSessions().filter((s) => s.id !== id));
}

export function sessionBest(session: LongDriveSession) {
  return session.carries.length ? Math.max(...session.carries) : 0;
}

export function sessionAvg(session: LongDriveSession) {
  if (!session.carries.length) return 0;
  return session.carries.reduce((a, b) => a + b, 0) / session.carries.length;
}

export function longDriveStats(sessions: LongDriveSession[]) {
  const bests = sessions.map(sessionBest);
  return {
    count: sessions.length,
    best: bests.length ? Math.max(...bests) : 0,
    avgBest: bests.length ? bests.reduce((a, b) => a + b, 0) / bests.length : 0,
    latest: sessions.length ? sessions[sessions.length - 1] : undefined,
  };
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
