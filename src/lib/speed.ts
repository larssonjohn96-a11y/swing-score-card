export type SpeedEntry = {
  id: string;
  /** ISO-datum, YYYY-MM-DD */
  date: string;
  /** bollhastighet i mph */
  ballSpeed: number;
  /** klubbhuvudshastighet i mph, valfritt */
  clubSpeed?: number;
  note?: string;
};

const KEY = "golf-speed-entries-v1";

export function loadSpeedEntries(): SpeedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as SpeedEntry[]) : [];
    if (!Array.isArray(parsed)) return [];
    return [...parsed].sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

function persist(entries: SpeedEntry[]) {
  window.localStorage.setItem(KEY, JSON.stringify(entries));
  return [...entries].sort((a, b) => a.date.localeCompare(b.date));
}

export function saveSpeedEntry(input: Omit<SpeedEntry, "id">): SpeedEntry[] {
  const entry: SpeedEntry = { ...input, id: crypto.randomUUID() };
  return persist([...loadSpeedEntries(), entry]);
}

export function deleteSpeedEntry(id: string): SpeedEntry[] {
  return persist(loadSpeedEntries().filter((e) => e.id !== id));
}

/** Smash factor = bollhastighet / klubbhastighet */
export function smashFactor(entry: SpeedEntry) {
  if (!entry.clubSpeed) return undefined;
  return entry.ballSpeed / entry.clubSpeed;
}

export function speedStats(entries: SpeedEntry[]) {
  const balls = entries.map((e) => e.ballSpeed);
  const clubs = entries.map((e) => e.clubSpeed).filter((v): v is number => typeof v === "number");
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  return {
    count: entries.length,
    bestBall: balls.length ? Math.max(...balls) : 0,
    avgBall: avg(balls),
    bestClub: clubs.length ? Math.max(...clubs) : 0,
    avgClub: avg(clubs),
    latest: entries.length ? entries[entries.length - 1] : undefined,
  };
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
