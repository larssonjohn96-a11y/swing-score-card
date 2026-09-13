/**
 * Gemensam regelkälla för SG4:s standardiserade Putting Match.
 *
 * Ett enda spelformat – bara matchlängden (3/5/7 hål) skiljer.
 * Återanvänds av bot, vän, turnering och framtida ranked-läge.
 * Gäller INTE tränings-/diagnostiska puttingtester.
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
  const quotas = length === 3 ? [1, 1, 1] : length === 5 ? [2, 1, 2] : [2, 3, 2];
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
