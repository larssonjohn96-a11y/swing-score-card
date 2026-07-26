import { LEVELS, type LevelKey } from "@/lib/levels";

/** Spelarens Golf-ID och handicap, sparat lokalt. */
export type PlayerHcp = {
  /** Golf-ID i formatet ÅÅMMDD-XXX */
  golfId: string;
  /** Exakt handicap, t.ex. 12.4 */
  hcp: number;
  updatedAt: string;
};

const KEY = "golf-player-hcp-v1";

export const GOLF_ID_PATTERN = /^\d{6}-\d{3}$/;

export function isValidGolfId(value: string) {
  return GOLF_ID_PATTERN.test(value.trim());
}

export function isValidHcp(value: number) {
  return Number.isFinite(value) && value >= -10 && value <= 54;
}

export function loadPlayerHcp(): PlayerHcp | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlayerHcp;
    if (!parsed || typeof parsed.hcp !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePlayerHcp(data: Omit<PlayerHcp, "updatedAt">): PlayerHcp {
  const next: PlayerHcp = { ...data, updatedAt: new Date().toISOString() };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }
  return next;
}

export function clearPlayerHcp() {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
}

/** Länk till spelarens sida på Min Golf. */
export function minGolfUrl(golfId: string) {
  return `https://mingolf.golf.se/Site/Player/Search?golfId=${encodeURIComponent(golfId.trim())}`;
}

/** Ungefärlig hcp per jämförelsenivå. */
const LEVEL_HCP: Record<LevelKey, number> = {
  thirty: 30,
  twenty: 20,
  ten: 10,
  scratch: 0,
  tour: -4,
  top5: -6,
};

/** Närmaste jämförelsenivå för ett givet handicap. */
export function levelForHcp(hcp: number): LevelKey {
  return LEVELS.map((l) => l.key).reduce((best, key) =>
    Math.abs(LEVEL_HCP[key] - hcp) < Math.abs(LEVEL_HCP[best] - hcp) ? key : best,
  );
}
