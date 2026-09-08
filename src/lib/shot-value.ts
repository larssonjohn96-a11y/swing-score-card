export type ShotValueLevel = "hcp20" | "hcp10" | "scratch" | "tour";

export type ShotValueResult = {
  level: ShotValueLevel;
  label: string;
  value: number;
};

export type SavedShotReference = {
  id: string;
  category: "putting";
  startDistanceM: number;
  holed: boolean;
  remainingDistanceM: number;
  count: number;
  createdAt: string;
};

export const SHOT_VALUE_STORAGE_KEY = "sg4:shot-value:references:v1";

export const SHOT_VALUE_LEVELS: Array<{ key: ShotValueLevel; label: string }> = [
  { key: "hcp20", label: "HCP 20" },
  { key: "hcp10", label: "HCP 10" },
  { key: "scratch", label: "Scratch" },
  { key: "tour", label: "Tour" },
];

// SG4 reference model v1. Values are expected putts, intentionally rounded and
// displayed as approximate guidance rather than false precision. The table is
// isolated here so it can later be replaced by validated SG4 population data.
const EXPECTED_PUTTS: Record<ShotValueLevel, Array<[number, number]>> = {
  hcp20: [[0,0],[0.3,1.02],[0.6,1.08],[0.9,1.18],[1.2,1.30],[1.5,1.42],[2,1.58],[3,1.78],[4,1.90],[5,1.99],[7.5,2.10],[10,2.18],[15,2.28],[20,2.36],[25,2.43]],
  hcp10: [[0,0],[0.3,1.01],[0.6,1.05],[0.9,1.12],[1.2,1.22],[1.5,1.33],[2,1.48],[3,1.68],[4,1.81],[5,1.90],[7.5,2.01],[10,2.09],[15,2.19],[20,2.27],[25,2.34]],
  scratch: [[0,0],[0.3,1.00],[0.6,1.03],[0.9,1.08],[1.2,1.16],[1.5,1.26],[2,1.40],[3,1.60],[4,1.73],[5,1.82],[7.5,1.93],[10,2.01],[15,2.11],[20,2.19],[25,2.26]],
  tour: [[0,0],[0.3,1.00],[0.6,1.01],[0.9,1.04],[1.2,1.10],[1.5,1.20],[2,1.35],[3,1.55],[4,1.68],[5,1.76],[7.5,1.87],[10,1.94],[15,2.03],[20,2.10],[25,2.17]],
};

export function expectedPutts(level: ShotValueLevel, distanceM: number) {
  const d = Math.max(0, Number.isFinite(distanceM) ? distanceM : 0);
  const points = EXPECTED_PUTTS[level];
  if (d <= points[0][0]) return points[0][1];
  if (d >= points[points.length - 1][0]) {
    const [x1,y1] = points[points.length - 2];
    const [x2,y2] = points[points.length - 1];
    return y2 + (d - x2) * ((y2 - y1) / (x2 - x1));
  }
  for (let i = 1; i < points.length; i += 1) {
    const [x2,y2] = points[i];
    if (d <= x2) {
      const [x1,y1] = points[i - 1];
      const t = (d - x1) / (x2 - x1);
      return y1 + (y2 - y1) * t;
    }
  }
  return points[points.length - 1][1];
}

export function puttingShotValue(startDistanceM: number, holed: boolean, remainingDistanceM: number, level: ShotValueLevel) {
  const before = expectedPutts(level, startDistanceM);
  const after = holed ? 0 : expectedPutts(level, remainingDistanceM);
  return before - 1 - after;
}

export function comparePuttingShot(startDistanceM: number, holed: boolean, remainingDistanceM: number): ShotValueResult[] {
  return SHOT_VALUE_LEVELS.map(({ key, label }) => ({
    level: key,
    label,
    value: puttingShotValue(startDistanceM, holed, remainingDistanceM, key),
  }));
}

export function approximateShotLevel(results: ShotValueResult[]) {
  return [...results].sort((a,b) => Math.abs(a.value) - Math.abs(b.value))[0] ?? null;
}

export function shotValueLabel(value: number) {
  if (value > 0.3) return "Mycket bra";
  if (value > 0.1) return "Bra";
  if (value >= -0.1) return "Normalt";
  if (value >= -0.3) return "Kostsamt";
  return "Mycket kostsamt";
}

function roundHalf(value: number) {
  return Math.round(value * 2) / 2;
}

export function referenceKey(startDistanceM: number, holed: boolean, remainingDistanceM: number) {
  return `putting:${roundHalf(startDistanceM)}:${holed ? "holed" : roundHalf(remainingDistanceM)}`;
}

export function loadSavedShotReferences(): SavedShotReference[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(SHOT_VALUE_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveShotReference(startDistanceM: number, holed: boolean, remainingDistanceM: number) {
  if (typeof window === "undefined") return [] as SavedShotReference[];
  const current = loadSavedShotReferences();
  const key = referenceKey(startDistanceM, holed, remainingDistanceM);
  const existing = current.find((item) => referenceKey(item.startDistanceM, item.holed, item.remainingDistanceM) === key);
  const next = existing
    ? current.map((item) => item.id === existing.id ? { ...item, count: item.count + 1 } : item)
    : [...current, {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()),
        category: "putting" as const,
        startDistanceM: roundHalf(startDistanceM),
        holed,
        remainingDistanceM: holed ? 0 : roundHalf(remainingDistanceM),
        count: 1,
        createdAt: new Date().toISOString(),
      }];
  localStorage.setItem(SHOT_VALUE_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function deleteShotReference(id: string) {
  if (typeof window === "undefined") return [] as SavedShotReference[];
  const next = loadSavedShotReferences().filter((item) => item.id !== id);
  localStorage.setItem(SHOT_VALUE_STORAGE_KEY, JSON.stringify(next));
  return next;
}
