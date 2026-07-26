import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LAG_OK_LIMIT,
  LAG_PUTT_DISTANCES,
  deleteLagPuttSession,
  emptyLagPutts,
  isApproved,
  loadLagPuttSessions,
  mean,
  saveLagPuttSession,
  type LagPutt,
  type LagPuttSession,
} from "@/lib/lagputt";

export const Route = createFileRoute("/lagputt")({
  head: () => ({
    meta: [
      { title: "Lagputt – 6 puttar 8–18 m | SG4" },
      {
        name: "description",
        content:
          "Lagputtstestet: 6 långa puttar från 8 till 18 meter. Allt inom 1 meter från hålet är godkänt.",
      },
      { property: "og:title", content: "Lagputt – 6 puttar 8–18 m" },
      {
        property: "og:description",
        content: "Mät kvarvarande avstånd, allt inom 1 m är godkänt. Resultat i procent.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LagPuttPage,
});

function LagPuttPage() {
  const [putts, setPutts] = useState<LagPutt[]>(emptyLagPutts);
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [done, setDone] = useState(false);
  const [notes, setNotes] = useState("");
  const [sessions, setSessions] = useState<LagPuttSession[]>([]);

  useEffect(() => setSessions(loadLagPuttSessions()), []);

  const played = done ? putts : putts.slice(0, index);
  const approved = played.filter(isApproved).length;
  const pct = played.length ? (approved / played.length) * 100 : 0;
  const avgLeft = mean(played.map((p) => p.left));

  function commit() {
    const num = Math.max(0, Number(value.replace(",", ".")) || 0);
    setPutts(putts.map((p, i) => (i === index ? { ...p, left: num } : p)));
    setValue("");
    if (index + 1 >= LAG_PUTT_DISTANCES.length) setDone(true);
    else setIndex(index + 1);
  }

  function save() {
    setSessions((prev) => [...prev, saveLagPuttSession(putts, notes)]);
    setNotes("");
  }

  function reset() {
    setPutts(emptyLagPutts());
    setIndex(0);
    setValue("");
    setDone(false);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-24 pt-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Puttning · 6 puttar
          </p>
          <h1 className="text-4xl leading-none">Lagputt 8–18 m</h1>
        </div>
        <Link
          to="/kategori/$slug"
          params={{ slug: "puttning" }}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Tillbaka
        </Link>
      </header>

      <section className="mt-6 rounded-3xl border border-border bg-card p-6 text-center shadow-[var(--shadow-glow)]">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Godkända (inom {LAG_OK_LIMIT} m)
        </p>
        <p className="font-[family-name:var(--font-display)] text-7xl leading-none text-flag">
          {pct.toFixed(0)}
          <span className="ml-2 text-2xl text-muted-foreground">%</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {played.length
            ? `${approved} av ${played.length} · snitt ${avgLeft.toFixed(2)} m kvar`
            : `Putt 1 av ${LAG_PUTT_DISTANCES.length}`}
        </p>
      </section>

      {done ? (
        <section className="mt-6 rounded-3xl border border-border bg-card p-6">
          <h2 className="text-2xl">Testet är klart</h2>
          <label htmlFor="notes" className="mt-5 block text-sm text-muted-foreground">
            Anteckning (valfritt)
          </label>
          <input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Greenfart, lutning, känsla…"
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
            Putt {index + 1} av {LAG_PUTT_DISTANCES.length}
          </p>
          <h2 className="text-3xl leading-tight">{putts[index].distance} meter</h2>
          <label htmlFor="left" className="mt-5 block text-sm text-muted-foreground">
            Kvar till hålet (meter) – 0 om den gick i
          </label>
          <input
            id="left"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0"
            className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-5 text-center font-[family-name:var(--font-display)] text-5xl text-foreground outline-none focus:border-primary"
          />
          <button
            onClick={commit}
            className="mt-4 w-full rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
          >
            Registrera putt
          </button>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Alla puttar</h2>
        <div className="mt-3 space-y-2">
          {putts.map((p, i) => (
            <div
              key={p.distance}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${
                !done && i === index
                  ? "border-primary bg-primary/15"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              <span>
                {i + 1}. {p.distance} m
              </span>
              <span>
                {done || i < index
                  ? `${p.left.toFixed(2)} m · ${isApproved(p) ? "Godkänt" : "Ej godkänt"}`
                  : "–"}
              </span>
            </div>
          ))}
        </div>
      </section>

      {sessions.length ? (
        <section className="mt-8">
          <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Historik</h2>
          <div className="mt-3 space-y-2">
            {[...sessions].reverse().map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm"
              >
                <span className="text-muted-foreground">
                  {new Date(s.date).toLocaleDateString("sv-SE")}
                </span>
                <span>
                  {s.approved}/{s.putts.length} · {s.pct.toFixed(0)} %
                </span>
                <button
                  onClick={() => setSessions(deleteLagPuttSession(s.id))}
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
          Sex långa puttar från 8, 10, 12, 14, 16 och 18 meter. Mät hur långt bollen stannar från
          hålet – allt inom 1 meter räknas som godkänt.
        </p>
      </section>
    </main>
  );
}
