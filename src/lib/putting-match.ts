/**
 * Gemensam regelkälla för SG4:s standardiserade Putting Match.
 *
 * Ett enda spelformat – bara matchlängden (5/9/18 hål) skiljer, likt
 * Quick/Rapid/Classical i schack. Återanvänds av bot, vän, turnering
 * och framtida ranked-läge. Gäller INTE tränings-/diagnostiska puttingtester.
 */

export type PuttingMatchLength = 5 | 9 | 18;

export const PUTTING_MATCH_FORMATS: Array<{
  length: PuttingMatchLength;
  name: string;
  label: string;
  detail: string;
  recommended?: boolean;
}> = [
  { length: 5, name: "Snabb · 5 hål", label: "", detail: "" },
  { length: 9, name: "Standard · 9 hål", label: "", detail: "", recommended: true },
  { length: 18, name: "Full match · 18 hål", label: "", detail: "" },
];

export const PUTTING_MATCH_RULES = [
  "Varje hål är en puttposition – båda spelarna puttar från exakt samma avstånd.",
  "Du puttar först, därefter motståndaren.",
  "Håla ut. Färre puttar vinner hålet, lika antal delar hålet.",
  "Flest vunna hål efter matchens längd vinner.",
];

function shuffle<T>(items: readonly T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function takeRandomUnique(min: number, max: number, count: number) {
  return shuffle(Array.from({ length: max - min + 1 }, (_, index) => min + index)).slice(0, count);
}

/**
 * Slumpar hela meter mellan 1 och 22 med balanserad spridning över korta,
 * mellanlånga och långa puttar. Avstånden är unika inom respektive match.
 */
export function generatePuttingMatchDistances(length: PuttingMatchLength): number[] {
  const quotas = length === 5 ? [2, 1, 2] : length === 9 ? [3, 3, 3] : [6, 6, 6];
  const distances = [
    ...takeRandomUnique(1, 7, quotas[0]),
    ...takeRandomUnique(8, 14, quotas[1]),
    ...takeRandomUnique(15, 22, quotas[2]),
  ];

  return shuffle(distances);
}

export function formatPuttingDistance(distance: number) {
  return `${Math.round(distance)} m`;
}
