import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, RotateCcw, Trophy } from "lucide-react";
import { useMemo, useState } from "react";

type StreakType = "approach" | "bunker";
type Phase = "ready" | "playing" | "result";

const CONFIG: Record<StreakType, {
  title: string;
  eyebrow: string;
  description: string;
  rule: string;
  hitLabel: string;
  unit: string;
}> = {
  approach: {
    title: "Inspel i rad",
    eyebrow: "Inspel challenge",
    description: "Välj en tydlig målzon på greenen. Träffa zonen och fortsätt. Första missen avslutar streaken.",
    rule: "Bestäm målzonen innan du börjar. Samma målzon gäller genom hela försöket.",
    hitLabel: "Träff",
    unit: "inspel i rad",
  },
  bunker: {
    title: "Bunkerslag i rad",
    eyebrow: "Bunker challenge",
    description: "Välj en målzon runt hålet. Inom zonen = fortsätt. Första missen avslutar streaken.",
    rule: "Bestäm målzonen innan du börjar, till exempel inom 3 meter. Samma zon gäller genom hela försöket.",
    hitLabel: "Inom zon",
    unit: "bunkerslag i rad",
  },
};

export const Route = createFileRoute("/streak-challenge")({
  validateSearch: (search: Record<string, unknown>) => ({
    type: search.type === "bunker" ? "bunker" as const : "approach" as const,
  }),
  component: StreakChallengePage,
});

function storageKey(type: StreakType) {
  return `sg4-streak-${type}-v1`;
}

function loadPb(type: StreakType) {
  if (typeof window === "undefined") return 0;
  const value = Number(window.localStorage.getItem(storageKey(type)) ?? "0");
  return Number.isFinite(value) ? value : 0;
}

function StreakChallengePage() {
  const { type } = Route.useSearch();
  const config = CONFIG[type];
  const [phase, setPhase] = useState<Phase>("ready");
  const [streak, setStreak] = useState(0);
  const [lastResult, setLastResult] = useState(0);
  const [pb, setPb] = useState(() => loadPb(type));
  const isPb = useMemo(() => lastResult > 0 && lastResult >= pb, [lastResult, pb]);

  function start() {
    setStreak(0);
    setLastResult(0);
    setPhase("playing");
  }

  function hit() {
    setStreak((value) => value + 1);
  }

  function miss() {
    const result = streak;
    const nextPb = Math.max(pb, result);
    window.localStorage.setItem(storageKey(type), String(nextPb));
    setLastResult(result);
    setPb(nextPb);
    setPhase("result");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-24 pt-8">
      <header className="flex items-center justify-between">
        <Link
          to="/standardiserade-tester"
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
          <section className="mt-9 text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{config.eyebrow}</p>
            <h1 className="mt-2 font-display text-5xl leading-none">{config.title}</h1>
            <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">{config.description}</p>
          </section>

          <section className="mt-7 rounded-3xl border border-border bg-card p-5 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Personbästa</p>
            <p className="mt-1 font-display text-6xl leading-none text-primary">{pb || "–"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{config.unit}</p>
          </section>

          <section className="mt-4 rounded-3xl border border-border bg-card p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Regel</p>
            <p className="mt-1">{config.rule}</p>
          </section>

          <button onClick={start} className="mt-6 w-full rounded-2xl bg-primary py-5 font-display text-2xl text-primary-foreground">
            Starta challenge
          </button>
        </>
      ) : phase === "playing" ? (
        <section className="mt-12 text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Nuvarande streak</p>
          <div className="mt-5 rounded-[2rem] border-2 border-primary/30 bg-card px-6 py-10">
            <p className="font-display text-8xl leading-none text-primary">{streak}</p>
            <p className="mt-2 text-sm text-muted-foreground">{config.unit}</p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button onClick={hit} className="rounded-2xl bg-primary py-5 font-display text-2xl text-primary-foreground">
              {config.hitLabel}
            </button>
            <button onClick={miss} className="rounded-2xl border-2 border-destructive/50 py-5 font-display text-2xl text-destructive">
              Miss
            </button>
          </div>
        </section>
      ) : (
        <section className="mt-12 text-center">
          <Trophy className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-4 text-xs uppercase tracking-[0.24em] text-muted-foreground">Ditt resultat</p>
          <p className="mt-1 font-display text-8xl leading-none text-primary">{lastResult}</p>
          <p className="text-lg text-muted-foreground">{config.unit}</p>
          {isPb ? <p className="mx-auto mt-4 inline-flex rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary">Nytt PB</p> : null}
          <button onClick={start} className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-5 font-display text-2xl text-slate-950">
            <RotateCcw className="h-5 w-5" /> Kör igen
          </button>
        </section>
      )}
    </main>
  );
}
