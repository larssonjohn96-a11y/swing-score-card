/** Display score derived from the mean percentage miss (legacy PEI).
 * Keep stored PEI unchanged so existing history and handicap calculations remain compatible.
 */
export function precisionScoreFromPei(pei: number): number {
  return Math.max(0, Math.min(100, 100 - pei));
}
