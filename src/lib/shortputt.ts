/** Kortputt – puttar inom 1,5 m. 4 puttar per avstånd (0,5 / 1,0 / 1,5 m) = 12 puttar. */
export const SHORT_PUTT_DISTANCES = [0.5, 1, 1.5] as const;
export const PUTTS_PER_DISTANCE = 4;
export const SHORT_PUTT_TOTAL = SHORT_PUTT_DISTANCES.length * PUTTS_PER_DISTANCE;

export type ShortPutt = {
  /** avstånd i meter */
  distance: number;
  /** puttnummer inom avståndet, 1-indexerat */
  index: number;
  holed: boolean;
};

export type ShortPuttSession = {
  id: string;
  date: string;
  putts: ShortPutt[];
  /** antal isatta puttar */
  holed: number;
  /** procent isatta */
  pct: number;
  notes?: string;
};

const KEY = "golf-shortputt-sessions-v1";

export function emptyShortPutts(): ShortPutt[] {
  const putts: ShortPutt[] = [];
  for (const distance of SHORT_PUTT_DISTANCES) {
    for (let index = 1; index <= PUTTS_PER_DISTANCE; index += 1) {
      putts.push({ distance, index, holed: false });
    }
  }
  return putts;
}

export type ShortPuttStat = {
  distance: number;
  holed: number;
  count: number;
  pct: number;
};

export function shortPuttStats(putts: ShortPutt[]): ShortPuttStat[] {
  return SHORT_PUTT_DISTANCES.map((distance) => {
    const rows = putts.filter((p) => p.distance === distance);
    const holed = rows.filter((p) => p.holed).length;
    return {
      distance,
      holed,
      count: rows.length,
      pct: rows.length ? (holed / rows.length) * 100 : 0,
    };
  });
}

export function loadShortPuttSessions(): ShortPuttSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as ShortPuttSession[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveShortPuttSession(putts: ShortPutt[], notes?: string): ShortPuttSession {
  const holed = putts.filter((p) => p.holed).length;
  const record: ShortPuttSession = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    putts,
    holed,
    pct: putts.length ? (holed / putts.length) * 100 : 0,
    notes: notes?.trim() || undefined,
  };
  window.localStorage.setItem(KEY, JSON.stringify([...loadShortPuttSessions(), record]));
  return record;
}

export function deleteShortPuttSession(id: string): ShortPuttSession[] {
  const all = loadShortPuttSessions().filter((s) => s.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(all));
  return all;
}
