import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Medal, TrendingDown } from "lucide-react";
import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FIFTY_PUTT_PAR,
  bestFiftyPuttScore,
  loadFiftyPuttSessions,
} from "@/lib/fifty-putts";

export const Route = createFileRoute("/50-bollar-resultat")({
  head: () => ({
    meta: [
      { title: "50-bollsövningen – Resultat | SG4" },
      {
        name: "description",
        content: "Se resultat, personbästa och utveckling över tid för 50-bollsövningen.",
      },
    ],
  }),
  component: FiftyBallResultsPage,
});

function FiftyBallResultsPage() {
  const sessions = loadFiftyPuttSessions();
  const best = bestFiftyPuttScore(sessions);
  const latest = sessions.at(-1) ?? null;
  const chartData = useMemo(
    () =>
      sessions.map((session, index) => ({
        attempt: index + 1,
        score: session.total,
        date: new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short" }).format(
          new Date(session.createdAt),
        ),
      })),
    [sessions],
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 pb-20 pt-8">
      <div className="flex items-center justify-between">
        <Link
          to="/50-bollar"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border"
          aria-label="Tillbaka"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Link
          to="/50-bollar"
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Nytt försök
        </Link>
      </div>

      <header className="mt-7">
        <p className="text-xs uppercase tracking-[0.28em] text-flag">50-bollsövningen</p>
        <h1 className="mt-1 text-5xl leading-none">Resultat</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Följ din totalscore över tid. I den här övningen är lägre score bättre.
        </p>
      </header>

      <section className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-5">
          <Medal className="h-5 w-5 text-primary" />
          <p className="mt-5 text-xs uppercase tracking-wider text-muted-foreground">Bästa resultat</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-5xl">{best ?? "–"}</p>
        </div>
        <div className="rounded-3xl border border-border bg-card p-5">
          <TrendingDown className="h-5 w-5 text-primary" />
          <p className="mt-5 text-xs uppercase tracking-wider text-muted-foreground">Senaste</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-5xl">{latest?.total ?? "–"}</p>
        </div>
        <div className="col-span-2 rounded-3xl border border-border bg-card p-5 md:col-span-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Genomförda</p>
          <p className="mt-4 font-[family-name:var(--font-display)] text-5xl">{sessions.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Referenspar: {FIFTY_PUTT_PAR}</p>
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Utveckling</p>
            <h2 className="mt-1 text-2xl">Score över tid</h2>
          </div>
          <p className="text-xs text-muted-foreground">↓ bättre</p>
        </div>

        {chartData.length ? (
          <div className="mt-5 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} domain={["dataMin - 3", "dataMax + 3"]} />
                <Tooltip
                  formatter={(value) => [`${value} slag`, "Score"]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
                />
                <ReferenceLine y={FIFTY_PUTT_PAR} strokeDasharray="5 5" label={{ value: "Par 72", position: "insideTopRight" }} />
                <Line type="monotone" dataKey="score" stroke="currentColor" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl bg-muted/40 px-4 py-12 text-center text-sm text-muted-foreground">
            Ditt diagram visas här efter första genomförda övningen.
          </div>
        )}
      </section>

      {latest && (
        <section className="mt-5 rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Senaste försöket</p>
              <h2 className="mt-1 text-2xl">Per avstånd</h2>
            </div>
            <span className="font-[family-name:var(--font-display)] text-3xl">{latest.total}</span>
          </div>
          <div className="mt-4 space-y-2">
            {latest.byDistance.map((item) => (
              <div key={item.distance} className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3 text-sm">
                <span>{item.distance} meter</span>
                <span className="font-semibold">
                  {item.strokes} <span className="font-normal text-muted-foreground">/ par {item.par}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-5">
        <h2 className="text-2xl">Historik</h2>
        <div className="mt-3 space-y-2">
          {[...sessions].reverse().map((session) => (
            <div key={session.id} className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
              <div>
                <p className="font-semibold">
                  {new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "long", year: "numeric" }).format(
                    new Date(session.createdAt),
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session.versusPar === 0
                    ? "Par"
                    : session.versusPar > 0
                      ? `+${session.versusPar} mot par`
                      : `${session.versusPar} mot par`}
                </p>
              </div>
              <div className="text-right">
                <p className="font-[family-name:var(--font-display)] text-3xl leading-none">{session.total}</p>
                {session.total === best && <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-primary">PB</p>}
              </div>
            </div>
          ))}
          {!sessions.length && (
            <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Ingen historik ännu.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
