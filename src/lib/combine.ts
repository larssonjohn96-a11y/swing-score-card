import { LEGACY_KEYS } from "@/lib/sessions/keys";
import { recordSessionDeleted, recordSessionSaved } from "@/lib/sessions/sync";
/** Combine test – approach 55–165 m + driver, poäng 0–100 (Trackman-liknande). */

export type CombineStation = {
  /** unikt id */
  id: string;
  /** etikett i UI */
  label: string;
  /** måldistans i meter, 0 för driver */
  distance: number;
  /** driver mäts i carry istället för proximity */
  driver?: boolean;
};

export const COMBINE_STATIONS: CombineStation[] = [
  { id: "55", label: "55 m (60 yd)", distance: 55 },
  { id: "64", label: "64 m (70 yd)", distance: 64 },
  { id: "73", label: "73 m (80 yd)", distance: 73 },
  { id: "82", label: "82 m (90 yd)", distance: 82 },
  { id: "91", label: "91 m (100 yd)", distance: 91 },
  { id: "110", label: "110 m (120 yd)", distance: 110 },
  { id: "128", label: "128 m (140 yd)", distance: 128 },
  { id: "146", label: "146 m (160 yd)", distance: 146 },
  { id: "165", label: "165 m (180 yd)", distance: 165 },
  { id: "driver", label: "Driver", distance: 0, driver: true },
];

/** Small = 5 stationer × 3 slag × 2 varv = 30 slag. */
export const SMALL_STATION_IDS = ["55", "82", "110", "146", "driver"];

export type CombineSize = "small" | "large";

export const SHOTS_PER_STATION = 3;
export const COMBINE_ROUNDS = 2;

export function stationsFor(size: CombineSize): CombineStation[] {
  return size === "large"
    ? COMBINE_STATIONS
    : COMBINE_STATIONS.filter((s) => SMALL_STATION_IDS.includes(s.id));
}

export function totalShots(size: CombineSize): number {
  return stationsFor(size).length * SHOTS_PER_STATION * COMBINE_ROUNDS;
}

export type CombineShot = {
  round: number;
  stationId: string;
  shot: number;
  /** proximity i meter (approach) eller carry i meter (driver) */
  value: number;
  /** driver: sidoavvikelse i meter från mittlinjen */
  offline?: number;
};

export type CombineSession = {
  id: string;
  date: string;
  size: CombineSize;
  shots: CombineShot[];
  /** totalpoäng 0–100 */
  score: number;
  notes?: string;
};

/** Elitgräns och nollgräns i procent av slaglängden. */
const ELITE_PCT = 3;
const ZERO_PCT = 25;

/** Driver: carry i meter för 0 respektive 100 poäng. */
const DRIVER_MIN = 140;
const DRIVER_MAX = 280;

/** Driver: sidoavvikelse i procent av carry där poängen når 0. */
const DRIVER_OFFLINE_ZERO_PCT = 8;

/** Vikter för driverpoängen. */
const DRIVER_LENGTH_WEIGHT = 0.6;
const DRIVER_STRAIGHT_WEIGHT = 0.4;

function clamp(v: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, v));
}

/** Längdpoäng 0–100 för ett driverslag. */
export function driverLengthScore(carry: number): number {
  return clamp(((carry - DRIVER_MIN) / (DRIVER_MAX - DRIVER_MIN)) * 100);
}

/** Rakhetspoäng 0–100 utifrån sidoavvikelse i procent av carry. */
export function driverStraightScore(carry: number, offline: number): number {
  if (!carry) return 0;
  const pct = (Math.abs(offline) / carry) * 100;
  return clamp(100 * (1 - pct / DRIVER_OFFLINE_ZERO_PCT));
}

/** Driverpoäng: längd + rakhet. Utan sidoavvikelse används enbart längd. */
export function driverScore(carry: number, offline?: number): number {
  const length = driverLengthScore(carry);
  if (offline === undefined || !Number.isFinite(offline)) return length;
  return (
    length * DRIVER_LENGTH_WEIGHT + driverStraightScore(carry, offline) * DRIVER_STRAIGHT_WEIGHT
  );
}

/** Proximity i procent av slaglängden. */
export function proximityPct(distance: number, proximity: number): number {
  if (!distance) return 0;
  return (proximity / distance) * 100;
}

/** Poäng 0–100 för ett enskilt slag. */
export function shotScore(station: CombineStation, value: number, offline?: number): number {
  if (station.driver) return driverScore(value, offline);
  if (!station.distance) return 0;
  const pct = proximityPct(station.distance, value);
  return clamp(100 * (1 - (pct - ELITE_PCT) / (ZERO_PCT - ELITE_PCT)));
}

export function stationById(id: string): CombineStation | undefined {
  return COMBINE_STATIONS.find((s) => s.id === id);
}

export function combineScore(shots: CombineShot[]): number {
  if (!shots.length) return 0;
  const total = shots.reduce((sum, s) => {
    const st = stationById(s.stationId);
    return sum + (st ? shotScore(st, s.value, s.offline) : 0);
  }, 0);
  return total / shots.length;
}

/** Snittproximity i procent för alla approachslag i en session. */
export function avgProximityPct(shots: CombineShot[]): number | null {
  const pcts = shots
    .map((s) => {
      const st = stationById(s.stationId);
      if (!st || st.driver || !st.distance) return null;
      return proximityPct(st.distance, s.value);
    })
    .filter((v): v is number => v !== null);
  if (!pcts.length) return null;
  return pcts.reduce((a, b) => a + b, 0) / pcts.length;
}

export type StationScore = {
  station: CombineStation;
  /** snittpoäng 0–100 */
  score: number;
  /** snittvärde (proximity eller carry) i meter */
  avg: number;
  count: number;
  /** approach: snittproximity i procent av avståndet */
  avgPct: number | null;
  /** driver: snittavvikelse i meter */
  avgOffline: number | null;
  /** driver: snittavvikelse i procent av carry */
  avgOfflinePct: number | null;
};

export function scoresByStation(shots: CombineShot[], size: CombineSize): StationScore[] {
  return stationsFor(size).map((station) => {
    const own = shots.filter((s) => s.stationId === station.id);
    const vals = own.map((s) => s.value);
    const count = vals.length;
    const avg = count ? vals.reduce((a, b) => a + b, 0) / count : 0;
    const score = count
      ? own.reduce((sum, s) => sum + shotScore(station, s.value, s.offline), 0) / count
      : 0;

    const offlines = own.filter(
      (s) => s.offline !== undefined && Number.isFinite(s.offline),
    );
    const avgOffline =
      station.driver && offlines.length
        ? offlines.reduce((a, b) => a + Math.abs(b.offline as number), 0) / offlines.length
        : null;
    const avgOfflinePct = avgOffline !== null && avg ? (avgOffline / avg) * 100 : null;
    const avgPct = !station.driver && count ? proximityPct(station.distance, avg) : null;

    return { station, score, avg, count, avgPct, avgOffline, avgOfflinePct };
  });
}


export type CombineLevel = { min: number; label: string };

export const COMBINE_LEVELS: CombineLevel[] = [
  { min: 95, label: "Världsklass / Tournivå" },
  { min: 90, label: "Professionell nivå" },
  { min: 85, label: "Elit / college" },
  { min: 80, label: "Låg handicap" },
  { min: 70, label: "Duktig klubbspelare" },
  { min: 0, label: "Utvecklingsnivå" },
];

export function levelFor(score: number): string {
  return (COMBINE_LEVELS.find((l) => score >= l.min) ?? COMBINE_LEVELS[COMBINE_LEVELS.length - 1])
    .label;
}

export function emptyCombineShots(size: CombineSize): CombineShot[] {
  const shots: CombineShot[] = [];
  for (let round = 1; round <= COMBINE_ROUNDS; round += 1) {
    for (const station of stationsFor(size)) {
      for (let shot = 1; shot <= SHOTS_PER_STATION; shot += 1) {
        shots.push({ round, stationId: station.id, shot, value: 0 });
      }
    }
  }
  return shots;
}

const KEY = LEGACY_KEYS.combine;

export function loadCombineSessions(): CombineSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as CombineSession[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCombineSession(
  size: CombineSize,
  shots: CombineShot[],
  notes?: string,
): CombineSession {
  const record: CombineSession = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    size,
    shots,
    score: combineScore(shots),
    notes: notes?.trim() || undefined,
  };
  window.localStorage.setItem(KEY, JSON.stringify([...loadCombineSessions(), record]));
  recordSessionSaved("combine", record);
  return record;
}

export function deleteCombineSession(id: string): CombineSession[] {
  const all = loadCombineSessions().filter((s) => s.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(all));
  recordSessionDeleted("combine", id);
  return all;
}
