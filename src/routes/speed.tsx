import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
  deleteSpeedEntry,
  loadSpeedEntries,
  saveSpeedEntry,
  smashFactor,
  speedStats,
  todayISO,
  type SpeedEntry,
} from "@/lib/speed";
import { HCP, TOUR, TOUR_TOP5 } from "@/lib/benchmarks";

export const Route = createFileRoute("/speed")({
  head: () => ({
    meta: [
      { title: "Speed test – ball speed & club head speed i mph" },
      {
        name: "description",
        content:
          "Logga bollhastighet i mph och valfritt klubbhuvudshastighet. Se utvecklingen över tid med datum på x-axeln och smash factor.",
      },
      { property: "og:title", content: "Speed test – ball speed & club head speed" },
      {
        property: "og:description",
        content: "Tracka ball speed i mph över tid, med valfri club head speed och smash factor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SpeedPage,
});

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

function SpeedPage() {
  const [entries, setEntries] = useState<SpeedEntry[]>([]);
  const [date, setDate] = useState(todayISO());
  const [ball, setBall] = useState("");
  const [club, setClub] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEntries(loadSpeedEntries());
  }, []);

  const stats = useMemo(() => speedStats(entries), [entries]);
  const chartData = useMemo(
    () =>
      entries.map((e) => ({
        label: fmtDate(e.date),
        ball: e.ballSpeed,
        club: e.clubSpeed ?? null,
      })),
    [entries],
  );
  const hasClub = entries.some((e) => typeof e.clubSpeed === "number");

  function num(value: string) {
    const n = Number(value.replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }

  function submit() {
    const ballSpeed = num(ball);
    if (!ballSpeed) {
      setError("Fyll i bollhastighet i mph.");
      return;
    }
    const clubSpeed = club.trim() ? num(club) : undefined;
    if (club.trim() && !clubSpeed) {
      setError("Klubbhastigheten måste vara ett tal.");
      return;
    }
    setError(null);
    setEntries(
      saveSpeedEntry({
        date: date || todayISO(),
        ballSpeed,
        clubSpeed,
        note: note.trim() || undefined,
      }),
    );
    setBall("");
    setClub("");
    setNote("");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Driving · Speed
          </p>
          <h1 className="text-4xl leading-none">Speed test</h1>
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
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Bästa ball</p>
          <p className="font-[family-name:var(--font-display)] text-5xl leading-none text-flag">
            {stats.bestBall ? stats.bestBall.toFixed(1) : "–"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            mph · tour {TOUR.ballSpeed} · topp 5 {TOUR_TOP5.ballSpeed}
          </p>
        </div>
        <div className="rounded-3xl border border-border bg-card p-5 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Bästa club</p>
          <p className="font-[family-name:var(--font-display)] text-5xl leading-none">
            {stats.bestClub ? stats.bestClub.toFixed(1) : "–"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            mph · tour {TOUR.clubSpeed} · topp 5 {TOUR_TOP5.clubSpeed}
          </p>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">
        {stats.count ? (
          <p>
            Snitt ball {stats.avgBall.toFixed(1)} mph
            {stats.avgClub ? ` · snitt club ${stats.avgClub.toFixed(1)} mph` : ""} ·{" "}
            {stats.count} mätning{stats.count === 1 ? "" : "ar"}
          </p>
        ) : (
          <p>Logga din första mätning för att börja tracka utvecklingen.</p>
        )}
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card p-5">
        <h2 className="text-2xl">Ny mätning</h2>
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

        <label htmlFor="ball" className="mt-4 block text-sm text-muted-foreground">
          Ball speed (mph)
        </label>
        <input
          id="ball"
          inputMode="decimal"
          value={ball}
          onChange={(e) => setBall(e.target.value)}
          placeholder="0"
          className="mt-1 w-full rounded-2xl border border-input bg-background px-4 py-4 text-center font-[family-name:var(--font-display)] text-5xl text-foreground outline-none focus:border-primary"
        />

        <label htmlFor="club" className="mt-4 block text-sm text-muted-foreground">
          Club head speed (mph) – valfritt
        </label>
        <input
          id="club"
          inputMode="decimal"
          value={club}
          onChange={(e) => setClub(e.target.value)}
          placeholder="–"
          className="mt-1 w-full rounded-2xl border border-input bg-background px-4 py-4 text-center font-[family-name:var(--font-display)] text-4xl text-foreground outline-none focus:border-primary"
        />

        <label htmlFor="note" className="mt-4 block text-sm text-muted-foreground">
          Anteckning – valfritt
        </label>
        <input
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Driver, range, vind..."
          className="mt-1 w-full rounded-2xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:border-primary"
        />

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

        <button
          onClick={submit}
          className="mt-5 w-full rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
        >
          Spara mätning
        </button>
      </section>

      {entries.length > 1 ? (
        <section className="mt-6 rounded-3xl border border-border bg-card p-5">
          <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
            Utveckling över tid
          </h2>
          <div className="mt-4 h-56 w-full">
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
                {[
                  { y: TOUR_TOP5.ballSpeed, text: `Long hitters ${TOUR_TOP5.ballSpeed}` },
                  { y: TOUR.ballSpeed, text: `Tour ${TOUR.ballSpeed}` },
                  { y: HCP.scratch.ballSpeed, text: `0 hcp ${HCP.scratch.ballSpeed}` },
                  { y: HCP.ten.ballSpeed, text: `10 hcp ${HCP.ten.ballSpeed}` },
                  { y: HCP.twenty.ballSpeed, text: `20 hcp ${HCP.twenty.ballSpeed}` },
                ].map((r) => (
                  <ReferenceLine
                    key={`ball-${r.y}`}
                    y={r.y}
                    stroke="var(--color-flag)"
                    strokeDasharray="5 5"
                    label={{ value: r.text, position: "insideTopRight", fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  />
                ))}
                {hasClub
                  ? [
                      { y: TOUR_TOP5.clubSpeed, text: `CHS long hitters ${TOUR_TOP5.clubSpeed}` },
                      { y: TOUR.clubSpeed, text: `CHS tour ${TOUR.clubSpeed}` },
                      { y: HCP.scratch.clubSpeed, text: `CHS 0 hcp ${HCP.scratch.clubSpeed}` },
                      { y: HCP.ten.clubSpeed, text: `CHS 10 hcp ${HCP.ten.clubSpeed}` },
                      { y: HCP.twenty.clubSpeed, text: `CHS 20 hcp ${HCP.twenty.clubSpeed}` },
                    ].map((r) => (
                      <ReferenceLine
                        key={`club-${r.y}`}
                        y={r.y}
                        stroke="var(--color-muted-foreground)"
                        strokeDasharray="2 6"
                        label={{ value: r.text, position: "insideBottomLeft", fontSize: 10, fill: "var(--color-muted-foreground)" }}
                      />
                    ))
                  : null}
                <Line
                  type="monotone"
                  dataKey="ball"
                  name="Ball speed"
                  stroke="var(--color-primary)"
                  strokeWidth={3}
                  connectNulls
                  isAnimationActive={false}
                  dot={{ r: 4, fill: "var(--color-primary)", stroke: "var(--color-card)", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                {hasClub ? (
                  <Line
                    type="monotone"
                    dataKey="club"
                    name="Club head speed"
                    stroke="var(--color-flag)"
                    strokeWidth={3}
                    connectNulls
                    isAnimationActive={false}
                    dot={{ r: 4, fill: "var(--color-flag)", stroke: "var(--color-card)", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                ) : null}
              </LineChart>

            </ResponsiveContainer>
          </div>
        </section>
      ) : null}

      {entries.length ? (
        <section className="mt-6">
          <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Mätningar</h2>
          <div className="mt-3 space-y-2">
            {[...entries].reverse().map((e) => {
              const smash = smashFactor(e);
              return (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm"
                >
                  <div>
                    <p className="text-foreground">
                      {e.ballSpeed.toFixed(1)} mph ball
                      {e.clubSpeed ? ` · ${e.clubSpeed.toFixed(1)} mph club` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDate(e.date)}
                      {smash ? ` · smash ${smash.toFixed(2)}` : ""}
                      {e.note ? ` · ${e.note}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => setEntries(deleteSpeedEntry(e.id))}
                    className="text-xs text-muted-foreground underline"
                  >
                    Ta bort
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mt-8 rounded-2xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">
        <h2 className="text-base text-foreground">Så funkar testet</h2>
        <p className="mt-2">
          Mät bollhastigheten i mph med launch monitor eller radar. Fyll gärna i klubbhuvudets
          hastighet också – då räknas smash factor ut automatiskt (ball ÷ club). Logga en mätning
          per tillfälle och följ kurvan över tid.
        </p>
        <p className="mt-3">
          PGA Tour-snitt med driver: {TOUR.ballSpeed} mph ball speed, {TOUR.clubSpeed} mph club head
          speed och smash factor {TOUR.smashFactor}. Linjerna i grafen visar tournivån.
        </p>
        <p className="mt-3">
          Snitt för tourens fem längsta slagare (long hitters): {TOUR_TOP5.ballSpeed} mph ball speed
          och {TOUR_TOP5.clubSpeed} mph club head speed.
        </p>
      </section>
    </main>
  );
}
