import { selectNextEngineDistance } from "@/lib/sg4-engine";

/**
 * Gemensam regelkälla för SG4:s Chip Match.
 * Ett enda spel – bara matchlängden (3/5/7 hål) skiljer.
 */

export type ChipMatchLength = 3 | 5 | 7;
export type ChipDistanceBandId = "short" | "medium" | "long";

export const CHIP_MATCH_FORMATS = [
  { length: 3, name: "3 hål", label: "", detail: "" },
  { length: 5, name: "5 hål", label: "", detail: "", recommended: true },
  { length: 7, name: "7 hål", label: "", detail: "" },
] as const;

export const CHIP_DISTANCE_BANDS = [
  { id: "short", label: "Kort chip", range: "8–14 m", min: 8, max: 14 },
  { id: "medium", label: "Medel chip", range: "15–22 m", min: 15, max: 22 },
  { id: "long", label: "Lång chip", range: "23–30 m", min: 23, max: 30 },
] as const;

export const CHIP_MATCH_RULES = [
  "Korta 8–14 m · Medel 15–22 m · Långa 23–30 m.",
  "Avstånden och ordningen varierar inför varje ny match. Två hål i rad skiljer minst 4 meter.",
  "Båda spelarna chippar från exakt samma avstånd på varje hål.",
  "Ett slag per spelare. Välj bara hur nära hålet bollen stannade.",
  "Bäst avståndszon vinner hålet, samma zon delar hålet.",
];

export const CHIP_POINT_ZONES = [
  { points: 5, label: "Sänkt" },
  { points: 4, label: "Inom 1 m" },
  { points: 3, label: "Inom 2 m" },
  { points: 2, label: "Inom 3 m" },
  { points: 1, label: "Inom 5 m" },
  { points: 0, label: "Över 5 m" },
] as const;

export function getChipPointZone(points: number | null | undefined) {
  return CHIP_POINT_ZONES.find((zone) => zone.points === points);
}

function shuffle<T>(items: readonly T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function getChipDistanceBand(distance: number) {
  if (distance <= 14) return CHIP_DISTANCE_BANDS[0];
  if (distance <= 22) return CHIP_DISTANCE_BANDS[1];
  return CHIP_DISTANCE_BANDS[2];
}

const MIN_CONSECUTIVE_DISTANCE_GAP = 4;

function ensureNoticeableGap(candidate: number, previous: number | undefined, min: number, max: number) {
  if (previous === undefined || Math.abs(candidate - previous) >= MIN_CONSECUTIVE_DISTANCE_GAP) return candidate;

  const valid = Array.from({ length: max - min + 1 }, (_, index) => min + index)
    .filter((distance) => Math.abs(distance - previous) >= MIN_CONSECUTIVE_DISTANCE_GAP)
    .sort((a, b) => Math.abs(a - candidate) - Math.abs(b - candidate));

  return valid[0] ?? candidate;
}

/**
 * Behåller kort/medel/lång-mixen men låter SG4-motorn välja de exakta metrarna
 * utifrån spelarens historik, flow, learning value, mastery och exploration.
 * Efter valet säkras minst 4 meters skillnad mot föregående hål så matchen
 * inte ger nästan identiska längder två gånger i rad.
 */
export function generateChipMatchDistances(length: ChipMatchLength): number[] {
  const quotas = length === 3 ? [1, 1, 1] : length === 5 ? [2, 1, 2] : [2, 3, 2];
  const slots = shuffle(
    CHIP_DISTANCE_BANDS.flatMap((band, index) =>
      Array.from({ length: quotas[index] }, () => band),
    ),
  );
  const distances: number[] = [];

  for (const band of slots) {
    const candidate = selectNextEngineDistance({
      skill: "chip",
      objective: "balanced",
      min: band.min,
      max: band.max,
      previousDistance: distances.at(-1),
    });

    distances.push(
      ensureNoticeableGap(candidate, distances.at(-1), band.min, band.max),
    );
  }
  return distances;
}
