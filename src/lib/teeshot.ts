/**
 * Off the tee – positionsslag utan driver. Tänkt för doglegs och smala
 * fairways: 10 slag med 3-wood, hybrid eller järn där träffbilden väger
 * tyngre än längden.
 */
export const TEE_SHOTS = 10;

export type TeeClub = "wood" | "hybrid" | "iron";

export const TEE_CLUB_LABEL: Record<TeeClub, string> = {
  wood: "3-wood",
  hybrid: "Hybrid",
  iron: "Järn",
};

export const TEE_CLUBS: TeeClub[] = ["wood", "hybrid", "iron"];

export type TeeResult = "fairway" | "rough" | "out";

export const TEE_RESULT_LABEL: Record<TeeResult, string> = {
  fairway: "Fairway",
  rough: "Ruff",
  out: "Out",
};

export const TEE_RESULTS: TeeResult[] = ["fairway", "rough", "out"];

export type TeeUnit = "m" | "yds";

export type TeeShot = {
  club: TeeClub;
  result: TeeResult;
  /** carry i vald enhet, 0 om out/ej mätt */
  carry: number;
};

export type TeeSession = {
  id: string;
  /** ISO-datum, YYYY-MM-DD */
  date: string;
  shots: TeeShot[];
  unit: TeeUnit;
  /** carry-mål som användes vid poängsättning */
  target: number;
  points: number;
  note?: string;
};

/** Standardmål för positionsslag (carry) per enhet. */
export const DEFAULT_TEE_TARGET = { m: 200, yds: 220 } as const;

/**
 * Poäng per slag, max 10. Träffbilden dominerar (8 p) och längden ger max 2 p –
 * poängen belönar att hitta smala fairways, inte att slå långt.
 */
export function teeShotPoints(shot: TeeShot, target: number): number {
  if (shot.result === "out") return -5;
  const ratio = target > 0 ? Math.min(1, Math.max(0, shot.carry / target)) : 0;
  if (shot.result === "fairway") return 8 + ratio * 2;
  return 3 + ratio * 1;
}

/** Totalpoäng för en omgång, max 100. */
export function teeTotalPoints(shots: TeeShot[], target: number): number {
  return shots.reduce((sum, s) => sum + teeShotPoints(s, target), 0);
}

export function teeHitRate(shots: TeeShot[]) {
  if (!shots.length) return 0;
  return shots.filter((s) => s.result === "fairway").length / shots.length;
}

/** Andel slag som är i spel (fairway eller ruff). */
export function teeInPlayRate(shots: TeeShot[]) {
  if (!shots.length) return 0;
  return shots.filter((s) => s.result !== "out").length / shots.length;
}

export function teeOutCount(shots: TeeShot[]) {
  return shots.filter((s) => s.result === "out").length;
}

export function teeAvgCarry(shots: TeeShot[]) {
  const inPlay = shots.filter((s) => s.result !== "out" && s.carry > 0);
  if (!inPlay.length) return 0;
  return inPlay.reduce((a, s) => a + s.carry, 0) / inPlay.length;
}

export type ClubStat = {
  club: TeeClub;
  count: number;
  hitRate: number;
  avgCarry: number;
};

export function teeStatsByClub(shots: TeeShot[]): ClubStat[] {
  return TEE_CLUBS.map((club) => {
    const own = shots.filter((s) => s.club === club);
    return {
      club,
      count: own.length,
      hitRate: teeHitRate(own),
      avgCarry: teeAvgCarry(own),
    };
  }).filter((c) => c.count > 0);
}

const KEY = "golf-teeshot-sessions-v1";

export function loadTeeSessions(): TeeSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as TeeSession[]) : [];
    if (!Array.isArray(parsed)) return [];
    return [...parsed].sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

function persist(sessions: TeeSession[]) {
  window.localStorage.setItem(KEY, JSON.stringify(sessions));
  return [...sessions].sort((a, b) => a.date.localeCompare(b.date));
}

export function saveTeeSession(input: Omit<TeeSession, "id">): TeeSession[] {
  const session: TeeSession = { ...input, id: crypto.randomUUID() };
  return persist([...loadTeeSessions(), session]);
}

export function deleteTeeSession(id: string): TeeSession[] {
  return persist(loadTeeSessions().filter((s) => s.id !== id));
}

export function teeStats(sessions: TeeSession[]) {
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
