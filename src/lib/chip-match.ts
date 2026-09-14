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
  "Matchen växlar mellan tydligt olika avstånd. Nästa hål försöker skilja minst 6 meter.",
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
  if (distance <= 14) return CHIP_DISTANCE_BANDS[0];
  if (distance <= 22) return CHIP_DISTANCE_BANDS[1];
  return CHIP_DISTANCE_BANDS[2];
}

/**
 * Variation prioriteras före finjustering. Matchen växlar mellan korta,
 * medellånga och långa chips så två hål i rad inte känns likadana.
 * SG4-motorn väljer fortfarande exakt meter inom respektive band. När möjligt
 * skiljer nästa hål minst 6 meter och exakt avstånd återanvänds inte.
 */
export function generateChipMatchDistances(length: ChipMatchLength): number[] {
  const bandOrder = length === 3
    ? [0, 1, 2]
    : length === 5
      ? [0, 1, 2, 0, 2]
      : [0, 1, 2, 1, 0, 1, 2];

  const orderedBandIndexes = Math.random() < 0.5
    ? bandOrder
    : bandOrder.map((index) => 2 - index);

  const distances: number[] = [];
  const minGap = 6;

  for (const bandIndex of orderedBandIndexes) {
    const band = CHIP_DISTANCE_BANDS[bandIndex];
    const previous = distances.at(-1);
    const all = Array.from({ length: band.max - band.min + 1 }, (_, index) => band.min + index);
    const unused = all.filter((distance) => !distances.includes(distance));
    const pool = unused.length ? unused : all;
    const varied = previous === undefined
      ? pool
      : pool.filter((distance) => Math.abs(distance - previous) >= minGap);
    const allowedDistances = varied.length ? varied : pool;

    distances.push(
      selectNextEngineDistance({
        skill: "chip",
        objective: "balanced",
        context: "game",
        min: band.min,
        max: band.max,
        previousDistance: previous,
        allowedDistances,
      }),
    );
  }

  return distances;
}
