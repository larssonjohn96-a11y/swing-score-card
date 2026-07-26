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
  FAIRWAY_DRIVES,
  RESULT_LABEL,
  avgCarry,
  deleteFairwaySession,
  drivePoints,
  fairwayHitRate,
  fairwayStats,
  loadFairwaySessions,
  outCount,
  saveFairwaySession,
  todayISO,
  totalPoints,
  type DriveResult,
  type FairwayDrive,
  type FairwaySession,
  type FairwayUnit,
} from "@/lib/fairway";
import { TOUR_LEVEL } from "@/lib/levels";
import { ChartCard } from "@/components/chart-card";

export const Route = createFileRoute("/fairway")({
  head: () => ({
    meta: [
      { title: "Fairway challenge – 10 drivar med totalpoäng" },
      {
        name: "description",
        content:
          "Tio drivar per test: registrera fairwayträff, ruff eller out och carry. Poängen belönar långa fairwayträffar och straffar out – precis som på banan.",
      },
      { property: "og:title", content: "Fairway challenge – 10 drivar med totalpoäng" },
      {
        property: "og:description",
        content:
          "Tio drivar, fairwayträff och carry ger totalpoäng upp till 100. Out ger minuspoäng.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FairwayPage,
});

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

const EMPTY_DRIVES: { result: DriveResult; carry: string }[] = Array.from(
  { length: FAIRWAY_DRIVES },
  () => ({ result: "fairway" as DriveResult, carry: "" }),
);

const RESULTS: DriveResult[] = ["fairway", "rough", "out"];

function FairwayPage() {
  const [sessions, setSessions] = useState<FairwaySession[]>([]);
  const [date, setDate] = useState(todayISO());
  const [unit, setUnit] = useState<FairwayUnit>("m");
  const [rows, setRows] = useState(EMPTY_DRIVES);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSessions(loadFairwaySessions());
  }, []);

  const target = useMemo(
    () => (unit === "yds" ? TOUR_LEVEL.carryYds : TOUR_LEVEL.carryM),
    [unit],
  );

  const drives: FairwayDrive[] = useMemo(
    () =>
      rows.map((r) => {
        const n = Number(r.carry.replace(",", "."));
        return {
          result: r.result,
          carry: r.result === "out" ? 0 : Number.isFinite(n) && n > 0 ? n : 0,
        };
      }),
    [rows],
  );

  const livePoints = totalPoints(drives, target);
  const stats = useMemo(() => fairwayStats(sessions), [sessions]);
  const chartData = useMemo(
    () =>
      sessions.map((s) => ({
        label: fmtDate(s.date),
        poäng: Number(s.points.toFixed(1)),
        fairway: Number((fairwayHitRate(s.drives) * 100).toFixed(0)),
      })),
    [sessions],
  );

  function setRow(i: number, patch: Partial<{ result: DriveResult; carry: string }>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function submit() {
    const missing = drives.some((d) => d.result !== "out" && d.carry <= 0);
    if (missing) {
      setError("Fyll i carry för alla drivar som är i spel (out behöver ingen längd).");
      return;
    }
    setError(null);
    setSessions(
      saveFairwaySession({
        date: date || todayISO(),
        drives,
        unit,
        target,
        points: Number(livePoints.toFixed(1)),
        note: note.trim() || undefined,
      }),
    );
    setRows(EMPTY_DRIVES);
    setNote("");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Driving · Banspel
          </p>
          <h1 className="text-4xl leading-none">Fairway challenge</h1>
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
            {(["m", "yds"] as FairwayUnit[]).map((u) => (
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

        <p className="mt-4 text-sm text-muted-foreground">Carry-mål (full längdpoäng)</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Mål: {target} {unit} carry ger full längdpoäng.
        </p>

        <div className="mt-5 space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="rounded-2xl border border-input bg-background p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Drive {i + 1}
                </span>
                <span className="text-xs text-muted-foreground">
                  {drivePoints(drives[i], target).toFixed(1)} p
                </span>
              </div>
              <div className="mt-2 flex gap-2">
                <div className="flex flex-1 gap-1">
                  {RESULTS.map((res) => (
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
                      {RESULT_LABEL[res]}
                    </button>
                  ))}
                </div>
                <input
                  aria-label={`Carry drive ${i + 1}`}
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
            Fairway {(fairwayHitRate(drives) * 100).toFixed(0)}% · {outCount(drives)} out · snitt
            carry {avgCarry(drives).toFixed(0)} {unit}
          </p>
        </div>

        <label htmlFor="note" className="mt-4 block text-sm text-muted-foreground">
          Anteckning – valfritt
        </label>
        <input
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Bana, vind, driver..."
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
              Poäng per test (max 100) och fairwayträff i procent. Tryck på grafen för helskärm.
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
              <ReferenceLine
                y={72}
                stroke="var(--color-flag)"
                strokeDasharray="5 5"
                label={{
                  value: "Tour-nivå 72% fairway",
                  position: "insideBottomRight",
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
                    {s.points.toFixed(1)} p · fairway {(fairwayHitRate(s.drives) * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(s.date)} · {outCount(s.drives)} out · snitt carry{" "}
                    {avgCarry(s.drives).toFixed(0)} {s.unit}
                    {s.note ? ` · ${s.note}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => setSessions(deleteFairwaySession(s.id))}
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
        <h2 className="text-base text-foreground">Så funkar poängen</h2>
        <p className="mt-2">
          Slå {FAIRWAY_DRIVES} drivar. För varje slag väljer du fairway, ruff eller out och fyller i
          carry.
        </p>
        <ul className="mt-3 space-y-1">
          <li>• Fairway: 6 p + upp till 4 p för längd (max 10 p).</li>
          <li>• Ruff: 3 p + upp till 2 p för längd.</li>
          <li>• Out: −5 p, ingen längdpoäng – precis som ett pliktslag på banan.</li>
        </ul>
        <p className="mt-3">
          Längdpoängen räknas mot PGA Tour-nivåns carry-mål ({target} {unit}).
          Alla tio i fairway på målavståndet ger 100 poäng.
        </p>
      </section>
    </main>
  );
}
