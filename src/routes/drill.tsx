import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  BALLS_PER_SESSION,
  DISTANCES,
  HITS_TO_CLEAR,
  currentDistance,
  distanceStats,
  formatScore,
  initialState,
  isFinished,
  registerShot,
  saveSession,
  score,
  undoShot,
  type DrillState,
} from "@/lib/drill";

export const Route = createFileRoute("/drill")({
  head: () => ({
    meta: [
      { title: "18-bollarsdrillen – Golfträning 75/125/150m" },
      {
        name: "description",
        content:
          "Kör 18-bollarsdrillen på 75, 125 och 150 meter. Registrera träffar, räkna varv och följ din score över tid.",
      },
      { property: "og:title", content: "18-bollarsdrillen – Golfträning 75/125/150m" },
      {
        property: "og:description",
        content: "Kör 18-bollarsdrillen på 75, 125 och 150 meter. Registrera träffar, räkna varv och följ din score över tid.",
      },
    ],
  }),
  component: DrillPage,
});

function DrillPage() {
  const [state, setState] = useState<DrillState>(initialState);
  const [saved, setSaved] = useState(false);

  const done = isFinished(state);
  const ballsLeft = BALLS_PER_SESSION - state.shots.length;
  const dist = currentDistance(state);
  const value = score(state);

  useEffect(() => {
    if (done && !saved) {
      saveSession(state);
      setSaved(true);
    }
  }, [done, saved, state]);

  const shoot = useCallback((hit: boolean) => setState((s) => registerShot(s, hit)), []);
  const reset = useCallback(() => {
    setState(initialState);
    setSaved(false);
  }, []);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Golfdrill</p>
          <h1 className="text-4xl leading-none">18 bollar</h1>
        </div>
        <Link
          to="/"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Tillbaka
        </Link>
      </header>

      <section className="mt-6 rounded-3xl border border-border bg-card p-6 text-center shadow-[var(--shadow-glow)]">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Score</p>
        <p className="font-[family-name:var(--font-display)] text-7xl leading-none text-primary">
          {formatScore(value)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {Math.floor(state.stagesCleared / 3)} varv · {state.stagesCleared} av 9 avstånd klara
        </p>
      </section>

      <section className="mt-4 grid grid-cols-3 gap-3">
        {DISTANCES.map((d, i) => {
          const active = !done && i === state.stageIndex;
          return (
            <div
              key={d}
              className={`rounded-2xl border p-3 text-center transition-colors ${
                active
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              <p className="font-[family-name:var(--font-display)] text-2xl leading-none">{d}m</p>
              <p className="mt-1 text-[11px] uppercase tracking-widest">
                {active ? `${state.hitsInStage}/${HITS_TO_CLEAR}` : "väntar"}
              </p>
            </div>
          );
        })}
      </section>

      {done ? (
        <section className="mt-6 rounded-3xl border border-border bg-card p-6 text-center">
          <h2 className="text-2xl">Passet är klart</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sparat i din historik. Slutscore {formatScore(value)}.
          </p>
          <div className="mt-4 space-y-2 text-left text-sm">
            {distanceStats(state.shots).map((s) => (
              <div key={s.distance} className="flex justify-between border-b border-border pb-1">
                <span className="text-muted-foreground">{s.distance}m</span>
                <span>
                  {s.hits} träff / {s.attempts} bollar
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={reset}
            className="mt-6 w-full rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
          >
            Nytt pass
          </button>
        </section>
      ) : (
        <section className="mt-6">
          <p className="text-center text-sm text-muted-foreground">
            Slår nu på <span className="text-foreground">{dist} meter</span> · {ballsLeft} bollar
            kvar
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => shoot(true)}
              className="rounded-3xl bg-hit py-8 font-[family-name:var(--font-display)] text-3xl text-primary-foreground active:scale-[0.98]"
            >
              Träff
            </button>
            <button
              onClick={() => shoot(false)}
              className="rounded-3xl bg-miss py-8 font-[family-name:var(--font-display)] text-3xl text-foreground active:scale-[0.98]"
            >
              Miss
            </button>
          </div>
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => setState(undoShot)}
              className="flex-1 rounded-2xl border border-border py-3 text-sm text-muted-foreground"
            >
              Ångra
            </button>
            <button
              onClick={reset}
              className="flex-1 rounded-2xl border border-border py-3 text-sm text-muted-foreground"
            >
              Nollställ
            </button>
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Bollar</h2>
        <div className="mt-3 grid grid-cols-9 gap-2">
          {Array.from({ length: BALLS_PER_SESSION }).map((_, i) => {
            const shot = state.shots[i];
            return (
              <div
                key={i}
                title={shot ? `${shot.distance}m` : undefined}
                className={`aspect-square rounded-full border ${
                  shot
                    ? shot.hit
                      ? "border-hit bg-hit"
                      : "border-miss bg-miss/60"
                    : "border-border bg-card"
                }`}
              />
            );
          })}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">
        <h2 className="text-base text-foreground">Så funkar drillen</h2>
        <p className="mt-2">
          18 bollar totalt. Sätt {HITS_TO_CLEAR} bollar på 75m innan du får gå vidare till 125m, sen
          150m. Klarar du alla tre avstånd är det 1 varv. Tar du dig runt tre gånger på 18 bollar får
          du 3.0 i score.
        </p>
      </section>
    </main>
  );
}
