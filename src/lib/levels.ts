/** Jämförelsenivåer: PGA Tour-snitt och tourens long hitters. */
export type LevelKey = "tour" | "top5";

export type Level = {
  key: LevelKey;
  label: string;
  /** ball speed driver, mph */
  ballSpeed: number;
  /** club head speed driver, mph */
  clubSpeed: number;
  /** carry driver, meter */
  carryM: number;
  /** carry driver, yards */
  carryYds: number;
  /** snitt närhet till hål från greenbunker, fot (lägre är bättre) */
  bunkerFeet: number;
  /** score i 18-bollarsdrillen, 0–3.0 */
  drillScore: number;
  /** wedge: snittavstånd till hål i procent av slagets längd (lägre är bättre) */
  wedgePct: number;
};

export const LEVELS: Level[] = [
  {
    key: "tour",
    label: "PGA Tour",
    ballSpeed: 171,
    clubSpeed: 115,
    carryM: 258,
    carryYds: 282,
    bunkerFeet: 9,
    drillScore: 2.6,
    wedgePct: 5.5,
  },
  {
    key: "top5",
    label: "Long hitters",
    ballSpeed: 186,
    clubSpeed: 126,
    carryM: 286,
    carryYds: 313,
    bunkerFeet: 9,
    drillScore: 2.8,
    wedgePct: 6,
  },
];

export const DEFAULT_LEVEL: LevelKey = "tour";

export function getLevel(key: LevelKey = DEFAULT_LEVEL): Level {
  return LEVELS.find((l) => l.key === key) ?? LEVELS[0];
}

/** Standardnivån att jämföra mot (PGA Tour). */
export const TOUR_LEVEL = getLevel("tour");
