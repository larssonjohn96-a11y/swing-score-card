import { selectNextEngineDistance } from "@/lib/sg4-engine";

/**
 * Gemensam regelkälla för SG4:s Putting Match.
 *
 * Ett enda spelformat – bara matchlängden (3/5/7 hål) skiljer.
 * Återanvänds av bot, vän, turnering och framtida ranked-läge.
 * Gäller INTE standardiserade HCP-tester.
 */

export type PuttingMatchLength = 3 | 5 | 7;

export const PUTTING_MATCH_FORMATS: Array<{
  length: PuttingMatchLength;
  name: string;
  label: string;
  detail: string;
  recommended?: boolean;
}> = [
  { length: 3, name: "Snabb · 3 hål", label: "", detail: "" },
  { length: 5, name: "Standard · 5 hål", label: "", detail: "", recommended: true },
  { length: 7, name: "Lång · 7 hål", label: "", detail: "" },
];

export const PUTTING_MATCH_RULES = [
  "Varje hål är en puttposition – båda spelarna puttar från exakt samma avstånd.",
  "Du puttar först, därefter motståndaren.",
  "Håla ut. Färre puttar vinner hålet, lika antal delar hålet.",
  "Flest vunna hål efter ordinarie matchlängd vinner.",
  "Vid lika blir det sudden death från 11 m: ett slag var, närmast flaggan vinner. Lika eller båda sänkta innebär en ny omgång.",
];

const PUTTING_DISTANCE_BANDS = [
  { min: 1, max: 7 },
  { min: 8, max: 14 },
  { min: 15, max: 22 },
] as const;

/**
 * Variation prioriteras före finjustering. Matchen växlar mellan tydligt olika
 * korta, medellånga och långa puttar, medan SG4-motorn fortfarande får välja
 * exakt avstånd inom varje band. När möjligt skiljer nästa hål minst 5 meter
 * och ett exakt avstånd återanvänds inte inom samma match.
 */
export function generatePuttingMatchDistances(length: PuttingMatchLength): number[] {
  const bandOrder = length === 3
    ? [0, 1, 2]
    : length === 5
      ? [0, 1, 2, 0, 2]
      : [0, 1, 2, 1, 0, 1, 2];

  const orderedBandIndexes = Math.random() < 0.5
    ? bandOrder
    : bandOrder.map((index) => 2 - index);

  const distances: number[] = [];
  const minGap = 5;

  for (const bandIndex of orderedBandIndexes) {
    const band = PUTTING_DISTANCE_BANDS[bandIndex];
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
        skill: "putting",
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

export function formatPuttingDistance(distance: number) {
  return `${Math.round(distance)} m`;
}
