export type ApproachMatchLength = 5 | 9 | 18;
export type ApproachSide = "left" | "center" | "right";

export type ApproachResult = {
  actualDistance: number;
  lateral: number;
  side: ApproachSide;
};

export const APPROACH_MATCH_FORMATS: Array<{
  length: ApproachMatchLength;
  name: string;
  label: string;
  recommended?: boolean;
}> = [
  { length: 5, name: "Snabb", label: "5 hål" },
  { length: 9, name: "Standard", label: "9 hål", recommended: true },
  { length: 18, name: "Full match", label: "18 hål" },
];

export function approachProximity(result: ApproachResult, targetDistance: number) {
  const longitudinal = result.actualDistance - targetDistance;
  const lateral = result.side === "center" ? 0 : Math.abs(result.lateral);
  return Math.hypot(longitudinal, lateral);
}

export function formatApproachResult(result: ApproachResult) {
  if (result.side === "center" || result.lateral === 0) return `${result.actualDistance} m · rakt`;
  return `${result.actualDistance} m · ${Math.abs(result.lateral)} m ${result.side === "left" ? "vänster" : "höger"}`;
}

export function generateApproachMatchDistances(length: ApproachMatchLength): number[] {
  const bands = [
    [55, 85],
    [86, 120],
    [121, 155],
    [156, 180],
  ] as const;
  const out: number[] = [];
  for (let i = 0; i < length; i++) {
    const band = bands[i % bands.length];
    out.push(Math.floor(Math.random() * (band[1] - band[0] + 1)) + band[0]);
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function gaussian() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function simulateApproachResult(hcp: number, approachSkill: number, targetDistance: number): ApproachResult {
  const skillHcp = hcp - approachSkill;
  const spread = Math.max(1.3, targetDistance * (0.018 + Math.max(-6, skillHcp) * 0.00055));
  const lengthError = Math.round(gaussian() * spread);
  const lateralError = Math.round(gaussian() * spread * 0.9);
  const lateral = Math.abs(lateralError);
  return {
    actualDistance: Math.max(1, Math.round(targetDistance + lengthError)),
    lateral,
    side: lateral === 0 ? "center" : lateralError < 0 ? "left" : "right",
  };
}
