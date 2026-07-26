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
  TEE_HALF_WIDTH_M,
  TEE_ROUNDS,
  TEE_SHOTS,
  TEE_WIDTH_M,
  TEE_ZONES,
  deleteTeeSession,
  emptyTeeShots,
  isShotOk,
  loadTeeSessions,
  saveTeeSession,
  statsByZone,
  teeAvgOffline,
  teeHitRate,
  teeLengthRate,
  teeStats,
  teeTotalPoints,
  teeWidthRate,
  todayISO,
  zoneById,
  type TeeSession,
  type TeeShot,
} from "@/lib/teeshot";
import { ChartCard } from "@/components/chart-card";

export const Route = createFileRoute("/teeshot")({
  head: () => ({
    meta: [
      { title: "Landningsytor från tee – 9 slag utan driver" },
      {
        name: "description",
        content:
          "Off the tee-test utan driver: tre stationer (170, 195, 220 m) × 3 varv. 1 poäng när bollen stannar inom både längdspannet och 25 m fairwaybredd.",
      },
      { property: "og:title", content: "Landningsytor från tee – 9 slag utan driver" },
      {
        property: "og:description",
        content: "Nio positionsslag mot tre landningsytor. Rätt längd och rätt bredd ger poäng.",
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

type Row = { round: number; zoneId: string; carry: string; offline: string };

const EMPTY_ROWS: Row[] = emptyTeeShots().map((s) => ({
  round: s.round,
  zoneId: s.zoneId,
  carry: "",
  offline: "",
}));

function num(v: string) {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function TeeShotPage() {
  const [sessions, setSessions] = useState<TeeSession[]>([]);
  const [date, setDate] = useState(todayISO());
  const [rows, setRows] = useState<Row[]>(EMPTY_ROWS);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSessions(loadTeeSessions());
  }, []);

  const shots: TeeShot[] = useMemo(
    () =>
      rows.map((r) => ({
        round: r.round,
        zoneId: r.zoneId,
        carry: Math.max(0, num(r.carry)),
        offline: Math.abs(num(r.offline)),
      })),
    [rows],
  );

  const livePoints = teeTotalPoints(shots);
  const stats = useMemo(() => teeStats(sessions), [sessions]);
  const zoneStats = useMemo(() => statsByZone(shots), [shots]);
  const chartData = useMemo(
    () =>
      sessions.map((s) => ({
        label: fmtDate(s.date),
        poäng: s.points,
        längd: Number((teeLengthRate(s.shots) * 100).toFixed(0)),
        bredd: Number((teeWidthRate(s.shots) * 100).toFixed(0)),
      })),
    [sessions],
  );

  function setRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function submit() {
    if (rows.some((r) => r.carry.trim() === "")) {
      setError("Fyll i längd för alla nio slag.");
      return;
    }
    setError(null);
    setSessions(
      saveTeeSession({
        date: date || todayISO(),
        shots,
        points: livePoints,
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
          <h1 className="text-4xl leading-none">Landningsytor från tee</h1>
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
          <p className="mt-1 text-xs text-muted-foreground">av {TEE_SHOTS}</p>
        </div>
        <div className="rounded-3xl border border-border bg-card p-5 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Snitt</p>
          <p className="font-[family-name:var(--font-display)] text-5xl leading-none">
            {stats.count ? stats.avg.toFixed(1) : "–"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.count} test{stats.count === 1 ? "" : "er"}
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card p-5">
        <h2 className="text-2xl">Nytt test</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {TEE_ROUNDS} varv × {TEE_ZONES.length} stationer = {TEE_SHOTS} slag. Godkänd bredd är{" "}
          {TEE_WIDTH_M} m (±{TEE_HALF_WIDTH_M} m). Driver är inte tillåten.
        </p>

        <div className="mt-4 space-y-1 rounded-2xl border border-input bg-background p-3 text-xs text-muted-foreground">
          {TEE_ZONES.map((z) => (
            <div key={z.id} className="flex justify-between">
              <span className="text-foreground">{z.label}</span>
              <span>
                {z.min}–{z.max} m · ±{TEE_HALF_WIDTH_M} m
              </span>
            </div>
          ))}
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

        <div className="mt-5 space-y-5">
          {Array.from({ length: TEE_ROUNDS }, (_, r) => r + 1).map((round) => (
            <div key={round}>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Varv {round}
              </p>
              <div className="mt-2 space-y-2">
                {rows.map((r, i) =>
                  r.round !== round ? null : (
                    <div key={i} className="rounded-2xl border border-input bg-background p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">
                          {zoneById(r.zoneId)?.label} ({zoneById(r.zoneId)?.min}–
                          {zoneById(r.zoneId)?.max} m)
                        </span>
                        <span
                          className={`text-xs ${isShotOk(shots[i]) ? "text-flag" : "text-muted-foreground"}`}
                        >
                          {isShotOk(shots[i]) ? "1 p" : "0 p"}
                        </span>
                      </div>

                      <div className="mt-2 flex gap-2">
                        <input
                          aria-label={`Längd varv ${round} ${zoneById(r.zoneId)?.label}`}
                          inputMode="decimal"
                          value={r.carry}
                          onChange={(e) => setRow(i, { carry: e.target.value })}
                          placeholder="längd m"
                          className="min-w-0 flex-1 rounded-xl border border-input bg-card px-2 py-2 text-center text-lg text-foreground outline-none focus:border-primary"
                        />

                        <input
                          aria-label={`Sidoavvikelse varv ${round} ${zoneById(r.zoneId)?.label}`}
                          inputMode="decimal"
                          value={r.offline}
                          onChange={(e) => setRow(i, { offline: e.target.value })}
                          placeholder="sid m"
                          className="w-20 rounded-xl border border-input bg-card px-2 py-2 text-center text-lg text-foreground outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>

        <label htmlFor="note" className="mt-5 block text-sm text-muted-foreground">
          Anteckning (valfritt)
        </label>
        <input
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Vind, bana, känsla…"
          className="mt-1 w-full rounded-2xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:border-primary"
        />

        <div className="mt-5 flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3">
          <span className="text-sm text-muted-foreground">Poäng nu</span>
          <span className="font-[family-name:var(--font-display)] text-3xl leading-none text-flag">
            {livePoints} / {TEE_SHOTS}
          </span>
        </div>

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

        <button
          type="button"
          onClick={submit}
          className="mt-4 w-full rounded-2xl bg-primary px-4 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Spara test
        </button>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
          <div className="rounded-2xl border border-border bg-background p-3">
            <p>Godkända</p>
            <p className="text-lg text-foreground">{(teeHitRate(shots) * 100).toFixed(0)}%</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-3">
            <p>Rätt längd</p>
            <p className="text-lg text-foreground">{(teeLengthRate(shots) * 100).toFixed(0)}%</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-3">
            <p>Snitt sid</p>
            <p className="text-lg text-foreground">{teeAvgOffline(shots).toFixed(1)} m</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {zoneStats.map((z) => (
            <div
              key={z.zone.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-2 text-sm"
            >
              <span className="text-foreground">{z.zone.label}</span>
              <span className="text-muted-foreground">
                {z.points}/{z.count} p · sid {z.avgOffline.toFixed(1)} m
              </span>
            </div>
          ))}
        </div>
      </section>

      {chartData.length > 1 ? (
        <ChartCard title="Poäng över tid">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis domain={[0, TEE_SHOTS]} stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
              />
              <ReferenceLine y={TEE_SHOTS} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="poäng" stroke="var(--flag)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : null}

      {chartData.length > 1 ? (
        <ChartCard title="Längd och bredd">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
              />
              <Line type="monotone" dataKey="längd" stroke="var(--flag)" strokeWidth={2} />
              <Line type="monotone" dataKey="bredd" stroke="var(--primary)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : null}

      {sessions.length ? (
        <section className="mt-6">
          <h2 className="text-2xl">Historik</h2>
          <div className="mt-3 space-y-2">
            {[...sessions].reverse().map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
              >
                <div>
                  <p className="text-foreground">
                    {s.points} / {TEE_SHOTS} p
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(s.date)}
                    {s.note ? ` · ${s.note}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSessions(deleteTeeSession(s.id))}
                  className="text-xs text-muted-foreground transition-colors hover:text-destructive"
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
          Tre stationer: {TEE_ZONES.map((z) => `${z.label} (${z.min}–${z.max} m)`).join(", ")}. Varje
          station spelas {TEE_ROUNDS} gånger, totalt {TEE_SHOTS} slag. Alla klubbor utom driver är tillåtna.
        </p>
        <ul className="mt-3 space-y-1">
          <li>• Godkänd sidobredd: {TEE_WIDTH_M} m (±{TEE_HALF_WIDTH_M} m från mittlinjen).</li>
          <li>• Inom både längdspann och bredd = 1 poäng, annars 0.</li>
          <li>• Maxpoäng {TEE_SHOTS}.</li>
        </ul>
      </section>
    </main>
  );
}
