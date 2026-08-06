import { loadSpeedSessions } from "@/lib/speed";
import { loadLongDriveSessions, sessionBest } from "@/lib/longdrive";
import { loadPrecisionSessions } from "@/lib/precision-store";

export type Highlight = {
  key: string;
  label: string;
  value?: number;
  unit: string;
  decimals: number;
  hint: string;
};

/** Bästa noteringar från alla sparade pass. */
export function topScores(): Highlight[] {
  const speed = loadSpeedSessions();
  const longdrive = loadLongDriveSessions();
  const precision = loadPrecisionSessions();

  const bestBall = speed.length ? Math.max(...speed.map((e) => e.topBallSpeed)) : undefined;
  const bestCarry = longdrive.length ? Math.max(...longdrive.map(sessionBest)) : undefined;
  const carryUnit = longdrive.length ? longdrive[longdrive.length - 1].unit : "m";
  const bestProximity = precision.length
    ? Math.min(...precision.map((s) => s.avgProximity))
    : undefined;

  return [
    {
      key: "ballspeed",
      label: "Ball speed",
      value: bestBall,
      unit: "mph",
      decimals: 1,
      hint: "Bästa noteringen i speedtestet",
    },
    {
      key: "carry",
      label: "Driver carry",
      value: bestCarry,
      unit: carryUnit,
      decimals: 0,
      hint: "Längsta carry i long drive",
    },
    {
      key: "proximity",
      label: "Snitt till hål",
      value: bestProximity,
      unit: "m",
      decimals: 1,
      hint: "Bästa snittet i Approach Precision Test",
    },
  ];
}
