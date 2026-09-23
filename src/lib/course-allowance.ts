/** Individual strokes below one per hole, then whole strokes per hole up to three. */
export function allowanceOptions(holes: number): number[] {
  return [...Array.from({ length: holes - 1 }, (_, i) => i + 1), holes, holes * 2, holes * 3];
}
export function normalizeAllowance(total: number, holes: number): number {
  return [0, ...allowanceOptions(holes)].filter((n) => n <= total).at(-1) ?? 0;
}
export function allowanceLabel(total: number, holes: number): string {
  if (!total) return "0 · inga extraslag";
  return total >= holes && total % holes === 0
    ? `${total / holes} per hål (${total} extra)`
    : `${total} extraslag`;
}
