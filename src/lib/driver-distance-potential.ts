/** Driver potential from measured BALL speed, never club speed.
 * TrackMan Driver Fitting Chart: CARRY Optimizer (2010), +5° attack rows.
 * Carry and total come from the SAME trajectory; total includes modeled roll.
 * Source: https://wishongolf.com/wp-content/uploads/2012/07/TrackMan-Driver-Optimization_2010.pdf
 * Linear interpolation in ball speed; outside 108–179 mph the nearest segment
 * is extrapolated and the UI explicitly labels the greater uncertainty.
 * These are fitting benchmarks, not a prediction of a measured shot or HCP.
 */
const ANCHORS = [
  [108, 164, 187],
  [116, 181, 197],
  [124, 197, 223],
  [132, 214, 239],
  [140, 231, 256],
  [148, 247, 272],
  [155, 263, 288],
  [163, 279, 305],
  [171, 295, 321],
  [179, 310, 350],
] as const;
export const DRIVER_POTENTIAL_SOURCE =
  "https://wishongolf.com/wp-content/uploads/2012/07/TrackMan-Driver-Optimization_2010.pdf";
export function driverDistancePotential(ballSpeedMph: number) {
  if (!Number.isFinite(ballSpeedMph) || ballSpeedMph < 40 || ballSpeedMph > 250) return null;
  const upper = ANCHORS.findIndex((a) => a[0] >= ballSpeedMph);
  const i = upper < 0 ? ANCHORS.length - 2 : Math.max(0, upper - 1);
  const a = ANCHORS[i],
    b = ANCHORS[i + 1];
  const fraction = (ballSpeedMph - a[0]) / (b[0] - a[0]);
  const metres = (column: 1 | 2) =>
    Math.max(5, Math.round(((a[column] + fraction * (b[column] - a[column])) * 0.9144) / 5) * 5);
  return {
    carry: metres(1),
    total: metres(2),
    extrapolated: ballSpeedMph < 108 || ballSpeedMph > 179,
  };
}
