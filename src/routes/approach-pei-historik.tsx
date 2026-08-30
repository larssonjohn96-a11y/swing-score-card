import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Target, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { loadPeiSessions, rollingEightAverage, type PeiSession } from "@/lib/approach-pei";

export const Route = createFileRoute("/approach-pei-historik")({
  head: () => ({
    meta: [
      { title: "PEI-historik – Approach | SG4" },
      {
        name: "description",
        content: "Följ ditt PEI-resultat över tid, personbästa och snitt över de senaste åtta testerna.",
      },
    ],
  }),
  component: ApproachPeiHistoryPage,
});

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short" }).format(new Date(date));
}

function ApproachPeiHistoryPage() {
  const [sessions] = useState<PeiSession[]>(() => loadPeiSessions());
  const best = sessions.length ? Math.min(...sessions.map((session) => session.pei)) : null;
  const latest = sessions.length ? sessions[sessions.length - 1].pei : null;
  const rolling = rollingEightAverage(sessions);

  const chartData = useMemo(
    () =>
      sessions.map((session, index) => ({
        index: index + 1,
        date: dateLabel(session.date),
        pei: Number(session.pei.toFixed(2)),
      })),
    [sessions],
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-6">
      <div className="flex items-center justify-between">
        <Link
          to="/approach-pei"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Ej HCP-grundande
        </p>
      </div>

      <p className="mt-6 text-xs uppercase tracking-[0.25em] text-muted-foreground">Approach · PEI</p>
      <h1 className="mt-1 text-4xl leading-none">Resultat över tid</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Lägre PEI är bättre. Grafen visar varje genomfört 18-bollarstest i kronologisk ordning.
      </p>

      {sessions.length ? (
        <>
          <div className="mt-6 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-border bg-card p-3">
              <Trophy className="h-4 w-4 text-primary" />
              <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">PB</p>
              <p className="mt-1 font-display text-2xl">{best?.toFixed(2)}%</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-3">
              <Target className="h-4 w-4 text-primary" />
              <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Senast</p>
              <p className="mt-1 font-display text-2xl">{latest?.toFixed(2)}%</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Senaste 8</p>
              <p className="mt-6 font-display text-2xl">{rolling !== null ? `${rolling.toFixed(2)}%` : "–"}</p>
            </div>
          </div>

          <section className="mt-5 rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-glow)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">PEI-utveckling</p>
                <p className="mt-1 text-xs text-muted-foreground">{sessions.length} genomförda test</p>
              </div>
              {best !== null ? <span className="text-xs text-muted-foreground">PB {best.toFixed(2)}%</span> : null}
            </div>

            <div className="mt-5 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <XAxis dataKey="index" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} domain={["auto", "auto"]} />
                  <Tooltip
                    labelFormatter={(value) => {
                      const point = chartData[Number(value) - 1];
                      return point ? `Test ${value} · ${point.date}` : `Test ${value}`;
                    }}
                    formatter={(value) => [`${Number(value).toFixed(2)}%`, "PEI"]}
                  />
                  {rolling !== null ? (
                    <ReferenceLine y={rolling} stroke="currentColor" strokeDasharray="4 4" opacity={0.35} />
                  ) : null}
                  <Line type="monotone" dataKey="pei" stroke="currentColor" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="mt-5 rounded-3xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Historik</p>
            <div className="mt-3 space-y-2">
              {[...sessions].reverse().map((session, reverseIndex) => {
                const number = sessions.length - reverseIndex;
                const isBest = best !== null && Math.abs(session.pei - best) < 0.0001;
                return (
                  <div key={session.id} className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">Test {number}</p>
                      <p className="text-xs text-muted-foreground">{dateLabel(session.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-xl">{session.pei.toFixed(2)}%</p>
                      {isBest ? <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">PB</p> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      ) : (
        <div className="mt-8 rounded-3xl border border-dashed border-border p-8 text-center">
          <Target className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 font-display text-2xl">Ingen historik ännu</h2>
          <p className="mt-2 text-sm text-muted-foreground">Genomför ditt första 18-bollars PEI-test så visas utvecklingen här.</p>
          <Link to="/approach-pei" className="mt-5 inline-flex rounded-2xl bg-primary px-5 py-3 font-semibold text-primary-foreground">
            Till PEI-testet
          </Link>
        </div>
      )}
    </main>
  );
}
