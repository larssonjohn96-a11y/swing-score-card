import { loadOffTeeSessions } from "@/lib/offtee-store";
import { collectApproachShots } from "@/lib/approach-global";
import { collectAroundGreenShots } from "@/lib/around-green-global";
import { collectLagHoleOutStarts, collectPuttStarts, groupedLagHoleOutStats, puttingMakeStats } from "@/lib/putting-global";
import { PROGRESS_TESTS, summarize } from "@/lib/progress";
import { topScores } from "@/lib/highlights";
import { LEGACY_KEYS } from "@/lib/sessions/keys";

export type ComparisonCategory = "driving" | "approach" | "around-the-green" | "puttning";

export type ComparisonMetric = {
  key: string;
  label: string;
  value: number;
  unit: string;
  decimals: number;
  higherIsBetter: boolean;
  category?: ComparisonCategory;
  overview?: boolean;
};

export type ComparisonTrainingResult = ComparisonMetric;

export type ComparisonActivity = {
  tests: number;
  shots: number;
};

export type SocialComparisonProfile = {
  activity: ComparisonActivity & {
    byCategory: Record<ComparisonCategory, ComparisonActivity>;
  };
  performance: ComparisonMetric[];
  training: ComparisonTrainingResult[];
  records: ComparisonMetric[];
};

type EightBallSession = { score?: number; scores?: number[] };

const emptyCategoryActivity = (): Record<ComparisonCategory, ComparisonActivity> => ({
  driving: { tests: 0, shots: 0 },
  approach: { tests: 0, shots: 0 },
  "around-the-green": { tests: 0, shots: 0 },
  puttning: { tests: 0, shots: 0 },
});

const avg = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const stdDev = (values: number[]) => {
  if (values.length < 2) return 0;
  const mean = avg(values);
  return Math.sqrt(avg(values.map((value) => (value - mean) ** 2)));
};

function loadEightBallSessions(): EightBallSession[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_KEYS.eightBall) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function makePctInRange(min: number, max: number, includeMin = true) {
  const rows = puttingMakeStats(collectPuttStarts()).filter((row) => includeMin ? row.distance >= min && row.distance <= max : row.distance > min && row.distance <= max);
  const attempts = rows.reduce((sum, row) => sum + row.attempts, 0);
  const made = rows.reduce((sum, row) => sum + row.made, 0);
  return attempts ? (made / attempts) * 100 : undefined;
}

function puttingOneToTwoPct() {
  return makePctInRange(1, 2, false);
}

function threePuttAvoidancePct() {
  const rows = collectLagHoleOutStarts();
  if (!rows.length) return undefined;
  return 100 - (rows.filter((row) => row.strokes >= 3).length / rows.length) * 100;
}

function categoryForProgress(slug: string): ComparisonCategory | undefined {
  if (slug === "driving" || slug === "approach" || slug === "around-the-green" || slug === "puttning") return slug;
  return undefined;
}

export function computeLocalComparisonProfile(): SocialComparisonProfile {
  const performance: ComparisonMetric[] = [];
  const records: ComparisonMetric[] = [];

  const offTeeSessions = loadOffTeeSessions();
  const teeShots = offTeeSessions.flatMap((session) => session.shots.filter((shot) => shot.filled));
  if (teeShots.length) {
    const totals = teeShots.map((shot) => shot.total).filter(Number.isFinite);
    const sides = teeShots.map((shot) => shot.sidled).filter(Number.isFinite);
    performance.push(
      { key: "avg-drive", label: "Snittdrive", value: avg(totals), unit: "m", decimals: 0, higherIsBetter: true, category: "driving" },
      { key: "fairway", label: "Fairwayträffar", value: teeShots.filter((shot) => Math.abs(shot.sidled) <= 16).length / teeShots.length * 100, unit: "%", decimals: 0, higherIsBetter: true, category: "driving" },
      { key: "driver-dispersion", label: "Driver dispersion", value: stdDev(sides), unit: "m", decimals: 1, higherIsBetter: false, category: "driving", overview: false },
    );
  }

  const oneToTwo = puttingOneToTwoPct();
  if (oneToTwo !== undefined) performance.push({ key: "putting-1-2", label: "Sänk% 1–2 m", value: oneToTwo, unit: "%", decimals: 0, higherIsBetter: true, category: "puttning" });

  const threePutt = threePuttAvoidancePct();
  if (threePutt !== undefined) performance.push({ key: "three-putt-avoid", label: "3-putt avoidance", value: threePutt, unit: "%", decimals: 0, higherIsBetter: true, category: "puttning" });

  const shortPuttBuckets = [
    { key: "putt-make-1m", label: "1-putt % · 1 m", min: 0, max: 1, includeMin: true },
    { key: "putt-make-2m", label: "1-putt % · 2 m", min: 1, max: 2, includeMin: false },
    { key: "putt-make-3m", label: "1-putt % · 3 m", min: 2, max: 3, includeMin: false },
    { key: "putt-make-4-5m", label: "1-putt % · 4–5 m", min: 3, max: 5, includeMin: false },
  ] as const;
  for (const bucket of shortPuttBuckets) {
    const value = makePctInRange(bucket.min, bucket.max, bucket.includeMin);
    if (value !== undefined) performance.push({ key: bucket.key, label: bucket.label, value, unit: "%", decimals: 0, higherIsBetter: true, category: "puttning", overview: false });
  }

  for (const range of groupedLagHoleOutStats()) {
    if (!range.attempts) continue;
    const rangeKey = `${range.min}-${range.max}`;
    performance.push(
      { key: `lag-avg-${rangeKey}`, label: `Lag · snitt ${range.label}`, value: range.avgPutts, unit: "puttar", decimals: 2, higherIsBetter: false, category: "puttning", overview: false },
      { key: `lag-1putt-${rangeKey}`, label: `Lag · 1-putt ${range.label}`, value: range.onePuttPct, unit: "%", decimals: 0, higherIsBetter: true, category: "puttning", overview: false },
      { key: `lag-3putt-${rangeKey}`, label: `Lag · 3-putt ${range.label}`, value: range.threePuttPct, unit: "%", decimals: 0, higherIsBetter: false, category: "puttning", overview: false },
    );
  }

  for (const item of topScores()) {
    if (item.value === undefined || !Number.isFinite(item.value)) continue;
    const higherIsBetter = item.key !== "proximity";
    const category: ComparisonCategory | undefined = item.key === "ballspeed" || item.key === "carry"
      ? "driving"
      : item.key === "proximity"
        ? "approach"
        : undefined;
    records.push({
      key: item.key,
      label: item.label,
      value: item.value,
      unit: item.unit,
      decimals: item.decimals,
      higherIsBetter,
      category,
    });
  }

  const training: ComparisonTrainingResult[] = PROGRESS_TESTS.flatMap((test) => {
    const summary = summarize(test);
    if (summary.best === undefined || !Number.isFinite(summary.best)) return [];
    return [{
      key: test.id,
      label: test.title,
      value: summary.best,
      unit: test.unit,
      decimals: test.decimals,
      higherIsBetter: test.higherIsBetter,
      category: categoryForProgress(test.categorySlug),
    } satisfies ComparisonTrainingResult];
  });

  const eightBallSessions = loadEightBallSessions();
  const eightBallScores = eightBallSessions.map((session) => session.score).filter((score): score is number => typeof score === "number" && Number.isFinite(score));
  if (eightBallScores.length) {
    training.push({ key: "eight-ball", label: "8-bollsövningen", value: Math.max(...eightBallScores), unit: "p", decimals: 0, higherIsBetter: true, category: "around-the-green" });
  }

  const progressTests = PROGRESS_TESTS.reduce((sum, test) => sum + test.load().length, 0);
  const tests = progressTests + eightBallSessions.length;
  const approachShots = collectApproachShots().length;
  const aroundShots = collectAroundGreenShots().length;
  const puttShots = collectPuttStarts().length;
  const lagShots = collectLagHoleOutStarts().length;
  const eightBallShots = eightBallSessions.reduce((sum, session) => sum + (Array.isArray(session.scores) ? session.scores.length : 40), 0);
  const shots = teeShots.length + approachShots + aroundShots + puttShots + lagShots + eightBallShots;

  const byCategory = emptyCategoryActivity();
  for (const test of PROGRESS_TESTS) {
    const category = categoryForProgress(test.categorySlug);
    if (category) byCategory[category].tests += test.load().length;
  }
  byCategory.driving.shots = teeShots.length;
  byCategory.approach.shots = approachShots;
  byCategory["around-the-green"].tests += eightBallSessions.length;
  byCategory["around-the-green"].shots = aroundShots + eightBallShots;
  byCategory.puttning.shots = puttShots + lagShots;

  return { activity: { tests, shots, byCategory }, performance, training, records };
}

export function parseComparisonProfile(value: unknown): SocialComparisonProfile {
  const empty: SocialComparisonProfile = { activity: { tests: 0, shots: 0, byCategory: emptyCategoryActivity() }, performance: [], training: [], records: [] };
  if (!value || typeof value !== "object" || Array.isArray(value)) return empty;
  const raw = value as Record<string, unknown>;

  const parseRows = (rows: unknown): ComparisonMetric[] => {
    if (!Array.isArray(rows)) return [];
    return rows.flatMap((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return [];
      const item = row as Record<string, unknown>;
      if (typeof item.key !== "string" || typeof item.label !== "string" || typeof item.value !== "number" || !Number.isFinite(item.value)) return [];
      const category = item.category === "driving" || item.category === "approach" || item.category === "around-the-green" || item.category === "puttning"
        ? item.category
        : undefined;
      return [{
        key: item.key,
        label: item.label,
        value: item.value,
        unit: typeof item.unit === "string" ? item.unit : "",
        decimals: typeof item.decimals === "number" && Number.isFinite(item.decimals) ? item.decimals : 0,
        higherIsBetter: item.higherIsBetter !== false,
        category,
        overview: item.overview !== false,
      }];
    });
  };

  const activityRaw = raw.activity && typeof raw.activity === "object" && !Array.isArray(raw.activity)
    ? raw.activity as Record<string, unknown>
    : {};
  const tests = typeof activityRaw.tests === "number" && Number.isFinite(activityRaw.tests) ? Math.max(0, activityRaw.tests) : 0;
  const shots = typeof activityRaw.shots === "number" && Number.isFinite(activityRaw.shots) ? Math.max(0, activityRaw.shots) : 0;
  const byCategory = emptyCategoryActivity();
  const categoryRaw = activityRaw.byCategory && typeof activityRaw.byCategory === "object" && !Array.isArray(activityRaw.byCategory)
    ? activityRaw.byCategory as Record<string, unknown>
    : {};
  for (const category of ["driving", "approach", "around-the-green", "puttning"] as ComparisonCategory[]) {
    const entry = categoryRaw[category] && typeof categoryRaw[category] === "object" && !Array.isArray(categoryRaw[category])
      ? categoryRaw[category] as Record<string, unknown>
      : {};
    byCategory[category] = {
      tests: typeof entry.tests === "number" && Number.isFinite(entry.tests) ? Math.max(0, entry.tests) : 0,
      shots: typeof entry.shots === "number" && Number.isFinite(entry.shots) ? Math.max(0, entry.shots) : 0,
    };
  }

  return {
    activity: { tests, shots, byCategory },
    performance: parseRows(raw.performance),
    training: parseRows(raw.training),
    records: parseRows(raw.records),
  };
}
