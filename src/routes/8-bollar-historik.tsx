import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Trash2, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
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
  deleteEightBallSession,
  loadEightBallSessions,
  type EightBallSession,
} from "./8-bollar";

export const Route = createFileRoute("/8-bollar-historik")({
  head: () => ({ meta: [{ title: "8-bollsövningen – Progress | SG4" }] }),
  component: EightBallHistoryPage,
});

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });

const TECHNIQUES = ["Chip", "Pitch", "Lobb", "Bunker"] as const;
type Technique = (typeof TECHNIQUES)[number];

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

function techniqueAverage(session: EightBallSession, technique: Technique) {
  if (!Array.isArray(session.scores) || session.scores.length === 0) return null;
  const stationIndexes = STATION_LIST.flatMap((station, index) => station.type === technique ? [index] : []);
  const values: number[] = [];

  for (let round = 0; round < EIGHT_BALL_ROUNDS; round += 1) {
    for (const stationIndex of stationIndexes) {
      const value = session.scores[round * STATION_LIST.length + stationIndex];
      if (typeof value === "number") values.push(value);
    }
  }

  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function EightBallHistoryPage() {
  const [sessions, setSessions] = useState<EightBallSession[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setSessions(loadEightBallSessions());
  }, []);

  function remove(id: string) {
    if (typeof window !== "undefined" && !window.confirm("Vill du ta bort det här testet?")) return;
    setSessions(deleteEightBallSession(id));
  }

  const complete = sessions.filter((s) => typeof s.score === "number");
  const bestScore = complete.length ? Math.max(...complete.map((s) => s.score)) : 0;
  const roundScores = complete.flatMap((s) => s.roundTotals ?? []);
  const bestRound = roundScores.length ? Math.max(...roundScores) : 0;
  const latestFive = complete.slice(-5);
  const recentAverage = latestFive.length
    ? Math.round(latestFive.reduce((sum, s) => sum + s.score, 0) / latestFive.length)
    : 0;
  const recent = [...complete].slice(-12);
  const latest = complete.length ? complete[complete.length - 1] : null;

  const chartData = recent.map((s, i) => ({
    key: s.id,
    label: dateLabel(s.date),
    score: s.score,
    isLast: i === recent.length - 1,
  }));

  const detailed = complete.filter((s) => Array.isArray(s.scores) && s.scores.length > 0);
  const latestDetailed = detailed.length ? detailed[detailed.length - 1] : null;
  const recentDetailed = detailed.slice(-5);

  const techniqueStats = TECHNIQUES.map((technique) => {
    const recentValues = recentDetailed
      .map((session) => techniqueAverage(session, technique))
      .filter((value): value is number => value !== null);
    const allValues = detailed
      .map((session) => techniqueAverage(session, technique))
      .filter((value): value is number => value !== null);
    const latestValue = latestDetailed ? techniqueAverage(latestDetailed, technique) : null;

    return {
      technique,
      recentAvg: recentValues.length ? recentValues.reduce((sum, value) => sum + value, 0) / recentValues.length : null,
      latest: latestValue,
      best: allValues.length ? Math.max(...allValues) : null,
    };
  }).filter((item) => item.recentAvg !== null);

  const strongestTechnique = techniqueStats.length
    ? techniqueStats.reduce((a, b) => (Number(b.recentAvg) > Number(a.recentAvg) ? b : a))
    : null;
  const weakestTechnique = techniqueStats.length
    ? techniqueStats.reduce((a, b) => (Number(b.recentAvg) < Number(a.recentAvg) ? b : a))
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
          <section className="mt-5 rounded-2xl border border-border bg-card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Totalpoäng</p>
            <p className="mt-2 font-display text-6xl leading-none">
              {latest?.score ?? bestScore}
              <span className="ml-2 text-base text-muted-foreground">poäng</span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {latest ? `Senaste testet ${dateLabel(latest.date)} · personbästa ${bestScore} poäng` : `Personbästa ${bestScore} poäng`}
              {latest && latest.score >= bestScore ? " · nytt PB!" : ""}
            </p>
          </section>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <KpiCard label="Bästa totalpoäng" value={String(bestScore)} unit="poäng" />
            <KpiCard label="Snitt senaste 5" value={String(recentAverage)} unit="poäng" hint={`${latestFive.length} senaste test`} />
            <KpiCard label="Bästa varv" value={roundScores.length ? String(bestRound) : "–"} unit={roundScores.length ? "poäng" : undefined} />
            <KpiCard label="Antal tester" value={String(complete.length)} hint="Genomförda test" />
          </div>

          <section className="mt-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-end justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Totalpoäng över tid</p>
              <span className="text-xs text-muted-foreground">Senaste {recent.length}</span>
            </div>
            <div className="mt-4 h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="eightBallFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <YAxis
                    type="number"
                    domain={[0, 160]}
                    ticks={[0, 40, 80, 120, 160]}
                    interval={0}
                    allowDecimals={false}
                    tickFormatter={(value: number) => String(value)}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    tickMargin={6}
                  />
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

          {techniqueStats.length ? (
            <section className="mt-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Styrkor & svagheter</p>
                  <p className="mt-1 text-xs text-muted-foreground">Snittpoäng per slag · senaste {recentDetailed.length} test</p>
                </div>
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Max 4,0</span>
              </div>

              <div className="mt-4 divide-y divide-border">
                {techniqueStats.map((item) => {
                  const isStrongest = item.technique === strongestTechnique?.technique;
                  const isWeakest = item.technique === weakestTechnique?.technique;
                  return (
                    <div key={item.technique} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{item.technique}</p>
                          {isStrongest ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-primary">Styrka</span> : null}
                          {isWeakest && !isStrongest ? <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Fokus</span> : null}
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (Number(item.recentAvg) / 4) * 100)}%` }} />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Senaste 5</p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums">{Number(item.recentAvg).toFixed(1)}<span className="text-xs text-muted-foreground"> / 4</span></p>
                      </div>
                      <div className="w-12 text-right">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Bäst</p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums">{item.best?.toFixed(1) ?? "–"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {strongestTechnique && weakestTechnique ? (
                <p className="mt-4 rounded-xl bg-muted px-3 py-2.5 text-xs text-muted-foreground">
                  <b className="text-foreground">Styrka:</b> {strongestTechnique.technique} {Number(strongestTechnique.recentAvg).toFixed(1)}/4 · <b className="text-foreground">Träningsfokus:</b> {weakestTechnique.technique} {Number(weakestTechnique.recentAvg).toFixed(1)}/4
                </p>
              ) : null}
            </section>
          ) : null}

          <section className="mt-3 rounded-2xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Senaste resultat</p>
            <div className="mt-3 divide-y divide-border">
              {(() => {
                const rows = [...complete].reverse();
                return (showAll ? rows : rows.slice(0, 5)).map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-semibold">{new Date(s.date).toLocaleDateString("sv-SE")}</p>
                      <p className="text-xs text-muted-foreground">Bästa varv {s.roundTotals?.length ? `${Math.max(...s.roundTotals)} poäng` : "–"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-display text-2xl leading-none">{s.score}<span className="ml-1 text-sm text-muted-foreground">poäng</span></p>
                      <button
                        type="button"
                        aria-label="Ta bort test"
                        onClick={() => remove(s.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors active:bg-muted"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>
            {complete.length > 5 ? (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="mt-3 w-full rounded-xl border border-border py-2.5 text-xs font-semibold text-muted-foreground transition-colors active:bg-muted"
              >
                {showAll ? "Visa färre" : `Visa fler (${complete.length - 5})`}
              </button>
            ) : null}
          </section>

          <Link to="/8-bollar" className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground">Gör ett nytt test <ArrowRight className="h-5 w-5" /></Link>
          <Link to="/8-bollar" className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 font-semibold"><Trophy className="h-4 w-4" /> Till testet</Link>
        </>
      )}
    </main>
  );
}
