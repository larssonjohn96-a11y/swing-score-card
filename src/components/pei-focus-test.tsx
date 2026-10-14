import { ActivityReview } from "@/components/activity-review";
import { rawActivityOutcomes, isActivityComplete } from "@/lib/activity-review";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Check, RotateCcw, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { LEGACY_KEYS } from "@/lib/sessions/keys";
import { recordSessionSaved } from "@/lib/sessions/sync";
import { LIGHT_SURFACE } from "@/routes/8-bollar";

import { useAuth } from "@/hooks/use-auth";
import { PeiLeaderboard } from "@/components/pei-leaderboard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  IRON_TARGETS,
  WEDGE_TARGETS,
  loadPeiSessions,
  peiRankingAverage,
  type FocusKind,
} from "@/lib/pei-ranking";
import { SESSIONS_CHANGED_EVENT } from "@/lib/sessions/sync";
export { IRON_TARGETS, WEDGE_TARGETS } from "@/lib/pei-ranking";
export type { FocusKind } from "@/lib/pei-ranking";
type Shot = { target: number; actual: number; lateral: number };
type Session = { id: string; date: string; pei: number; shots?: Shot[] };

type FocusConfig = {
  title: string;
  /** Avståndsband som visas på landningssidan. */
  min: number;
  max: number;
  shotCount: number;
  key: string;
  testId: string;
  intro: string;
  targets: readonly number[];
};

const CONFIG: Record<FocusKind, FocusConfig> = {
  wedge: {
    title: "Wedge PEI",
    min: 30,
    max: 110,
    shotCount: WEDGE_TARGETS.length,
    key: LEGACY_KEYS.peiWedge,
    testId: "pei-wedge",
    targets: WEDGE_TARGETS,
    intro:
      "9 slag på fasta, stigande avstånd från 30 till 110 m. Ett slag per avstånd, i samma ordning varje gång.",
  },
  iron: {
    title: "Iron PEI",
    min: 120,
    max: 175,
    shotCount: IRON_TARGETS.length,
    key: LEGACY_KEYS.peiIron,
    testId: "pei-iron",
    targets: IRON_TARGETS,
    intro:
      "9 slag på fasta, stigande avstånd från 120 till 175 m. Ett slag per avstånd, i samma ordning varje gång.",
  },
};

function shotPei(shot: Shot) {
  return (Math.hypot(shot.actual - shot.target, shot.lateral) / shot.target) * 100;
}

function missDistance(shot: Shot) {
  return Math.hypot(shot.actual - shot.target, shot.lateral);
}

function totalPei(shots: Shot[]) {
  return shots.reduce((sum, shot) => sum + shotPei(shot), 0) / shots.length;
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
          className="rounded-2xl border border-slate-300/85 bg-white/58 py-3 font-display text-lg text-slate-900 shadow-[0_10px_26px_-22px_rgba(15,23,42,.45)] backdrop-blur-xl transition-all active:scale-95 disabled:opacity-25"
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
  const { user, displayName } = useAuth();
  const [confirmExit, setConfirmExit] = useState(false);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [phase, setPhase] = useState<"intro" | "test" | "result">("intro");
  const [shots, setShots] = useState<Shot[]>([]);
  const [index, setIndex] = useState(0);
  const [actual, setActual] = useState(0);
  const [lateral, setLateral] = useState(0);
  const [distanceActive, setDistanceActive] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  const [history, setHistory] = useState<Session[]>([]);
  useEffect(() => {
    setHistory(loadPeiSessions(kind));
  }, [kind, phase, historyRevision]);
  const ranking = peiRankingAverage(history, kind);
  useEffect(() => {
    const handler = () => setHistoryRevision((value) => value + 1);
    window.addEventListener(SESSIONS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(SESSIONS_CHANGED_EVENT, handler);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.sg4TestActive = String(phase === "test");
    document.documentElement.dataset.sg4PeiResult = String(phase === "result");
    const landingHandler = () => {
      if (phase === "result") returnToLanding();
    };
    window.addEventListener("sg4-pei-landing", landingHandler);
    const handler = () => {
      if (phase === "test") setConfirmExit(true);
    };
    window.addEventListener("sg4-test-abort", handler);
    return () => {
      delete document.documentElement.dataset.sg4TestActive;
      delete document.documentElement.dataset.sg4PeiResult;
      window.removeEventListener("sg4-pei-landing", landingHandler);
      window.removeEventListener("sg4-test-abort", handler);
    };
  }, [phase]);

  function returnToLanding() {
    setConfirmExit(false);
    setShots([]);
    setIndex(0);
    setResult(null);
    setPhase("intro");
  }

  function start() {
    const distances = [...cfg.targets];
    const next = distances.map((target) => ({ target, actual: target, lateral: 0 }));
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
    const updated = shots.map((shot, i) => (i === index ? { ...shot, actual, lateral } : shot));
    setShots(updated);
    if (index === updated.length - 1) {
      const pei = totalPei(updated);
      const sessions = loadPeiSessions(kind);
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now());
      const record: Session = { id, date: new Date().toISOString(), pei, shots: updated };
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

  if (phase === "intro") {
    return (
      <main className="mx-auto min-h-[calc(100dvh-58px)] w-full max-w-md space-y-4 bg-slate-50 px-4 pb-8 pt-4 text-slate-950">
        <section className="text-center">
          <p className="text-xs font-black uppercase text-blue-600">{cfg.title}</p>
          <h1 className="mt-1 text-4xl font-black">Hur nära kommer du?</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
            Testa din precision med {kind === "wedge" ? "wedgar" : "järn"}, följ din utveckling och
            jämför med dina vänner.
          </p>
        </section>
        <section className="rounded-3xl border border-blue-100 bg-white px-3 pb-5 pt-4 shadow-sm">
          <img
            src="/Approach_shot.png"
            alt="Golfare slår ett inspel mot green"
            className="mb-4 h-52 w-full rounded-2xl object-cover"
            fetchPriority="high"
          />
          <div className="grid grid-cols-3 divide-x divide-slate-100 rounded-2xl bg-slate-50 px-1 py-3 text-center">
            {[
              ["Precision", "Din PEI i %"],
              ["Utveckling", "Följ dina resultat"],
              ["Jämför", "Du & dina vänner"],
            ].map(([title, detail]) => (
              <div key={title} className="px-2">
                <Check className="mx-auto mb-1 h-4 w-4 text-blue-600" />
                <p className="text-xs font-black text-slate-800">{title}</p>
                <p className="mt-0.5 text-[10px] text-slate-500">{detail}</p>
              </div>
            ))}
          </div>
          <Button
            onClick={start}
            className="mt-4 min-h-14 w-full rounded-2xl bg-blue-600 text-base font-black text-white hover:bg-blue-700"
          >
            Starta {cfg.title}
          </Button>
          <p className="mt-3 text-center text-xs font-semibold text-slate-500">
            {cfg.shotCount} slag · {cfg.min}–{cfg.max} m · ca 5 min
          </p>
          <p className="mt-2 text-center text-xs text-slate-500">
            Ett slag per avstånd. Mät längd och sidled från målet.
          </p>
        </section>
        {ranking.best !== null && (
          <div className="flex items-center justify-between px-2 py-2">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Trophy className="h-4 w-4" />
              Ditt personbästa
            </span>
            <strong>{ranking.best.toFixed(2).replace(".", ",")}%</strong>
          </div>
        )}
        <PeiLeaderboard
          kind={kind}
          history={history}
          userId={user?.id ?? null}
          playerName={displayName ?? "Du"}
        />
        <Link
          to={kind === "wedge" ? "/approach-pei-wedge-historik" : "/approach-pei-iron-historik"}
          className="flex items-center justify-center gap-2 py-3 text-sm font-semibold text-blue-700"
        >
          <BarChart3 className="h-4 w-4" />
          Resultat över tid
        </Link>
      </main>
    );
  }

  if (phase === "test") {
    const current = shots[index];
    const preview = { ...current, actual, lateral };
    const lengthDelta = actual - current.target;
    const progress = Math.round((index / shots.length) * 100);

    return (
      <main
        style={LIGHT_SURFACE}
        className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-36 pt-3 text-foreground"
      >
        {isActivityComplete(phase) && (
          <ActivityReview
            input={{
              title: kind === "iron" ? "Iron PEI" : "Wedge PEI",
              outcomes: rawActivityOutcomes(shots),
            }}
          />
        )}
        <Dialog open={confirmExit} onOpenChange={setConfirmExit}>
          <DialogContent className="!z-[140] w-[calc(100%-32px)] max-w-sm rounded-3xl bg-white p-6 text-slate-950">
            <DialogTitle className="text-2xl font-black">Avbryta testet?</DialogTitle>
            <DialogDescription>Dina slag i det här testet sparas inte.</DialogDescription>
            <Button
              onClick={returnToLanding}
              className="min-h-12 rounded-xl bg-slate-950 text-white hover:bg-slate-800"
            >
              Avbryt test
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmExit(false)}
              className="min-h-12 rounded-xl"
            >
              Fortsätt testet
            </Button>
          </DialogContent>
        </Dialog>
        <p className="text-center text-sm font-semibold">
          Slag {index + 1} / {shots.length}
        </p>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200/65">
          <div className="h-full rounded-full bg-blue-500/70" style={{ width: `${progress}%` }} />
        </div>

        <section className="mt-3 rounded-3xl border border-slate-300/85 bg-gradient-to-br from-slate-200/82 via-slate-100/75 to-white/65 px-4 py-4 text-center shadow-[0_18px_42px_-30px_rgba(15,23,42,.42)] backdrop-blur-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Mål</p>
          <p className="mt-1 font-display text-5xl leading-none text-slate-700">
            {current.target}
            <span className="ml-1 text-lg text-slate-500">m</span>
          </p>
        </section>

        <section className="mt-3 rounded-3xl border border-slate-300/80 bg-white/68 p-4 shadow-[0_18px_42px_-32px_rgba(15,23,42,.35)] backdrop-blur-2xl">
          <button
            type="button"
            onClick={() => setDistanceActive(true)}
            className="w-full text-center"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Faktisk längd
            </p>
            <p
              className={`mt-1 font-display text-5xl leading-none transition-colors ${distanceActive ? "text-slate-950" : "text-slate-500/70"}`}
            >
              {actual}
              <span className="ml-1 text-lg">m</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {lengthDelta === 0
                ? "På mål"
                : lengthDelta < 0
                  ? `${Math.abs(lengthDelta)} m kort`
                  : `${lengthDelta} m lång`}
            </p>
          </button>
          <div className="mt-4">
            <StepButtons onAdjust={adjustDistance} />
          </div>
        </section>

        <section className="mt-3 rounded-3xl border border-slate-300/80 bg-white/68 p-4 text-center shadow-[0_18px_42px_-32px_rgba(15,23,42,.35)] backdrop-blur-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Sidled från mål
          </p>
          <p className="mt-1 font-display text-5xl leading-none text-slate-950">
            {lateral}
            <span className="ml-1 text-lg text-slate-500">m</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">Endast avstånd</p>
          <div className="mt-4">
            <StepButtons onAdjust={adjustLateral} disableNegative={lateral === 0} />
          </div>
        </section>

        <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200/70 bg-white/66 px-5 pb-5 pt-3 backdrop-blur-2xl">
          <div className="mx-auto max-w-md rounded-3xl border border-slate-200/80 bg-white/55 px-4 py-3 shadow-[0_16px_36px_-30px_rgba(15,23,42,.4)] backdrop-blur-2xl">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-[9px] uppercase text-slate-500">Mål</p>
                <p className="font-semibold">{current.target} m</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-slate-500">Längd</p>
                <p className="font-semibold">{actual} m</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-slate-500">Sidled</p>
                <p className="font-semibold">{lateral} m</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-slate-500">PEI</p>
                <p className="font-semibold">{shotPei(preview).toFixed(1)}%</p>
              </div>
            </div>
            <p className="mt-1 text-center text-[10px] text-slate-500">
              Total miss {missDistance(preview).toFixed(1)} m
            </p>
          </div>
          <button
            onClick={commit}
            className="mx-auto mt-2 flex w-full max-w-md items-center justify-center gap-2 rounded-2xl border border-blue-300/75 bg-gradient-to-br from-blue-500/[0.18] via-blue-400/[0.13] to-white/55 py-3.5 font-display text-xl text-blue-800 shadow-[0_18px_40px_-28px_rgba(37,99,235,.75)] backdrop-blur-2xl"
          >
            {index === shots.length - 1 ? "Avsluta test" : "Nästa slag"}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </main>
    );
  }

  const best = history.length ? Math.min(...history.map((session) => session.pei)) : result!;

  return (
    <main
      style={LIGHT_SURFACE}
      className="mx-auto min-h-screen w-full max-w-md bg-background px-6 pb-16 pt-8 text-foreground"
    >
      {isActivityComplete(phase) && (
        <ActivityReview
          input={{
            title: kind === "iron" ? "Iron PEI" : "Wedge PEI",
            outcomes: rawActivityOutcomes(shots),
          }}
        />
      )}
      <p className="mt-7 text-xs uppercase tracking-[0.22em] text-slate-500">{cfg.title}</p>
      <h1 className="mt-1 text-4xl">Resultat</h1>
      <div className="mt-5 rounded-3xl border border-slate-300/80 bg-white/68 p-6 text-center shadow-[0_18px_42px_-30px_rgba(15,23,42,.35)] backdrop-blur-2xl">
        <p className="text-xs text-slate-500">PEI</p>
        <p className="font-display text-7xl text-blue-700">{result?.toFixed(2)}%</p>
        <p className="mt-2 text-xs text-slate-500">PB {best.toFixed(2)}%</p>
      </div>
      <Link
        to={kind === "wedge" ? "/approach-pei-wedge-historik" : "/approach-pei-iron-historik"}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300/80 bg-white/58 py-4 font-semibold backdrop-blur-xl"
      >
        <BarChart3 className="h-4 w-4" /> Resultat över tid
      </Link>
      <Button
        onClick={returnToLanding}
        className="mt-4 min-h-12 w-full rounded-2xl bg-blue-600 font-bold text-white hover:bg-blue-700"
      >
        Till {cfg.title}
      </Button>
      <button
        onClick={start}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-300/75 bg-blue-500/[0.12] py-4 font-display text-xl text-blue-800 backdrop-blur-2xl"
      >
        <RotateCcw className="h-5 w-5" /> Kör igen
      </button>
    </main>
  );
}
