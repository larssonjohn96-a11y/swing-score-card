import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  BUNKER_LIES,
  FAILED_PENALTY,
  saveBunkerSession,
  type BunkerShot,
} from "@/lib/bunker";

export const Route = createFileRoute("/bunker")({
  head: () => ({
    meta: [
      { title: "Bunkerslag – 6 olika lägen | Golfträning" },
      {
        name: "description",
        content:
          "Bunkertestet: 1 boll från 6 olika lägen. Mät avståndet till hålet i fot och följ ditt snitt över tid.",
      },
      { property: "og:title", content: "Bunkerslag – 6 olika lägen" },
      {
        property: "og:description",
        content: "1 boll från varje läge, mät avståndet till hålet i fot.",
      },
    ],
  }),
  component: BunkerPage,
});

const EMPTY: BunkerShot[] = BUNKER_LIES.map((lie) => ({ lie, feet: 0, out: true }));

function BunkerPage() {
  const [shots, setShots] = useState<BunkerShot[]>(EMPTY);
  const [index, setIndex] = useState(0);
  const [feet, setFeet] = useState("");
  const [done, setDone] = useState(false);

  const total = shots
    .slice(0, done ? shots.length : index)
    .reduce((a, s) => a + (s.out ? s.feet : FAILED_PENALTY), 0);

  function commit(out: boolean) {
    const value = out ? Math.max(0, Number(feet.replace(",", ".")) || 0) : FAILED_PENALTY;
    const next = [...shots];
    next[index] = { lie: BUNKER_LIES[index], feet: value, out };
    setShots(next);
    setFeet("");
    if (index + 1 >= BUNKER_LIES.length) {
      saveBunkerSession(next);
      setDone(true);
    } else {
      setIndex(index + 1);
    }
  }

  function reset() {
    setShots(EMPTY);
    setIndex(0);
    setFeet("");
    setDone(false);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Test 2 · 6 lägen
          </p>
          <h1 className="text-4xl leading-none">Bunkerslag</h1>
        </div>
        <Link
          to="/"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Tillbaka
        </Link>
      </header>

      <section className="mt-6 rounded-3xl border border-border bg-card p-6 text-center shadow-[var(--shadow-glow)]">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          {done ? "Snitt per slag" : "Total hittills"}
        </p>
        <p className="font-[family-name:var(--font-display)] text-7xl leading-none text-flag">
          {done ? (total / BUNKER_LIES.length).toFixed(1) : total}
          <span className="ml-2 text-2xl text-muted-foreground">fot</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {done ? `Totalt ${total} fot på 6 slag` : `Läge ${index + 1} av ${BUNKER_LIES.length}`}
        </p>
      </section>

      {done ? (
        <section className="mt-6 rounded-3xl border border-border bg-card p-6">
          <h2 className="text-2xl">Testet är klart</h2>
          <div className="mt-3 space-y-2 text-sm">
            {shots.map((s) => (
              <div key={s.lie} className="flex justify-between border-b border-border pb-1">
                <span className="text-muted-foreground">{s.lie}</span>
                <span>{s.out ? `${s.feet} fot` : `Ur bunkern misslyckades (${FAILED_PENALTY})`}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <button
              onClick={reset}
              className="flex-1 rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
            >
              Nytt test
            </button>
            <Link
              to="/historik"
              className="flex-1 rounded-2xl border border-border py-4 text-center font-[family-name:var(--font-display)] text-2xl text-muted-foreground"
            >
              Historik
            </Link>
          </div>
        </section>
      ) : (
        <section className="mt-6 rounded-3xl border border-border bg-card p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Läge</p>
          <h2 className="text-3xl leading-tight">{BUNKER_LIES[index]}</h2>
          <label
            htmlFor="feet"
            className="mt-5 block text-sm text-muted-foreground"
          >
            Avstånd till hålet (fot)
          </label>
          <input
            id="feet"
            inputMode="decimal"
            value={feet}
            onChange={(e) => setFeet(e.target.value)}
            placeholder="0"
            className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-5 text-center font-[family-name:var(--font-display)] text-5xl text-foreground outline-none focus:border-primary"
          />
          <button
            onClick={() => commit(true)}
            className="mt-4 w-full rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
          >
            Registrera slag
          </button>
          <button
            onClick={() => commit(false)}
            className="mt-3 w-full rounded-2xl border border-border py-3 text-sm text-muted-foreground"
          >
            Kom inte ur bunkern (+{FAILED_PENALTY} fot)
          </button>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Alla lägen</h2>
        <div className="mt-3 space-y-2">
          {BUNKER_LIES.map((lie, i) => {
            const played = done || i < index;
            return (
              <div
                key={lie}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${
                  !done && i === index
                    ? "border-primary bg-primary/15"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                <span>
                  {i + 1}. {lie}
                </span>
                <span>
                  {played ? (shots[i].out ? `${shots[i].feet} fot` : "Ej ur") : "–"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">
        <h2 className="text-base text-foreground">Så funkar testet</h2>
        <p className="mt-2">
          Varierande avstånd och lägen i bunkern. Slå 1 boll från varje position och mät avståndet
          till hålet i fot. Lägre snitt är bättre.
        </p>
      </section>
    </main>
  );
}
