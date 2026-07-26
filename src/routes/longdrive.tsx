import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  LONG_DRIVE_ATTEMPTS,
  deleteLongDriveSession,
  loadLongDriveSessions,
  longDriveStats,
  saveLongDriveSession,
  sessionAvg,
  sessionBest,
  todayISO,
  type LongDriveSession,
  type LongDriveUnit,
} from "@/lib/longdrive";
import { HCP, TOUR, TOUR_TOP5 } from "@/lib/benchmarks";

export const Route = createFileRoute("/longdrive")({
  head: () => ({
    meta: [
      { title: "Long drive – 6 försök carry per test" },
      {
        name: "description",
        content:
          "Long drive-test med 6 försök per omgång. Logga carry för varje slag, se längsta och snitt samt utvecklingen över tid.",
      },
      { property: "og:title", content: "Long drive – 6 försök carry" },
      {
        property: "og:description",
        content: "Sex utslag per test, bara carry räknas. Följ längsta drive och snitt över tid.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LongDrivePage,
});

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

const EMPTY = Array.from({ length: LONG_DRIVE_ATTEMPTS }, () => "");

function LongDrivePage() {
  const [sessions, setSessions] = useState<LongDriveSession[]>([]);
  const [date, setDate] = useState(todayISO());
  const [unit, setUnit] = useState<LongDriveUnit>("m");
  const [values, setValues] = useState<string[]>(EMPTY);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSessions(loadLongDriveSessions());
  }, []);

  const stats = useMemo(() => longDriveStats(sessions), [sessions]);
  const chartData = useMemo(
    () =>
      sessions.map((s) => ({
        label: fmtDate(s.date),
        best: Number(sessionBest(s).toFixed(1)),
        snitt: Number(sessionAvg(s).toFixed(1)),
      })),
    [sessions],
  );

  const chartUnit = sessions.length ? sessions[sessions.length - 1].unit : unit;
  const refLines = useMemo(() => {
    const yds = chartUnit === "yds";
    return [
      { y: yds ? TOUR_TOP5.carryYds : TOUR_TOP5.carryM, text: `Long hitters ${yds ? TOUR_TOP5.carryYds : TOUR_TOP5.carryM}` },
      { y: yds ? TOUR.carryYds : TOUR.carryM, text: `Tour ${yds ? TOUR.carryYds : TOUR.carryM}` },
      { y: yds ? HCP.scratch.carryYds : HCP.scratch.carryM, text: `0 hcp ${yds ? HCP.scratch.carryYds : HCP.scratch.carryM}` },
      { y: yds ? HCP.ten.carryYds : HCP.ten.carryM, text: `10 hcp ${yds ? HCP.ten.carryYds : HCP.ten.carryM}` },
      { y: yds ? HCP.twenty.carryYds : HCP.twenty.carryM, text: `20 hcp ${yds ? HCP.twenty.carryYds : HCP.twenty.carryM}` },
    ];
  }, [chartUnit]);


  const parsed = values.map((v) => {
    const n = Number(v.replace(",", "."));
    return v.trim() && Number.isFinite(n) && n > 0 ? n : undefined;
  });
  const filled = parsed.filter((n): n is number => typeof n === "number");
  const liveBest = filled.length ? Math.max(...filled) : 0;
  const liveAvg = filled.length ? filled.reduce((a, b) => a + b, 0) / filled.length : 0;

  function setValue(i: number, v: string) {
    setValues((prev) => prev.map((old, idx) => (idx === i ? v : old)));
  }

  function submit() {
    if (filled.length !== LONG_DRIVE_ATTEMPTS) {
      setError(`Fyll i carry för alla ${LONG_DRIVE_ATTEMPTS} försök.`);
      return;
    }
    setError(null);
    setSessions(
      saveLongDriveSession({
        date: date || todayISO(),
        carries: filled,
        unit,
        note: note.trim() || undefined,
      }),
    );
    setValues(EMPTY);
    setNote("");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Driving · Carry
          </p>
          <h1 className="text-4xl leading-none">Long drive</h1>
        </div>
        <Link
          to="/kategori/$slug"
          params={{ slug: "driving" }}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Tillbaka
        </Link>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-border bg-card p-5 text-center shadow-[var(--shadow-glow)]">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Längsta carry</p>
          <p className="font-[family-name:var(--font-display)] text-5xl leading-none text-flag">
            {stats.best ? stats.best.toFixed(0) : "–"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.latest ? stats.latest.unit : unit}
          </p>
        </div>
        <div className="rounded-3xl border border-border bg-card p-5 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Snitt bästa</p>
          <p className="font-[family-name:var(--font-display)] text-5xl leading-none">
            {stats.avgBest ? stats.avgBest.toFixed(0) : "–"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.count} test{stats.count === 1 ? "" : "er"}
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl">Nytt test</h2>
          <div className="flex rounded-full border border-border p-1 text-xs">
            {(["m", "yds"] as LongDriveUnit[]).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`rounded-full px-3 py-1 ${
                  unit === u ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        <label htmlFor="date" className="mt-4 block text-sm text-muted-foreground">
          Datum
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full rounded-2xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:border-primary"
        />

        <p className="mt-4 text-sm text-muted-foreground">
          Carry per försök ({LONG_DRIVE_ATTEMPTS} slag)
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {values.map((v, i) => (
            <div key={i} className="rounded-2xl border border-input bg-background p-2 text-center">
              <label htmlFor={`carry-${i}`} className="text-[11px] text-muted-foreground">
                Slag {i + 1}
              </label>
              <input
                id={`carry-${i}`}
                inputMode="decimal"
                value={v}
                onChange={(e) => setValue(i, e.target.value)}
                placeholder="0"
                className="w-full bg-transparent text-center font-[family-name:var(--font-display)] text-3xl text-foreground outline-none"
              />
            </div>
          ))}
        </div>

        {filled.length ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {filled.length}/{LONG_DRIVE_ATTEMPTS} ifyllda · längsta {liveBest.toFixed(0)} {unit} ·
            snitt {liveAvg.toFixed(1)} {unit}
          </p>
        ) : null}

        <label htmlFor="note" className="mt-4 block text-sm text-muted-foreground">
          Anteckning – valfritt
        </label>
        <input
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Driver, vind, range..."
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

      {sessions.length > 1 ? (
        <ChartCard
          title="Utveckling över tid"
          footer={
            <p className="text-xs text-muted-foreground">
              Streckade linjer: alla nivåer från 30 hcp till tourens long hitters. Tryck på grafen
              för helskärm.
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
              {refLines.map((r) => (
                <ReferenceLine
                  key={r.text}
                  y={r.y}
                  stroke="var(--color-flag)"
                  strokeDasharray="5 5"
                  label={{
                    value: r.text,
                    position: "insideTopRight",
                    fontSize: 10,
                    fill: "var(--color-muted-foreground)",
                  }}
                />
              ))}
              <Line
                type="monotone"
                dataKey="best"
                name="Längsta"
                stroke="var(--color-primary)"
                strokeWidth={3}
                connectNulls
                isAnimationActive={false}
                dot={{ r: 4, fill: "var(--color-primary)", strokeWidth: 2, stroke: "var(--color-card)" }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="snitt"
                name="Snitt"
                stroke="var(--color-flag)"
                strokeWidth={3}
                connectNulls
                isAnimationActive={false}
                dot={{ r: 4, fill: "var(--color-flag)", strokeWidth: 2, stroke: "var(--color-card)" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : null}


      {sessions.length ? (
        <section className="mt-6">
          <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Tester</h2>
          <div className="mt-3 space-y-2">
            {[...sessions].reverse().map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm"
              >
                <div>
                  <p className="text-foreground">
                    Längsta {sessionBest(s).toFixed(0)} {s.unit} · snitt{" "}
                    {sessionAvg(s).toFixed(1)} {s.unit}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(s.date)} · {s.carries.map((c) => c.toFixed(0)).join(" / ")}
                    {s.note ? ` · ${s.note}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => setSessions(deleteLongDriveSession(s.id))}
                  className="text-xs text-muted-foreground underline"
                >
                  Ta bort
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8 rounded-2xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">
        <h2 className="text-base text-foreground">Så funkar testet</h2>
        <p className="mt-2">
          Sex utslag med driver per test. Endast carry räknas – roll bortses från. Fyll i carry för
          varje slag så får du längsta drive och snitt för omgången, och kan följa utvecklingen över
          tid.
        </p>
      </section>
    </main>
  );
}
