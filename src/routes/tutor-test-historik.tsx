import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Trash2, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LIGHT_SURFACE } from "./8-bollar";
import {
  TUTOR_ROLLING_WINDOW,
  bestRollingAverage,
  deleteTutorSession,
  formatTutorAverage,
  loadTutorSessions,
  recentAverage,
  tutorProgress,
  type TutorSession,
} from "@/lib/tutor-test";

export const Route = createFileRoute("/tutor-test-historik")({
  head: () => ({ meta: [{ title: "Tutor – Progress | SG4" }] }),
  component: TutorHistoryPage,
});

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

function TutorHistoryPage() {
  const [sessions, setSessions] = useState<TutorSession[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setSessions(loadTutorSessions());
  }, []);

  const points = useMemo(() => tutorProgress(sessions), [sessions]);
  const rollingAverage = recentAverage(sessions);
  const bestAverage = bestRollingAverage(sessions);
  const latest = sessions.at(-1);
  const latest20 = sessions.slice(-TUTOR_ROLLING_WINDOW);
  const perfect20 = latest20.filter((session) => session.score === 10).length;
  const visibleHistory = [...sessions].reverse();
  const chartPoints = points.slice(-60).map((point) => ({
    ...point,
    label: dateLabel(point.date),
  }));

  const previousWindowAverage =
    sessions.length >= TUTOR_ROLLING_WINDOW * 2
      ? sessions
          .slice(-TUTOR_ROLLING_WINDOW * 2, -TUTOR_ROLLING_WINDOW)
          .reduce((sum, session) => sum + session.score, 0) / TUTOR_ROLLING_WINDOW
      : null;
  const delta = previousWindowAverage === null ? null : rollingAverage - previousWindowAverage;

  function remove(id: string) {
    if (typeof window !== "undefined" && !window.confirm("Vill du ta bort det här testet?")) return;
    setSessions(deleteTutorSession(id));
  }

  return (
    <main
      style={LIGHT_SURFACE}
      className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-16 pt-6 text-foreground"
    >
      <header className="flex items-center gap-3">
        <Link
          to="/tutor-test"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold leading-tight">Tutor</h1>
          <p className="text-xs text-muted-foreground">Progress</p>
        </div>
      </header>

      {sessions.length === 0 ? (
        <section className="mt-8 rounded-3xl border border-dashed border-border bg-card p-8 text-center">
          <p className="font-semibold">Ingen historik ännu</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Genomför ditt första Tutor-test så börjar utvecklingen sparas här.
          </p>
          <Link
            to="/tutor-test"
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
          >
            Gör ett test <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      ) : (
        <>
          <section className="mt-5 rounded-3xl border border-primary/20 bg-tint p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              {sessions.length >= TUTOR_ROLLING_WINDOW
                ? "20-testers snitt"
                : `Snitt hittills · ${sessions.length} test`}
            </p>
            <div className="mt-2 flex items-end justify-between gap-4">
              <p className="font-display text-6xl leading-none text-primary">
                {formatTutorAverage(rollingAverage)}
              </p>
              {delta !== null ? (
                <p className={`pb-1 text-sm font-semibold ${delta >= 0 ? "text-primary" : "text-destructive"}`}>
                  {delta >= 0 ? "+" : ""}{formatTutorAverage(delta)}
                </p>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {sessions.length >= TUTOR_ROLLING_WINDOW
                ? `Senaste ${TUTOR_ROLLING_WINDOW} tester · ${Math.round(rollingAverage * 10)}% genom gaten`
                : `${TUTOR_ROLLING_WINDOW - sessions.length} test kvar tills det riktiga 20-testerssnittet är aktivt.`}
            </p>
          </section>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <Kpi
              label="Senaste test"
              value={`${latest?.score ?? 0}/10`}
              hint={latest ? dateLabel(latest.date) : ""}
            />
            <Kpi
              label="PB · 20-test snitt"
              value={bestAverage === null ? "–" : formatTutorAverage(bestAverage)}
              hint={bestAverage === null ? "Kräver 20 test" : "Bästa rullande snitt"}
            />
            <div className="col-span-2">
              <Kpi
                label="Perfekta test"
                value={String(perfect20)}
                hint={`10/10 av senaste ${latest20.length} test`}
              />
            </div>
          </div>

          <section className="mt-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  20-testers snitt över tid
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Rullande snitt · högre är bättre</p>
              </div>
              <span className="text-xs text-muted-foreground">Senaste {Math.min(points.length, 60)}</span>
            </div>
            <div className="mt-4 h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartPoints} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tutorFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.24} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    domain={[0, 10]}
                    ticks={[0, 2, 4, 6, 8, 10]}
                    width={28}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value, name, props) => {
                      const count = props.payload?.rollingCount ?? 0;
                      return [`${formatTutorAverage(Number(value))} (${count} test)`, "Snitt"];
                    }}
                    contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="rollingAverage"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fill="url(#tutorFill)"
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="mt-3 rounded-2xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Senaste resultat
            </p>
            <div className="mt-3 divide-y divide-border">
              {(showAll ? visibleHistory : visibleHistory.slice(0, 5)).map((session) => (
                <div key={session.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold">{new Date(session.date).toLocaleDateString("sv-SE")}</p>
                    <p className="text-xs text-muted-foreground">{session.score * 10}% genom Tutor</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-display text-2xl leading-none">
                      {session.score}<span className="ml-1 text-sm text-muted-foreground">/10</span>
                    </p>
                    <button
                      type="button"
                      aria-label="Ta bort test"
                      onClick={() => remove(session.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground active:bg-muted"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {sessions.length > 5 ? (
              <button
                type="button"
                onClick={() => setShowAll((value) => !value)}
                className="mt-3 w-full rounded-xl border border-border py-2.5 text-xs font-semibold text-muted-foreground active:bg-muted"
              >
                {showAll ? "Visa färre" : `Visa fler (${sessions.length - 5})`}
              </button>
            ) : null}
          </section>

          {bestAverage !== null && Math.abs(bestAverage - rollingAverage) < 0.001 ? (
            <p className="mx-auto mt-4 inline-flex items-center gap-1.5 rounded-full bg-tint px-3 py-1.5 text-xs font-semibold text-primary">
              <Trophy className="h-3.5 w-3.5" /> Du ligger på ditt bästa 20-testerssnitt
            </p>
          ) : null}

          <Link
            to="/tutor-test"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground"
          >
            Kör testet igen <ArrowRight className="h-5 w-5" />
          </Link>
        </>
      )}
    </main>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl leading-none">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
