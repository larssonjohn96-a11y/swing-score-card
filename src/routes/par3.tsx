import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  PAR3_DISTANCES,
  PAR3_TOTAL_SHOTS,
  deletePar3Session,
  emptyPar3Shots,
  loadPar3Sessions,
  par3BestWorst,
  par3OverallPct,
  par3StatsByDistance,
  savePar3Session,
  mean,
  stdDev,
  type Par3Session,
  type Par3Shot,
} from "@/lib/par3";

export const Route = createFileRoute("/par3")({
  head: () => ({
    meta: [
      { title: "Approach precision test – par 3 | Golfträning" },
      {
        name: "description",
        content:
          "Par 3-testet: 20 slag mot 110–170 m. Mät avstånd till hål per klubba, se snitt i meter och procent samt spridning över tid.",
      },
      { property: "og:title", content: "Approach precision test – par 3" },
      {
        property: "og:description",
        content: "5 avstånd × 2 slag × 2 varv. Precision med järn mot typiska par 3-avstånd.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Par3Page,
});

function Par3Page() {
  const [shots, setShots] = useState<Par3Shot[]>(emptyPar3Shots);
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [done, setDone] = useState(false);
  const [notes, setNotes] = useState("");
  const [sessions, setSessions] = useState<Par3Session[]>([]);

  useEffect(() => {
    setSessions(loadPar3Sessions());
  }, []);

  const current = shots[index];
  const played = done ? shots : shots.slice(0, index);
  const stats = par3StatsByDistance(played);
  const { best: bestDist, worst: worstDist } = par3BestWorst(played);

  function commit() {
    const num = Math.max(0, Number(value.replace(",", ".")) || 0);
    const next = shots.map((s, i) => (i === index ? { ...s, proximity: num } : s));
    setShots(next);
    setValue("");
    if (index + 1 >= PAR3_TOTAL_SHOTS) setDone(true);
    else setIndex(index + 1);
  }

  function save() {
    const record = savePar3Session(shots, notes);
    setSessions((prev) => [...prev, record]);
    setNotes("");
  }

  function reset() {
    setShots(emptyPar3Shots());
    setIndex(0);
    setValue("");
    setDone(false);
  }

  function remove(id: string) {
    setSessions(deletePar3Session(id));
  }

  const avg = mean(played.map((s) => s.proximity));
  const spread = stdDev(played.map((s) => s.proximity));
  const pct = par3OverallPct(played);

  const barData = stats.map((s) => ({
    label: `${s.distance} m`,
    pct: Number(s.pct.toFixed(1)),
  }));

  const chartData = sessions.map((s) => ({
    date: new Date(s.date).toLocaleDateString("sv-SE", { day: "numeric", month: "short" }),
    pct: Number(s.pct.toFixed(1)),
    avg: Number(s.avgProximity.toFixed(1)),
  }));

  const bestSession = sessions.reduce<Par3Session | null>(
    (acc, s) => (!acc || s.pct < acc.pct ? s : acc),
    null,
  );
  const latest = sessions.length ? sessions[sessions.length - 1] : null;

  const clubFor = (d: number) => PAR3_DISTANCES.find((x) => x.distance === d)?.club ?? "";

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Par 3 · 20 slag
          </p>
          <h1 className="text-4xl leading-none">Approach precision</h1>
        </div>
        <Link
          to="/kategori/$slug"
          params={{ slug: "approach" }}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Tillbaka
        </Link>
      </header>

      <section className="mt-6 rounded-3xl border border-border bg-card p-6 text-center shadow-[var(--shadow-glow)]">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          {done ? "Snittavstånd till hål" : "Snitt hittills"}
        </p>
        <p className="font-[family-name:var(--font-display)] text-7xl leading-none text-flag">
          {avg.toFixed(1)}
          <span className="ml-2 text-2xl text-muted-foreground">m</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {played.length
            ? `${pct.toFixed(1)} % av slaglängden · spridning ${spread.toFixed(1)} m`
            : `Slag 1 av ${PAR3_TOTAL_SHOTS}`}
        </p>
      </section>

      {done ? (
        <section className="mt-6 rounded-3xl border border-border bg-card p-6">
          <h2 className="text-2xl">Testet är klart</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {bestDist && worstDist
              ? `Bäst: ${bestDist.distance} m (${bestDist.pct.toFixed(1)} %) · Sämst: ${worstDist.distance} m (${worstDist.pct.toFixed(1)} %)`
              : null}
          </p>
          <label htmlFor="notes" className="mt-5 block text-sm text-muted-foreground">
            Anteckning (valfritt)
          </label>
          <input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Vind, bana, känsla…"
            className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:border-primary"
          />
          <div className="mt-4 flex gap-3">
            <button
              onClick={save}
              className="flex-1 rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
            >
              Spara
            </button>
            <button
              onClick={reset}
              className="flex-1 rounded-2xl border border-border py-4 font-[family-name:var(--font-display)] text-2xl text-muted-foreground"
            >
              Nytt test
            </button>
          </div>
        </section>
      ) : (
        <section className="mt-6 rounded-3xl border border-border bg-card p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Varv {current.round} · slag {current.shot}
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-5xl leading-none">
            {current.distance} m
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{clubFor(current.distance)}</p>
          <label htmlFor="prox" className="mt-5 block text-sm text-muted-foreground">
            Avstånd till hål (m)
          </label>
          <input
            id="prox"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commit()}
            placeholder="0"
            className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-5 text-center font-[family-name:var(--font-display)] text-5xl text-foreground outline-none focus:border-primary"
          />
          <button
            onClick={commit}
            className="mt-4 w-full rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
          >
            Registrera slag ({index + 1}/{PAR3_TOTAL_SHOTS})
          </button>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
          Resultat per avstånd
        </h2>
        <div className="mt-3 space-y-2">
          {stats.map((s) => (
            <div
              key={s.distance}
              className="rounded-2xl border border-border bg-card px-4 py-3 text-sm"
            >
              <div className="flex items-center justify-between">
                <span>
                  {s.distance} m
                  <span className="ml-2 text-xs text-muted-foreground">{s.club}</span>
                </span>
                <span>
                  {s.count ? `${s.avg.toFixed(1)} m · ${s.pct.toFixed(1)} %` : "–"}
                </span>
              </div>
              {s.count > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Bäst {s.best.toFixed(1)} m · spridning {s.spread.toFixed(1)} m · {s.count} slag
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {played.length > 0 && (
        <section className="mt-6 rounded-3xl border border-border bg-card p-4">
          <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
            Precision i % per avstånd
          </h2>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" />
                <YAxis tick={{ fontSize: 11 }} stroke="currentColor" />
                <Tooltip formatter={(v: number) => `${v} %`} />
                <Bar dataKey="pct" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="pct" position="top" fontSize={11} formatter={(v: number) => `${v}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {sessions.length > 0 && (
        <>
          <section className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Bästa</p>
              <p className="font-[family-name:var(--font-display)] text-3xl">
                {bestSession ? `${bestSession.pct.toFixed(1)} %` : "–"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Senaste</p>
              <p className="font-[family-name:var(--font-display)] text-3xl">
                {latest ? `${latest.pct.toFixed(1)} %` : "–"}
              </p>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-border bg-card p-4">
            <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
              Utveckling över tid
            </h2>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="currentColor" />
                  <YAxis tick={{ fontSize: 11 }} stroke="currentColor" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="pct"
                    name="Proximity %"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg"
                    name="Snitt (m)"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="mt-6">
            <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Historik</h2>
            <div className="mt-3 space-y-2">
              {[...sessions].reverse().map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm"
                >
                  <div>
                    <p>{new Date(s.date).toLocaleDateString("sv-SE")}</p>
                    {s.notes && <p className="text-xs text-muted-foreground">{s.notes}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-[family-name:var(--font-display)] text-2xl">
                      {s.avgProximity.toFixed(1)} m
                    </span>
                    <button
                      onClick={() => remove(s.id)}
                      className="text-xs text-muted-foreground underline"
                    >
                      Ta bort
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="mt-8 rounded-2xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">
        <h2 className="text-base text-foreground">Så funkar testet</h2>
        <p className="mt-2">
          Syftet är att mäta precision med järn mot typiska par 3-avstånd: 110 m (PW/9), 125 m
          (9/8), 140 m (8/7), 155 m (7/6) och 170 m (6/5). Två slag per avstånd i varv 1 (10 slag),
          sedan samma fem avstånd igen i varv 2 (10 slag) — totalt {PAR3_TOTAL_SHOTS} slag.
        </p>
        <p className="mt-2">
          Mät avståndet till hålet i meter för varje slag. Resultatet visas som snitt i meter, i
          procent av slaglängden och som spridning, både totalt och per avstånd.
        </p>
      </section>
    </main>
  );
}
