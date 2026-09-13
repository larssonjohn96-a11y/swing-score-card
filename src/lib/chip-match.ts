/**
 * Gemensam regelkälla för SG4:s standardiserade Chip Match.
 * Ett enda spel – bara matchlängden (3/5/7 hål) skiljer.
 */

export type ChipMatchLength = 3 | 5 | 7;

export const CHIP_MATCH_FORMATS: Array<{
  length: ChipMatchLength;
  name: string;
  label: string;
  detail: string;
  recommended?: boolean;
}> = [
  { length: 3, name: "Snabb · 3 hål", label: "", detail: "" },
  { length: 5, name: "Standard · 5 hål", label: "", detail: "", recommended: true },
  { length: 7, name: "Lång · 7 hål", label: "", detail: "" },
];

export const CHIP_MATCH_RULES = [
  "Varje hål är ett chip från 8–30 m – båda spelar från exakt samma avstånd.",
  "Ett slag per spelare. Välj bara vilken poängzon bollen hamnade i.",
  "4 p sänkt · 3 p inom 1 m · 2 p inom 2 m · 1 p inom 5 m · 0 p över 5 m.",
  "Högst poäng vinner hålet, lika poäng delar hålet.",
  "Vid lika efter matchen blir det sudden death från 11 m: ett chip var, närmast flaggan vinner. Lika eller båda sänkta innebär en ny omgång.",
];

export const CHIP_POINT_ZONES = [
  { points: 4, label: "Sänkt" },
  { points: 3, label: "Inom 1 m" },
  { points: 2, label: "Inom 2 m" },
  { points: 1, label: "Inom 5 m" },
  { points: 0, label: "Över 5 m" },
] as const;

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
 * Slumpar hela meter mellan 8 och 30 med balanserad mix av korta,
 * mellanlånga och långa chippar. Avstånden är unika inom respektive match.
 */
export function generateChipMatchDistances(length: ChipMatchLength): number[] {
  const quotas = length === 3 ? [1, 1, 1] : length === 5 ? [2, 1, 2] : [2, 3, 2];
  return shuffle([
    ...takeRandomUnique(8, 14, quotas[0]),
    ...takeRandomUnique(15, 22, quotas[1]),
    ...takeRandomUnique(23, 30, quotas[2]),
  ]);
}
