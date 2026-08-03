/**
 * Datalagring för Off the Tee Test.
 * Separerad från testlogik/beräkningar (src/lib/offtee.ts) och UI.
 */
import { offTeeResult, type TeeShot } from "@/lib/offtee";

export type OffTeeSession = {
  id: string;
  /** ISO-datum med tid */
  date: string;
  shots: TeeShot[];
  /** Off the Tee Score 0–100 */
  score: number;
  handicap: number;
  avgTotal: number;
  fairwayHitPct: number;
  note?: string;
};

const KEY = "golf-offtee-sessions-v1";

export function loadOffTeeSessions(): OffTeeSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as OffTeeSession[]) : [];
    if (!Array.isArray(parsed)) return [];
    return [...parsed].sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

function persist(sessions: OffTeeSession[]) {
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  window.localStorage.setItem(KEY, JSON.stringify(sorted));
  return sorted;
}

export function saveOffTeeSession(shots: TeeShot[], note?: string): OffTeeSession {
  const r = offTeeResult(shots);
  const session: OffTeeSession = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    shots,
    score: r.score,
    handicap: r.handicap,
    avgTotal: r.avgTotal,
    fairwayHitPct: r.fairwayHitPct,
    note: note?.trim() || undefined,
  };
  persist([...loadOffTeeSessions(), session]);
  return session;
}

export function deleteOffTeeSession(id: string): OffTeeSession[] {
  return persist(loadOffTeeSessions().filter((s) => s.id !== id));
}
