import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BarChart3, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { LEGACY_KEYS } from "@/lib/sessions/keys";
import { recordSessionSaved } from "@/lib/sessions/sync";

export type FocusKind = "wedge" | "iron";
type Shot = { target: number; actual: number; lateral: number };
type Session = { id: string; date: string; pei: number };

const CONFIG = {
  wedge: { title: "Wedge PEI", min: 50, max: 120, key: LEGACY_KEYS.peiWedge, testId: "pei-wedge" },
  iron: { title: "Iron PEI", min: 120, max: 190, key: LEGACY_KEYS.peiIron, testId: "pei-iron" },
} as const;

function generateDistances(min: number, max: number) {
  const count = 18;
  const width = (max - min) / count;
  const values = Array.from({ length: count }, (_, i) =>
    Math.round(min + i * width + Math.random() * width),
  );
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

function shotPei(shot: Shot) {
  return (Math.hypot(shot.actual - shot.target, shot.lateral) / shot.target) * 100;
}

function missDistance(shot: Shot) {
  return Math.hypot(shot.actual - shot.target, shot.lateral);
}

function totalPei(shots: Shot[]) {
  return shots.reduce((sum, shot) => sum + shotPei(shot), 0) / shots.length;
}

function load(key: string): Session[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function StepButtons({
  onAdjust,
  disableNegative = false,
}: {
  onAdjust: (delta: number) => void;
  disableNegative?: boolean;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {[-5, -1, 1, 5].map((delta) => (
        <button
          key={delta}
          type="button"
          onClick={() => onAdjust(delta)}
          disabled={disableNegative && delta < 0}
          className="rounded-xl border border-border bg-background py-2.5 text-sm font-semibold transition-transform active:scale-95 disabled:opacity-30"
        >
          {delta > 0 ? `+${delta}` : delta}
        </button>
      ))}
    </div>
  );
}

export function PeiFocusTest({ kind }: { kind: FocusKind }) {
  useHideBottomNav(true);
  const cfg = CONFIG[kind];
  const [phase, setPhase] = useState<"intro" | "test" | "result">("intro");
  const [shots, setShots] = useState<Shot[]>([]);
  const [index, setIndex] = useState(0);
  const [actual, setActual] = useState(0);
  const [lateral, setLateral] = useState(0);
  const [distanceActive, setDistanceActive] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  function start() {
    const next = generateDistances(cfg.min, cfg.max).map((target) => ({
      target,
      actual: target,
      lateral: 0,
    }));
    setShots(next);
    setIndex(0);
    setActual(next[0].target);
    setLateral(0);
    setDistanceActive(false);
    setResult(null);
    setPhase("test");
  }

  function adjustDistance(delta: number) {
    setDistanceActive(true);
    setActual((value) => Math.max(0, value + delta));
  }

  function adjustLateral(delta: number) {
    setLateral((value) => Math.max(0, value + delta));
  }

  function commit() {
    const updated = shots.map((shot, i) =>
      i === index ? { ...shot, actual, lateral } : shot,
    );
    setShots(updated);

    if (index === 17) {
      const pei = totalPei(updated);
      const sessions = load(cfg.key);
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now());
      const record: Session = { id, date: new Date().toISOString(), pei };
      localStorage.setItem(cfg.key, JSON.stringify([...sessions, record]));
      recordSessionSaved(cfg.testId, record);
      setResult(pei);
      setPhase("result");
      return;
    }

    const nextIndex = index + 1;
    setIndex(nextIndex);
    setActual(updated[nextIndex].target);
    setLateral(0);
    setDistanceActive(false);
  }

  function back() {
    if (index === 0) return;
    const previousIndex = index - 1;
    const previous = shots[previousIndex];
    setIndex(previousIndex);
    setActual(previous.actual || previous.target);
    setLateral(previous.lateral);
    setDistanceActive(true);
  }

  if (phase === "intro") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-8">
        <Link
          to="/approach-pei-valj"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <p className="mt-8 text-xs uppercase tracking-[0.22em] text-muted-foreground">
          Approach · PEI Precision
        </p>
        <h1 className="mt-2 text-5xl leading-none">{cfg.title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          18 kontrollerat slumpade avstånd mellan {cfg.min}–{cfg.max} m. Hela spannet täcks varje gång och ordningen blandas.
        </p>
        <p className="mt-5 rounded-2xl bg-muted/50 p-4 text-xs text-muted-foreground">
          Träningstest · Ej HCP-grundande
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

  if (phase === "test") {
    const current = shots[index];
    const preview = { ...current, actual, lateral };
    const lengthDelta = actual - current.target;
    const progress = Math.round((index / 18) * 100);

    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-36 pt-3">
        <div className="flex items-center justify-between">
          <button
            onClick={back}
            disabled={index === 0}
            className="rounded-full border border-border p-2 text-muted-foreground disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold">Slag {index + 1} / 18</span>
          <Link
            to="/approach-pei-valj"
            className="flex items-center gap-1 text-xs text-muted-foreground"
          >
            <X className="h-4 w-4" /> Avbryt
          </Link>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${progress}%` }}
          />
        </div>

        <section className="mt-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-[var(--shadow-glow)]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Mål</p>
            <p className="font-display text-4xl leading-none text-flag">
              {current.target}<span className="ml-1 text-lg text-muted-foreground">m</span>
            </p>
          </div>
        </section>

        <section className="mt-3 rounded-2xl border border-border bg-card p-4">
          <button
            type="button"
            onClick={() => setDistanceActive(true)}
            className="w-full text-left"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Faktisk längd
            </p>
            <div className="mt-1 flex items-end justify-between">
              <p
                className={`font-display text-4xl leading-none transition-colors ${
                  distanceActive ? "text-foreground" : "text-muted-foreground/55"
                }`}
              >
                {actual}<span className="ml-1 text-lg">m</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {lengthDelta === 0
                  ? "På mål"
                  : lengthDelta < 0
                    ? `${Math.abs(lengthDelta)} m kort`
                    : `${lengthDelta} m lång`}
              </p>
            </div>
          </button>
          <div className="mt-3">
            <StepButtons onAdjust={adjustDistance} />
          </div>
        </section>

        <section className="mt-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Sidled från mål
              </p>
              <p className="mt-1 font-display text-4xl leading-none">
                {lateral}<span className="ml-1 text-lg text-muted-foreground">m</span>
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Endast avstånd</p>
          </div>
          <div className="mt-3">
            <StepButtons onAdjust={adjustLateral} disableNegative={lateral === 0} />
          </div>
        </section>

        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 px-5 pb-5 pt-3 backdrop-blur">
          <div className="mx-auto max-w-md rounded-2xl bg-muted/55 px-4 py-3">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-[9px] uppercase text-muted-foreground">Mål</p>
                <p className="font-semibold">{current.target} m</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-muted-foreground">Längd</p>
                <p className="font-semibold">{actual} m</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-muted-foreground">Sidled</p>
                <p className="font-semibold">{lateral} m</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-muted-foreground">PEI</p>
                <p className="font-semibold">{shotPei(preview).toFixed(1)}%</p>
              </div>
            </div>
            <p className="mt-1 text-center text-[10px] text-muted-foreground">
              Total miss {missDistance(preview).toFixed(1)} m
            </p>
          </div>
          <button
            onClick={commit}
            className="mx-auto mt-2 flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-display text-xl text-primary-foreground"
          >
            {index === 17 ? "Avsluta test" : "Nästa slag"}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </main>
    );
  }

  const history = load(cfg.key);
  const best = history.length ? Math.min(...history.map((session) => session.pei)) : result!;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-8">
      <Link
        to="/approach-pei-valj"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <p className="mt-7 text-xs uppercase tracking-[0.22em] text-muted-foreground">{cfg.title}</p>
      <h1 className="mt-1 text-4xl">Resultat</h1>
      <div className="mt-5 rounded-3xl border border-border bg-card p-6 text-center">
        <p className="text-xs text-muted-foreground">PEI</p>
        <p className="font-display text-7xl text-primary">{result?.toFixed(2)}%</p>
        <p className="mt-2 text-xs text-muted-foreground">PB {best.toFixed(2)}%</p>
      </div>
      <Link
        to={kind === "wedge" ? "/approach-pei-wedge-historik" : "/approach-pei-iron-historik"}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-4 font-semibold"
      >
        <BarChart3 className="h-4 w-4" /> Resultat över tid
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
