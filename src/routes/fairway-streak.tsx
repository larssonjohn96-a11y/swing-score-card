import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Flag, RotateCcw, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import {
  fairwayStreakPb,
  loadFairwayStreakSessions,
  saveFairwayStreakSession,
} from "@/lib/fairway-streak";

export const Route = createFileRoute("/fairway-streak")({
  head: () => ({
    meta: [
      { title: "Fairway Streak – one life challenge | SG4" },
      {
        name: "description",
        content:
          "Fairway Streak: slå driver mot en 30 m fairway. Fortsätt så länge du träffar. Första missen avslutar testet.",
      },
    ],
  }),
  component: FairwayStreakPage,
});

type Phase = "ready" | "playing" | "result";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

function FairwayStreakPage() {
  const [sessions, setSessions] = useState(loadFairwayStreakSessions);
  const [phase, setPhase] = useState<Phase>("ready");
  const [streak, setStreak] = useState(0);
  const [lastResult, setLastResult] = useState(0);
  const pb = useMemo(() => fairwayStreakPb(sessions), [sessions]);

  function start() {
    setStreak(0);
    setLastResult(0);
    setPhase("playing");
  }

  function hit() {
    setStreak((v) => v + 1);
  }

  function miss() {
    const next = saveFairwayStreakSession(streak);
    setSessions(next);
    setLastResult(streak);
    setPhase("result");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-24 pt-8">
      <header className="flex items-center justify-between">
        <Link
          to="/traning"
          search={{ category: "off-the-tee" }}
          aria-label="Tillbaka"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          One life
        </span>
      </header>

      {phase === "ready" ? (
        <>
          <section className="mt-8 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Flag className="h-7 w-7" />
            </span>
            <p className="mt-5 text-xs uppercase tracking-[0.25em] text-muted-foreground">Driver challenge</p>
            <h1 className="mt-1 font-display text-5xl leading-none">Fairway Streak</h1>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Sikta mot en 30 m bred fairway. Träff = fortsätt. Första missen avslutar testet.
            </p>
          </section>

          <section className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-border bg-card p-5 text-center shadow-[var(--shadow-glow)]">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Personbästa</p>
              <p className="mt-1 font-display text-5xl leading-none text-primary">{pb || "–"}</p>
              <p className="mt-1 text-xs text-muted-foreground">fairways i rad</p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-5 text-center">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Tester</p>
              <p className="mt-1 font-display text-5xl leading-none">{sessions.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">försök</p>
            </div>
          </section>

          <section className="mt-5 rounded-3xl border border-border bg-card p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Regel</p>
            <p className="mt-1">30 m korridor. En boll i taget. Ingen maxgräns. Miss = game over.</p>
          </section>

          <button onClick={start} className="mt-6 w-full rounded-2xl bg-primary py-5 font-display text-2xl text-primary-foreground">
            Starta challenge
          </button>
        </>
      ) : phase === "playing" ? (
        <section className="mt-10 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Nuvarande streak</p>
          <div className="mt-5 rounded-[2rem] border-2 border-primary/30 bg-card px-6 py-10 shadow-[var(--shadow-glow)]">
            <p className="font-display text-8xl leading-none text-primary">{streak}</p>
            <p className="mt-2 text-sm text-muted-foreground">fairways i rad</p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button onClick={hit} className="rounded-2xl bg-primary py-5 font-display text-2xl text-primary-foreground">
              Fairway
            </button>
            <button onClick={miss} className="rounded-2xl border-2 border-destructive/50 py-5 font-display text-2xl text-destructive">
              Miss
            </button>
          </div>
        </section>
      ) : (
        <section className="mt-10 text-center">
          <Trophy className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-4 text-xs uppercase tracking-[0.25em] text-muted-foreground">Ditt resultat</p>
          <p className="mt-1 font-display text-8xl leading-none text-primary">{lastResult}</p>
          <p className="text-lg text-muted-foreground">fairways i rad</p>
          {lastResult >= pb && lastResult > 0 ? (
            <p className="mx-auto mt-4 inline-flex rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary">Nytt PB</p>
          ) : null}
          <button onClick={start} className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 font-display text-2xl text-primary-foreground">
            <RotateCcw className="h-5 w-5" /> Kör igen
          </button>
        </section>
      )}

      {sessions.length > 0 && phase !== "playing" ? (
        <section className="mt-8">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Senaste försök</h2>
          <div className="mt-3 space-y-2">
            {[...sessions].reverse().slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
                <span className="text-sm text-muted-foreground">{fmtDate(s.date)}</span>
                <span className="font-display text-xl">{s.streak}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
