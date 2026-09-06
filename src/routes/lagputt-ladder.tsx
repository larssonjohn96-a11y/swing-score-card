import { createFileRoute, Link } from "@tanstack/react-router";
import { Flag, RotateCcw, Trophy, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  LAG_PUTT_LADDER_DISTANCES,
  lagPuttLadderPb,
  loadLagPuttLadderSessions,
  saveLagPuttLadderSession,
  type LagPuttLadderAttempt,
  type LagPuttLadderSession,
} from "@/lib/lagputt-ladder";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

export const Route = createFileRoute("/lagputt-ladder")({
  head: () => ({
    meta: [
      { title: "Lag Putt Ladder | SG4" },
      {
        name: "description",
        content:
          "Lagputt-stege från 8 till 30 meter. Håla ut på högst två puttar för att gå vidare. Tre puttar avslutar testet.",
      },
    ],
  }),
  component: LagPuttLadderPage,
});

type Phase = "setup" | "playing" | "result";

function LagPuttLadderPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [level, setLevel] = useState(0);
  const [attempts, setAttempts] = useState<LagPuttLadderAttempt[]>([]);
  const [sessions, setSessions] = useState<LagPuttLadderSession[]>([]);
  const [last, setLast] = useState<LagPuttLadderSession | null>(null);

  useEffect(() => setSessions(loadLagPuttLadderSessions()), []);
  useHideBottomNav(phase === "playing");

  const pb = useMemo(() => lagPuttLadderPb(sessions), [sessions]);
  const currentDistance = LAG_PUTT_LADDER_DISTANCES[level];

  function start() {
    setLevel(0);
    setAttempts([]);
    setLast(null);
    setPhase("playing");
  }

  function record(putts: 1 | 2 | 3) {
    if (currentDistance === undefined) return;
    const nextAttempts = [...attempts, { distance: currentDistance, putts }];
    setAttempts(nextAttempts);

    const finished = putts === 3 || level === LAG_PUTT_LADDER_DISTANCES.length - 1;
    if (finished) {
      const nextSessions = saveLagPuttLadderSession(nextAttempts);
      setSessions(nextSessions);
      setLast(nextSessions[nextSessions.length - 1] ?? null);
      setPhase("result");
      return;
    }

    setLevel((v) => v + 1);
  }

  if (phase === "setup") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-24 pt-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Putting · Challenge</p>
            <h1 className="mt-1 font-display text-4xl leading-none">Lag Putt Ladder</h1>
          </div>
          <Link to="/traning" search={{ category: "putting" }} className="rounded-full border border-border p-3 text-muted-foreground">
            <X className="h-4 w-4" />
          </Link>
        </div>

        <section className="mt-8 rounded-3xl border border-border bg-card p-6 text-center shadow-[var(--shadow-glow)]">
          <Flag className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Börja på 8 meter och jobba dig uppåt.</p>
          <p className="mt-2 font-display text-3xl">2 puttar eller bättre = vidare</p>
          <p className="mt-2 text-sm font-semibold text-destructive">3 puttar = game over</p>
        </section>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {LAG_PUTT_LADDER_DISTANCES.map((d) => (
            <span key={d} className="shrink-0 rounded-full border border-border bg-card px-3 py-2 text-sm font-semibold">
              {d} m
            </span>
          ))}
        </div>

        <section className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Personbästa</p>
            <p className="mt-1 font-display text-4xl text-primary">{pb || "–"}<span className="ml-1 text-lg text-muted-foreground">m</span></p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Försök</p>
            <p className="mt-1 font-display text-4xl">{sessions.length}</p>
          </div>
        </section>

        <button onClick={start} className="mt-6 w-full rounded-2xl bg-primary py-5 font-display text-2xl text-primary-foreground">
          Starta stegen
        </button>
      </main>
    );
  }

  if (phase === "playing") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-20 pt-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Nivå {level + 1} av {LAG_PUTT_LADDER_DISTANCES.length}</span>
          <button onClick={() => setPhase("setup")} className="text-muted-foreground">Avbryt</button>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((level + 1) / LAG_PUTT_LADDER_DISTANCES.length) * 100}%` }} />
        </div>

        <section className="mt-10 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Aktuellt avstånd</p>
          <p className="mt-2 font-display text-8xl leading-none text-primary">{currentDistance}</p>
          <p className="mt-1 text-xl text-muted-foreground">meter</p>
          <p className="mx-auto mt-5 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Håla ut. Två puttar eller bättre tar dig vidare till nästa nivå.
          </p>
        </section>

        <div className="mt-10 grid grid-cols-3 gap-3">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => record(n as 1 | 2 | 3)}
              className={`rounded-3xl border-2 py-7 text-center transition-transform active:scale-95 ${n === 3 ? "border-destructive/50 text-destructive" : "border-primary/40 bg-primary/[0.05] text-foreground"}`}
            >
              <span className="block font-display text-5xl leading-none">{n}</span>
              <span className="mt-1 block text-xs uppercase tracking-[0.12em]">putt{n > 1 ? "ar" : ""}</span>
            </button>
          ))}
        </div>
      </main>
    );
  }

  const cleared = last?.clearedDistance ?? 0;
  const isPb = cleared > 0 && cleared >= pb;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-24 pt-10 text-center">
      <Trophy className="mx-auto h-10 w-10 text-primary" />
      <p className="mt-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">Lag Putt Ladder</p>
      <p className="mt-2 font-display text-8xl leading-none text-primary">{cleared || "0"}</p>
      <p className="mt-1 text-xl text-muted-foreground">meter klarat</p>
      {isPb ? <p className="mt-4 font-semibold text-primary">Nytt personbästa 🎉</p> : null}
      {last?.failedDistance ? <p className="mt-3 text-sm text-muted-foreground">Spelet tog slut på {last.failedDistance} m.</p> : <p className="mt-3 text-sm text-muted-foreground">Du klarade hela stegen.</p>}

      <button onClick={start} className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 font-display text-2xl text-primary-foreground">
        <RotateCcw className="h-5 w-5" /> Kör igen
      </button>
      <Link to="/traning" search={{ category: "putting" }} className="mt-3 block w-full rounded-2xl border border-border py-4 text-sm font-semibold text-muted-foreground">
        Till Putting
      </Link>
    </main>
  );
}
