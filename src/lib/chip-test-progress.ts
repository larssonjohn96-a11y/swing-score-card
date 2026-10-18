import type { ChipPoints } from "./chip-stations";

/** Live version of the test's model-4 score, including unfinished stations. */
export function chipTestStars(shots: readonly ChipPoints[]): number {
  return Math.min(3, shots.reduce<number>((sum, points) => sum + points, 0) / 3);
}
export function chipStationComplete(shots: readonly ChipPoints[]): boolean {
  return shots.length === 3;
}

/** Representative distances match the existing chipping HCP model. */
export function chipTestMetrics(shots: readonly ChipPoints[]) {
  const metres = [7, 2.5, 1.5, 0.5, 0];
  return {
    average: shots.length
      ? shots.reduce((sum, points) => sum + metres[points], 0) / shots.length
      : 0,
    within1m: shots.filter((points) => points >= 3).length,
    holed: shots.filter((points) => points === 4).length,
  };
}
