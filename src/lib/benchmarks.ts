/** Referensvärden från PGA Tour (säsongssnitt, avrundade). */
export const TOUR = {
  /** ball speed med driver, mph */
  ballSpeed: 171,
  /** club head speed med driver, mph */
  clubSpeed: 115,
  /** smash factor med driver */
  smashFactor: 1.49,
  /** carry med driver, yards */
  carryYds: 282,
  /** carry med driver, meter */
  carryM: 258,
  /** närhet till hål från greenbunker, fot */
  bunkerFeet: 9,
  /** träffprocent på inspel 100–150 yards */
  approachHitRate: 0.72,
} as const;

/** Snitt för de fem längsta slagarna på PGA Tour (long hitters). */
export const TOUR_TOP5 = {
  /** ball speed med driver, mph */
  ballSpeed: 186,
  /** club head speed med driver, mph */
  clubSpeed: 126,
  /** smash factor med driver */
  smashFactor: 1.48,
  /** carry med driver, yards */
  carryYds: 313,
  /** carry med driver, meter */
  carryM: 286,
} as const;

export function toursLabel(value: number, unit: string) {
  return `PGA Tour-snitt ${value} ${unit}`;
}

