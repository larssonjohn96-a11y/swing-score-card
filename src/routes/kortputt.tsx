import { Link, createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import {
  SHORT_PUTT_TOTAL,
  deleteShortPuttSession,
  emptyShortPutts,
  loadShortPuttSessions,
  saveShortPuttSession,
  shortPuttStats,
  type ShortPutt,
  type ShortPuttSession,
} from "@/lib/shortputt";

export const Route = createFileRoute("/kortputt")({
  head: () => ({
    meta: [
      { title: "Kortputt – 12 puttar inom 1,5 m | SG4" },
      {
        name: "description",
        content:
          "Kortputtstestet: 12 puttar från 0,5, 1,0 och 1,5 meter. Räkna isatta puttar och följ träffprocenten över tid.",
      },
      { property: "og:title", content: "Kortputt – 12 puttar inom 1,5 m" },
      {
        property: "og:description",
        content: "4 puttar per avstånd från 0,5 till 1,5 m. Resultat i procent isatta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ShortPuttPage,
});

function ShortPuttPage() {
  const [putts, setPutts] = useState<ShortPutt[]>(emptyShortPutts);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [sessions, setSessions] = useState<ShortPuttSession[]>([]);

  useEffect(() => setSessions(loadShortPuttSessions()), []);

  const played = done ? putts : putts.slice(0, index);
  const holed = played.filter((p) => p.holed).length;
  const pct = played.length ? (holed / played.length) * 100 : 0;
  const stats = shortPuttStats(played);

  function commit(made: boolean) {
    setPutts(putts.map((p, i) => (i === index ? { ...p, holed: made } : p)));
    if (index + 1 >= SHORT_PUTT_TOTAL) setDone(true);
    else setIndex(index + 1);
  }

  function save() {
    setSessions((prev) => [...prev, saveShortPuttSession(putts, notes)]);
    setNotes("");
    setSaved(true);
  }

  function reset() {
    setSaved(false);
    setPutts(emptyShortPutts());
    setIndex(0);
    setDone(false);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-24 pt-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Puttning · 12 puttar
          </p>
          <h1 className="text-4xl leading-none">Kortputt</h1>
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
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Isatta puttar</p>
        <p className="font-[family-name:var(--font-display)] text-7xl leading-none text-flag">
          {pct.toFixed(0)}
          <span className="ml-2 text-2xl text-muted-foreground">%</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {holed} av {played.length || 0} · {done ? "klart" : `Putt ${index + 1} av ${SHORT_PUTT_TOTAL}`}
        </p>
      </section>

      {done ? (
        <section className="mt-6 rounded-3xl border border-border bg-card p-6">
          <h2 className="text-2xl">Testet är klart</h2>
          <div className="mt-3 space-y-2 text-sm">
            {stats.map((s) => (
              <div key={s.distance} className="flex justify-between border-b border-border pb-1">
                <span className="text-muted-foreground">{s.distance} m</span>
                <span>
                  {s.holed}/{s.count} · {s.pct.toFixed(0)} %
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
            placeholder="Green, lutning, känsla…"
            className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:border-primary"
          />
          <div className="mt-4 flex gap-3">
            {saved ? (
              <div className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-primary bg-primary/10 py-4 text-base font-semibold text-primary">
                <Check className="h-5 w-5" /> Testet sparat
              </div>
            ) : (
              <button
                onClick={save}
                className="flex-1 rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
              >
                Spara
              </button>
            )}
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
            Putt {index + 1} av {SHORT_PUTT_TOTAL}
          </p>
          <h2 className="text-3xl leading-tight">{putts[index].distance} meter</h2>
          <button
            onClick={() => commit(true)}
            className="mt-5 w-full rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
          >
            I hål
          </button>
          <button
            onClick={() => commit(false)}
            className="mt-3 w-full rounded-2xl border border-border py-4 font-[family-name:var(--font-display)] text-2xl text-muted-foreground"
          >
            Miss
          </button>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Alla puttar</h2>
        <div className="mt-3 space-y-2">
          {putts.map((p, i) => (
            <div
              key={`${p.distance}-${p.index}`}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${
                !done && i === index
                  ? "border-primary bg-primary/15"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              <span>
                {i + 1}. {p.distance} m
              </span>
              <span>{done || i < index ? (p.holed ? "I hål" : "Miss") : "–"}</span>
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
                  {s.holed}/{s.putts.length} · {s.pct.toFixed(0)} %
                </span>
                <button
                  onClick={() => setSessions(deleteShortPuttSession(s.id))}
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
          Fyra puttar från vardera 0,5, 1,0 och 1,5 meter – totalt 12 puttar inom 1,5 m. Resultatet
          är andelen isatta puttar.
        </p>
      </section>
    </main>
  );
}
