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
  DEFAULT_TEE_TARGET,
  TEE_CLUBS,
  TEE_CLUB_LABEL,
  TEE_RESULTS,
  TEE_RESULT_LABEL,
  TEE_SHOTS,
  deleteTeeSession,
  loadTeeSessions,
  saveTeeSession,
  teeAvgCarry,
  teeHitRate,
  teeInPlayRate,
  teeOutCount,
  teeShotPoints,
  teeStats,
  teeStatsByClub,
  teeTotalPoints,
  todayISO,
  type TeeClub,
  type TeeResult,
  type TeeSession,
  type TeeShot,
  type TeeUnit,
} from "@/lib/teeshot";
import { ChartCard } from "@/components/chart-card";

export const Route = createFileRoute("/teeshot")({
  head: () => ({
    meta: [
      { title: "Positionsslag från tee – 10 slag utan driver" },
      {
        name: "description",
        content:
          "Off the tee-test utan driver för doglegs och smala fairways: 10 slag med 3-wood, hybrid eller järn. Träffbilden väger tyngst i poängen 0–100.",
      },
      { property: "og:title", content: "Positionsslag från tee – 10 slag utan driver" },
      {
        property: "og:description",
        content:
          "Tio positionsslag från tee med 3-wood, hybrid eller järn. Fairwayträff ger mest poäng, out straffas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeeShotPage,
});

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

type Row = { club: TeeClub; result: TeeResult; carry: string };

const EMPTY_ROWS: Row[] = Array.from({ length: TEE_SHOTS }, () => ({
  club: "wood" as TeeClub,
  result: "fairway" as TeeResult,
  carry: "",
}));

function TeeShotPage() {
  const [sessions, setSessions] = useState<TeeSession[]>([]);
  const [date, setDate] = useState(todayISO());
  const [unit, setUnit] = useState<TeeUnit>("m");
  const [rows, setRows] = useState<Row[]>(EMPTY_ROWS);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSessions(loadTeeSessions());
  }, []);

  const target = DEFAULT_TEE_TARGET[unit];

  const shots: TeeShot[] = useMemo(
    () =>
      rows.map((r) => {
        const n = Number(r.carry.replace(",", "."));
        return {
          club: r.club,
          result: r.result,
          carry: r.result === "out" ? 0 : Number.isFinite(n) && n > 0 ? n : 0,
        };
      }),
    [rows],
  );

  const livePoints = teeTotalPoints(shots, target);
  const stats = useMemo(() => teeStats(sessions), [sessions]);
  const clubStats = useMemo(() => teeStatsByClub(shots), [shots]);
  const chartData = useMemo(
    () =>
      sessions.map((s) => ({
        label: fmtDate(s.date),
        poäng: Number(s.points.toFixed(1)),
        fairway: Number((teeHitRate(s.shots) * 100).toFixed(0)),
        ispel: Number((teeInPlayRate(s.shots) * 100).toFixed(0)),
      })),
    [sessions],
  );

  function setRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function submit() {
    const missing = shots.some((s) => s.result !== "out" && s.carry <= 0);
    if (missing) {
      setError("Fyll i carry för alla slag som är i spel (out behöver ingen längd).");
      return;
    }
    setError(null);
    setSessions(
      saveTeeSession({
        date: date || todayISO(),
        shots,
        unit,
        target,
        points: Number(livePoints.toFixed(1)),
        note: note.trim() || undefined,
      }),
    );
    setRows(EMPTY_ROWS);
    setNote("");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Driving · Utan driver
          </p>
          <h1 className="text-4xl leading-none">Positionsslag från tee</h1>
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
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Bästa poäng</p>
          <p className="font-[family-name:var(--font-display)] text-5xl leading-none text-flag">
            {stats.count ? stats.best.toFixed(0) : "–"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">av 100</p>
        </div>
        <div className="rounded-3xl border border-border bg-card p-5 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Snitt</p>
          <p className="font-[family-name:var(--font-display)] text-5xl leading-none">
            {stats.count ? stats.avg.toFixed(0) : "–"}
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
            {(["m", "yds"] as TeeUnit[]).map((u) => (
              <button
                key={u}
                type="button"
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

        <p className="mt-4 text-xs text-muted-foreground">
          Sikta mot en smal korridor. Carry-mål för full längdbonus: {target} {unit}.
        </p>

        <div className="mt-5 space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="rounded-2xl border border-input bg-background p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Slag {i + 1}
                </span>
                <span className="text-xs text-muted-foreground">
                  {teeShotPoints(shots[i], target).toFixed(1)} p
                </span>
              </div>

              <div className="mt-2 flex gap-1">
                {TEE_CLUBS.map((club) => (
                  <button
                    key={club}
                    type="button"
                    onClick={() => setRow(i, { club })}
                    aria-pressed={r.club === club}
                    className={`flex-1 rounded-xl border px-2 py-1.5 text-xs font-medium transition-colors ${
                      r.club === club
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground"
                    }`}
                  >
                    {TEE_CLUB_LABEL[club]}
                  </button>
                ))}
              </div>

              <div className="mt-2 flex gap-2">
                <div className="flex flex-1 gap-1">
                  {TEE_RESULTS.map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setRow(i, { result: res })}
                      aria-pressed={r.result === res}
                      className={`flex-1 rounded-xl px-2 py-2 text-xs font-medium transition-colors ${
                        r.result === res
                          ? res === "out"
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-primary text-primary-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {TEE_RESULT_LABEL[res]}
                    </button>
                  ))}
                </div>
                <input
                  aria-label={`Carry slag ${i + 1}`}
                  inputMode="decimal"
                  disabled={r.result === "out"}
                  value={r.result === "out" ? "" : r.carry}
                  onChange={(e) => setRow(i, { carry: e.target.value })}
                  placeholder={r.result === "out" ? "–" : "carry"}
                  className="w-20 rounded-xl border border-input bg-card px-2 py-2 text-center text-lg text-foreground outline-none focus:border-primary disabled:opacity-40"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">
          <p className="text-foreground">
            Totalpoäng just nu:{" "}
            <span className="font-[family-name:var(--font-display)] text-2xl text-flag">
              {livePoints.toFixed(1)}
            </span>{" "}
            / 100
          </p>
          <p className="mt-1">
            Fairway {(teeHitRate(shots) * 100).toFixed(0)}% · i spel{" "}
            {(teeInPlayRate(shots) * 100).toFixed(0)}% · {teeOutCount(shots)} out · snitt carry{" "}
            {teeAvgCarry(shots).toFixed(0)} {unit}
          </p>
          {clubStats.length ? (
            <ul className="mt-2 space-y-0.5 text-xs">
              {clubStats.map((c) => (
                <li key={c.club}>
                  {TEE_CLUB_LABEL[c.club]}: {c.count} slag · {(c.hitRate * 100).toFixed(0)}% fairway
                  · {c.avgCarry.toFixed(0)} {unit}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <label htmlFor="note" className="mt-4 block text-sm text-muted-foreground">
          Anteckning – valfritt
        </label>
        <input
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Dogleg höger, motvind..."
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
              Poäng per test (max 100), fairwayträff och andel slag i spel. Tryck på grafen för
              helskärm.
            </p>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <ReferenceLine
                y={100}
                stroke="var(--color-flag)"
                strokeDasharray="5 5"
                label={{
                  value: "Max 100",
                  position: "insideTopRight",
                  fontSize: 10,
                  fill: "var(--color-muted-foreground)",
                }}
              />
              <Line
                type="monotone"
                dataKey="poäng"
                name="Totalpoäng"
                stroke="var(--color-primary)"
                strokeWidth={3}
                connectNulls
                isAnimationActive={false}
                dot={{ r: 4, fill: "var(--color-primary)", stroke: "var(--color-card)", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="fairway"
                name="Fairway %"
                stroke="var(--color-flag)"
                strokeWidth={3}
                connectNulls
                isAnimationActive={false}
                dot={{ r: 4, fill: "var(--color-flag)", stroke: "var(--color-card)", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="ispel"
                name="I spel %"
                stroke="var(--color-muted-foreground)"
                strokeWidth={2}
                strokeDasharray="4 4"
                connectNulls
                isAnimationActive={false}
                dot={false}
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
                    {s.points.toFixed(1)} p · fairway {(teeHitRate(s.shots) * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(s.date)} · {teeOutCount(s.shots)} out · snitt carry{" "}
                    {teeAvgCarry(s.shots).toFixed(0)} {s.unit}
                    {s.note ? ` · ${s.note}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => setSessions(deleteTeeSession(s.id))}
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
          Tio slag från tee utan driver – 3-wood, hybrid eller järn. Tänk dogleg eller smal fairway:
          välj klubba som ger bästa position, inte längsta slag.
        </p>
        <ul className="mt-3 space-y-1">
          <li>• Fairway: 8 p + upp till 2 p för längd (max 10 p).</li>
          <li>• Ruff: 3 p + upp till 1 p för längd.</li>
          <li>• Out: −5 p.</li>
        </ul>
        <p className="mt-3">
          Längdbonusen räknas mot {target} {unit} carry. Poängen premierar träffsäkerhet – tio
          fairwayträffar på målavståndet ger 100 poäng.
        </p>
      </section>
    </main>
  );
}
