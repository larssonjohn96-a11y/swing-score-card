import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Target, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { groupPei, loadPeiSessions, PEI_GROUPS, rollingEightAverage, type PeiSession } from "@/lib/approach-pei";

export const Route = createFileRoute("/approach-pei-historik")({
  head: () => ({
    meta: [
      { title: "PEI-historik – Approach | SG4" },
      { name: "description", content: "Följ ditt PEI-resultat över tid, personbästa och resultat per avståndskategori." },
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
  const latestSession = sessions.length ? sessions[sessions.length - 1] : null;
  const latest = latestSession?.pei ?? null;
  const rolling = rollingEightAverage(sessions);

  const chartData = useMemo(
    () => sessions.map((session, index) => ({ index: index + 1, date: dateLabel(session.date), pei: Number(session.pei.toFixed(2)) })),
    [sessions],
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-5">
      <div className="flex items-center justify-between">
        <Link to="/approach-pei" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground"><ArrowLeft className="h-4 w-4" /></Link>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Ej HCP-grundande</p>
      </div>

      <p className="mt-5 text-xs uppercase tracking-[0.25em] text-muted-foreground">Approach · PEI</p>
      <h1 className="mt-1 text-4xl leading-none">Resultat över tid</h1>

      {sessions.length ? (
        <>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-border bg-card p-3"><Trophy className="h-4 w-4 text-primary" /><p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">PB</p><p className="mt-1 font-display text-2xl">{best?.toFixed(2)}%</p></div>
            <div className="rounded-2xl border border-border bg-card p-3"><Target className="h-4 w-4 text-primary" /><p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Senast</p><p className="mt-1 font-display text-2xl">{latest?.toFixed(2)}%</p></div>
            <div className="rounded-2xl border border-border bg-card p-3"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Senaste 8</p><p className="mt-6 font-display text-2xl">{rolling !== null ? `${rolling.toFixed(2)}%` : "–"}</p></div>
          </div>

          {latestSession ? (
            <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
              <div className="grid grid-cols-2 border-b border-border bg-muted/70 px-4 py-2 text-xs font-semibold"><span>Avstånd</span><span className="text-right">PEI</span></div>
              {PEI_GROUPS.map((group) => (
                <div key={group.label} className="grid grid-cols-2 px-4 py-2 text-sm">
                  <span>{group.label.replace("–", " till ")}</span>
                  <span className="text-right font-semibold">{groupPei(latestSession.shots, group.min, group.max).toFixed(2)}%</span>
                </div>
              ))}
            </section>
          ) : null}

          <section className="mt-4 rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-glow)]">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">PEI-utveckling</p><p className="mt-1 text-xs text-muted-foreground">{sessions.length} genomförda test</p></div>
              {best !== null ? <span className="text-xs text-muted-foreground">PB {best.toFixed(2)}%</span> : null}
            </div>
            <div className="mt-3 h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <XAxis dataKey="index" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} domain={["auto", "auto"]} />
                  <Tooltip labelFormatter={(value) => { const point = chartData[Number(value) - 1]; return point ? `Test ${value} · ${point.date}` : `Test ${value}`; }} formatter={(value) => [`${Number(value).toFixed(2)}%`, "PEI"]} />
                  {rolling !== null ? <ReferenceLine y={rolling} stroke="currentColor" strokeDasharray="4 4" opacity={0.35} /> : null}
                  <Line type="monotone" dataKey="pei" stroke="currentColor" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="mt-4 rounded-3xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Historik</p>
            <div className="mt-3 space-y-2">
              {[...sessions].reverse().map((session, reverseIndex) => {
                const number = sessions.length - reverseIndex;
                const isBest = best !== null && Math.abs(session.pei - best) < 0.0001;
                return (
                  <div key={session.id} className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
                    <div><p className="text-sm font-semibold">Test {number}</p><p className="text-xs text-muted-foreground">{dateLabel(session.date)}</p></div>
                    <div className="text-right"><p className="font-display text-xl">{session.pei.toFixed(2)}%</p>{isBest ? <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">PB</p> : null}</div>
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
          <Link to="/approach-pei" className="mt-5 inline-flex rounded-2xl bg-primary px-5 py-3 font-semibold text-primary-foreground">Till PEI-testet</Link>
        </div>
      )}
    </main>
  );
}
