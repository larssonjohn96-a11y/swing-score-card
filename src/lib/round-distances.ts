/** Round IDs seed generation so reducer replays remain pure. Persist the result. */
export function generateRoundDistances(
  kind: "chip" | "putt" | "approach",
  id: string,
  previous?: readonly number[],
): number[] {
  let seed = 2166136261;
  for (const char of `${kind}:${id}`) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  const random = () => {
    seed += 0x6d2b79f5;
    let n = Math.imul(seed ^ (seed >>> 15), seed | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
  // Keep difficulty coverage and putting's 16-star maximum consistent across rounds.
  const bands =
    kind === "putt"
      ? [
          [2, 3, 1, 2],
          [4, 7, 1, 1],
          [8, 12, 1, 3],
        ]
      : kind === "chip"
        ? [
            [8, 10, 1, 2],
            [11, 14, 1, 2],
            [15, 18, 1, 2],
          ]
        : [
            [90, 110, 5, 2],
            [115, 135, 5, 2],
            [140, 155, 5, 2],
          ];
  const out: number[] = [];
  for (const [min, max, step, count] of bands) {
    const pool = Array.from({ length: (max - min) / step + 1 }, (_, i) => min + i * step);
    for (let i = 0; i < count; i++) out.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  if (previous?.every((d, i) => d === out[i])) out.push(out.shift()!);
  return out;
}
export function validRoundDistances(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === 6 &&
    value.every((d) => typeof d === "number" && Number.isFinite(d) && d > 0 && d <= 400)
  );
}
