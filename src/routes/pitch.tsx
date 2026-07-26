import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  PITCH_DISTANCES,
  deletePitchSession,
  emptyPitchShots,
  loadPitchSessions,
  mean,
  pitchPct,
  savePitchSession,
  type PitchSession,
  type PitchShot,
} from "@/lib/pitch";

export const Route = createFileRoute("/pitch")({
  head: () => ({
    meta: [
      { title: "Pitch – 6 slag 8–18 m | SG4" },
      {
        name: "description",
        content:
          "Pitchtestet: 6 slag från 8 till 18 meter. Mät avståndet till hålet i meter och följ snittet över tid.",
      },
      { property: "og:title", content: "Pitch – 6 slag 8–18 m" },
      {
        property: "og:description",
        content: "6 pitchar från olika avstånd, resultat mäts i meter till hålet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PitchPage,
});

function PitchPage() {
  const [shots, setShots] = useState<PitchShot[]>(emptyPitchShots);
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [done, setDone] = useState(false);
  const [notes, setNotes] = useState("");
  const [sessions, setSessions] = useState<PitchSession[]>([]);

  useEffect(() => setSessions(loadPitchSessions()), []);

  const played = done ? shots : shots.slice(0, index);
  const avg = mean(played.map((s) => s.proximity));
  const pct = pitchPct(played);

  function commit() {
    const num = Math.max(0, Number(value.replace(",", ".")) || 0);
    setShots(shots.map((s, i) => (i === index ? { ...s, proximity: num } : s)));
    setValue("");
    if (index + 1 >= PITCH_DISTANCES.length) setDone(true);
    else setIndex(index + 1);
  }

  function save() {
    setSessions((prev) => [...prev, savePitchSession(shots, notes)]);
    setNotes("");
  }

  function reset() {
    setShots(emptyPitchShots());
    setIndex(0);
    setValue("");
    setDone(false);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-24 pt-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Pitch · 6 slag
          </p>
          <h1 className="text-4xl leading-none">Pitch 8–18 m</h1>
        </div>
        <Link
          to="/kategori/$slug"
          params={{ slug: "around-the-green" }}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Tillbaka
        </Link>
      </header>

      <section className="mt-6 rounded-3xl border border-border bg-card p-6 text-center shadow-[var(--shadow-glow)]">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          {done ? "Snitt till hål" : "Snitt hittills"}
        </p>
        <p className="font-[family-name:var(--font-display)] text-7xl leading-none text-flag">
          {avg.toFixed(1)}
          <span className="ml-2 text-2xl text-muted-foreground">m</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {played.length
            ? `${pct.toFixed(1)} % av slaglängden`
            : `Slag 1 av ${PITCH_DISTANCES.length}`}
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
            placeholder="Lie, green, känsla…"
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
            Slag {index + 1} av {PITCH_DISTANCES.length}
          </p>
          <h2 className="text-3xl leading-tight">{shots[index].distance} meter</h2>
          <label htmlFor="prox" className="mt-5 block text-sm text-muted-foreground">
            Avstånd till hålet (meter)
          </label>
          <input
            id="prox"
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
            Registrera slag
          </button>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Alla slag</h2>
        <div className="mt-3 space-y-2">
          {shots.map((s, i) => (
            <div
              key={`${s.distance}-${i}`}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${
                !done && i === index
                  ? "border-primary bg-primary/15"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              <span>
                {i + 1}. {s.distance} m
              </span>
              <span>{done || i < index ? `${s.proximity.toFixed(1)} m` : "–"}</span>
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
                <span>{s.avgProximity.toFixed(1)} m</span>
                <button
                  onClick={() => setSessions(deletePitchSession(s.id))}
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
          Sex pitchar från 8, 12, 16, 10, 14 och 18 meter. Mät avståndet till hålet i meter efter
          varje slag – lägre snitt är bättre.
        </p>
      </section>
    </main>
  );
}
