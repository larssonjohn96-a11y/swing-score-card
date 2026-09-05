import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
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
import { LIGHT_SURFACE } from "./8-bollar";
import {
  deleteLag18Session,
  distanceGroups,
  fmtScore,
  loadLag18Sessions,
  sumRange,
  type Lag18Session,
} from "@/lib/lagputt18";

export const Route = createFileRoute("/lagputt-historik")({
  head: () => ({
    meta: [
      { title: "Lag putt – Progress | SG4" },
      {
        name: "description",
        content: "Följ utvecklingen i lagputtestet: totalscore över tid, bästa nio och starkaste avstånd.",
      },
      { property: "og:title", content: "Lag putt – Progress | SG4" },
      { property: "og:description", content: "Din utveckling i lagputtestet, 18 puttar 8–22 m." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LagPuttHistoryPage,
});

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl leading-none">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function LagPuttHistoryPage() {
  const [sessions, setSessions] = useState<Lag18Session[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setSessions(loadLag18Sessions());
  }, []);

  function remove(id: string) {
    if (typeof window !== "undefined" && !window.confirm("Vill du ta bort det här testet?")) return;
    setSessions(deleteLag18Session(id));
  }

  const best = sessions.length ? Math.min(...sessions.map((s) => s.total)) : 0;
  const average = sessions.length
    ? sessions.reduce((sum, s) => sum + s.total, 0) / sessions.length
    : 0;
  const latest = sessions.length ? sessions[sessions.length - 1] : null;
  const recent = sessions.slice(-12);
  const halves = sessions.flatMap((s) => [sumRange(s.scores, 0, 9), sumRange(s.scores, 9, 18)]);
  const bestHalf = halves.length ? Math.min(...halves) : 0;

  const chartData = recent.map((s, i) => ({
    key: s.id,
    label: dateLabel(s.date),
    score: s.total,
    isLast: i === recent.length - 1,
  }));

  const groups = distanceGroups(sessions.map((s) => s.scores));
  const strongest = groups.length ? groups.reduce((a, b) => (b.avg < a.avg ? b : a)) : null;
  const weakest = groups.length ? groups.reduce((a, b) => (b.avg > a.avg ? b : a)) : null;

  return (
    <main
      style={LIGHT_SURFACE}
      className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-16 pt-6 text-foreground"
    >
      <header className="flex items-center gap-3">
        <Link to="/lagputt" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold leading-tight">Lag putt</h1>
          <p className="text-xs text-muted-foreground">Progress</p>
        </div>
      </header>

      {sessions.length === 0 ? (
        <section className="mt-8 rounded-3xl border border-dashed border-border bg-card p-8 text-center">
          <p className="font-semibold">Ingen historik ännu</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Genomför ditt första lagputtest så börjar utvecklingen sparas här.
          </p>
          <Link to="/lagputt" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 font-semibold text-primary-foreground">
            Gör ett test <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      ) : (
        <>
          <section className="mt-5 rounded-2xl border border-border bg-card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Totalscore</p>
            <p className="mt-2 font-display text-6xl leading-none">
              {fmtScore(latest?.total ?? best)}
              <span className="ml-2 text-base text-muted-foreground">poäng</span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {latest ? `Senaste testet ${dateLabel(latest.date)} · bästa ${fmtScore(best)} poäng` : ""} · lägre är bättre
            </p>
          </section>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <KpiCard label="Bästa resultat" value={fmtScore(best)} hint="Lägsta totalscore" />
            <KpiCard label="Bästa nio" value={fmtScore(bestHalf)} hint="Lägsta niohålsscore" />
            <KpiCard label="Snittresultat" value={fmtScore(Math.round(average))} hint="Alla test" />
            <KpiCard label="Antal tester" value={String(sessions.length)} hint="Genomförda test" />
          </div>

          <section className="mt-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-end justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Totalscore över tid</p>
              <span className="text-xs text-muted-foreground">Senaste {recent.length}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Lägre är bättre – kurvan ska falla.</p>
            <div className="mt-4 h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="lagPuttFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <YAxis
                    type="number"
                    domain={[-36, 54]}
                    ticks={[-36, -18, 0, 18, 36, 54]}
                    interval={0}
                    allowDecimals={false}
                    reversed
                    tickFormatter={(value: number) => fmtScore(value)}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    tickMargin={6}
                  />
                  <Tooltip
                    formatter={(value) => [`${fmtScore(Number(value))} poäng`, "Totalscore"]}
                    contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fill="url(#lagPuttFill)"
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
            {sessions.length === 1 ? (
              <p className="mt-2 text-xs text-muted-foreground">Endast ett test hittills – gör fler test så syns kurvan här.</p>
            ) : null}
          </section>

          {strongest && weakest ? (
            <section className="mt-3 rounded-2xl border border-border bg-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Analys</p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between rounded-xl bg-primary/8 px-3 py-2.5">
                  <span className="text-sm"><b className="text-primary">Starkast:</b> {strongest.distance} m</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{strongest.avg.toFixed(1)} snitt</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2.5">
                  <span className="text-sm"><b>Fokus:</b> {weakest.distance} m</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{weakest.avg.toFixed(1)} snitt</span>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Snittpoäng per måldistans över alla test – lägre är starkare.</p>
            </section>
          ) : null}

          <section className="mt-3 rounded-2xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Senaste resultat</p>
            <div className="mt-3 divide-y divide-border">
              {(() => {
                const rows = [...sessions].reverse();
                return (showAll ? rows : rows.slice(0, 5)).map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-semibold">{new Date(s.date).toLocaleDateString("sv-SE")}</p>
                      <p className="text-xs text-muted-foreground">
                        OUT {fmtScore(sumRange(s.scores, 0, 9))} · IN {fmtScore(sumRange(s.scores, 9, 18))}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-display text-2xl leading-none">
                        {fmtScore(s.total)}<span className="ml-1 text-sm text-muted-foreground">poäng</span>
                      </p>
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
            {sessions.length > 5 ? (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="mt-3 w-full rounded-xl border border-border py-2.5 text-xs font-semibold text-muted-foreground transition-colors active:bg-muted"
              >
                {showAll ? "Visa färre" : `Visa fler (${sessions.length - 5})`}
              </button>
            ) : null}
          </section>

          <Link to="/lagputt" className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground">
            Kör testet igen <ArrowRight className="h-5 w-5" />
          </Link>
        </>
      )}
    </main>
  );
}
