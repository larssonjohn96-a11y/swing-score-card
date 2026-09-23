import { generateGameDistances } from "./game-distances";

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
  { id: "short", label: "Kort chip", range: "8–10 m", min: 8, max: 10 },
  { id: "medium", label: "Medel chip", range: "11–14 m", min: 11, max: 14 },
  { id: "long", label: "Lång chip", range: "15–18 m", min: 15, max: 18 },
] as const;

export const CHIP_MATCH_RULES = [
  "Korta 8–10 m · Medel 11–14 m · Långa 15–18 m.",
  "Matchen växlar mellan tydligt olika avstånd. Samma zon kommer inte två gånger i rad.",
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
  { points: 0, label: "Utanför 5 m" },
] as const;

export function getChipPointZone(points: number | null | undefined) {
  return CHIP_POINT_ZONES.find((zone) => zone.points === points);
}

export function getChipDistanceBand(distance: number) {
  if (distance <= 10) return CHIP_DISTANCE_BANDS[0];
  if (distance <= 14) return CHIP_DISTANCE_BANDS[1];
  return CHIP_DISTANCE_BANDS[2];
}

export function generateChipMatchDistances(length: ChipMatchLength, previous: readonly number[] = []): number[] {
  return generateGameDistances("chip", length, previous);
}
