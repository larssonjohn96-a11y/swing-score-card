import { loadOffTeeSessions } from "@/lib/offtee-store";
import { collectLagHoleOutStarts, collectPuttStarts, puttingMakeStats } from "@/lib/putting-global";
import { PROGRESS_TESTS, summarize } from "@/lib/progress";
import { topScores } from "@/lib/highlights";

export type ComparisonMetric = {
  key: string;
  label: string;
  value: number;
  unit: string;
  decimals: number;
  higherIsBetter: boolean;
};

export type ComparisonTrainingResult = {
  key: string;
  label: string;
  value: number;
  unit: string;
  decimals: number;
  higherIsBetter: boolean;
};

export type SocialComparisonProfile = {
  performance: ComparisonMetric[];
  training: ComparisonTrainingResult[];
  records: ComparisonMetric[];
};

const avg = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const stdDev = (values: number[]) => {
  if (values.length < 2) return 0;
  const mean = avg(values);
  return Math.sqrt(avg(values.map((value) => (value - mean) ** 2)));
};

function puttingOneToTwoPct() {
  const stats = puttingMakeStats(collectPuttStarts());
  const selected = stats.filter((row) => row.distance > 1 && row.distance <= 2);
  const attempts = selected.reduce((sum, row) => sum + row.attempts, 0);
  const made = selected.reduce((sum, row) => sum + row.made, 0);
  return attempts ? (made / attempts) * 100 : undefined;
}

function threePuttAvoidancePct() {
  const rows = collectLagHoleOutStarts();
  if (!rows.length) return undefined;
  return 100 - (rows.filter((row) => row.strokes >= 3).length / rows.length) * 100;
}

export function computeLocalComparisonProfile(): SocialComparisonProfile {
  const performance: ComparisonMetric[] = [];
  const records: ComparisonMetric[] = [];

  const teeShots = loadOffTeeSessions().flatMap((session) => session.shots.filter((shot) => shot.filled));
  if (teeShots.length) {
    const totals = teeShots.map((shot) => shot.total).filter(Number.isFinite);
    const sides = teeShots.map((shot) => shot.sidled).filter(Number.isFinite);
    performance.push(
      { key: "avg-drive", label: "Snittdrive", value: avg(totals), unit: "m", decimals: 0, higherIsBetter: true },
      { key: "longest-drive-test", label: "Längsta drive", value: Math.max(...totals), unit: "m", decimals: 0, higherIsBetter: true },
      { key: "fairway", label: "Fairwayträffar", value: teeShots.filter((shot) => Math.abs(shot.sidled) <= 16).length / teeShots.length * 100, unit: "%", decimals: 0, higherIsBetter: true },
      { key: "driver-dispersion", label: "Driver dispersion", value: stdDev(sides), unit: "m", decimals: 1, higherIsBetter: false },
    );
  }

  const oneToTwo = puttingOneToTwoPct();
  if (oneToTwo !== undefined) performance.push({ key: "putting-1-2", label: "Puttning 1–2 m", value: oneToTwo, unit: "%", decimals: 0, higherIsBetter: true });

  const threePutt = threePuttAvoidancePct();
  if (threePutt !== undefined) performance.push({ key: "three-putt-avoid", label: "3-putt avoidance", value: threePutt, unit: "%", decimals: 0, higherIsBetter: true });

  for (const item of topScores()) {
    if (item.value === undefined || !Number.isFinite(item.value)) continue;
    const higherIsBetter = item.key !== "proximity";
    records.push({
      key: item.key,
      label: item.label,
      value: item.value,
      unit: item.unit,
      decimals: item.decimals,
      higherIsBetter,
    });
  }

  const training = PROGRESS_TESTS.flatMap((test) => {
    const summary = summarize(test);
    if (summary.best === undefined || !Number.isFinite(summary.best)) return [];
    return [{
      key: test.id,
      label: test.title,
      value: summary.best,
      unit: test.unit,
      decimals: test.decimals,
      higherIsBetter: test.higherIsBetter,
    } satisfies ComparisonTrainingResult];
  });

  return { performance, training, records };
}

export function parseComparisonProfile(value: unknown): SocialComparisonProfile {
  const empty: SocialComparisonProfile = { performance: [], training: [], records: [] };
  if (!value || typeof value !== "object" || Array.isArray(value)) return empty;
  const raw = value as Record<string, unknown>;

  const parseRows = (rows: unknown): ComparisonMetric[] => {
    if (!Array.isArray(rows)) return [];
    return rows.flatMap((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return [];
      const item = row as Record<string, unknown>;
      if (typeof item.key !== "string" || typeof item.label !== "string" || typeof item.value !== "number" || !Number.isFinite(item.value)) return [];
      return [{
        key: item.key,
        label: item.label,
        value: item.value,
        unit: typeof item.unit === "string" ? item.unit : "",
        decimals: typeof item.decimals === "number" && Number.isFinite(item.decimals) ? item.decimals : 0,
        higherIsBetter: item.higherIsBetter !== false,
      }];
    });
  };

  return {
    performance: parseRows(raw.performance),
    training: parseRows(raw.training),
    records: parseRows(raw.records),
  };
}
