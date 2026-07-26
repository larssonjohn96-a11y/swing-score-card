/** Pitch – 6 slag från 8, 12, 16, 10, 14, 18 m. Resultat mäts i meter till hål. */
export const PITCH_DISTANCES = [8, 12, 16, 10, 14, 18] as const;

export type PitchShot = {
  /** måldistans i meter */
  distance: number;
  /** avstånd till hål i meter */
  proximity: number;
};

export type PitchSession = {
  id: string;
  date: string;
  shots: PitchShot[];
  /** snittavstånd till hål i meter */
  avgProximity: number;
  /** snitt i procent av slaglängden */
  pct: number;
  notes?: string;
};

const KEY = "golf-pitch-sessions-v1";

export function emptyPitchShots(): PitchShot[] {
  return PITCH_DISTANCES.map((distance) => ({ distance, proximity: 0 }));
}

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function pitchPct(shots: PitchShot[]): number {
  if (!shots.length) return 0;
  return mean(shots.map((s) => (s.proximity / s.distance) * 100));
}

export function loadPitchSessions(): PitchSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as PitchSession[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePitchSession(shots: PitchShot[], notes?: string): PitchSession {
  const record: PitchSession = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    shots,
    avgProximity: mean(shots.map((s) => s.proximity)),
    pct: pitchPct(shots),
    notes: notes?.trim() || undefined,
  };
  window.localStorage.setItem(KEY, JSON.stringify([...loadPitchSessions(), record]));
  return record;
}

export function deletePitchSession(id: string): PitchSession[] {
  const all = loadPitchSessions().filter((s) => s.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(all));
  return all;
}
