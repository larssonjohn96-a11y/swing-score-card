import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  SHAPES,
  SHAPING_TOTAL_SHOTS,
  deleteShapingSession,
  emptyShapingShots,
  loadShapingSessions,
  saveShapingSession,
  shapingPct,
  shapingScore,
  statsByShape,
  type ShapingSession,
  type ShapingShot,
} from "@/lib/shaping";

export const Route = createFileRoute("/shaping")({
  head: () => ({
    meta: [
      { title: "Shot shaping test – 9 slag med 9-järn | Golfträning" },
      {
        name: "description",
        content:
          "Shot shaping test med 9-järn: draw, rak och fade i tre varv. Godkänt eller ej per slag ger en Shot Shape Score i procent.",
      },
      { property: "og:title", content: "Shot shaping test – 9-järn" },
      {
        property: "og:description",
        content: "Tre varv med draw, rak och fade. 9 slag, poäng 0–9 och score i procent.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ShapingPage,
});

function ShapingPage() {
  const [shots, setShots] = useState<ShapingShot[]>(emptyShapingShots);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [notes, setNotes] = useState("");
  const [sessions, setSessions] = useState<ShapingSession[]>([]);

  useEffect(() => {
    setSessions(loadShapingSessions());
  }, []);

  const current = shots[index];
  const score = shapingScore(done ? shots : shots.slice(0, index));
  const pct = done ? shapingPct(shots) : 0;
  const stats = statsByShape(shots);

  function commit(ok: boolean) {
    const next = shots.map((s, i) => (i === index ? { ...s, ok } : s));
    setShots(next);
    if (index + 1 >= SHAPING_TOTAL_SHOTS) {
      setDone(true);
    } else {
      setIndex(index + 1);
    }
  }

  function save() {
    const record = saveShapingSession(shots, notes);
    setSessions((prev) => [...prev, record]);
    setNotes("");
  }

  function reset() {
    setShots(emptyShapingShots());
    setIndex(0);
    setDone(false);
  }

  function remove(id: string) {
    setSessions(deleteShapingSession(id));
  }

  const chartData = sessions.map((s) => ({
    date: new Date(s.date).toLocaleDateString("sv-SE", { day: "numeric", month: "short" }),
    pct: Math.round(s.pct),
  }));

  const best = sessions.reduce<ShapingSession | null>(
    (acc, s) => (!acc || s.score > acc.score ? s : acc),
    null,
  );
  const latest = sessions.length ? sessions[sessions.length - 1] : null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            9-järn · 9 slag
          </p>
          <h1 className="text-4xl leading-none">Shot shaping</h1>
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
          {done ? "Shot shape score" : "Godkända hittills"}
        </p>
        <p className="font-[family-name:var(--font-display)] text-7xl leading-none text-flag">
          {done ? `${Math.round(pct)}` : score}
          <span className="ml-2 text-2xl text-muted-foreground">
            {done ? "%" : `/ ${index}`}
          </span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {done
            ? `${score} av ${SHAPING_TOTAL_SHOTS} godkända slag`
            : `Slag ${index + 1} av ${SHAPING_TOTAL_SHOTS}`}
        </p>
      </section>

      {done ? (
        <section className="mt-6 rounded-3xl border border-border bg-card p-6">
          <h2 className="text-2xl">Testet är klart</h2>
          <div className="mt-3 space-y-2 text-sm">
            {stats.map((s) => (
              <div key={s.shape} className="flex justify-between border-b border-border pb-1">
                <span className="text-muted-foreground">{s.shape}</span>
                <span>
                  {s.ok}/{s.count} · {Math.round(s.pct)} %
                </span>
              </div>
            ))}
          </div>
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
        <section className="mt-6 rounded-3xl border border-border bg-card p-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Varv {current.round}
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-5xl leading-none">
            {current.shape}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Blev bollflykten som du tänkt dig?
          </p>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => commit(true)}
              className="flex-1 rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
            >
              Godkänt
            </button>
            <button
              onClick={() => commit(false)}
              className="flex-1 rounded-2xl border border-border py-5 font-[family-name:var(--font-display)] text-2xl text-muted-foreground"
            >
              Ej godkänt
            </button>
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Alla slag</h2>
        <div className="mt-3 space-y-2">
          {shots.map((s, i) => {
            const played = done || i < index;
            return (
              <div
                key={`${s.round}-${s.shape}`}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${
                  !done && i === index
                    ? "border-primary bg-primary/15"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                <span>
                  Varv {s.round} · {s.shape}
                </span>
                <span>{played ? (s.ok ? "1 p" : "0 p") : "–"}</span>
              </div>
            );
          })}
        </div>
      </section>

      {sessions.length > 0 && (
        <>
          <section className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Bästa</p>
              <p className="font-[family-name:var(--font-display)] text-3xl">
                {best ? `${Math.round(best.pct)} %` : "–"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Senaste</p>
              <p className="font-[family-name:var(--font-display)] text-3xl">
                {latest ? `${Math.round(latest.pct)} %` : "–"}
              </p>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-border bg-card p-4">
            <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
              Score över tid
            </h2>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="currentColor" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="currentColor" />
                  <Tooltip formatter={(v: number) => `${v} %`} />
                  <Line
                    type="monotone"
                    dataKey="pct"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
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
                      {s.score}/{SHAPING_TOTAL_SHOTS}
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
          Slå med 9-järn: {SHAPES.join(" – ")} i tre varv, totalt {SHAPING_TOTAL_SHOTS} slag. Varje
          slag bedöms bara som godkänt (1 poäng) eller ej godkänt (0 poäng) — önskad bollflykt
          uppnådd eller inte. Längd, träff i mål och dispersion räknas inte.
        </p>
        <p className="mt-2">
          Shot Shape Score = antal godkända / {SHAPING_TOTAL_SHOTS} × 100 %. 9/9 = 100 %, 8/9 = 89
          %, 7/9 = 78 %, 6/9 = 67 %, 5/9 = 56 %.
        </p>
      </section>
    </main>
  );
}
