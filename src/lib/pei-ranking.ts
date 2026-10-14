import { LEGACY_KEYS } from "@/lib/sessions/keys";

export type FocusKind = "wedge" | "iron";
export const WEDGE_TARGETS = [30, 40, 50, 60, 70, 80, 90, 100, 110] as const;
export const IRON_TARGETS = [120, 125, 135, 140, 150, 155, 165, 170, 175] as const;
export type PeiSession = {
  id: string;
  date: string;
  pei: number;
  shots?: Array<{ target: number; actual: number; lateral: number }>;
};

export function loadPeiSessions(kind: FocusKind): PeiSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(
      localStorage.getItem(kind === "wedge" ? LEGACY_KEYS.peiWedge : LEGACY_KEYS.peiIron) || "[]",
    );
    return Array.isArray(raw)
      ? raw.filter((s) => s && typeof s.pei === "number" && Number.isFinite(s.pei) && s.pei >= 0)
      : [];
  } catch {
    return [];
  }
}

// Compare only completed tests using the current fixed sequence, never older random tests.
export function peiRankingAverage(history: PeiSession[], kind: FocusKind) {
  const targets = kind === "wedge" ? WEDGE_TARGETS : IRON_TARGETS;
  const eligible = history.filter(
    (s) =>
      Number.isFinite(s.pei) &&
      s.pei >= 0 &&
      s.shots?.length === targets.length &&
      s.shots.every(
        (shot, i) =>
          shot.target === targets[i] &&
          Number.isFinite(shot.actual) &&
          shot.actual >= 0 &&
          Number.isFinite(shot.lateral) &&
          shot.lateral >= 0,
      ),
  );
  const recent = [...eligible].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  return {
    count: recent.length,
    average: recent.length ? recent.reduce((sum, s) => sum + s.pei, 0) / recent.length : null,
    best: eligible.length ? Math.min(...eligible.map((s) => s.pei)) : null,
  };
}
