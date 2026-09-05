import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Trophy } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Dot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  EIGHT_BALL_ROUNDS,
  LIGHT_SURFACE,
  STATION_LIST,
  loadEightBallSessions,
} from "./8-bollar";

export const Route = createFileRoute("/8-bollar-historik")({
  head: () => ({ meta: [{ title: "8-bollsövningen – Progress | SG4" }] }),
  component: EightBallHistoryPage,
});

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });

function KpiCard({ label, value, unit, hint }: { label: string; value: string; unit?: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl leading-none">
        {value}
        {unit ? <span className="ml-1 text-sm text-muted-foreground">{unit}</span> : null}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function EightBallHistoryPage() {
  const sessions = loadEightBallSessions();
  const complete = sessions.filter((s) => typeof s.score === "number");
  const bestScore = complete.length ? Math.max(...complete.map((s) => s.score)) : 0;
  const roundScores = complete.flatMap((s) => s.roundTotals ?? []);
  const bestRound = roundScores.length ? Math.max(...roundScores) : 0;
  const average = complete.length
    ? Math.round(complete.reduce((sum, s) => sum + s.score, 0) / complete.length)
    : 0;
  const recent = [...complete].slice(-12);

  const chartData = recent.map((s, i) => ({
    key: s.id,
    label: dateLabel(s.date),
    score: s.score,
    best: s.roundTotals?.length ? Math.max(...s.roundTotals) : null,
    isLast: i === recent.length - 1,
  }));

  const detailed = complete.filter((s) => Array.isArray(s.scores) && s.scores.length > 0);
  const stationTotals = detailed.length
    ? STATION_LIST.map((station, stationIdx) => {
        let sum = 0;
        let count = 0;
        for (const session of detailed) {
          for (let r = 0; r < EIGHT_BALL_ROUNDS; r += 1) {
            const value = session.scores?.[r * STATION_LIST.length + stationIdx];
            if (typeof value === "number") {
              sum += value;
              count += 1;
            }
          }
        }
        return { ...station, index: stationIdx, avg: count ? sum / count : 0, count };
      }).filter((s) => s.count > 0)
    : [];
  const strongest = stationTotals.length
    ? stationTotals.reduce((a, b) => (b.avg > a.avg ? b : a))
    : null;
  const weakest = stationTotals.length
    ? stationTotals.reduce((a, b) => (b.avg < a.avg ? b : a))
    : null;

  return (
    <main
      style={LIGHT_SURFACE}
      className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-16 pt-6 text-foreground"
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/8-bollar" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <h1 className="text-lg font-semibold leading-tight">8-bollsövningen</h1>
            <p className="text-xs text-muted-foreground">Progress</p>
          </div>
        </div>
      </header>

      {complete.length === 0 ? (
        <section className="mt-8 rounded-3xl border border-dashed border-border bg-card p-8 text-center">
          <p className="font-semibold">Ingen historik ännu</p>
          <p className="mt-2 text-xs text-muted-foreground">Genomför ditt första test så börjar utvecklingen sparas här.</p>
          <Link to="/8-bollar" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 font-semibold text-primary-foreground">Gör ett nytt test <ArrowRight className="h-4 w-4" /></Link>
        </section>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <KpiCard label="Bästa totalpoäng" value={String(bestScore)} unit="poäng" />
            <KpiCard label="Bästa varv" value={roundScores.length ? String(bestRound) : "–"} unit={roundScores.length ? "poäng" : undefined} />
            <KpiCard label="Snittresultat" value={String(average)} unit="poäng" />
            <KpiCard label="Antal tester" value={String(complete.length)} hint="Genomförda test" />
          </div>

          <section className="mt-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-end justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Totalpoäng över tid</p>
              <span className="text-xs text-muted-foreground">Senaste {recent.length}</span>
            </div>
            <div className="mt-4 h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="eightBallFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 160]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={34} />
                  <Tooltip
                    formatter={(value) => [`${value} poäng`, "Totalpoäng"]}
                    contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fill="url(#eightBallFill)"
                    dot={(props) => {
                      const { key, ...rest } = props as never as { key?: string } & Record<string, unknown>;
                      const isLast = (rest as { payload?: { isLast?: boolean } }).payload?.isLast;
                      return (
                        <Dot
                          key={key}
                          {...(rest as object)}
                          r={isLast ? 5 : 3}
                          fill="var(--primary)"
                          stroke="var(--card)"
                          strokeWidth={isLast ? 3 : 1.5}
                        />
                      );
                    }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {complete.length === 1 ? (
              <p className="mt-2 text-xs text-muted-foreground">Endast ett test hittills – gör fler test så syns utvecklingskurvan här.</p>
            ) : null}
          </section>

          {roundScores.length ? (
            <section className="mt-3 rounded-2xl border border-border bg-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Bästa varv per test</p>
              <div className="mt-4 h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 10, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 32]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={34} />
                    <Tooltip
                      formatter={(value) => [`${value} poäng`, "Bästa varv"]}
                      contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }}
                    />
                    <Bar dataKey="best" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          ) : null}

          <section className="mt-3 rounded-2xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Senaste resultat</p>
            <div className="mt-3 divide-y divide-border">
              {[...complete].reverse().slice(0, 10).map((s) => (
                <div key={s.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold">{new Date(s.date).toLocaleDateString("sv-SE")}</p>
                    <p className="text-xs text-muted-foreground">Bästa varv {s.roundTotals?.length ? `${Math.max(...s.roundTotals)} poäng` : "–"}</p>
                  </div>
                  <p className="font-display text-2xl leading-none">{s.score}<span className="ml-1 text-sm text-muted-foreground">poäng</span></p>
                </div>
              ))}
            </div>
          </section>

          {strongest && weakest ? (
            <section className="mt-3 rounded-2xl border border-border bg-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Analys</p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between rounded-xl bg-primary/8 px-3 py-2.5">
                  <span className="text-sm"><b className="text-primary">Starkast:</b> {strongest.type} {strongest.distance} m</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{strongest.avg.toFixed(1)} poäng</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2.5">
                  <span className="text-sm"><b>Fokus:</b> {weakest.type} {weakest.distance} m</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{weakest.avg.toFixed(1)} poäng</span>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Snittpoäng per slag på respektive station.</p>
            </section>
          ) : null}

          <Link to="/8-bollar" className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground">Gör ett nytt test <ArrowRight className="h-5 w-5" /></Link>
          <Link to="/8-bollar" className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 font-semibold"><Trophy className="h-4 w-4" /> Till testet</Link>
        </>
      )}
    </main>
  );
}
