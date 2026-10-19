import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/hooks/use-auth";
import {
  HISTORY_METRICS,
  HISTORY_OPTIONS,
  loadAnalysisHistory,
  metricSeries,
  type AnalysisHistoryPoint,
  type HistoryKind,
  type MetricDef,
  type MetricId,
} from "@/lib/analysis-history";
import { hcpLabel } from "@/lib/sg-handicap";
import { SESSIONS_CHANGED_EVENT } from "@/lib/sessions/sync";
const dateLabel = (value: number) =>
  new Date(value).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
export function formatMetric(def: MetricDef, value: number) {
  if (def.id === "hcp") return hcpLabel(value);
  const n = value.toLocaleString("sv-SE", {
    minimumFractionDigits: def.decimals,
    maximumFractionDigits: def.decimals,
  });
  return def.unit === "%" ? `${n}%` : `${n} ${def.unit}`;
}
export function AnalysisHistoryChart() {
  const [kind, setKind] = useState<HistoryKind>("driving");
  const [metricId, setMetricId] = useState<MetricId>("hcp");
  const [rows, setRows] = useState<AnalysisHistoryPoint[]>([]);
  const { user } = useAuth();
  useEffect(() => {
    const refresh = () => setRows(loadAnalysisHistory(kind, user?.id ?? null));
    refresh();
    window.addEventListener(SESSIONS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(SESSIONS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [kind, user?.id]);
  const metrics = HISTORY_METRICS[kind];
  const def = metrics.find((m) => m.id === metricId) ?? metrics[0];
  const series = useMemo(() => metricSeries(rows, def.id), [rows, def.id]);
  const fmt = (v: number) => formatMetric(def, v);
  const pad = def.id === "hcp" ? 2 : def.unit === "%" ? 5 : def.unit === "m" ? 5 : 1;
  return (
    <section
      className="mt-7 rounded-3xl border border-border bg-card p-4"
      aria-label="Utveckling över tid"
    >
      <h2 className="text-xl font-black">Utveckling över tid</h2>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Test
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as HistoryKind);
              setMetricId("hcp");
            }}
            className="mt-1 min-h-11 w-full rounded-xl border border-border bg-muted/50 px-3 text-sm font-semibold normal-case tracking-normal text-foreground"
          >
            {HISTORY_OPTIONS.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Mätvärde
          <select
            value={def.id}
            onChange={(e) => setMetricId(e.target.value as MetricId)}
            className="mt-1 min-h-11 w-full rounded-xl border border-border bg-muted/50 px-3 text-sm font-semibold normal-case tracking-normal text-foreground"
          >
            {metrics.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id === "hcp" ? "Uppskattat HCP" : `${m.label} (${m.unit})`}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {def.id === "hcp" ? "Uppskattat HCP per test" : `${def.label} per test (${def.unit})`} ·{" "}
        {def.higherIsBetter ? "Högre är bättre" : "Lägre är bättre"}
      </p>
      {series.length ? (
        <>
          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={series}
                margin={{ top: 12, right: 12, bottom: 8, left: -8 }}
                accessibilityLayer
              >
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={
                    series.length === 1
                      ? [series[0].time - 86400000, series[0].time + 86400000]
                      : ["dataMin", "dataMax"]
                  }
                  tickFormatter={dateLabel}
                  minTickGap={35}
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) =>
                    def.id === "hcp" ? hcpLabel(v) : `${Math.round(v)}${def.unit === "%" ? "%" : ""}`
                  }
                  domain={[
                    (min: number) => Math.floor(min - pad),
                    (max: number) => Math.ceil(max + pad),
                  ]}
                  tick={{ fontSize: 10 }}
                  width={46}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  labelFormatter={(value) =>
                    new Date(Number(value)).toLocaleString("sv-SE", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  }
                  formatter={(value) => [fmt(Number(value)), def.label]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--chart-4)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "var(--chart-4)", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {series.length === 1
              ? "Ett test registrerat. Gör ett till för att se din utveckling."
              : `${series.length} test · Senaste ${fmt(series[series.length - 1].value)}`}
          </p>
        </>
      ) : (
        <div className="flex h-44 items-center justify-center text-center text-sm text-muted-foreground">
          {rows.length
            ? "Det här mätvärdet finns inte i dina sparade test ännu."
            : "Inga test registrerade i den här kategorin ännu."}
        </div>
      )}
    </section>
  );
}
