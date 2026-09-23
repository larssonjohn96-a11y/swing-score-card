export type ApproachMatchLength = 3 | 5 | 7;
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
  { length: 3, name: "Snabb", label: "3 hål" },
  { length: 5, name: "Standard", label: "5 hål", recommended: true },
  { length: 7, name: "Lång", label: "7 hål" },
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

// Every match has a majority in the core zone, plus varied shorter/longer shots.
export const APPROACH_MATCH_ZONES = [
  { min: 50, max: 85 },
  { min: 86, max: 114 },
  { min: 115, max: 135 },
  { min: 136, max: 150 },
] as const;

export function generateApproachMatchDistances(length: ApproachMatchLength): number[] {
  const coreCount = Math.floor(length / 2) + 1;
  const otherZones = [0, 1, 3];
  for (let i = otherZones.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [otherZones[i], otherZones[j]] = [otherZones[j], otherZones[i]];
  }
  const out: number[] = [];
  for (let i = 0; i < length; i++) {
    const zone = APPROACH_MATCH_ZONES[i < coreCount ? 2 : otherZones[i - coreCount]];
    const candidates = Array.from({ length: zone.max - zone.min + 1 }, (_, n) => zone.min + n)
      .filter((distance) => !out.includes(distance));
    out.push(candidates[Math.floor(Math.random() * candidates.length)]);
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
