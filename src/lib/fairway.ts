/**
 * Fairway challenge: 10 drivar. Varje drive får poäng för träffbild (fairway /
 * ruff / out) och för längd (carry mot vald nivås carry-mål). Simulerar vad som
 * händer på banan: out ger stor bestraffning.
 */
export const FAIRWAY_DRIVES = 10;

export type DriveResult = "fairway" | "rough" | "out";

export type FairwayUnit = "m" | "yds";

export type FairwayDrive = {
  result: DriveResult;
  /** carry i vald enhet, 0 om out/ej mätt */
  carry: number;
};

export type FairwaySession = {
  id: string;
  /** ISO-datum, YYYY-MM-DD */
  date: string;
  drives: FairwayDrive[];
  unit: FairwayUnit;
  /** carry-mål som användes vid poängsättning */
  target: number;
  points: number;
  note?: string;
};

export const RESULT_LABEL: Record<DriveResult, string> = {
  fairway: "Fairway",
  rough: "Ruff",
  out: "Out",
};

/** Poäng för en enskild drive, max 10, out ger −5. */
export function drivePoints(drive: FairwayDrive, target: number): number {
  if (drive.result === "out") return -5;
  const ratio = target > 0 ? Math.min(1, Math.max(0, drive.carry / target)) : 0;
  const lengthBonus = ratio * 4;
  return drive.result === "fairway" ? 6 + lengthBonus : 3 + lengthBonus * 0.5;
}

/** Totalpoäng för en omgång. Max 100 (alla i fairway och på carry-målet). */
export function totalPoints(drives: FairwayDrive[], target: number): number {
  return drives.reduce((sum, d) => sum + drivePoints(d, target), 0);
}

export function fairwayHitRate(drives: FairwayDrive[]) {
  if (!drives.length) return 0;
  return drives.filter((d) => d.result === "fairway").length / drives.length;
}

export function outCount(drives: FairwayDrive[]) {
  return drives.filter((d) => d.result === "out").length;
}

export function avgCarry(drives: FairwayDrive[]) {
  const inPlay = drives.filter((d) => d.result !== "out" && d.carry > 0);
  if (!inPlay.length) return 0;
  return inPlay.reduce((a, d) => a + d.carry, 0) / inPlay.length;
}

const KEY = "golf-fairway-sessions-v1";

export function loadFairwaySessions(): FairwaySession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as FairwaySession[]) : [];
    if (!Array.isArray(parsed)) return [];
    return [...parsed].sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

function persist(sessions: FairwaySession[]) {
  window.localStorage.setItem(KEY, JSON.stringify(sessions));
  return [...sessions].sort((a, b) => a.date.localeCompare(b.date));
}

export function saveFairwaySession(input: Omit<FairwaySession, "id">): FairwaySession[] {
  const session: FairwaySession = { ...input, id: crypto.randomUUID() };
  return persist([...loadFairwaySessions(), session]);
}

export function deleteFairwaySession(id: string): FairwaySession[] {
  return persist(loadFairwaySessions().filter((s) => s.id !== id));
}

export function fairwayStats(sessions: FairwaySession[]) {
  const points = sessions.map((s) => s.points);
  return {
    count: sessions.length,
    best: points.length ? Math.max(...points) : 0,
    avg: points.length ? points.reduce((a, b) => a + b, 0) / points.length : 0,
    latest: sessions.length ? sessions[sessions.length - 1] : undefined,
  };
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
