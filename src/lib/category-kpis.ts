import {
  HISTORY_METRICS,
  latestAverage,
  type AnalysisHistoryPoint,
  type HistoryKind,
  type MetricDef,
  type MetricId,
} from "./analysis-history";
import type { CategorySlug } from "./sg-handicap";

export type CategoryKpi = {
  key: string;
  label: string;
  def: MetricDef;
  value: number | undefined;
  /** Antal testpass som snittet bygger på (max 5). */
  count: number;
};

/** Vilka råa nyckeltal som visas per HCP-kategori (snitt av senaste 5 giltiga testpass). */
export const CATEGORY_KPI_SOURCES: Partial<
  Record<CategorySlug, Array<{ kind: HistoryKind; metric: MetricId; label: string }>>
> = {
  driving: [
    { kind: "driving", metric: "avgDrive", label: "Snittlängd drive" },
    { kind: "driving", metric: "fairwayPct", label: "Fairwayträffar" },
    { kind: "driving", metric: "obPct", label: "OB" },
  ],
  approach: [
    { kind: "wedge", metric: "proximity", label: "Wedge · från flagg" },
    { kind: "iron", metric: "proximity", label: "Järn · från flagg" },
  ],
  "around-the-green": [
    { kind: "chipping", metric: "chipPoints", label: "Chip · poäng/boll" },
    { kind: "bunker", metric: "proximity", label: "Bunker · från hål" },
  ],
  puttning: [
    { kind: "short", metric: "avgPutts", label: "Kortputt · puttar/hål" },
    { kind: "long", metric: "avgPutts", label: "Långputt · puttar/hål" },
  ],
};

export function categoryKpis(
  slug: CategorySlug,
  history: (kind: HistoryKind) => AnalysisHistoryPoint[],
  n = 5,
): CategoryKpi[] {
  return (CATEGORY_KPI_SOURCES[slug] ?? []).map((src) => {
    const def = HISTORY_METRICS[src.kind].find((m) => m.id === src.metric)!;
    const { value, count } = latestAverage(history(src.kind), src.metric, n);
    return { key: `${src.kind}-${src.metric}`, label: src.label, def, value, count };
  });
}
