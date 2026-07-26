/** Jämförelsenivåer: 30/20/10/0 hcp, PGA Tour-snitt och tourens long hitters. */
export type LevelKey = "thirty" | "twenty" | "ten" | "scratch" | "tour" | "top5";

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
};

export const LEVELS: Level[] = [
  {
    key: "thirty",
    label: "30 hcp",
    ballSpeed: 122,
    clubSpeed: 83,
    carryM: 165,
    carryYds: 180,
    bunkerFeet: 30,
    drillScore: 0.5,
  },
  {
    key: "twenty",
    label: "20 hcp",
    ballSpeed: 133,
    clubSpeed: 90,
    carryM: 183,
    carryYds: 200,
    bunkerFeet: 24,
    drillScore: 0.9,
  },
  {
    key: "ten",
    label: "10 hcp",
    ballSpeed: 147,
    clubSpeed: 98,
    carryM: 206,
    carryYds: 225,
    bunkerFeet: 18,
    drillScore: 1.4,
  },
  {
    key: "scratch",
    label: "0 hcp",
    ballSpeed: 161,
    clubSpeed: 107,
    carryM: 230,
    carryYds: 251,
    bunkerFeet: 13,
    drillScore: 2.0,
  },
  {
    key: "tour",
    label: "PGA Tour",
    ballSpeed: 171,
    clubSpeed: 115,
    carryM: 258,
    carryYds: 282,
    bunkerFeet: 9,
    drillScore: 2.6,
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
  },
];

export const DEFAULT_LEVEL: LevelKey = "tour";

export function getLevel(key: LevelKey): Level {
  return LEVELS.find((l) => l.key === key) ?? LEVELS[LEVELS.length - 2];
}

const KEY = "golf-compare-level-v1";

export function loadLevel(): LevelKey {
  if (typeof window === "undefined") return DEFAULT_LEVEL;
  const raw = window.localStorage.getItem(KEY) as LevelKey | null;
  return raw && LEVELS.some((l) => l.key === raw) ? raw : DEFAULT_LEVEL;
}

export function saveLevel(key: LevelKey) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, key);
}
