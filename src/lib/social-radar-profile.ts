import { approachLateralErrorPct, approachLengthErrorPct, approachProximityPct, collectApproachShots } from "@/lib/approach-global";
import { bunkerShots, collectAroundGreenShots, expectedScramblingPct, outside30Yards } from "@/lib/around-green-global";
import { loadOffTeeSessions } from "@/lib/offtee-store";
import { distanceToHandicap, shotHandicap } from "@/lib/offtee";
import { collectLagHoleOutStarts, collectPuttStarts, puttingMakeStats } from "@/lib/putting-global";
import { handicapFromPct } from "@/lib/precision";
import { ratingFromHandicap } from "@/lib/sg-handicap";

export type SocialRadarCategory = "driving" | "approach" | "around-the-green" | "puttning";
export type SocialRadarProfile = Partial<Record<SocialRadarCategory, number[]>>;

const avg = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const clamp = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

const PUTTING_BMS = {
  tour: { score: 100, values: { "0-1": 99, "1-2": 82, "2-3": 50, "3-5": 30, "three-putt": 97.5 } },
  hcp0: { score: 85, values: { "0-1": 98, "1-2": 76, "2-3": 49, "3-5": 34, "three-putt": 92.2 } },
  hcp10: { score: 65, values: { "0-1": 96, "1-2": 65, "2-3": 39, "3-5": 26, "three-putt": 88.2 } },
  hcp20: { score: 45, values: { "0-1": 90, "1-2": 55, "2-3": 33, "3-5": 18, "three-putt": 80.9 } },
} as const;

type PuttingKey = keyof typeof PUTTING_BMS.hcp10.values;

function puttingSkill(key: PuttingKey, raw: number) {
  const anchors = Object.values(PUTTING_BMS).map((row) => ({ raw: row.values[key], score: row.score })).sort((a, b) => a.raw - b.raw);
  const safeRaw = Number.isFinite(raw) ? raw : 0;
  if (safeRaw >= anchors.at(-1)!.raw) return 100;
  if (safeRaw <= anchors[0].raw) return clamp((safeRaw / Math.max(1, anchors[0].raw)) * anchors[0].score);
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const a = anchors[i], b = anchors[i + 1];
    if (safeRaw >= a.raw && safeRaw <= b.raw) {
      const t = (safeRaw - a.raw) / (b.raw - a.raw || 1);
      return clamp(a.score + t * (b.score - a.score));
    }
  }
  return 0;
}

function puttBin(rows: ReturnType<typeof puttingMakeStats>, min: number, max: number, first = false) {
  const selected = rows.filter((row) => first ? row.distance >= min && row.distance <= max : row.distance > min && row.distance <= max);
  const attempts = selected.reduce((sum, row) => sum + row.attempts, 0);
  const made = selected.reduce((sum, row) => sum + row.made, 0);
  return attempts ? (made / attempts) * 100 : 0;
}

export function computeLocalSocialRadarProfile(): SocialRadarProfile {
  const profile: SocialRadarProfile = {};

  const teeShots = loadOffTeeSessions().flatMap((session) => session.shots.filter((shot) => shot.filled));
  if (teeShots.length) {
    const avgTotal = avg(teeShots.map((shot) => shot.total));
    const overallHcp = avg(teeShots.map((shot) => shotHandicap(shot)));
    const fairway = teeShots.filter((shot) => Math.abs(shot.sidled) <= 16).length / teeShots.length * 100;
    const meanSide = avg(teeShots.map((shot) => shot.sidled));
    const dispersion = Math.sqrt(avg(teeShots.map((shot) => (shot.sidled - meanSide) ** 2)));
    const penaltyAvoid = 100 - teeShots.filter((shot) => Math.abs(shot.sidled) > 28).length / teeShots.length * 100;
    profile.driving = [
      clamp(ratingFromHandicap(distanceToHandicap(avgTotal))),
      clamp(ratingFromHandicap(overallHcp)),
      clamp(fairway),
      clamp(100 - dispersion * 2.4),
      clamp(penaltyAvoid),
    ];
  }

  const approachShots = collectApproachShots();
  if (approachShots.length) {
    const score = (selected: typeof approachShots, getter: (shot: typeof approachShots[number]) => number) => {
      const values = selected.map(getter).filter(Number.isFinite);
      return values.length ? clamp(ratingFromHandicap(handicapFromPct(avg(values)))) : 0;
    };
    profile.approach = [
      score(approachShots.filter((shot) => shot.target < 91.44), approachProximityPct),
      score(approachShots.filter((shot) => shot.target >= 91.44), approachProximityPct),
      score(approachShots, approachProximityPct),
      score(approachShots, approachLengthErrorPct),
      score(approachShots, approachLateralErrorPct),
    ];
  }

  const shortShots = collectAroundGreenShots();
  if (shortShots.length) {
    const outside = outside30Yards(shortShots);
    const sand = bunkerShots(shortShots);
    profile["around-the-green"] = [
      clamp(expectedScramblingPct(shortShots)),
      outside.length ? clamp(expectedScramblingPct(outside)) : 0,
      sand.length ? clamp(expectedScramblingPct(sand)) : 0,
      0,
      0,
    ];
  }

  const starts = collectPuttStarts();
  const lag = collectLagHoleOutStarts();
  const stats = puttingMakeStats(starts);
  if (starts.length || lag.length) {
    const values: Array<[PuttingKey, number, boolean]> = [
      ["0-1", puttBin(stats, 0, 1, true), stats.some((r) => r.distance >= 0 && r.distance <= 1 && r.attempts > 0)],
      ["1-2", puttBin(stats, 1, 2), stats.some((r) => r.distance > 1 && r.distance <= 2 && r.attempts > 0)],
      ["2-3", puttBin(stats, 2, 3), stats.some((r) => r.distance > 2 && r.distance <= 3 && r.attempts > 0)],
      ["3-5", puttBin(stats, 3, 5), stats.some((r) => r.distance > 3 && r.distance <= 5 && r.attempts > 0)],
      ["three-putt", lag.length ? 100 - lag.filter((row) => row.strokes >= 3).length / lag.length * 100 : 0, lag.length > 0],
    ];
    profile.puttning = values.map(([key, raw, hasData]) => hasData ? puttingSkill(key, raw) : 0);
  }

  return profile;
}
