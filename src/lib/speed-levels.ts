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

/** App benchmarks are not handicap estimates or tour qualification standards. */
export const SPEED_LEVELS: readonly SpeedLevel[] = [
  { id: "foundation", mph: 90, label: "Grundnivå", shortLabel: "grundnivån", source: sg4, celebration: "normal" },
  { id: "club", mph: 126, label: "Klubbgolf", shortLabel: "klubbgolfnivån", source: sg4, celebration: "normal" },
  { id: "lpga-average", mph: 143, label: "LPGA-snitt 2023", shortLabel: "LPGA-snittet", source: trackman, celebration: "normal" },
  { id: "low-hcp", mph: 150, label: "Låg-HCP-fart", shortLabel: "Låg-HCP-fart", source: sg4, celebration: "normal" },
  { id: "scratch", mph: 161, label: "Scratch-fart", shortLabel: "Scratch-fart", source: sg4, celebration: "normal" },
  { id: "pga-average", mph: 171, label: "PGA-snitt 2023", shortLabel: "PGA-snittet", source: trackman, celebration: "normal" },
  { id: "club-180", mph: 180, label: "180 mph-klubben", shortLabel: "180 mph-klubben", source: sg4, celebration: "high" },
  { id: "club-190", mph: 190, label: "190 mph-klubben", shortLabel: "190 mph-klubben", source: sg4, celebration: "high" },
  { id: "club-200", mph: 200, label: "200 mph-klubben", shortLabel: "200 mph-klubben", source: sg4, celebration: "high" },
  { id: "long-drive", mph: 220, label: "Long drive-fart", shortLabel: "Long drive-fart", source: sg4, celebration: "high" },
];

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
  return { achieved, next, gapMph, nearMiss: gapMph !== null && gapMph > 0 && gapMph <= 6 };
}

const decimal = (value: number, digits: number) => value.toFixed(digits).replace(".", ",");

/** Keep measured mph precision, without rounding an unreached threshold up. */
export function formatSpeedValue(valueMph: number, unit: SpeedUnit, digits = 1) {
  if (!Number.isFinite(valueMph) || valueMph < 0) return "–";
  const value = fromMph(valueMph, unit);
  let precision = Math.max(0, Math.min(3, Math.trunc(digits)));
  if (unit === "mph") {
    while (precision < 3 && Math.abs(value * 10 ** precision - Math.round(value * 10 ** precision)) > 1e-8) precision += 1;
  }
  const next = speedLevelProgress(valueMph)?.next;
  if (next) {
    const threshold = fromMph(next.mph, unit);
    while (precision < 6 && Number(value.toFixed(precision)) >= threshold) precision += 1;
    if (Number(value.toFixed(precision)) >= threshold) {
      return decimal(Math.floor(value * 10 ** precision) / 10 ** precision, precision);
    }
  }
  return decimal(value, precision);
}

/** Animation may approach a milestone but must never round up across it. */
export function formatAnimatedSpeedValue(valueMph: number, unit: SpeedUnit) {
  if (!Number.isFinite(valueMph) || valueMph < 0) return "–";
  return decimal(Math.floor(fromMph(valueMph, unit) * 10) / 10, 1);
}

export function formatPositiveSpeedGap(gapMph: number, unit: SpeedUnit) {
  if (!Number.isFinite(gapMph) || gapMph <= 0) return null;
  const scaled = fromMph(gapMph, unit) * 10;
  const nearest = Math.round(scaled);
  // Display-only tolerance for cancellation such as 171 - 164.9. Level checks stay exact.
  const stable = Math.abs(scaled - nearest) <= 1e-10 * Math.max(1, Math.abs(scaled)) ? nearest : scaled;
  if (stable < 1) return `<0,1 ${unit}`;
  return `${decimal(Math.ceil(stable) / 10, 1)} ${unit}`;
}

export function nextLevelMessage(speedMph: number, unit: SpeedUnit) {
  const progress = speedLevelProgress(speedMph);
  if (!progress) return null;
  if (!progress.next || progress.gapMph === null) {
    return speedMph === SPEED_LEVELS[SPEED_LEVELS.length - 1].mph
      ? "Högsta hastighetsmilstolpen uppnådd"
      : "Över högsta hastighetsmilstolpen";
  }
  const gap = formatPositiveSpeedGap(progress.gapMph, unit);
  if (!gap) return null;
  return `${progress.nearMiss ? "Bara" : "Nästa mål ·"} ${gap} till ${progress.next.shortLabel}`;
}
