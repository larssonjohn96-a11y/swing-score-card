import type { ChipPoints } from "./chip-stations";

/** Live version of the test's model-4 score, including unfinished stations. */
export function chipTestStars(shots: readonly ChipPoints[]): number {
  return Math.min(3, shots.reduce<number>((sum, points) => sum + points, 0) / 3);
}
export function chipStationComplete(shots: readonly ChipPoints[]): boolean {
  return shots.length === 3;
}
