export const PEI_TARGET_DISTANCES = [
  109, 201, 149, 66, 90, 170, 143, 50, 194, 129, 83, 220, 117, 102, 181, 157, 208, 61,
] as const;

export const PEI_SHOT_COUNT = PEI_TARGET_DISTANCES.length;

export const PEI_GROUPS = [
  { min: 0, max: 100, label: "0–100 m" },
  { min: 100, max: 150, label: "100–150 m" },
  { min: 150, max: 200, label: "150–200 m" },
  { min: 200, max: 250, label: "200–250 m" },
] as const;

export type PeiShot = {
  targetDistance: number;
  actualDistance: number;
  lateral: number;
};

export type PeiSession = {
  id: string;
  date: string;
  shots: PeiShot[];
  pei: number;
};

const STORAGE_KEY = "sg4-approach-pei-v2";

export function createPeiShots(): PeiShot[] {
  return PEI_TARGET_DISTANCES.map((targetDistance) => ({
    targetDistance,
    actualDistance: 0,
    lateral: 0,
  }));
}

export function distanceError(shot: PeiShot) {
  return shot.actualDistance - shot.targetDistance;
}

export function missDistance(shot: PeiShot) {
  return Math.hypot(distanceError(shot), shot.lateral);
}

export function shotPei(shot: PeiShot) {
  if (!shot.targetDistance) return 0;
  return (missDistance(shot) / shot.targetDistance) * 100;
}

export function sessionPei(shots: PeiShot[]) {
  if (!shots.length) return 0;
  return shots.reduce((sum, shot) => sum + shotPei(shot), 0) / shots.length;
}

export function averageDistancePercent(shots: PeiShot[]) {
  if (!shots.length) return 0;
  return (
    shots.reduce((sum, shot) => sum + shot.actualDistance / shot.targetDistance, 0) /
    shots.length
  ) * 100;
}

export function averageDirection(shots: PeiShot[]) {
  if (!shots.length) return 0;
  return shots.reduce((sum, shot) => sum + shot.lateral, 0) / shots.length;
}

export function groupPei(shots: PeiShot[], min: number, max: number) {
  const grouped = shots.filter(
    (shot) => shot.targetDistance >= min && shot.targetDistance < max,
  );
  return grouped.length ? sessionPei(grouped) : 0;
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
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
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
