import { loadSpeedEntries } from "@/lib/speed";
import { loadLongDriveSessions, sessionBest } from "@/lib/longdrive";
import { loadWedgeSessions } from "@/lib/wedge";

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
  const speed = loadSpeedEntries();
  const longdrive = loadLongDriveSessions();
  const wedge = loadWedgeSessions();
  const combine = loadCombineSessions();

  const bestBall = speed.length ? Math.max(...speed.map((e) => e.ballSpeed)) : undefined;
  const bestCarry = longdrive.length
    ? Math.max(...longdrive.map(sessionBest))
    : undefined;
  const carryUnit = longdrive.length ? longdrive[longdrive.length - 1].unit : "m";
  const bestProximity = wedge.length
    ? Math.min(...wedge.map((s) => s.avgProximity))
    : undefined;
  const bestCombine = combine.length ? Math.max(...combine.map((s) => s.score)) : undefined;

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
      hint: "Bästa snittet i wedge matrix",
    },
    {
      key: "combine",
      label: "Combine",
      value: bestCombine,
      unit: "p",
      decimals: 0,
      hint: "Högsta combine-score",
    },
  ];
}
