import { generateGameDistances } from "./game-distances";

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

export function generatePuttingMatchDistances(length: PuttingMatchLength, previous: readonly number[] = []): number[] {
  return generateGameDistances("putt", length, previous);
}

export function formatPuttingDistance(distance: number) {
  return `${String(distance).replace(".", ",")} m`;
}
