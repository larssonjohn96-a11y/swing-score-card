import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, RotateCcw, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import {
  CLOCK_MAX_SCORE,
  CLOCK_PUTTING_ROLLING_WINDOW,
  CLOCK_PUTTS,
  bestClockScore,
  clockDistanceStats,
  formatClockAverage,
  loadClockPuttingSessions,
  recentClockAverage,
  saveClockPuttingSession,
} from "@/lib/clock-putting";

export const Route = createFileRoute("/klock-putt")({
  head: () => ({
    meta: [
      { title: "Klockan – 12 puttar | SG4" },
      {
        name: "description",
        content:
          "12 puttar från klockan 12, 3, 6 och 9 på 1, 2 och 3 meter. Följ totalpoäng, rullande snitt och träffprocent per avstånd.",
      },
    ],
  }),
  component: ClockPuttingPage,
});

type Phase = "ready" | "playing" | "result";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });

function ClockPuttingPage() {
  const [sessions, setSessions] = useState(loadClockPuttingSessions);
  const [phase, setPhase] = useState<Phase>("ready");
  const [index, setIndex] = useState(0);
  const [made, setMade] = useState<boolean[]>(Array(CLOCK_PUTTS.length).fill(false));
  const [lastScore, setLastScore] = useState<number | null>(null);

  const current = CLOCK_PUTTS[index];
  const rolling = useMemo(() => recentClockAverage(sessions), [sessions]);
  const best = useMemo(() => bestClockScore(sessions), [sessions]);
  const distanceStats = useMemo(() => clockDistanceStats(sessions), [sessions]);

  function start() {
    setIndex(0);
    setMade(Array(CLOCK_PUTTS.length).fill(false));
    setLastScore(null);
    setPhase("playing");
  }

  function register(value: boolean) {
    const nextMade = made.map((old, i) => (i === index ? value : old));
    if (index < CLOCK_PUTTS.length - 1) {
      setMade(nextMade);
      setIndex(index + 1);
      return;
    }
    const session = saveClockPuttingSession(nextMade);
    setMade(nextMade);
    setSessions(loadClockPuttingSessions());
    setLastScore(session.total);
    setPhase("result");
  }

  const liveScore = CLOCK_PUTTS.reduce(
    (sum, putt, i) => sum + (i < index && made[i] ? putt.points : 0),
    0,
  );

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
          12 puttar
        </span>
      </header>

      {phase === "ready" ? (
        <>
          <section className="mt-8 text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Putting · scoring</p>
            <h1 className="mt-1 font-display text-5xl leading-none">Klockan</h1>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Klockan 12, 3, 6 och 9. En putt från 1, 2 och 3 meter på varje position.
            </p>
          </section>

          <section className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-border bg-card p-5 text-center shadow-[var(--shadow-glow)]">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Rullande snitt</p>
              <p className="mt-1 font-display text-5xl leading-none text-primary">
                {sessions.length ? formatClockAverage(rolling) : "–"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">senaste {Math.min(sessions.length, CLOCK_PUTTING_ROLLING_WINDOW)} tester</p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-5 text-center">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Bästa score</p>
              <p className="mt-1 font-display text-5xl leading-none">{best ?? "–"}</p>
              <p className="mt-1 text-xs text-muted-foreground">av {CLOCK_MAX_SCORE}</p>
            </div>
          </section>

          <section className="mt-5 rounded-3xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Poäng</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-muted p-3"><strong className="block text-xl">1 m</strong><span className="text-xs text-muted-foreground">1 p / satt</span></div>
              <div className="rounded-2xl bg-muted p-3"><strong className="block text-xl">2 m</strong><span className="text-xs text-muted-foreground">1 p / satt</span></div>
              <div className="rounded-2xl bg-muted p-3"><strong className="block text-xl">3 m</strong><span className="text-xs text-muted-foreground">2 p / satt</span></div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Maxscore: {CLOCK_MAX_SCORE}. Högre är bättre.</p>
          </section>

          {sessions.length ? (
            <section className="mt-5 rounded-3xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Träffprocent per avstånd</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {distanceStats.map((stat) => (
                  <div key={stat.distance} className="rounded-2xl bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground">{stat.distance} m</p>
                    <p className="font-display text-3xl">{Math.round(stat.pct)}%</p>
                    <p className="text-[10px] text-muted-foreground">{stat.made}/{stat.attempts}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <button onClick={start} className="mt-6 w-full rounded-2xl bg-primary py-5 font-display text-2xl text-primary-foreground">
            Starta test
          </button>
        </>
      ) : phase === "playing" && current ? (
        <section className="mt-10 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Putt {index + 1} av 12 · {liveScore} poäng</p>
          <div className="mt-5 rounded-[2rem] border-2 border-primary/30 bg-card px-6 py-9 shadow-[var(--shadow-glow)]">
            <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Klockan {current.direction}</p>
            <p className="mt-2 font-display text-8xl leading-none text-primary">{current.distance}</p>
            <p className="mt-1 text-lg text-muted-foreground">meter</p>
            <p className="mt-4 text-sm font-semibold">{current.points} poäng om du sätter den</p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button onClick={() => register(true)} className="rounded-2xl bg-primary py-5 font-display text-2xl text-primary-foreground">Satt</button>
            <button onClick={() => register(false)} className="rounded-2xl border-2 border-border py-5 font-display text-2xl">Miss</button>
          </div>
        </section>
      ) : (
        <section className="mt-10 text-center">
          <Trophy className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-4 text-xs uppercase tracking-[0.25em] text-muted-foreground">Ditt resultat</p>
          <p className="mt-1 font-display text-8xl leading-none text-primary">{lastScore ?? 0}</p>
          <p className="text-lg text-muted-foreground">av {CLOCK_MAX_SCORE} poäng</p>
          <p className="mt-3 text-sm text-muted-foreground">Rullande snitt: {formatClockAverage(rolling)}</p>

          <div className="mt-6 grid grid-cols-3 gap-2">
            {distanceStats.map((stat) => (
              <div key={stat.distance} className="rounded-2xl border border-border bg-card p-3 text-center">
                <p className="text-xs text-muted-foreground">{stat.distance} m</p>
                <p className="font-display text-3xl">{Math.round(stat.pct)}%</p>
                <p className="text-[10px] text-muted-foreground">{stat.made}/{stat.attempts}</p>
              </div>
            ))}
          </div>

          <button onClick={start} className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 font-display text-2xl text-primary-foreground">
            <RotateCcw className="h-5 w-5" /> Kör igen
          </button>
        </section>
      )}

      {sessions.length > 0 && phase !== "playing" ? (
        <section className="mt-8">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Senaste tester</h2>
          <div className="mt-3 space-y-2">
            {[...sessions].reverse().slice(0, 5).map((session) => (
              <div key={session.id} className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
                <span className="text-sm text-muted-foreground">{fmtDate(session.date)}</span>
                <span className="font-display text-xl">{session.total}/{CLOCK_MAX_SCORE}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
