import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Flame, RotateCcw, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import {
  PUTTING_STREAK_DISTANCES,
  loadPuttingStreakSessions,
  puttingStreakPb,
  savePuttingStreakSession,
} from "@/lib/putting-streak";

export const Route = createFileRoute("/putting-streak")({
  head: () => ({
    meta: [
      { title: "Putting Streak – one life challenge | SG4" },
      {
        name: "description",
        content:
          "Putting Streak: en putt per nivå från 1 till 10 meter. Första missen avslutar testet. Följ ditt personbästa över tid.",
      },
    ],
  }),
  component: PuttingStreakPage,
});

type Phase = "ready" | "playing" | "result";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

function PuttingStreakPage() {
  const [sessions, setSessions] = useState(loadPuttingStreakSessions);
  const [phase, setPhase] = useState<Phase>("ready");
  const [index, setIndex] = useState(0);
  const [lastCleared, setLastCleared] = useState(0);
  const [lastFailed, setLastFailed] = useState(PUTTING_STREAK_DISTANCES[0]);

  const pb = useMemo(() => puttingStreakPb(sessions), [sessions]);
  const current = PUTTING_STREAK_DISTANCES[Math.min(index, PUTTING_STREAK_DISTANCES.length - 1)];

  function start() {
    setIndex(0);
    setLastCleared(0);
    setLastFailed(PUTTING_STREAK_DISTANCES[0]);
    setPhase("playing");
  }

  function made() {
    const clearedDistance = current;
    const nextIndex = index + 1;
    if (nextIndex >= PUTTING_STREAK_DISTANCES.length) {
      const next = savePuttingStreakSession({
        cleared: PUTTING_STREAK_DISTANCES.length,
        clearedDistance,
        failedDistance: clearedDistance,
      });
      setSessions(next);
      setLastCleared(clearedDistance);
      setLastFailed(clearedDistance);
      setPhase("result");
      return;
    }
    setLastCleared(clearedDistance);
    setIndex(nextIndex);
  }

  function missed() {
    const cleared = index;
    const clearedDistance = index > 0 ? PUTTING_STREAK_DISTANCES[index - 1] : 0;
    const next = savePuttingStreakSession({ cleared, clearedDistance, failedDistance: current });
    setSessions(next);
    setLastCleared(clearedDistance);
    setLastFailed(current);
    setPhase("result");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-24 pt-8">
      <header className="flex items-center justify-between">
        <Link
          to="/traning"
          search={{ category: "putting" }}
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
              <Flame className="h-7 w-7" />
            </span>
            <p className="mt-5 text-xs uppercase tracking-[0.25em] text-muted-foreground">Putting challenge</p>
            <h1 className="mt-1 font-display text-5xl leading-none">Putting Streak</h1>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              En putt per nivå. Sätt den och gå längre. Missar du är testet slut.
            </p>
          </section>

          <section className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-border bg-card p-5 text-center shadow-[var(--shadow-glow)]">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Personbästa</p>
              <p className="mt-1 font-display text-5xl leading-none text-primary">{pb || "–"}</p>
              <p className="mt-1 text-xs text-muted-foreground">meter</p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-5 text-center">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Tester</p>
              <p className="mt-1 font-display text-5xl leading-none">{sessions.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">försök</p>
            </div>
          </section>

          <section className="mt-5 rounded-3xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Stegen</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PUTTING_STREAK_DISTANCES.map((d) => (
                <span key={d} className="rounded-full bg-muted px-3 py-1.5 text-sm font-semibold">
                  {String(d).replace(".", ",")} m
                </span>
              ))}
            </div>
          </section>

          <button onClick={start} className="mt-6 w-full rounded-2xl bg-primary py-5 font-display text-2xl text-primary-foreground">
            Starta challenge
          </button>
        </>
      ) : phase === "playing" ? (
        <section className="mt-10 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Nivå {index + 1}</p>
          <div className="mt-5 rounded-[2rem] border-2 border-primary/30 bg-card px-6 py-10 shadow-[var(--shadow-glow)]">
            <p className="font-display text-8xl leading-none text-primary">
              {String(current).replace(".", ",")}
            </p>
            <p className="mt-1 text-lg text-muted-foreground">meter</p>
            <p className="mt-4 text-sm text-muted-foreground">1 putt · 1 liv</p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button onClick={made} className="rounded-2xl bg-primary py-5 font-display text-2xl text-primary-foreground">
              Satt
            </button>
            <button onClick={missed} className="rounded-2xl border-2 border-destructive/50 py-5 font-display text-2xl text-destructive">
              Miss
            </button>
          </div>
        </section>
      ) : (
        <section className="mt-10 text-center">
          <Trophy className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-4 text-xs uppercase tracking-[0.25em] text-muted-foreground">Ditt resultat</p>
          <p className="mt-1 font-display text-8xl leading-none text-primary">{lastCleared || 0}</p>
          <p className="text-lg text-muted-foreground">meter klarat</p>
          <p className="mt-4 text-sm text-muted-foreground">Miss på {String(lastFailed).replace(".", ",")} m</p>
          {lastCleared >= pb && lastCleared > 0 ? (
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
                <span className="font-display text-xl">{s.clearedDistance} m</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
