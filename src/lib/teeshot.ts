/**
 * Off the tee – positionsslag utan driver mot bestämda landningsytor.
 * Tre carry-spann × 3 varv = 9 slag. Du väljer klubba själv per slag;
 * poängen belönar rätt längdkontroll (carry inom spannet) och rätt riktning.
 */

export type TeeZone = {
  id: string;
  /** min carry i meter */
  min: number;
  /** max carry i meter */
  max: number;
  label: string;
};

export const TEE_ZONES: TeeZone[] = [
  { id: "z1", min: 150, max: 180, label: "150–180 m" },
  { id: "z2", min: 170, max: 190, label: "170–190 m" },
  { id: "z3", min: 200, max: 230, label: "200–230 m" },
];

export const TEE_ROUNDS = 3;
export const TEE_SHOTS = TEE_ZONES.length * TEE_ROUNDS;

export type TeeResult = "fairway" | "rough" | "out";

export const TEE_RESULT_LABEL: Record<TeeResult, string> = {
  fairway: "Fairway",
  rough: "Ruff",
  out: "Out",
};

export const TEE_RESULTS: TeeResult[] = ["fairway", "rough", "out"];

export type TeeShot = {
  round: number;
  zoneId: string;
  /** klubba, fritt vald */
  club: string;
  result: TeeResult;
  /** carry i meter, 0 om out/ej mätt */
  carry: number;
};

export type TeeSession = {
  id: string;
  /** ISO-datum, YYYY-MM-DD */
  date: string;
  shots: TeeShot[];
  /** totalpoäng 0–100 */
  points: number;
  note?: string;
};

export function zoneById(id: string): TeeZone | undefined {
  return TEE_ZONES.find((z) => z.id === id);
}

/** Hur många meter utanför spannet innan längdpoängen är noll. */
const MISS_ZERO_M = 20;

/** Längdpoäng 0–4 utifrån hur nära carryn ligger landningsytan. */
export function zoneLengthPoints(zone: TeeZone, carry: number): number {
  if (carry <= 0) return 0;
  const miss = carry < zone.min ? zone.min - carry : carry > zone.max ? carry - zone.max : 0;
  if (miss === 0) return 4;
  return Math.max(0, 4 * (1 - miss / MISS_ZERO_M));
}

/** Poäng per slag, max 10: riktning (max 6) + landningsyta (max 4). Out ger −5. */
export function teeShotPoints(shot: TeeShot): number {
  if (shot.result === "out") return -5;
  const zone = zoneById(shot.zoneId);
  const dir = shot.result === "fairway" ? 6 : 3;
  return dir + (zone ? zoneLengthPoints(zone, shot.carry) : 0);
}

/** Totalpoäng 0–100 (9 slag × max 10 p, skalat). */
export function teeTotalPoints(shots: TeeShot[]): number {
  if (!shots.length) return 0;
  const sum = shots.reduce((a, s) => a + teeShotPoints(s), 0);
  return Math.max(0, (sum / (shots.length * 10)) * 100);
}

/** Andel slag med carry inom sitt spann. */
export function zoneHitRate(shots: TeeShot[]) {
  if (!shots.length) return 0;
  const hits = shots.filter((s) => {
    const z = zoneById(s.zoneId);
    return z && s.result !== "out" && s.carry >= z.min && s.carry <= z.max;
  }).length;
  return hits / shots.length;
}

export function teeHitRate(shots: TeeShot[]) {
  if (!shots.length) return 0;
  return shots.filter((s) => s.result === "fairway").length / shots.length;
}

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

export type ZoneStat = {
  zone: TeeZone;
  count: number;
  /** snittpoäng 0–10 */
  points: number;
  /** andel carry inom spannet */
  hitRate: number;
  /** andel fairwayträffar */
  fairwayRate: number;
  avgCarry: number;
  /** klubbor som använts */
  clubs: string[];
};

export function statsByZone(shots: TeeShot[]): ZoneStat[] {
  return TEE_ZONES.map((zone) => {
    const own = shots.filter((s) => s.zoneId === zone.id);
    return {
      zone,
      count: own.length,
      points: own.length ? own.reduce((a, s) => a + teeShotPoints(s), 0) / own.length : 0,
      hitRate: zoneHitRate(own),
      fairwayRate: teeHitRate(own),
      avgCarry: teeAvgCarry(own),
      clubs: Array.from(new Set(own.map((s) => s.club.trim()).filter(Boolean))),
    };
  });
}

export function emptyTeeShots(): TeeShot[] {
  const shots: TeeShot[] = [];
  for (let round = 1; round <= TEE_ROUNDS; round += 1) {
    for (const zone of TEE_ZONES) {
      shots.push({ round, zoneId: zone.id, club: "", result: "fairway", carry: 0 });
    }
  }
  return shots;
}

const KEY = "golf-teeshot-sessions-v2";

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
