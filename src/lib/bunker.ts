export const BUNKER_LIES = [
  "Plant läge",
  "Uppförslut",
  "Nedförslut",
  "Boll över fötterna",
  "Boll under fötterna",
  "Nedgrävd (plugged)",
] as const;

/** Straff i fot när bollen inte kommer ut ur bunkern */
export const FAILED_PENALTY = 30;

export type BunkerShot = {
  lie: string;
  /** avstånd till hål i fot */
  feet: number;
  out: boolean;
};

export type BunkerSession = {
  id: string;
  date: string;
  shots: BunkerShot[];
  totalFeet: number;
  avgFeet: number;
};

const KEY = "golf-bunker-sessions-v1";

export function loadBunkerSessions(): BunkerSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as BunkerSession[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBunkerSession(shots: BunkerShot[]): BunkerSession {
  const totalFeet = shots.reduce((a, s) => a + (s.out ? s.feet : FAILED_PENALTY), 0);
  const record: BunkerSession = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    shots,
    totalFeet,
    avgFeet: shots.length ? totalFeet / shots.length : 0,
  };
  window.localStorage.setItem(KEY, JSON.stringify([...loadBunkerSessions(), record]));
  return record;
}

export function deleteBunkerSession(id: string): BunkerSession[] {
  const all = loadBunkerSessions().filter((s) => s.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(all));
  return all;
}
