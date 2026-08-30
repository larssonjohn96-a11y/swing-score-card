import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, RotateCcw, Target, Trophy, X } from "lucide-react";
import { useState } from "react";
import {
  createPeiShots,
  loadPeiSessions,
  missDistance,
  PEI_SHOT_COUNT,
  PEI_ZONES,
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
          "18 slumpade inspel mellan 50 och 220 meter. Mät miss i procent av målavståndet och följ PEI över tid. Ej HCP-grundande.",
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
  const [lengthError, setLengthError] = useState("");
  const [lateralError, setLateralError] = useState("");
  const [savedSession, setSavedSession] = useState<PeiSession | null>(null);
  const [history, setHistory] = useState<PeiSession[]>(() => loadPeiSessions());

  const current = shots[index];
  const progress = Math.round((index / PEI_SHOT_COUNT) * 100);

  function start() {
    setShots(createPeiShots());
    setIndex(0);
    setLengthError("");
    setLateralError("");
    setSavedSession(null);
    setPhase("test");
  }

  function commit() {
    const length = Number(lengthError.replace(",", "."));
    const lateral = Number(lateralError.replace(",", "."));
    if (!Number.isFinite(length) || !Number.isFinite(lateral) || length < 0 || lateral < 0) return;

    const updated = shots.map((shot, i) =>
      i === index ? { ...shot, lengthError: length, lateralError: lateral } : shot,
    );
    setShots(updated);
    setLengthError("");
    setLateralError("");

    if (index + 1 >= PEI_SHOT_COUNT) {
      const session = savePeiSession(updated);
      setHistory((old) => [...old, session]);
      setSavedSession(session);
      setPhase("result");
    } else {
      setIndex((old) => old + 1);
    }
  }

  function back() {
    if (index === 0) return;
    const previousIndex = index - 1;
    const previous = shots[previousIndex];
    setIndex(previousIndex);
    setLengthError(previous.lengthError ? String(previous.lengthError) : "");
    setLateralError(previous.lateralError ? String(previous.lateralError) : "");
  }

  if (phase === "intro") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-8">
        <Link
          to="/kategori/$slug"
          params={{ slug: "approach" }}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Approach · Träningstest
        </p>
        <h1 className="mt-2 text-5xl leading-none">18-bollars PEI</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          18 slumpade inspel mellan 50 och 220 meter. Tre slag genereras i varje avståndszon,
          och ordningen blandas inför varje test.
        </p>

        <div className="mt-6 rounded-3xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Så räknas resultatet
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            Ange längdmiss och sidledsmiss i meter. Appen räknar den raka missen till målet och
            dividerar den med målavståndet. Snittet av alla 18 slag blir ditt PEI.
          </p>
          <p className="mt-3 rounded-2xl bg-muted/60 p-3 text-xs text-muted-foreground">
            Exempel: 100 m till mål + 3 m längdmiss + 4 m sidled = 5 m total miss = 5,0 % PEI.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {PEI_ZONES.map((zone) => (
            <div key={zone.label} className="rounded-2xl border border-border bg-card p-3">
              <p className="font-semibold">{zone.label}</p>
              <p className="text-xs text-muted-foreground">3 slag</p>
            </div>
          ))}
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
    const previewShot: PeiShot = {
      ...current,
      lengthError: Number(lengthError.replace(",", ".")) || 0,
      lateralError: Number(lateralError.replace(",", ".")) || 0,
    };
    const canContinue = lengthError !== "" && lateralError !== "";

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

        <section className="mt-8 rounded-3xl border border-border bg-card p-6 text-center shadow-[var(--shadow-glow)]">
          <Target className="mx-auto h-7 w-7 text-primary" />
          <p className="mt-3 text-xs uppercase tracking-[0.25em] text-muted-foreground">Målavstånd</p>
          <p className="mt-1 font-display text-7xl leading-none text-flag">
            {current.targetDistance}<span className="ml-2 text-2xl text-muted-foreground">m</span>
          </p>
        </section>

        <section className="mt-5 rounded-3xl border border-border bg-card p-5">
          <p className="text-sm font-semibold">Registrera missen</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ange absoluta meter. Kort/långt eller vänster/höger spelar ingen roll för PEI.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-xs text-muted-foreground">
              Längdmiss
              <div className="mt-1 flex items-center rounded-2xl border border-border bg-background px-3">
                <input inputMode="decimal" value={lengthError} onChange={(e) => setLengthError(e.target.value)} placeholder="0" className="min-w-0 flex-1 bg-transparent py-4 text-2xl outline-none" />
                <span>m</span>
              </div>
            </label>
            <label className="text-xs text-muted-foreground">
              Sidledsmiss
              <div className="mt-1 flex items-center rounded-2xl border border-border bg-background px-3">
                <input inputMode="decimal" value={lateralError} onChange={(e) => setLateralError(e.target.value)} placeholder="0" className="min-w-0 flex-1 bg-transparent py-4 text-2xl outline-none" />
                <span>m</span>
              </div>
            </label>
          </div>
          {canContinue ? (
            <div className="mt-4 flex justify-between rounded-2xl bg-muted/60 p-4">
              <div><p className="text-xs text-muted-foreground">Total miss</p><p className="font-display text-2xl">{missDistance(previewShot).toFixed(1)} m</p></div>
              <div className="text-right"><p className="text-xs text-muted-foreground">PEI</p><p className="font-display text-2xl">{shotPei(previewShot).toFixed(1)} %</p></div>
            </div>
          ) : null}
        </section>

        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 px-6 pb-6 pt-3 backdrop-blur">
          <button onClick={commit} disabled={!canContinue} className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground disabled:opacity-40">
            {index + 1 === PEI_SHOT_COUNT ? "Avsluta test" : "Nästa slag"}<ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </main>
    );
  }

  const result = savedSession ?? { id: "", date: "", shots, pei: sessionPei(shots) };
  const best = history.length ? Math.min(...history.map((session) => session.pei)) : result.pei;
  const rolling = rollingEightAverage(history);
  const zoneResults = PEI_ZONES.map((zone) => {
    const zoneShots = result.shots.filter(
      (shot) => shot.targetDistance >= zone.min && shot.targetDistance <= zone.max,
    );
    return { label: zone.label, pei: zoneShots.length ? sessionPei(zoneShots) : 0 };
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-6">
      <Link to="/kategori/$slug" params={{ slug: "approach" }} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground">
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
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Per avståndszon</p>
        <div className="mt-3 space-y-2">
          {zoneResults.map((zone) => (
            <div key={zone.label} className="flex justify-between rounded-2xl bg-muted/50 px-4 py-3">
              <span className="text-sm">{zone.label}</span><span className="font-semibold">{zone.pei.toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </section>

      {history.length > 1 ? (
        <section className="mt-5 rounded-3xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Senaste tester</p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {history.slice(-8).reverse().map((session) => (
              <span key={session.id} className="shrink-0 rounded-full border border-border px-3 py-2 text-xs">{session.pei.toFixed(2)}%</span>
            ))}
          </div>
        </section>
      ) : null}

      <button onClick={start} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground">
        <RotateCcw className="h-5 w-5" /> Kör igen
      </button>
    </main>
  );
}
