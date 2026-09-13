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
  { length: 5, name: "Snabb", label: "5 hål", detail: "Kort match · 1,5–12 m" },
  { length: 9, name: "Standard", label: "9 hål", detail: "Balanserad match · 1,5–15 m", recommended: true },
  { length: 18, name: "Full match", label: "18 hål", detail: "Hela formatet · 1,5–18 m" },
];

export const PUTTING_MATCH_RULES = [
  "Varje hål är en puttposition – båda spelarna puttar från exakt samma avstånd.",
  "Du puttar först, därefter motståndaren.",
  "Håla ut. Färre puttar vinner hålet, lika antal delar hålet.",
  "Flest vunna hål efter matchens längd vinner.",
];

const DISTANCES_5 = [1.5, 3, 5, 8, 12];
const DISTANCES_9 = [1.5, 2, 3, 4, 5, 7, 9, 12, 15];
const DISTANCES_18 = [1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18];

function shuffle<T>(items: readonly T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

/**
 * Standardiserad avståndsmix per format. Samma uppsättning avstånd varje match
 * (jämförbart), med lätt variation i ordningen men alltid balanserat mellan
 * korta, mellanlånga och långa puttar.
 */
export function generatePuttingMatchDistances(length: PuttingMatchLength): number[] {
  const base = length === 5 ? DISTANCES_5 : length === 9 ? DISTANCES_9 : DISTANCES_18;
  const short = shuffle(base.filter((d) => d <= 3));
  const medium = shuffle(base.filter((d) => d > 3 && d <= 8));
  const long = shuffle(base.filter((d) => d > 8));
  const queues = [short, medium, long];
  const out: number[] = [];
  while (out.length < base.length) {
    for (const index of shuffle([0, 1, 2])) {
      const value = queues[index].shift();
      if (value !== undefined) out.push(value);
    }
  }
  return out;
}

export function formatPuttingDistance(distance: number) {
  return `${Number.isInteger(distance) ? distance : distance.toFixed(1).replace(".", ",")} m`;
}
