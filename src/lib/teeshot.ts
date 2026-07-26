/**
 * Off the tee – positionsslag utan driver mot bestämda landningsytor.
 * Tre stationer × 3 varv = 9 slag.  * Ett slag ger 1 poäng när bollen stannar inom både längdspannet
 * och fairwaybredden (25 m). Annars 0 poäng.
 */

export type TeeZone = {
  id: string;
  /** stationens måldistans i meter */
  target: number;
  /** min carry i meter */
  min: number;
  /** max carry i meter */
  max: number;
  label: string;
};

/** Godkänd fairwaybredd i meter (±12,5 m från mittlinjen). */
export const TEE_WIDTH_M = 25;
export const TEE_HALF_WIDTH_M = TEE_WIDTH_M / 2;

export const TEE_ZONES: TeeZone[] = [
  { id: "z1", target: 170, min: 160, max: 180, label: "170 m" },
  { id: "z2", target: 195, min: 185, max: 205, label: "195 m" },
  { id: "z3", target: 220, min: 210, max: 230, label: "220 m" },
];

export const TEE_ROUNDS = 3;
export const TEE_SHOTS = TEE_ZONES.length * TEE_ROUNDS;

export type TeeShot = {
  round: number;
  zoneId: string;
  /** längd i meter */
  carry: number;
  /** sidoavvikelse i meter från mittlinjen (absolutvärde) */
  offline: number;
};

export type TeeSession = {
  id: string;
  /** ISO-datum, YYYY-MM-DD */
  date: string;
  shots: TeeShot[];
  /** antal godkända slag, 0–9 */
  points: number;
  note?: string;
};

export function zoneById(id: string): TeeZone | undefined {
  return TEE_ZONES.find((z) => z.id === id);
}

/** Godkänt slag: inom längdspannet och inom fairwaybredden. */
export function isShotOk(shot: TeeShot): boolean {
  const zone = zoneById(shot.zoneId);
  if (!zone) return false;
  if (!(shot.carry > 0)) return false;
  const lengthOk = shot.carry >= zone.min && shot.carry <= zone.max;
  const widthOk = Math.abs(shot.offline) <= TEE_HALF_WIDTH_M;
  return lengthOk && widthOk;
}

export function teeShotPoints(shot: TeeShot): number {
  return isShotOk(shot) ? 1 : 0;
}

/** Totalpoäng 0–9. */
export function teeTotalPoints(shots: TeeShot[]): number {
  return shots.reduce((a, s) => a + teeShotPoints(s), 0);
}

/** Andel godkända slag. */
export function teeHitRate(shots: TeeShot[]) {
  if (!shots.length) return 0;
  return teeTotalPoints(shots) / shots.length;
}

/** Andel slag inom längdspannet. */
export function teeLengthRate(shots: TeeShot[]) {
  if (!shots.length) return 0;
  const hits = shots.filter((s) => {
    const z = zoneById(s.zoneId);
    return z && s.carry >= z.min && s.carry <= z.max;
  }).length;
  return hits / shots.length;
}

/** Andel slag inom fairwaybredden. */
export function teeWidthRate(shots: TeeShot[]) {
  if (!shots.length) return 0;
  return shots.filter((s) => Math.abs(s.offline) <= TEE_HALF_WIDTH_M).length / shots.length;
}

export function teeAvgOffline(shots: TeeShot[]) {
  if (!shots.length) return 0;
  return shots.reduce((a, s) => a + Math.abs(s.offline), 0) / shots.length;
}

export function teeAvgCarry(shots: TeeShot[]) {
  const withCarry = shots.filter((s) => s.carry > 0);
  if (!withCarry.length) return 0;
  return withCarry.reduce((a, s) => a + s.carry, 0) / withCarry.length;
}

export type ZoneStat = {
  zone: TeeZone;
  count: number;
  /** godkända slag */
  points: number;
  hitRate: number;
  avgCarry: number;
  avgOffline: number;
};

export function statsByZone(shots: TeeShot[]): ZoneStat[] {
  return TEE_ZONES.map((zone) => {
    const own = shots.filter((s) => s.zoneId === zone.id);
    return {
      zone,
      count: own.length,
      points: teeTotalPoints(own),
      hitRate: teeHitRate(own),
      avgCarry: teeAvgCarry(own),
      avgOffline: teeAvgOffline(own),
    };
  });
}

export function emptyTeeShots(): TeeShot[] {
  const shots: TeeShot[] = [];
  for (let round = 1; round <= TEE_ROUNDS; round += 1) {
    for (const zone of TEE_ZONES) {
      shots.push({ round, zoneId: zone.id, carry: 0, offline: 0 });
    }
  }
  return shots;
}

const KEY = "golf-teeshot-sessions-v3";

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

export type MissBreakdown = {
  /** missade endast längdspannet */
  lengthOnly: number;
  /** missade endast sidobredden */
  sideOnly: number;
  /** missade både längd och sida */
  both: number;
  /** totalt antal missar */
  total: number;
};

/** Delar upp missarna i längd-, sido- och kombinerade missar. */
export function teeMissBreakdown(shots: TeeShot[]): MissBreakdown {
  let lengthOnly = 0;
  let sideOnly = 0;
  let both = 0;
  for (const s of shots) {
    const zone = zoneById(s.zoneId);
    if (!zone) continue;
    const lengthOk = s.carry >= zone.min && s.carry <= zone.max;
    const widthOk = Math.abs(s.offline) <= TEE_HALF_WIDTH_M;
    if (lengthOk && widthOk) continue;
    if (!lengthOk && !widthOk) both += 1;
    else if (!lengthOk) lengthOnly += 1;
    else sideOnly += 1;
  }
  return { lengthOnly, sideOnly, both, total: lengthOnly + sideOnly + both };
}

/** Missade längden: för kort eller för långt. */
export function teeLengthMissDirection(shots: TeeShot[]) {
  let short = 0;
  let long = 0;
  for (const s of shots) {
    const zone = zoneById(s.zoneId);
    if (!zone) continue;
    if (s.carry < zone.min) short += 1;
    else if (s.carry > zone.max) long += 1;
  }
  return { short, long };
}
