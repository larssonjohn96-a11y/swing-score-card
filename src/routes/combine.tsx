import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,

  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/chart-card";
import {
  COMBINE_LEVELS,
  COMBINE_ROUNDS,
  SHOTS_PER_STATION,
  avgProximityPct,
  combineScore,

  deleteCombineSession,
  emptyCombineShots,
  levelFor,
  loadCombineSessions,
  scoresByStation,
  stationById,
  stationsFor,
  totalShots,
  type CombineSession,
  type CombineSize,
  saveCombineSession,
} from "@/lib/combine";

export const Route = createFileRoute("/combine")({
  head: () => ({
    meta: [
      { title: "Combine test – approach 55–165 m + driver" },
      {
        name: "description",
        content:
          "Combine test i golf: 30 eller 60 slag från 55 till 165 meter plus driver. Två varv med tre slag per station ger en totalpoäng 0–100 och nivå från utveckling till tournivå.",
      },
      { property: "og:title", content: "Combine test – poäng 0–100" },
      {
        property: "og:description",
        content: "Precision och bollträff från 55–165 m plus driver. Small 30 slag, large 60 slag.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CombinePage,
});

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

function CombinePage() {
  const [size, setSize] = useState<CombineSize>("large");
  const shotOrder = useMemo(() => emptyCombineShots(size), [size]);
  const [values, setValues] = useState<string[]>(() => shotOrder.map(() => ""));
  const [offlines, setOfflines] = useState<string[]>(() => shotOrder.map(() => ""));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<CombineSession[]>([]);

  useEffect(() => {
    setSessions(loadCombineSessions());
  }, []);

  useEffect(() => {
    setValues(shotOrder.map(() => ""));
    setOfflines(shotOrder.map(() => ""));
    setError("");
  }, [shotOrder]);

  const filledShots = shotOrder
    .map((s, i) => {
      const off = (offlines[i] ?? "").replace(",", ".").trim();
      const offNum = Number(off);
      return {
        ...s,
        value: Number((values[i] ?? "").replace(",", ".")),
        offline: off !== "" && Number.isFinite(offNum) ? Math.abs(offNum) : undefined,
      };
    })
    .filter((s, i) => (values[i] ?? "").trim() !== "" && Number.isFinite(s.value));

  const liveScore = combineScore(filledShots);
  const required = totalShots(size);

  function setValue(i: number, v: string) {
    setValues((prev) => prev.map((old, idx) => (idx === i ? v : old)));
  }

  function setOffline(i: number, v: string) {
    setOfflines((prev) => prev.map((old, idx) => (idx === i ? v : old)));
  }

  function submit() {
    if (filledShots.length < required) {
      setError(`Fyll i alla ${required} slag (${filledShots.length} ifyllda).`);
      return;
    }
    setError("");
    saveCombineSession(size, filledShots, note);
    setSessions(loadCombineSessions());
    setValues(shotOrder.map(() => ""));
    setOfflines(shotOrder.map(() => ""));
    setNote("");
  }

  function remove(id: string) {
    setSessions(deleteCombineSession(id));
  }

  const latest = sessions[sessions.length - 1];
  const best = sessions.length ? Math.max(...sessions.map((s) => s.score)) : 0;

  const analysis = filledShots.length ? filledShots : latest ? latest.shots : [];
  const analysisSize: CombineSize = filledShots.length ? size : (latest?.size ?? size);
  const stationScores = scoresByStation(analysis, analysisSize).filter((s) => s.count > 0);
  const analysisProxPct = avgProximityPct(analysis);
  const stationChart = stationScores.map((s) => ({
    label: s.station.driver ? "Driver" : `${s.station.distance} m`,
    Poäng: Number(s.score.toFixed(1)),
    pct: s.station.driver ? s.avgOfflinePct : s.avgPct,
    driver: !!s.station.driver,
  }));
  const bestStation = [...stationScores].sort((a, b) => b.score - a.score)[0];
  const worstStation = [...stationScores].sort((a, b) => a.score - b.score)[0];

  const overTime = sessions.map((s) => ({
    label: fmtDate(s.date),
    Poäng: Number(s.score.toFixed(1)),
  }));


  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Approach · {required} slag
          </p>
          <h1 className="text-4xl leading-none">Combine test</h1>
        </div>
        <Link
          to="/kategori/$slug"
          params={{ slug: "combine" }}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Tillbaka
        </Link>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Bästa score</p>
          <p className="font-[family-name:var(--font-display)] text-5xl leading-none text-flag">
            {sessions.length ? best.toFixed(1) : "–"}
          </p>
          {sessions.length ? (
            <p className="mt-1 text-xs text-muted-foreground">{levelFor(best)}</p>
          ) : null}
        </div>
        <div className="rounded-3xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Senaste</p>
          <p className="font-[family-name:var(--font-display)] text-5xl leading-none">
            {latest ? latest.score.toFixed(1) : "–"}
          </p>
          {latest ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {latest.size === "large" ? "Large 60" : "Small 30"} · {levelFor(latest.score)}
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card p-6">
        <h2 className="text-2xl">Nytt test</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["small", "large"] as CombineSize[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`rounded-2xl border px-3 py-3 text-sm transition-colors ${
                size === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input text-muted-foreground"
              }`}
            >
              {s === "small" ? "Small · 30 slag" : "Large · 60 slag"}
              <span className="mt-0.5 block text-xs opacity-80">
                {s === "small" ? "5 stationer, 2 varv" : "10 stationer, 2 varv"}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Avstånd till hål i meter per slag. För driver anger du carry i meter och sidoavvikelse
          (hur långt från mittlinjen bollen hamnar). 3 slag per station, två varv.
        </p>

        {Array.from({ length: COMBINE_ROUNDS }, (_, r) => r + 1).map((round) => (
          <div key={round} className="mt-5">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Varv {round}
            </p>
            <div className="mt-2 space-y-2">
              {stationsFor(size).map((station) => (
                <div
                  key={station.id}
                  className="flex items-center gap-2 rounded-2xl border border-input bg-background px-3 py-2"
                >
                  <span className="w-16 shrink-0 font-[family-name:var(--font-display)] text-xl">
                    {station.driver ? "Drv" : `${station.distance}m`}
                  </span>
                  {Array.from({ length: SHOTS_PER_STATION }, (_, k) => k + 1).map((shot) => {
                    const i = shotOrder.findIndex(
                      (s) => s.round === round && s.stationId === station.id && s.shot === shot,
                    );
                    return (
                      <div key={shot} className="flex w-full min-w-0 flex-col gap-1">
                        <input
                          id={`combine-${i}`}
                          aria-label={`Varv ${round}, ${station.label}, slag ${shot}${
                            station.driver ? " carry" : ""
                          }`}
                          inputMode="decimal"
                          value={values[i] ?? ""}
                          onChange={(e) => setValue(i, e.target.value)}
                          placeholder={station.driver ? "carry" : `${shot}`}
                          className="w-full min-w-0 rounded-xl bg-card px-2 py-2 text-center font-[family-name:var(--font-display)] text-xl text-foreground outline-none focus:ring-1 focus:ring-primary"
                        />
                        {station.driver ? (
                          <input
                            id={`combine-offline-${i}`}
                            aria-label={`Varv ${round}, driver, slag ${shot} sidoavvikelse i meter`}
                            inputMode="decimal"
                            value={offlines[i] ?? ""}
                            onChange={(e) => setOffline(i, e.target.value)}
                            placeholder="offline"
                            className="w-full min-w-0 rounded-xl bg-card px-2 py-1 text-center text-sm text-foreground outline-none focus:ring-1 focus:ring-primary"
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}


        {filledShots.length ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {filledShots.length}/{required} ifyllda · score {liveScore.toFixed(1)} ·{" "}
            {levelFor(liveScore)}
          </p>
        ) : null}

        <label htmlFor="combine-note" className="mt-4 block text-sm text-muted-foreground">
          Anteckning – valfritt
        </label>
        <input
          id="combine-note"
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

      {stationScores.length ? (
        <>
          <section className="mt-6 rounded-3xl border border-border bg-card p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
                Score per station
              </h2>
              <span className="font-[family-name:var(--font-display)] text-3xl">
                {combineScore(analysis).toFixed(1)}
              </span>
            </div>
            {analysisProxPct !== null ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Snittproximity approach:{" "}
                <span className="text-foreground">{analysisProxPct.toFixed(1)} %</span> av
                slaglängden
              </p>
            ) : null}
            {bestStation && worstStation ? (
              <p className="mt-2 text-sm">
                Bäst:{" "}
                <span className="text-flag">
                  {bestStation.station.driver ? "Driver" : `${bestStation.station.distance} m`} (
                  {bestStation.score.toFixed(0)})
                </span>{" "}
                · Sämst:{" "}
                <span className="text-destructive">
                  {worstStation.station.driver ? "Driver" : `${worstStation.station.distance} m`} (
                  {worstStation.score.toFixed(0)})
                </span>
              </p>
            ) : null}
            <div className="mt-3 space-y-1 text-sm">
              {stationScores.map((s) => (
                <div
                  key={s.station.id}
                  className="flex justify-between border-b border-border pb-1"
                >
                  <span className="text-muted-foreground">{s.station.label}</span>
                  <span>
                    {s.score.toFixed(0)} p · {s.avg.toFixed(1)} m
                    {s.station.driver
                      ? ` carry${
                          s.avgOffline !== null
                            ? ` · ${s.avgOffline.toFixed(1)} m offline${
                                s.avgOfflinePct !== null ? ` (${s.avgOfflinePct.toFixed(1)} %)` : ""
                              }`
                            : ""
                        }`
                      : s.avgPct !== null
                        ? ` (${s.avgPct.toFixed(1)} %)`
                        : ""}
                  </span>
                </div>
              ))}
            </div>

          </section>

          <ChartCard
            title="Poäng per station"
            footer={
              <p className="text-xs text-muted-foreground">
                100 poäng = elitträff. Siffran ovanför stapeln är proximity i procent av avståndet
                (driver: sidoavvikelse i procent av carry). Grön = bästa station, röd = svagaste.
              </p>
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stationChart} margin={{ top: 16, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  stroke="var(--color-muted-foreground)"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11 }}
                  stroke="var(--color-muted-foreground)"
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(value: number, _name: string, item: { payload?: { pct?: number | null; driver?: boolean } }) => {
                    const pct = item?.payload?.pct;
                    const suffix =
                      pct === null || pct === undefined
                        ? ""
                        : item?.payload?.driver
                          ? ` (${pct.toFixed(1)} % offline)`
                          : ` (${pct.toFixed(1)} % proximity)`;
                    return [`${value}${suffix}`, "Poäng"];
                  }}
                />
                <Bar dataKey="Poäng" radius={[8, 8, 0, 0]}>
                  <LabelList
                    dataKey="pct"
                    position="top"
                    fontSize={10}
                    fill="var(--color-muted-foreground)"
                    formatter={(v: number | null) =>
                      v === null || v === undefined ? "" : `${v.toFixed(1)}%`
                    }
                  />
                  {stationChart.map((d) => (
                    <Cell
                      key={d.label}
                      fill={
                        bestStation &&
                        d.label ===
                          (bestStation.station.driver
                            ? "Driver"
                            : `${bestStation.station.distance} m`)
                          ? "var(--color-flag)"
                          : worstStation &&
                              d.label ===
                                (worstStation.station.driver
                                  ? "Driver"
                                  : `${worstStation.station.distance} m`)
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

      {overTime.length > 1 ? (
        <ChartCard
          title="Score över tid"
          footer={
            <p className="text-xs text-muted-foreground">
              Streckade linjer: tournivå 95, proffs 90, elit 85, låg hcp 80.
            </p>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={overTime} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                stroke="var(--color-muted-foreground)"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                stroke="var(--color-muted-foreground)"
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              {[95, 90, 85, 80].map((y) => (
                <ReferenceLine
                  key={y}
                  y={y}
                  stroke="var(--color-muted-foreground)"
                  strokeDasharray="4 4"
                />
              ))}
              <Line
                type="monotone"
                dataKey="Poäng"
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

      {sessions.length ? (
        <section className="mt-6">
          <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Historik</h2>
          <div className="mt-3 space-y-2">
            {[...sessions].reverse().map((s) => (
              <div key={s.id} className="rounded-2xl border border-border bg-card p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {fmtDate(s.date)} · {s.size === "large" ? "Large 60" : "Small 30"}
                  </span>
                  <button
                    onClick={() => remove(s.id)}
                    className="text-xs text-muted-foreground underline"
                  >
                    Ta bort
                  </button>
                </div>
                <p className="mt-1">
                  Score {s.score.toFixed(1)} · {levelFor(s.score)}
                </p>
                <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                  {scoresByStation(s.shots, s.size)
                    .filter((d) => d.count > 0)
                    .map((d) => (
                      <div key={d.station.id} className="rounded-lg border border-border px-2 py-1">
                        {d.station.driver ? "Drv" : `${d.station.distance}m`}{" "}
                        <span className="text-foreground">{d.score.toFixed(0)}</span>
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
          Slå stationerna i ordning med 3 bollar per station, vila och kör exakt samma varv en gång
          till. Approach poängsätts på avstånd till hål i procent av slaglängden (3 % ger 100 poäng,
          25 % ger 0). Driver poängsätts på både längd och rakhet: 60 % av poängen kommer från carry
          (140 m = 0, 280 m = 100) och 40 % från sidoavvikelsen (0 % av carry = 100 poäng, 8 % = 0).
          Lämnar du sidoavvikelsen tom räknas bara längden.
        </p>

        <div className="mt-3 space-y-1">
          {COMBINE_LEVELS.map((l) => (
            <div key={l.label} className="flex justify-between border-b border-border pb-1">
              <span>{l.min ? `${l.min}+` : "< 70"}</span>
              <span className="text-foreground">{l.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-3">
          Stationer:{" "}
          {stationsFor(size)
            .map((s) => (s.driver ? "Driver" : `${s.distance} m`))
            .join(" · ")}
          {stationById("165") ? "" : ""}
        </p>
      </section>
    </main>
  );
}
