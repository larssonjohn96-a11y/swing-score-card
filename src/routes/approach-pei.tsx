import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BarChart3, RotateCcw, Target, Trophy, X } from "lucide-react";
import { useState } from "react";
import {
  createPeiShots,
  groupPei,
  loadPeiSessions,
  missDistance,
  PEI_GROUPS,
  PEI_SHOT_COUNT,
  PEI_TARGET_DISTANCES,
  rollingEightAverage,
  savePeiSession,
  sessionPei,
  shotPei,
  type PeiSession,
  type PeiShot,
} from "@/lib/approach-pei";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

export const Route = createFileRoute("/approach-pei")({
  head: () => ({
    meta: [
      { title: "18-bollars PEI – Approach träningstest | SG4" },
      {
        name: "description",
        content:
          "18 fasta inspel mellan 50 och 220 meter. Snabbregistrera längd och sidled med knappar och följ PEI över tid. Ej HCP-grundande.",
      },
    ],
  }),
  component: ApproachPeiPage,
});

type Phase = "intro" | "test" | "result";

function ApproachPeiPage() {
  useHideBottomNav(true);
  const [phase, setPhase] = useState<Phase>("intro");
  const [shots, setShots] = useState<PeiShot[]>(createPeiShots);
  const [index, setIndex] = useState(0);
  const [actualDistance, setActualDistance] = useState(PEI_TARGET_DISTANCES[0]);
  const [lateral, setLateral] = useState(0);
  const [savedSession, setSavedSession] = useState<PeiSession | null>(null);
  const [history, setHistory] = useState<PeiSession[]>(() => loadPeiSessions());

  const current = shots[index];
  const progress = Math.round((index / PEI_SHOT_COUNT) * 100);

  function resetInputFor(shotIndex: number) {
    const shot = shots[shotIndex];
    setActualDistance(shot?.actualDistance || shot?.targetDistance || PEI_TARGET_DISTANCES[0]);
    setLateral(Math.abs(shot?.lateral ?? 0));
  }

  function start() {
    const nextShots = createPeiShots();
    setShots(nextShots);
    setIndex(0);
    setActualDistance(nextShots[0].targetDistance);
    setLateral(0);
    setSavedSession(null);
    setPhase("test");
  }

  function adjustDistance(delta: number) {
    setActualDistance((value) => Math.max(0, value + delta));
  }

  function adjustLateral(delta: number) {
    setLateral((value) => Math.max(0, value + delta));
  }

  function commit() {
    const updated = shots.map((shot, i) =>
      i === index ? { ...shot, actualDistance, lateral } : shot,
    );
    setShots(updated);

    if (index + 1 >= PEI_SHOT_COUNT) {
      const session = savePeiSession(updated);
      setHistory((old) => [...old, session]);
      setSavedSession(session);
      setPhase("result");
      return;
    }

    const nextIndex = index + 1;
    setIndex(nextIndex);
    setActualDistance(updated[nextIndex].targetDistance);
    setLateral(0);
  }

  function back() {
    if (index === 0) return;
    const previousIndex = index - 1;
    setIndex(previousIndex);
    const previous = shots[previousIndex];
    setActualDistance(previous.actualDistance || previous.targetDistance);
    setLateral(Math.abs(previous.lateral ?? 0));
  }

  if (phase === "intro") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-8">
        <div className="flex items-center justify-between">
          <Link
            to="/kategori/$slug"
            params={{ slug: "approach" }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Link
            to="/approach-pei-historik"
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground"
          >
            <BarChart3 className="h-4 w-4" /> Historik
          </Link>
        </div>

        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Approach · Träningstest
        </p>
        <h1 className="mt-2 text-5xl leading-none">18-bollars PEI</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Samma 18 målavstånd varje gång. Efter varje slag justerar du bara längden och hur många meter i sidled bollen slutade.
        </p>

        <div className="mt-6 rounded-3xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Snabb inmatning
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            Längden startar automatiskt på målavståndet. Justera med ±5 eller ±1 meter. Sidled startar på 0 och anges bara som antal meter från mållinjen – höger eller vänster spelar ingen roll för PEI.
          </p>
        </div>

        <div className="mt-4 rounded-3xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            De 18 målavstånden
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PEI_TARGET_DISTANCES.map((distance) => (
              <span key={distance} className="rounded-full bg-muted px-3 py-1.5 text-xs">{distance} m</span>
            ))}
          </div>
        </div>

        <p className="mt-5 rounded-2xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Ej HCP-grundande · påverkar inte SG4 HCP.
        </p>

        <button
          onClick={start}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 font-display text-2xl text-primary-foreground"
        >
          Starta 18 slag <ArrowRight className="h-5 w-5" />
        </button>
      </main>
    );
  }

  if (phase === "test" && current) {
    const previewShot: PeiShot = { ...current, actualDistance, lateral };

    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-32 pt-4">
        <div className="flex items-center justify-between">
          <button
            onClick={back}
            disabled={index === 0}
            className="rounded-full border border-border p-2 text-muted-foreground disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Link
            to="/kategori/$slug"
            params={{ slug: "approach" }}
            className="flex items-center gap-1 text-xs text-muted-foreground"
          >
            <X className="h-4 w-4" /> Avbryt
          </Link>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">Slag {index + 1} av {PEI_SHOT_COUNT}</span>
            <span className="text-muted-foreground">{progress} %</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <section className="mt-6 rounded-3xl border border-border bg-card p-5 text-center shadow-[var(--shadow-glow)]">
          <Target className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">Mål</p>
          <p className="mt-1 font-display text-6xl leading-none text-flag">
            {current.targetDistance}<span className="ml-2 text-xl text-muted-foreground">m</span>
          </p>
        </section>

        <section className="mt-4 rounded-3xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Faktiskt avstånd</p>
          <div className="mt-3 text-center">
            <p className="font-display text-5xl leading-none">{actualDistance} <span className="text-xl text-muted-foreground">m</span></p>
            <p className="mt-1 text-xs text-muted-foreground">
              {actualDistance === current.targetDistance
                ? "Exakt målavstånd"
                : actualDistance < current.targetDistance
                  ? `${current.targetDistance - actualDistance} m kort`
                  : `${actualDistance - current.targetDistance} m lång`}
            </p>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[-5, -1, 1, 5].map((delta) => (
              <button
                key={delta}
                type="button"
                onClick={() => adjustDistance(delta)}
                className="rounded-2xl border border-border bg-background py-4 font-display text-xl active:scale-95"
              >
                {delta > 0 ? `+${delta}` : delta}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-3 rounded-3xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Sidled från mål</p>
          <div className="mt-3 text-center">
            <p className="font-display text-5xl leading-none">{lateral} <span className="text-xl text-muted-foreground">m</span></p>
            <p className="mt-1 text-xs text-muted-foreground">Endast avståndet räknas, inte höger/vänster.</p>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[-5, -1, 1, 5].map((delta) => (
              <button
                key={delta}
                type="button"
                onClick={() => adjustLateral(delta)}
                disabled={lateral === 0 && delta < 0}
                className="rounded-2xl border border-border bg-background py-4 font-display text-xl active:scale-95 disabled:opacity-30"
              >
                {delta > 0 ? `+${delta}` : delta}
              </button>
            ))}
          </div>
        </section>

        <div className="mt-3 flex justify-between rounded-2xl bg-muted/60 p-4">
          <div>
            <p className="text-xs text-muted-foreground">Från mål</p>
            <p className="font-display text-2xl">{missDistance(previewShot).toFixed(1)} m</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">PEI</p>
            <p className="font-display text-2xl">{shotPei(previewShot).toFixed(1)} %</p>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 px-6 pb-6 pt-3 backdrop-blur">
          <button
            onClick={commit}
            className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground"
          >
            {index + 1 === PEI_SHOT_COUNT ? "Avsluta test" : "Nästa slag"}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </main>
    );
  }

  const result = savedSession ?? { id: "", date: "", shots, pei: sessionPei(shots) };
  const best = history.length ? Math.min(...history.map((session) => session.pei)) : result.pei;
  const rolling = rollingEightAverage(history);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-6">
      <Link
        to="/kategori/$slug"
        params={{ slug: "approach" }}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <p className="mt-6 text-xs uppercase tracking-[0.25em] text-muted-foreground">Approach · Träningstest</p>
      <h1 className="mt-1 text-4xl leading-none">18-bollars PEI</h1>

      <div className="mt-6 rounded-3xl border border-border bg-card p-6 text-center shadow-[var(--shadow-glow)]">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ditt PEI</p>
        <p className="mt-2 font-display text-7xl leading-none text-primary">{result.pei.toFixed(2)}%</p>
        <p className="mt-3 text-xs text-muted-foreground">Lägre är bättre · ej HCP-grundande</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <Trophy className="h-4 w-4 text-primary" />
          <p className="mt-2 text-xs text-muted-foreground">Personbästa</p>
          <p className="font-display text-3xl">{best.toFixed(2)}%</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Snitt senaste 8</p>
          <p className="mt-6 font-display text-3xl">{rolling !== null ? `${rolling.toFixed(2)}%` : "–"}</p>
        </div>
      </div>

      <section className="mt-5 rounded-3xl border border-border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">PEI per avstånd</p>
        <div className="mt-3 space-y-2">
          {PEI_GROUPS.map((group) => (
            <div key={group.label} className="flex justify-between rounded-2xl bg-muted/50 px-4 py-3">
              <span className="text-sm">{group.label}</span>
              <span className="font-semibold">{groupPei(result.shots, group.min, group.max).toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </section>

      <Link
        to="/approach-pei-historik"
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-4 font-semibold"
      >
        <BarChart3 className="h-5 w-5" /> Se resultathistorik
      </Link>

      <button
        onClick={start}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground"
      >
        <RotateCcw className="h-5 w-5" /> Kör igen
      </button>
    </main>
  );
}
