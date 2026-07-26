import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  WEDGE_DISTANCES,
  WEDGE_TOTAL_SHOTS,
  deleteWedgeSession,
  emptyWedgeShots,
  loadWedgeSessions,
  mean,
  saveWedgeSession,
  stdDev,
  wedgeStatsByDistance,
  wedgePctByDistance,
  wedgeOverallPct,
  bestWorstDistance,
  type WedgeSession,
} from "@/lib/wedge";
import { ChartCard } from "@/components/chart-card";
import { LevelToggle } from "@/components/level-toggle";
import { LEVELS, getLevel, loadLevel, saveLevel, type LevelKey } from "@/lib/levels";

export const Route = createFileRoute("/wedge")({
  head: () => ({
    meta: [
      { title: "Wedge matrix – 20-slagstest 40–120 m" },
      {
        name: "description",
        content:
          "Wedge matrix: 20 slag på 40, 60, 80, 100 och 120 meter i två varv. Registrera avstånd till hål och följ medelproximity och spridning över tid.",
      },
      { property: "og:title", content: "Wedge matrix – 20 slag" },
      {
        property: "og:description",
        content: "5 avstånd × 2 slag × 2 varv. Medelproximity och spridning per avstånd.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WedgePage,
});

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

function WedgePage() {
  const shotOrder = useMemo(() => emptyWedgeShots(), []);
  const [values, setValues] = useState<string[]>(() => shotOrder.map(() => ""));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<WedgeSession[]>([]);
  const [level, setLevel] = useState<LevelKey>("tour");

  useEffect(() => {
    setSessions(loadWedgeSessions());
    setLevel(loadLevel());
  }, []);

  function changeLevel(key: LevelKey) {
    setLevel(key);
    saveLevel(key);
  }

  const filledShots = shotOrder
    .map((s, i) => ({ ...s, proximity: Number(values[i].replace(",", ".")) }))
    .filter((s, i) => values[i].trim() !== "" && Number.isFinite(s.proximity));

  const liveAvg = mean(filledShots.map((s) => s.proximity));
  const liveSpread = stdDev(filledShots.map((s) => s.proximity));
  const liveByDistance = wedgeStatsByDistance(filledShots);

  function setValue(i: number, v: string) {
    setValues((prev) => prev.map((old, idx) => (idx === i ? v : old)));
  }

  function submit() {
    if (filledShots.length < WEDGE_TOTAL_SHOTS) {
      setError(`Fyll i alla ${WEDGE_TOTAL_SHOTS} slag (${filledShots.length} ifyllda).`);
      return;
    }
    setError("");
    saveWedgeSession(filledShots, note);
    setSessions(loadWedgeSessions());
    setValues(shotOrder.map(() => ""));
    setNote("");
  }

  function remove(id: string) {
    setSessions(deleteWedgeSession(id));
  }

  const chartData = sessions.map((s) => ({
    label: fmtDate(s.date),
    Snitt: Number(s.avgProximity.toFixed(2)),
    Spridning: Number(s.spread.toFixed(2)),
  }));

  const lv = getLevel(level);
  const analysisShots = filledShots.length
    ? filledShots
    : sessions.length
      ? sessions[sessions.length - 1].shots
      : [];
  const pctByDistance = wedgePctByDistance(analysisShots);
  const overallPct = wedgeOverallPct(analysisShots);
  const { best: bestDist, worst: worstDist } = bestWorstDistance(analysisShots);
  const pctChartData = pctByDistance.map((d) => ({
    label: `${d.distance} m`,
    Procent: d.count ? Number(d.pct.toFixed(1)) : 0,
    best: bestDist?.distance === d.distance,
    worst: worstDist?.distance === d.distance,
  }));
  const pctOverTime = sessions.map((s) => ({
    label: fmtDate(s.date),
    Procent: Number(wedgeOverallPct(s.shots).toFixed(1)),
  }));

  const latest = sessions[sessions.length - 1];
  const best = sessions.length
    ? Math.min(...sessions.map((s) => s.avgProximity))
    : 0;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Approach · 20 slag
          </p>
          <h1 className="text-4xl leading-none">Wedge matrix</h1>
        </div>
        <Link
          to="/kategori/$slug"
          params={{ slug: "approach" }}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Tillbaka
        </Link>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Bästa snitt</p>
          <p className="font-[family-name:var(--font-display)] text-5xl leading-none text-flag">
            {best ? best.toFixed(1) : "–"}
            <span className="ml-1 text-lg text-muted-foreground">m</span>
          </p>
        </div>
        <div className="rounded-3xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Senaste</p>
          <p className="font-[family-name:var(--font-display)] text-5xl leading-none">
            {latest ? latest.avgProximity.toFixed(1) : "–"}
            <span className="ml-1 text-lg text-muted-foreground">m</span>
          </p>
          {latest ? (
            <p className="mt-1 text-xs text-muted-foreground">
              spridning {latest.spread.toFixed(1)} m
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card p-6">
        <h2 className="text-2xl">Nytt test</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Avstånd till hål i meter för varje slag. 2 slag per avstånd, två varv.
        </p>

        {[1, 2].map((round) => (
          <div key={round} className="mt-5">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Varv {round}
            </p>
            <div className="mt-2 space-y-2">
              {WEDGE_DISTANCES.map((distance) => (
                <div
                  key={distance}
                  className="flex items-center gap-3 rounded-2xl border border-input bg-background px-3 py-2"
                >
                  <span className="w-14 font-[family-name:var(--font-display)] text-2xl">
                    {distance}m
                  </span>
                  {[1, 2].map((shot) => {
                    const i = shotOrder.findIndex(
                      (s) => s.round === round && s.distance === distance && s.shot === shot,
                    );
                    return (
                      <input
                        key={shot}
                        id={`shot-${i}`}
                        aria-label={`Varv ${round}, ${distance} meter, slag ${shot}`}
                        inputMode="decimal"
                        value={values[i]}
                        onChange={(e) => setValue(i, e.target.value)}
                        placeholder={`Slag ${shot}`}
                        className="w-full min-w-0 rounded-xl bg-card px-2 py-2 text-center font-[family-name:var(--font-display)] text-2xl text-foreground outline-none focus:ring-1 focus:ring-primary"
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}

        {filledShots.length ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {filledShots.length}/{WEDGE_TOTAL_SHOTS} ifyllda · snitt {liveAvg.toFixed(1)} m ·
            spridning {liveSpread.toFixed(1)} m
          </p>
        ) : null}

        <label htmlFor="note" className="mt-4 block text-sm text-muted-foreground">
          Anteckning – valfritt
        </label>
        <input
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Vind, bollar, bana..."
          className="mt-1 w-full rounded-2xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:border-primary"
        />

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

        <button
          onClick={submit}
          className="mt-5 w-full rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
        >
          Spara test
        </button>
      </section>

      {filledShots.length ? (
        <section className="mt-6 rounded-3xl border border-border bg-card p-5">
          <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
            Per avstånd (pågående)
          </h2>
          <div className="mt-3 space-y-2 text-sm">
            {liveByDistance.map((d) => (
              <div key={d.distance} className="flex justify-between border-b border-border pb-1">
                <span className="text-muted-foreground">{d.distance} m</span>
                <span>
                  {d.count
                    ? `snitt ${d.avg.toFixed(1)} m · spridning ${d.spread.toFixed(1)} m`
                    : "–"}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {analysisShots.length ? (
        <>
          <section className="mt-6 rounded-3xl border border-border bg-card p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
                Proximity i procent
              </h2>
              <span className="font-[family-name:var(--font-display)] text-3xl">
                {overallPct.toFixed(1)}%
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Snittavstånd till hål delat med slagets längd. Lägre är bättre.
            </p>
            <div className="mt-3">
              <LevelToggle value={level} onChange={changeLevel} />
            </div>
            {bestDist && worstDist ? (
              <p className="mt-3 text-sm">
                Bäst: <span className="text-flag">{bestDist.distance} m ({bestDist.pct.toFixed(1)}%)</span>{" "}
                · Sämst:{" "}
                <span className="text-destructive">
                  {worstDist.distance} m ({worstDist.pct.toFixed(1)}%)
                </span>
              </p>
            ) : null}
            <div className="mt-2 space-y-1 text-sm">
              {pctByDistance.map((d) => (
                <div key={d.distance} className="flex justify-between border-b border-border pb-1">
                  <span className="text-muted-foreground">{d.distance} m</span>
                  <span>{d.count ? `${d.pct.toFixed(1)}% · ${d.avg.toFixed(1)} m` : "–"}</span>
                </div>
              ))}
            </div>
          </section>

          <ChartCard
            title="Procent per längdnivå"
            footer={
              <p className="text-xs text-muted-foreground">
                Streckade linjer: {LEVELS.map((l) => `${l.label} ${l.wedgePct}%`).join(" · ")}
              </p>
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pctChartData} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" unit="%" />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                {LEVELS.map((l) => (
                  <ReferenceLine
                    key={l.key}
                    y={l.wedgePct}
                    stroke="var(--color-muted-foreground)"
                    strokeDasharray="4 4"
                    label={{
                      value: `${l.label} ${l.wedgePct}%`,
                      position: "right",
                      fontSize: 10,
                      fill: "var(--color-muted-foreground)",
                    }}
                  />
                ))}
                <Bar dataKey="Procent" radius={[8, 8, 0, 0]}>
                  {pctChartData.map((d) => (
                    <Cell
                      key={d.label}
                      fill={
                        d.best
                          ? "var(--color-flag)"
                          : d.worst
                            ? "var(--color-destructive)"
                            : "var(--color-primary)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      ) : null}

      {pctOverTime.length > 1 ? (
        <ChartCard
          title="Proximity % över tid"
          footer={
            <p className="text-xs text-muted-foreground">
              Jämför mot vald nivå: {lv.label} {lv.wedgePct}%. Lägre är bättre.
            </p>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={pctOverTime} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" unit="%" />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              {LEVELS.map((l) => (
                <ReferenceLine
                  key={l.key}
                  y={l.wedgePct}
                  stroke="var(--color-muted-foreground)"
                  strokeDasharray="4 4"
                  label={{
                    value: `${l.label} ${l.wedgePct}%`,
                    position: "right",
                    fontSize: 10,
                    fill: "var(--color-muted-foreground)",
                  }}
                />
              ))}
              <Line
                type="monotone"
                dataKey="Procent"
                stroke="var(--color-primary)"
                strokeWidth={3}
                connectNulls
                dot={{ r: 4, fill: "var(--color-primary)", stroke: "var(--color-primary)" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : null}

      {sessions.length > 1 ? (
        <ChartCard
          title="Utveckling över tid"
          footer={
            <p className="text-xs text-muted-foreground">
              Lägre är bättre – både medelproximity och spridning. Tryck på grafen för helskärm.
            </p>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="Snitt"
                stroke="var(--color-primary)"
                strokeWidth={3}
                connectNulls
                dot={{ r: 4, fill: "var(--color-primary)", stroke: "var(--color-primary)" }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="Spridning"
                stroke="var(--color-flag)"
                strokeWidth={2}
                connectNulls
                dot={{ r: 3, fill: "var(--color-flag)", stroke: "var(--color-flag)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : null}

      {sessions.length ? (
        <section className="mt-6">
          <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Historik</h2>
          <div className="mt-3 space-y-2">
            {[...sessions].reverse().map((s) => (
              <div key={s.id} className="rounded-2xl border border-border bg-card p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{fmtDate(s.date)}</span>
                  <button
                    onClick={() => remove(s.id)}
                    className="text-xs text-muted-foreground underline"
                  >
                    Ta bort
                  </button>
                </div>
                <p className="mt-1">
                  Snitt {s.avgProximity.toFixed(1)} m · spridning {s.spread.toFixed(1)} m
                </p>
                <div className="mt-2 grid grid-cols-5 gap-1 text-center text-[11px] text-muted-foreground">
                  {wedgeStatsByDistance(s.shots).map((d) => (
                    <div key={d.distance} className="rounded-lg border border-border py-1">
                      <div>{d.distance}m</div>
                      <div className="text-foreground">{d.avg.toFixed(1)}</div>
                    </div>
                  ))}
                </div>
                {s.notes ? <p className="mt-2 text-muted-foreground">{s.notes}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8 rounded-2xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">
        <h2 className="text-base text-foreground">Så funkar testet</h2>
        <p className="mt-2">
          Slå avstånden i ordningen 40–60–80–100–120 m med 2 bollar per avstånd. Vila 2–3 minuter
          och upprepa exakt samma varv. Registrera avstånd till hål för varje slag – appen räknar
          medelproximity och spridning per avstånd samt totalt. Totalt 20 slag, cirka 20–25 minuter.
        </p>
      </section>
    </main>
  );
}
