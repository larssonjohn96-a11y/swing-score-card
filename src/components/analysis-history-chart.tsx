import { useEffect, useState } from "react";
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
  HISTORY_OPTIONS,
  loadAnalysisHistory,
  type AnalysisHistoryPoint,
  type HistoryKind,
} from "@/lib/analysis-history";
import { hcpLabel } from "@/lib/sg-handicap";
import { SESSIONS_CHANGED_EVENT } from "@/lib/sessions/sync";
const dateLabel = (value: number) =>
  new Date(value).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
export function AnalysisHistoryChart() {
  const [kind, setKind] = useState<HistoryKind>("driving");
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
  return (
    <section
      className="mt-7 rounded-3xl border border-slate-200 bg-white p-4"
      aria-label="Utveckling över tid"
    >
      <h2 className="text-xl font-black">Utveckling över tid</h2>
      <label htmlFor="analysis-history-kind" className="sr-only">
        Välj kategori
      </label>
      <select
        id="analysis-history-kind"
        value={kind}
        onChange={(e) => setKind(e.target.value as HistoryKind)}
        className="mt-4 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold"
      >
        {HISTORY_OPTIONS.map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
      <p className="mt-3 text-xs text-slate-500">Uppskattat HCP per test · Lägre är bättre</p>
      {rows.length ? (
        <>
          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={rows}
                margin={{ top: 12, right: 12, bottom: 8, left: -12 }}
                accessibilityLayer
              >
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={
                    rows.length === 1
                      ? [rows[0].time - 86400000, rows[0].time + 86400000]
                      : ["dataMin", "dataMax"]
                  }
                  tickFormatter={dateLabel}
                  minTickGap={35}
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={hcpLabel}
                  domain={[
                    (min: number) => Math.floor(min - 2),
                    (max: number) => Math.ceil(max + 2),
                  ]}
                  tick={{ fontSize: 10 }}
                  width={42}
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
                  formatter={(value) => [hcpLabel(Number(value)), "HCP"]}
                />
                <Line
                  type="linear"
                  dataKey="hcp"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#2563eb", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {rows.length === 1
              ? "Ett test registrerat. Gör ett till för att se din utveckling."
              : `${rows.length} test · Senaste HCP ${hcpLabel(rows[rows.length - 1].hcp)}`}
          </p>
        </>
      ) : (
        <div className="flex h-44 items-center justify-center text-center text-sm text-slate-500">
          Inga test registrerade i den här kategorin ännu.
        </div>
      )}
    </section>
  );
}
