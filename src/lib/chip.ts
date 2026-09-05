import { LEGACY_KEYS } from "@/lib/sessions/keys";
import { recordSessionDeleted, recordSessionSaved } from "@/lib/sessions/sync";
/** Chippar – 6 slag från 8, 12, 16, 10, 14, 18 m. Resultat mäts i fot till hål. */
export const CHIP_DISTANCES = [8, 12, 16, 10, 14, 18] as const;

export type ChipShot = {
  /** måldistans i meter */
  distance: number;
  /** avstånd till hål i fot */
  feet: number;
};

export type ChipSession = {
  id: string;
  date: string;
  shots: ChipShot[];
  /** snittavstånd till hål i fot */
  avgFeet: number;
  /** totalt antal fot */
  totalFeet: number;
  notes?: string;
};

const KEY = LEGACY_KEYS.chip;

export function emptyChipShots(): ChipShot[] {
  return CHIP_DISTANCES.map((distance) => ({ distance, feet: 0 }));
}

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function loadChipSessions(): ChipSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as ChipSession[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveChipSession(shots: ChipShot[], notes?: string): ChipSession {
  const values = shots.map((s) => s.feet);
  const record: ChipSession = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    shots,
    avgFeet: mean(values),
    totalFeet: values.reduce((a, b) => a + b, 0),
    notes: notes?.trim() || undefined,
  };
  window.localStorage.setItem(KEY, JSON.stringify([...loadChipSessions(), record]));
  recordSessionSaved("chip", record);
  return record;
}

export function deleteChipSession(id: string): ChipSession[] {
  const all = loadChipSessions().filter((s) => s.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(all));
  recordSessionDeleted("chip", id);
  return all;
}
