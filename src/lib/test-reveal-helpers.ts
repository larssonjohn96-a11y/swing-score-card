import type { RevealState } from "@/components/test-reveal";

/**
 * Räknar ut vilket reveal-state (first/personal-best/improved/neutral) som
 * gäller, utifrån tidigare handicap-värden (från INNAN det nya testet
 * sparades) och det nya testets handicap. Lägre HCP = bättre för alla sju
 * tester (Lagputt lagras med samma konvention). Ren härledning, ingen ny
 * beräkning av själva HCP:et.
 */
export function computeRevealState(
  previousHcps: number[],
  newHcp: number,
): {
  state: RevealState;
  previousHcp?: number;
  deltaLabel?: string;
} {
  if (!previousHcps.length) {
    return { state: "first" };
  }

  const lastHcp = previousHcps[previousHcps.length - 1];
  const bestHcp = Math.min(...previousHcps);
  const fmtDelta = (n: number) =>
    Math.abs(Math.round(n * 10) / 10)
      .toFixed(1)
      .replace(".", ",");

  if (newHcp < bestHcp - 0.05) {
    return {
      state: "personal-best",
      previousHcp: bestHcp,
      deltaLabel: fmtDelta(bestHcp - newHcp),
    };
  }
  if (newHcp < lastHcp - 0.05) {
    return {
      state: "improved",
      previousHcp: lastHcp,
      deltaLabel: fmtDelta(lastHcp - newHcp),
    };
  }
  return { state: "neutral", previousHcp: lastHcp };
}
