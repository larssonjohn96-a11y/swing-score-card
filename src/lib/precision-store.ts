/**
 * Datalagring för Approach Precision Test.
 * Separerad från testlogik/beräkningar (src/lib/precision.ts) och UI.
 */
import {
  precisionResult,
  summarize,
  type PrecisionShot,
  type PrecisionSummary,
} from "@/lib/precision";
import type { Device, MeasurementContext } from "@/lib/speed";

export type PrecisionSession = {
  id: string;
  /** ISO-datum med tid */
  date: string;
  shots: PrecisionShot[];
  avgProximity: number;
  medianProximity: number;
  consistency: number;
  /** Approach Score 0–100 */
  score?: number;
  handicap?: number;
  avgProximityPct?: number;
  note?: string;
  /** var mätningen gjordes, valt innan testet startar */
  context?: MeasurementContext;
  device?: Device;
};

const KEY = "golf-precision-sessions-v1";

export function loadPrecisionSessions(): PrecisionSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as PrecisionSession[]) : [];
    if (!Array.isArray(parsed)) return [];
    return [...parsed].sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

function persist(sessions: PrecisionSession[]) {
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  window.localStorage.setItem(KEY, JSON.stringify(sorted));
  return sorted;
}

export function savePrecisionSession(
  shots: PrecisionShot[],
  context?: MeasurementContext,
  device?: Device,
  note?: string,
): PrecisionSession {
  const s: PrecisionSummary = summarize(shots);
  const r = precisionResult(shots);
  const session: PrecisionSession = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    shots,
    avgProximity: s.avgProximity,
    medianProximity: s.medianProximity,
    consistency: s.consistency,
    score: r.score,
    handicap: r.handicap,
    avgProximityPct: r.avgProximityPct,
    note: note?.trim() || undefined,
    context,
    device,
  };
  persist([...loadPrecisionSessions(), session]);
  return session;
}

export function deletePrecisionSession(id: string): PrecisionSession[] {
  return persist(loadPrecisionSessions().filter((s) => s.id !== id));
}
