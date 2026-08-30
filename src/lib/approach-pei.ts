export const PEI_SHOT_COUNT = 18;

export const PEI_ZONES = [
  { min: 50, max: 79, label: "50–79 m" },
  { min: 80, max: 109, label: "80–109 m" },
  { min: 110, max: 139, label: "110–139 m" },
  { min: 140, max: 169, label: "140–169 m" },
  { min: 170, max: 199, label: "170–199 m" },
  { min: 200, max: 220, label: "200–220 m" },
] as const;

export type PeiShot = {
  targetDistance: number;
  lengthError: number;
  lateralError: number;
};

export type PeiSession = {
  id: string;
  date: string;
  shots: PeiShot[];
  pei: number;
};

const STORAGE_KEY = "sg4-approach-pei-v1";

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function createPeiShots(): PeiShot[] {
  const distances = PEI_ZONES.flatMap((zone) =>
    Array.from({ length: 3 }, () => randomInt(zone.min, zone.max)),
  );
  return shuffle(distances).map((targetDistance) => ({
    targetDistance,
    lengthError: 0,
    lateralError: 0,
  }));
}

export function missDistance(shot: PeiShot) {
  return Math.hypot(shot.lengthError, shot.lateralError);
}

export function shotPei(shot: PeiShot) {
  if (!shot.targetDistance) return 0;
  return (missDistance(shot) / shot.targetDistance) * 100;
}

export function sessionPei(shots: PeiShot[]) {
  if (!shots.length) return 0;
  return shots.reduce((sum, shot) => sum + shotPei(shot), 0) / shots.length;
}

export function loadPeiSessions(): PeiSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as PeiSession[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePeiSession(shots: PeiShot[]): PeiSession {
  const record: PeiSession = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    date: new Date().toISOString(),
    shots,
    pei: sessionPei(shots),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...loadPeiSessions(), record]));
  return record;
}

export function rollingEightAverage(sessions: PeiSession[]) {
  const lastEight = sessions.slice(-8);
  if (!lastEight.length) return null;
  return lastEight.reduce((sum, session) => sum + session.pei, 0) / lastEight.length;
}
