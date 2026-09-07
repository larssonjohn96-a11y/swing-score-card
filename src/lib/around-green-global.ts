import { loadEightBallSessions, STATION_LIST } from "@/routes/8-bollar";
import { INTERVALS, loadShortGameSessions, type IntervalKey } from "@/lib/shortgame";
import { BUNKER_INTERVALS, loadBunkerSessions, type BunkerIntervalKey } from "@/lib/bunker";
import { collectPuttStarts, latestRows, puttingMakeStats } from "@/lib/putting-global";

const YARDS_30_M = 27.432;
const RECENT_PUTT_PRIOR = 100;

export type AroundGreenShotRecord = {
  source: string;
  date: string;
  startDistance: number;
  proximity: number;
  lie: "bunker" | "other";
};

const EIGHT_BALL_PROXIMITY: Record<number, number> = {
  4: 0,
  3: 0.75,
  2: 1.5,
  1: 2.5,
  0: 4,
};

const SHORTGAME_MIDPOINT = Object.fromEntries(INTERVALS.map((row) => [row.key, row.midpoint])) as Record<IntervalKey, number>;
const BUNKER_MIDPOINT = Object.fromEntries(BUNKER_INTERVALS.map((row) => [row.key, row.midpoint])) as Record<BunkerIntervalKey, number>;

function validAroundGreenShot(shot: AroundGreenShotRecord) {
  return Number.isFinite(shot.startDistance) && shot.startDistance >= 0 && Number.isFinite(shot.proximity) && shot.proximity >= 0;
}

export function collectAroundGreenShots(): AroundGreenShotRecord[] {
  const rows: AroundGreenShotRecord[] = [];

  loadEightBallSessions().forEach((session) => {
    session.scores?.forEach((score, index) => {
      const station = STATION_LIST[index % STATION_LIST.length];
      if (!station) return;
      const row: AroundGreenShotRecord = {
        source: "8-bollar",
        date: session.date,
        startDistance: station.distance,
        proximity: EIGHT_BALL_PROXIMITY[score] ?? 4,
        lie: station.type === "Bunker" ? "bunker" : "other",
      };
      if (validAroundGreenShot(row)) rows.push(row);
    });
  });

  loadShortGameSessions().forEach((session) => {
    session.shots.forEach((shot) => {
      if (!shot.interval) return;
      const row: AroundGreenShotRecord = {
        source: "Around the Green HCP",
        date: session.date,
        startDistance: shot.distanceTarget,
        proximity: SHORTGAME_MIDPOINT[shot.interval],
        lie: "other",
      };
      if (validAroundGreenShot(row)) rows.push(row);
    });
  });

  loadBunkerSessions().forEach((session) => {
    session.shots.forEach((shot) => {
      if (!shot.interval) return;
      const row: AroundGreenShotRecord = {
        source: "Bunker HCP",
        date: session.date,
        startDistance: 15,
        proximity: BUNKER_MIDPOINT[shot.interval],
        lie: "bunker",
      };
      if (validAroundGreenShot(row)) rows.push(row);
    });
  });

  return rows.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

const MAKE_CURVES = {
  tour: [
    { d: 0.5, p: 99 }, { d: 1, p: 98 }, { d: 1.5, p: 90 }, { d: 2, p: 82 }, { d: 3, p: 50 }, { d: 4, p: 35 }, { d: 5, p: 30 },
  ],
  hcp0: [
    { d: 0.5, p: 99 }, { d: 1, p: 98 }, { d: 1.5, p: 87 }, { d: 2, p: 76 }, { d: 3, p: 49 }, { d: 4, p: 38 }, { d: 5, p: 34 },
  ],
  hcp10: [
    { d: 0.5, p: 98 }, { d: 1, p: 96 }, { d: 1.5, p: 79 }, { d: 2, p: 65 }, { d: 3, p: 39 }, { d: 4, p: 30 }, { d: 5, p: 26 },
  ],
  hcp20: [
    { d: 0.5, p: 96 }, { d: 1, p: 90 }, { d: 1.5, p: 70 }, { d: 2, p: 55 }, { d: 3, p: 33 }, { d: 4, p: 23 }, { d: 5, p: 18 },
  ],
} as const;

export type AroundGreenBenchmarkKey = keyof typeof MAKE_CURVES;

function interpolateCurve(distance: number, curve: readonly { d: number; p: number }[]) {
  if (!Number.isFinite(distance)) return 0;
  if (distance <= 0) return 100;
  if (distance <= curve[0].d) return curve[0].p;
  for (let i = 0; i < curve.length - 1; i += 1) {
    const a = curve[i];
    const b = curve[i + 1];
    if (distance >= a.d && distance <= b.d) {
      const t = (distance - a.d) / (b.d - a.d);
      return a.p + t * (b.p - a.p);
    }
  }
  const last = curve[curve.length - 1];
  return Math.max(2, last.p * Math.exp(-(distance - last.d) / 4));
}

function personalMakeProbability(distance: number) {
  if (!Number.isFinite(distance)) return 0;
  const starts = latestRows(collectPuttStarts(), RECENT_PUTT_PRIOR);
  const stats = puttingMakeStats(starts);
  if (!stats.length) return interpolateCurve(distance, MAKE_CURVES.hcp10);

  const nearby = stats
    .map((row) => ({ ...row, delta: Math.abs(row.distance - distance) }))
    .filter((row) => Number.isFinite(row.delta) && row.delta <= 1.25)
    .sort((a, b) => a.delta - b.delta);

  const attempts = nearby.reduce((sum, row) => sum + row.attempts, 0);
  const made = nearby.reduce((sum, row) => sum + row.made, 0);
  const observed = attempts ? (made / attempts) * 100 : interpolateCurve(distance, MAKE_CURVES.hcp10);
  const prior = interpolateCurve(distance, MAKE_CURVES.hcp10);
  const weight = Math.min(0.8, attempts / 20);
  return prior * (1 - weight) + observed * weight;
}

export function expectedScramblingPct(shots: AroundGreenShotRecord[], benchmark?: AroundGreenBenchmarkKey) {
  const valid = shots.filter(validAroundGreenShot);
  if (!valid.length) return 0;
  const probabilities = valid
    .map((shot) => benchmark ? interpolateCurve(shot.proximity, MAKE_CURVES[benchmark]) : personalMakeProbability(shot.proximity))
    .filter(Number.isFinite);
  if (!probabilities.length) return 0;
  return probabilities.reduce((sum, value) => sum + value, 0) / probabilities.length;
}

export function outside30Yards(shots: AroundGreenShotRecord[]) {
  return shots.filter((shot) => validAroundGreenShot(shot) && shot.startDistance > YARDS_30_M);
}

export function bunkerShots(shots: AroundGreenShotRecord[]) {
  return shots.filter((shot) => validAroundGreenShot(shot) && shot.lie === "bunker");
}
