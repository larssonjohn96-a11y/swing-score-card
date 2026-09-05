import { LEGACY_KEYS } from "@/lib/sessions/keys";
import { recordSessionDeleted, recordSessionSaved } from "@/lib/sessions/sync";
export const TUTOR_PUTTS = 10;
export const TUTOR_ROLLING_WINDOW = 20;
export const TUTOR_STORAGE_KEY = LEGACY_KEYS.tutor;

export type TutorSession = {
  id: string;
  date: string;
  results: boolean[];
  score: number;
};

export type TutorPoint = {
  id: string;
  date: string;
  score: number;
  rollingAverage: number;
  rollingCount: number;
};

export function loadTutorSessions(): TutorSession[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(TUTOR_STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (session): session is TutorSession =>
        !!session &&
        typeof session.id === "string" &&
        typeof session.date === "string" &&
        typeof session.score === "number" &&
        Array.isArray(session.results),
    );
  } catch {
    return [];
  }
}

export function saveTutorSession(results: boolean[]): TutorSession {
  const score = results.filter(Boolean).length;
  const session: TutorSession = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now()),
    date: new Date().toISOString(),
    results,
    score,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(
      TUTOR_STORAGE_KEY,
      JSON.stringify([...loadTutorSessions(), session]),
    );
    recordSessionSaved("tutor", session);
  }
  return session;
}

export function deleteTutorSession(id: string): TutorSession[] {
  const next = loadTutorSessions().filter((session) => session.id !== id);
  if (typeof window !== "undefined") {
    localStorage.setItem(TUTOR_STORAGE_KEY, JSON.stringify(next));
    recordSessionDeleted("tutor", id);
  }
  return next;
}

export function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function recentAverage(
  sessions: TutorSession[],
  window = TUTOR_ROLLING_WINDOW,
): number {
  return average(sessions.slice(-window).map((session) => session.score));
}

export function tutorProgress(sessions: TutorSession[]): TutorPoint[] {
  return sessions.map((session, index) => {
    const start = Math.max(0, index - TUTOR_ROLLING_WINDOW + 1);
    const sample = sessions.slice(start, index + 1);
    return {
      id: session.id,
      date: session.date,
      score: session.score,
      rollingAverage: average(sample.map((item) => item.score)),
      rollingCount: sample.length,
    };
  });
}

export function bestRollingAverage(sessions: TutorSession[]): number | null {
  if (sessions.length < TUTOR_ROLLING_WINDOW) return null;
  const points = tutorProgress(sessions).filter(
    (point) => point.rollingCount === TUTOR_ROLLING_WINDOW,
  );
  if (!points.length) return null;
  return Math.max(...points.map((point) => point.rollingAverage));
}

export function formatTutorAverage(value: number): string {
  return value.toFixed(2).replace(".", ",");
}
