import { fromMph, type SpeedUnit } from "./speed-course";

export type SpeedLevelSource =
  | { kind: "sg4" }
  | { kind: "trackman-tour-average"; season: 2023; published: "2024-05-02"; url: string };

export type SpeedLevel = {
  id: string;
  mph: number;
  label: string;
  shortLabel: string;
  source: SpeedLevelSource;
  celebration: "normal" | "high";
};

export const TRACKMAN_TOUR_AVERAGES_URL =
  "https://www.trackman.com/blog/introducing-updated-tour-averages";

const sg4 = { kind: "sg4" } as const;
const trackman = {
  kind: "trackman-tour-average",
  season: 2023,
  published: "2024-05-02",
  url: TRACKMAN_TOUR_AVERAGES_URL,
} as const;

/**
 * A strictly increasing comparison scale. SG4 levels are motivational app
 * benchmarks, while LPGA/PGA values are 2023 driver ball-speed averages.
 */
export const SPEED_LEVELS: readonly SpeedLevel[] = [
  { id: "club-100", mph: 100, label: "Klubbgolf · start", shortLabel: "Klubbgolf", source: sg4, celebration: "normal" },
  { id: "club-120", mph: 120, label: "Klubbgolf · fart", shortLabel: "Klubbgolf", source: sg4, celebration: "normal" },
  { id: "lpga-average", mph: 143, label: "LPGA-snitt 2023", shortLabel: "LPGA-snittet", source: trackman, celebration: "normal" },
  { id: "low-hcp", mph: 150, label: "Låg-HCP-fart", shortLabel: "Låg-HCP-fart", source: sg4, celebration: "normal" },
  { id: "scratch", mph: 161, label: "Scratch-fart", shortLabel: "Scratch-fart", source: sg4, celebration: "normal" },
  { id: "pga-average", mph: 171, label: "PGA-snitt 2023", shortLabel: "PGA-snittet", source: trackman, celebration: "normal" },
  { id: "club-180", mph: 180, label: "180-klubben", shortLabel: "180-klubben", source: sg4, celebration: "high" },
  { id: "club-190", mph: 190, label: "190-klubben", shortLabel: "190-klubben", source: sg4, celebration: "high" },
  { id: "club-200", mph: 200, label: "200-klubben", shortLabel: "200-klubben", source: sg4, celebration: "high" },
] as const;

export type SpeedLevelProgress = {
  achieved: SpeedLevel | null;
  next: SpeedLevel | null;
  gapMph: number | null;
  nearMiss: boolean;
};

export function speedLevelProgress(speedMph: number): SpeedLevelProgress | null {
  if (!Number.isFinite(speedMph) || speedMph <= 0) return null;
  const achieved = [...SPEED_LEVELS].reverse().find((level) => speedMph >= level.mph) ?? null;
  const next = SPEED_LEVELS.find((level) => level.mph > speedMph) ?? null;
  const gapMph = next ? next.mph - speedMph : null;
  return {
    achieved,
    next,
    gapMph,
    nearMiss: gapMph !== null && gapMph > 0 && gapMph <= 6,
  };
}

export function formatSpeedValue(valueMph: number, unit: SpeedUnit, digits = 1) {
  return fromMph(valueMph, unit).toFixed(digits).replace(".", ",");
}

export function formatPositiveSpeedGap(gapMph: number, unit: SpeedUnit) {
  if (!Number.isFinite(gapMph) || gapMph <= 0) return null;
  const converted = fromMph(gapMph, unit);
  const roundedUp = Math.ceil(converted * 10 - Number.EPSILON) / 10;
  return `${roundedUp.toFixed(1).replace(".", ",")} ${unit}`;
}

export function nextLevelMessage(speedMph: number, unit: SpeedUnit) {
  const progress = speedLevelProgress(speedMph);
  if (!progress) return null;
  if (!progress.next || progress.gapMph === null) return "Över högsta hastighetsmilstolpen";
  const gap = formatPositiveSpeedGap(progress.gapMph, unit);
  if (!gap) return null;
  return `${progress.nearMiss ? "Bara" : "Nästa mål ·"} ${gap} till ${progress.next.shortLabel}`;
}