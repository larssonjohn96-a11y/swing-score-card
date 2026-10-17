import { precisionScoreFromPei } from "@/lib/precision-score";
import { approachHistorySummary, type ApproachHistoryRow } from "@/lib/approach-history";
const fmt = (value: number | null, unit: string) =>
  value === null || !Number.isFinite(value) ? "–" : `${value.toFixed(1).replace(".", ",")} ${unit}`;
export function ApproachLevelSummary({ rows }: { rows: ApproachHistoryRow[] }) {
  const summary = approachHistorySummary(rows);
  if (!summary.count) return null;
  return (
    <section className="rounded-3xl border border-blue-100 bg-white p-4 text-slate-950 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-black">Din nivå</h2>
        <span className="text-[10px] font-bold uppercase tracking-[.15em] text-slate-400">
          {summary.count} test
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Senaste 5", metrics: summary.recent },
          { label: "Senaste test", metrics: summary.latest },
        ].map(({ label, metrics }) => (
          <div key={label} className="rounded-2xl bg-slate-50 p-4 text-center">
            <p className="text-[11px] font-bold text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-black tabular-nums tracking-tight">
              {fmt(metrics?.meters ?? null, "m")}
            </p>
            <p className="mt-1 text-[10px] font-medium text-slate-400">Snitt från flaggan</p>
            <div className="mt-3 border-t border-slate-200/70 pt-2">
              <p className="text-lg font-bold tabular-nums text-blue-600">
                {fmt(metrics?.pei == null ? null : precisionScoreFromPei(metrics.pei), "/100")}
              </p>
              <p className="text-[10px] font-semibold text-slate-400">Precision Score</p>
            </div>
          </div>
        ))}
      </div>
      {summary.recentCount < 5 && (
        <p className="mt-3 text-center text-[10px] text-slate-400">
          Snitt baserat på {summary.recentCount} {summary.recentCount === 1 ? "test" : "tester"}{" "}
          hittills.
        </p>
      )}
    </section>
  );
}
