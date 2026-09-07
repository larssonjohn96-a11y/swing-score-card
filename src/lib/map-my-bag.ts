export type BagShot = {
  carry: number;
  accepted: boolean;
  createdAt: string;
};

export type BagClub = {
  id: string;
  label: string;
  order: number;
  shots: BagShot[];
};

export type BagMapStatus = "draft" | "completed";

export type BagMap = {
  id: string;
  status: BagMapStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  location?: string;
  environment?: "outdoor" | "indoor";
  clubs: BagClub[];
};

const DRAFT_KEY = "sg4:map-my-bag:draft";
const HISTORY_KEY = "sg4:map-my-bag:history";

export const DEFAULT_BAG_CLUBS = [
  "60°", "56°", "52°", "PW", "9i", "8i", "7i", "6i", "5i", "4i", "3i", "5W", "3W", "Driver",
] as const;

export const BAG_CLUB_LIBRARY = [
  "64°", "62°", "60°", "58°", "56°", "54°", "52°", "50°", "48°", "46°",
  "LW", "SW", "GW", "AW", "PW",
  "9i", "8i", "7i", "6i", "5i", "4i", "3i", "2i", "1i",
  "7H", "6H", "5H", "4H", "3H", "2H",
  "11W", "9W", "7W", "5W", "4W", "3W", "2W",
  "Driving Iron", "Mini Driver", "Driver",
] as const;

export const INDOOR_REFERENCE_TEMPERATURE_C = 22;
export const INDOOR_REFERENCE_ELEVATION_M = 0;

// Practical estimates for carry normalization when launch/spin data is unavailable.
// Temperature: roughly 1% carry per 10°C. Elevation: roughly 2% per 305 m (1,000 ft).
const CARRY_PER_C = 0.001;
const CARRY_PER_M_ELEVATION = 0.02 / 305;

export type CarryConditionAdjustment = {
  adjustedCarry: number;
  temperatureDelta: number;
  elevationDelta: number;
  totalDelta: number;
};

export function adjustCarryForConditions(
  stockCarry: number,
  temperatureC: number,
  elevationM: number,
  referenceTemperatureC = INDOOR_REFERENCE_TEMPERATURE_C,
  referenceElevationM = INDOOR_REFERENCE_ELEVATION_M,
): CarryConditionAdjustment {
  const safeTemp = Number.isFinite(temperatureC) ? temperatureC : referenceTemperatureC;
  const safeElevation = Number.isFinite(elevationM) ? elevationM : referenceElevationM;
  const tempFactor = 1 + (safeTemp - referenceTemperatureC) * CARRY_PER_C;
  const elevationFactor = 1 + (safeElevation - referenceElevationM) * CARRY_PER_M_ELEVATION;
  const afterTemperature = stockCarry * tempFactor;
  const adjustedCarry = Math.max(0, afterTemperature * elevationFactor);
  const temperatureDelta = afterTemperature - stockCarry;
  const elevationDelta = adjustedCarry - afterTemperature;
  return {
    adjustedCarry,
    temperatureDelta,
    elevationDelta,
    totalDelta: adjustedCarry - stockCarry,
  };
}

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function makeClub(label: string, order: number): BagClub {
  return { id: `${uid()}-${label}`, label, order, shots: [] };
}

export function normalizeBagOrder(map: BagMap): BagMap {
  return { ...map, clubs: map.clubs.map((club, order) => ({ ...club, order })) };
}

export function createBagMap(labels: readonly string[] = DEFAULT_BAG_CLUBS): BagMap {
  const now = new Date().toISOString();
  return {
    id: uid(),
    status: "draft",
    createdAt: now,
    updatedAt: now,
    clubs: labels.map((label, order) => makeClub(label, order)),
  };
}

export function addClubToBag(map: BagMap, label: string): BagMap {
  const clean = label.trim();
  if (!clean) return map;
  return normalizeBagOrder({ ...map, clubs: [...map.clubs, makeClub(clean, map.clubs.length)] });
}

export function removeClubFromBag(map: BagMap, clubId: string): BagMap {
  return normalizeBagOrder({ ...map, clubs: map.clubs.filter((club) => club.id !== clubId) });
}

export function moveClub(map: BagMap, fromIndex: number, toIndex: number): BagMap {
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= map.clubs.length || toIndex >= map.clubs.length || fromIndex === toIndex) return map;
  const clubs = [...map.clubs];
  const [moved] = clubs.splice(fromIndex, 1);
  clubs.splice(toIndex, 0, moved);
  return normalizeBagOrder({ ...map, clubs });
}

export function loadBagDraft(): BagMap | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch { return null; }
}

export function saveBagDraft(map: BagMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...normalizeBagOrder(map), updatedAt: new Date().toISOString() }));
}

export function clearBagDraft() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DRAFT_KEY);
}

export function loadBagHistory(): BagMap[] {
  if (typeof window === "undefined") return [];
  try {
    const rows = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as BagMap[];
    return rows.sort((a, b) => Date.parse(b.completedAt || b.updatedAt) - Date.parse(a.completedAt || a.updatedAt));
  } catch { return []; }
}

export function completeBagMap(map: BagMap, completedOnly = false): BagMap {
  const clubs = completedOnly ? map.clubs.filter(clubComplete) : map.clubs;
  const completed: BagMap = {
    ...normalizeBagOrder({ ...map, clubs }),
    status: "completed",
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    const history = loadBagHistory().filter((row) => row.id !== completed.id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify([completed, ...history]));
    localStorage.removeItem(DRAFT_KEY);
  }
  return completed;
}

export function acceptedShots(club: BagClub) {
  return club.shots.filter((shot) => shot.accepted);
}

export function clubComplete(club: BagClub) {
  return acceptedShots(club).length >= 3;
}

export function medianCarry(club: BagClub): number | null {
  const values = acceptedShots(club).map((shot) => shot.carry).filter(Number.isFinite).sort((a, b) => a - b);
  if (!values.length) return null;
  const middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
}

export function nextRecommendedClub(map: BagMap): BagClub | null {
  return [...map.clubs].sort((a, b) => a.order - b.order).find((club) => !clubComplete(club)) ?? null;
}

export function completedClubCount(map: BagMap) {
  return map.clubs.filter(clubComplete).length;
}

export function latestCompletedBagMap() {
  return loadBagHistory()[0] ?? null;
}
