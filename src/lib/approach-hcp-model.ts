/** SG4 v1 game model, not an empirically validated handicap benchmark.
 * Retains the existing test formula; HCP 40 is an extrapolation.
 * Negative values denote plus handicap. Never interpret 7/9 as an official HCP.
 */
export const APPROACH_MODEL_VERSION = "sg4-approach-v1";
export const APPROACH_HCP_LEVELS = [40, 30, 20, 10, 5, 0, -3] as const;
export type ApproachHcp = typeof APPROACH_HCP_LEVELS[number];
const SCRATCH_PERCENT = 6.7;
const HCP_PER_PERCENT = 2.2;
export const approachPercentForHcp = (hcp: number) => SCRATCH_PERCENT + hcp / HCP_PER_PERCENT;
export function approachHandicapFromPct(pct: number) {
  return Math.max(-6, Math.min(36, Math.round((pct - SCRATCH_PERCENT) * HCP_PER_PERCENT * 10) / 10));
}
export function approachZoneRadius(target: number, hcp: ApproachHcp) {
  // Round to 0.1 m; the displayed boundary is the rule used by the game.
  return Math.round(target * approachPercentForHcp(hcp) / 10) / 10;
}
export const approachHcpLabel = (hcp: number) => hcp < 0 ? `+${Math.abs(hcp)}` : `${hcp}`;
