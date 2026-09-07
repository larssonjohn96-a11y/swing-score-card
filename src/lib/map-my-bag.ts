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

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createBagMap(): BagMap {
  const now = new Date().toISOString();
  return {
    id: uid(),
    status: "draft",
    createdAt: now,
    updatedAt: now,
    clubs: DEFAULT_BAG_CLUBS.map((label, order) => ({ id: `${order}-${label}`, label, order, shots: [] })),
  };
}

export function loadBagDraft(): BagMap | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch { return null; }
}

export function saveBagDraft(map: BagMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...map, updatedAt: new Date().toISOString() }));
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

export function completeBagMap(map: BagMap): BagMap {
  const completed: BagMap = { ...map, status: "completed", completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
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
