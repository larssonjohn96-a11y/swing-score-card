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

function shuffle<T>(items: readonly T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

/**
 * Behåller kort/medel/lång-spridningen, men SG4-motorn väljer exakt avstånd
 * utifrån spelarens historik och aktuell balans mellan flow och inlärning.
 * Avstånden hålls unika inom matchen när intervallet tillåter det.
 */
export function generatePuttingMatchDistances(length: PuttingMatchLength): number[] {
  const quotas = length === 3 ? [1, 1, 1] : length === 5 ? [2, 1, 2] : [2, 3, 2];
  const slots = shuffle(
    PUTTING_DISTANCE_BANDS.flatMap((band, index) =>
      Array.from({ length: quotas[index] }, () => band),
    ),
  );
  const distances: number[] = [];

  for (const band of slots) {
    const unused = Array.from(
      { length: band.max - band.min + 1 },
      (_, index) => band.min + index,
    ).filter((distance) => !distances.includes(distance));
    const allowedDistances = unused.length
      ? unused
      : Array.from({ length: band.max - band.min + 1 }, (_, index) => band.min + index);

    distances.push(
      selectNextEngineDistance({
        skill: "putting",
        objective: "balanced",
        min: band.min,
        max: band.max,
        previousDistance: distances.at(-1),
        allowedDistances,
      }),
    );
  }
  return distances;
}

export function formatPuttingDistance(distance: number) {
  return `${Math.round(distance)} m`;
}
