import { Link, createFileRoute } from "@tanstack/react-router";
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
import { loadPrecisionSessions, type PrecisionSession } from "@/lib/precision-store";

export const Route = createFileRoute("/precision-historik")({
  head: () => ({
    meta: [
      { title: "Historik – Approach Test | SG4" },
      {
        name: "description",
        content:
          "Följ utvecklingen av din Approach Score, ditt uppskattade approach-handicap och snittavståndet till flaggan över tid.",
      },
      { property: "og:title", content: "Historik – Approach Test" },
      {
        property: "og:description",
        content: "Se hur Approach Score och precision utvecklas test för test.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrecisionHistoryPage,
});

function PrecisionHistoryPage() {
  const [sessions, setSessions] = useState<PrecisionSession[]>([]);

  useEffect(() => {
    setSessions(loadPrecisionSessions());
  }, []);

  const chartData = sessions.map((s) => ({
    label: new Date(s.date).toLocaleDateString("sv-SE", { day: "2-digit", month: "2-digit" }),
    score: s.score ?? 0,
  }));

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-8">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Approach Test</p>
          <h1 className="text-4xl leading-none">Historik</h1>
        </div>
        <Link
          to="/precision"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Till testet
        </Link>
      </header>

      {sessions.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Inga tester sparade än. Genomför Approach Test så visas utvecklingen här.
        </p>
      ) : (
        <>
          <section className="mt-6 rounded-3xl border border-border bg-card p-4">
            <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
              Approach Score över tid
            </h2>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="currentColor" />
                  <Tooltip formatter={(v: number) => `${v} / 100`} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="mt-6 space-y-2">
            <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
              Alla tester
            </h2>
            {[...sessions].reverse().map((s) => (
              <div key={s.id} className="rounded-2xl border border-border bg-card px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {new Date(s.date).toLocaleDateString("sv-SE")}{" "}
                    <span className="text-muted-foreground">
                      {new Date(s.date).toLocaleTimeString("sv-SE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                  <span className="font-[family-name:var(--font-display)] text-2xl leading-none">
                    {s.score ?? "–"}
                    <span className="text-sm text-muted-foreground">/100</span>
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.avgProximity.toFixed(1)} m till flaggan
                  {s.avgProximityPct !== undefined
                    ? ` · ${s.avgProximityPct.toFixed(1)} %`
                    : ""}{" "}
                  · est. hcp {s.handicap !== undefined ? s.handicap.toFixed(1) : "–"} · konsistens{" "}
                  {s.consistency}
                </p>
                {s.note ? <p className="text-xs text-muted-foreground">{s.note}</p> : null}
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
