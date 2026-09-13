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
  "Avstånden och ordningen slumpas inför varje ny match. Samma exakta meter kan förekomma flera gånger.",
  "Båda spelarna chippar från exakt samma avstånd på varje hål.",
  "Ett slag per spelare. Välj poängzon efter var bollen stannar.",
  "Högst poäng vinner hålet, lika poäng delar hålet.",
];

export const CHIP_POINT_ZONES = [
  { points: 4, label: "Sänkt" },
  { points: 3, label: "Inom 1 m" },
  { points: 2, label: "Inom 2 m" },
  { points: 1, label: "Inom 5 m" },
  { points: 0, label: "Över 5 m" },
] as const;

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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

export function generateChipMatchDistances(length: ChipMatchLength): number[] {
  const quotas = length === 3 ? [1, 1, 1] : length === 5 ? [2, 1, 2] : [2, 3, 2];
  const distances = CHIP_DISTANCE_BANDS.flatMap((band, index) =>
    Array.from({ length: quotas[index] }, () => rand(band.min, band.max)),
  );
  return shuffle(distances);
}
