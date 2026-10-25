import { precisionScoreFromPei } from "@/lib/precision-score";
import { ActivityReview } from "@/components/activity-review";
import { ApproachLevelSummary } from "@/components/approach-level-summary";
import { HcpCountdownScreen } from "@/components/hcp-countdown-screen";
import { HcpTestProgress } from "@/components/hcp-test-progress";
import { PeiHistoryCard } from "@/components/pei-history-card";
import { PeiLeaderboard } from "@/components/pei-leaderboard";
import { ShotAnalysisList, StandardHcpAnalysis } from "@/components/standard-hcp-analysis";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { peiHistoryRows } from "@/lib/approach-history";
import { isActivityComplete, rawActivityOutcomes } from "@/lib/activity-review";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import {
  IRON_TARGETS,
  WEDGE_TARGETS,
  loadPeiSessions,
  peiRankingAverage,
  type FocusKind,
} from "@/lib/pei-ranking";
import { handicapFromPct, precisionResult, type PrecisionShot } from "@/lib/precision";
import { LEGACY_KEYS } from "@/lib/sessions/keys";
import { recordSessionSaved, SESSIONS_CHANGED_EVENT } from "@/lib/sessions/sync";
import { useChipScreenColor } from "@/lib/use-chip-screen-color";
import { useTestViewportLock } from "@/lib/use-test-viewport-lock";
import { LIGHT_SURFACE } from "@/routes/8-bollar";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BarChart3,
  Check,
  LoaderCircle,
  RotateCcw,
  Trophy,
  Undo2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export { IRON_TARGETS, WEDGE_TARGETS } from "@/lib/pei-ranking";
export type { FocusKind } from "@/lib/pei-ranking";

type Shot = { target: number; actual: number; lateral: number };
type Session = { id: string; date: string; pei: number; handicap?: number; shots?: Shot[] };
type Phase = "intro" | "countdown" | "test" | "compiling" | "result";
type FocusConfig = {
  title: string;
  min: number;
  max: number;
  shotCount: number;
  key: string;
  testId: string;
  intro: string;
  targets: readonly number[];
  inputLabel: string;
};

const CONFIG: Record<FocusKind, FocusConfig> = {
  wedge: {
    title: "Korta inspel",
    min: 30,
    max: 110,
    shotCount: WEDGE_TARGETS.length,
    key: LEGACY_KEYS.peiWedge,
    testId: "pei-wedge",
    targets: WEDGE_TARGETS,
    inputLabel: "Wedge · 30–110 m",
    intro:
      "9 slag på fasta, stigande avstånd från 30 till 110 m. Ett slag per avstånd, i samma ordning varje gång.",
  },
  iron: {
    title: "Inspel järn",
    min: 120,
    max: 175,
    shotCount: IRON_TARGETS.length,
    key: LEGACY_KEYS.peiIron,
    testId: "pei-iron",
    targets: IRON_TARGETS,
    inputLabel: "Järn · 120–175 m",
    intro:
      "9 slag på fasta, stigande avstånd från 120 till 175 m. Ett slag per avstånd, i samma ordning varje gång.",
  },
};

const fmt = (value: number) => value.toFixed(1).replace(".", ",");
const shotPei = (shot: Shot) =>
  (Math.hypot(shot.actual - shot.target, shot.lateral) / shot.target) * 100;
const missDistance = (shot: Shot) => Math.hypot(shot.actual - shot.target, shot.lateral);
const totalPei = (shots: Shot[]) =>
  shots.reduce((sum, shot) => sum + shotPei(shot), 0) / shots.length;
const averageMiss = (shots: Shot[]) =>
  shots.reduce((sum, shot) => sum + missDistance(shot), 0) / shots.length;
const shotGrade = (
  pei: number,
): "exceptionell" | "briljant" | "bra" | "godkänt" | "svagt" | "stort tapp" =>
  pei <= 3
    ? "exceptionell"
    : pei <= 5
      ? "briljant"
      : pei <= 8
        ? "bra"
        : pei <= 12
          ? "godkänt"
          : pei <= 18
            ? "svagt"
            : "stort tapp";

function asPrecisionShots(shots: Shot[]): PrecisionShot[] {
  return shots.map((shot, index) => ({
    index: index + 1,
    round: 1,
    target: shot.target,
    carry: shot.actual,
    offline: shot.lateral,
    filled: true,
  }));
}

export function PeiFocusTest({ kind }: { kind: FocusKind }) {
  useHideBottomNav(true);
  const cfg = CONFIG[kind];
  const { user, displayName } = useAuth();
  const [phase, setPhase] = useState<Phase>("intro");
  const [confirmExit, setConfirmExit] = useState(false);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [history, setHistory] = useState<Session[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  const [index, setIndex] = useState(0);
  const [actualEntry, setActualEntry] = useState("0");
  const actual = Number(actualEntry.replace(",", "."));
  function setActual(value: number | ((previous: number) => number)) {
    setActualEntry((previous) =>
      String(typeof value === "function" ? value(Number(previous.replace(",", "."))) : value),
    );
  }
  const [lateral, setLateral] = useState(0);
  const [side, setSide] = useState<-1 | 1 | null>(null);
  const [distanceActive, setDistanceActive] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [compile, setCompile] = useState(0);
  const [analysis, setAnalysis] = useState(false);
  const timers = useRef<number[]>([]);

  useChipScreenColor(phase === "countdown" || phase === "compiling" || analysis);
  useTestViewportLock(phase === "test");
  useEffect(() => setHistory(loadPeiSessions(kind)), [kind, phase, historyRevision]);
  useEffect(() => {
    const handler = () => setHistoryRevision((value) => value + 1);
    window.addEventListener(SESSIONS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(SESSIONS_CHANGED_EVENT, handler);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.sg4TestActive = String(phase === "test");
    document.documentElement.dataset.sg4PeiResult = String(phase === "result");
    const landingHandler = () => phase === "result" && returnToLanding();
    const abortHandler = () => phase === "test" && setConfirmExit(true);
    window.addEventListener("sg4-pei-landing", landingHandler);
    window.addEventListener("sg4-test-abort", abortHandler);
    return () => {
      delete document.documentElement.dataset.sg4TestActive;
      delete document.documentElement.dataset.sg4PeiResult;
      window.removeEventListener("sg4-pei-landing", landingHandler);
      window.removeEventListener("sg4-test-abort", abortHandler);
    };
  }, [phase]);
  useEffect(() => {
    if (phase !== "compiling") return;
    timers.current.forEach(window.clearTimeout);
    setCompile(0);
    timers.current = [
      window.setTimeout(() => setCompile(1), 800),
      window.setTimeout(() => setCompile(2), 1600),
      window.setTimeout(() => setCompile(3), 2400),
      window.setTimeout(() => setPhase("result"), 3100),
    ];
    return () => timers.current.forEach(window.clearTimeout);
  }, [phase]);

  const ranking = peiRankingAverage(history, kind);
  const analysisResult = useMemo(
    () => (shots.length ? precisionResult(asPrecisionShots(shots)) : null),
    [shots],
  );

  function returnToLanding() {
    timers.current.forEach(window.clearTimeout);
    setConfirmExit(false);
    setShots([]);
    setIndex(0);
    setResult(null);
    setAnalysis(false);
    setPhase("intro");
  }
  function start() {
    const next = cfg.targets.map((target) => ({ target, actual: target, lateral: 0 }));
    setShots(next);
    setIndex(0);
    setActual(next[0].target);
    setLateral(0);
    setSide(null);
    setDistanceActive(false);
    setResult(null);
    setAnalysis(false);
    setPhase("countdown");
  }
  function adjustDistance(delta: number) {
    setDistanceActive(true);
    setActual((value) => Math.max(0, Math.min(400, (Number.isFinite(value) ? value : 0) + delta)));
  }
  function undo() {
    if (index === 0) return;
    const previousIndex = index - 1;
    const previous = shots[previousIndex];
    setIndex(previousIndex);
    setActual(previous.actual);
    setLateral(Math.abs(previous.lateral));
    setSide(previous.lateral < 0 ? -1 : previous.lateral > 0 ? 1 : null);
    setDistanceActive(true);
  }
  function commit() {
    if (
      !actualEntry.trim() ||
      !Number.isFinite(actual) ||
      actual < 0 ||
      actual > 400 ||
      (lateral > 0 && side === null)
    )
      return;
    const signedLateral = lateral === 0 ? 0 : lateral * (side ?? 1);
    const updated = shots.map((shot, shotIndex) =>
      shotIndex === index ? { ...shot, actual, lateral: signedLateral } : shot,
    );
    setShots(updated);
    if (index === updated.length - 1) {
      const pei = totalPei(updated);
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now());
      const record: Session = {
        id,
        date: new Date().toISOString(),
        pei,
        handicap: handicapFromPct(pei),
        shots: updated,
      };
      localStorage.setItem(cfg.key, JSON.stringify([...loadPeiSessions(kind), record]));
      recordSessionSaved(cfg.testId, record);
      setResult(pei);
      setPhase("compiling");
      return;
    }
    const nextIndex = index + 1;
    setIndex(nextIndex);
    setActual(updated[nextIndex].target);
    setLateral(0);
    setSide(null);
    setDistanceActive(false);
  }

  if (phase === "intro")
    return (
      <main className="mx-auto min-h-[calc(100dvh-58px)] w-full max-w-md space-y-4 bg-slate-50 px-4 pb-8 pt-4 text-slate-950">
        <section className="text-center">
          <p className="text-xs font-black uppercase text-blue-600">{cfg.inputLabel}</p>
          <h1 className="mt-1 text-4xl font-black">{cfg.title}</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
            Testa din precision, följ din utveckling och jämför med dina vänner.
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
              ["Precision", "Score av 100"],
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
            Starta testet
          </Button>
          <p className="mt-3 text-center text-xs font-semibold text-slate-500">
            {cfg.shotCount} slag · {cfg.min}–{cfg.max} m · ca 5 min
          </p>
          <p className="mt-2 text-center text-xs text-slate-500">
            Ett slag per avstånd. Mät carry och sidled från målet.
          </p>
          <p className="mt-2 text-center text-xs text-slate-500">
            Precision Score = 100 − snittavvikelsen i procent. Högre är bättre, lägst 0.
          </p>
        </section>
        {ranking.best !== null && (
          <div className="flex items-center justify-between px-2 py-2">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Trophy className="h-4 w-4" />
              Ditt personbästa
            </span>
            <strong>{precisionScoreFromPei(ranking.best).toFixed(1).replace(".", ",")} /100</strong>
          </div>
        )}
        <ApproachLevelSummary rows={peiHistoryRows(history)} />
        <PeiHistoryCard sessions={history} kind={kind} preview />
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

  if (phase === "countdown")
    return (
      <HcpCountdownScreen
        label={`${cfg.title} · ${cfg.shotCount} slag`}
        onComplete={() => setPhase("test")}
      />
    );

  if (phase === "test") {
    const current = shots[index];
    const preview: Shot = { ...current, actual, lateral: lateral * (side ?? 1) };
    const directionMissing = lateral > 0 && side === null;
    return (
      <main
        style={LIGHT_SURFACE}
        className="mx-auto flex min-h-[calc(100dvh-58px)] w-full max-w-md flex-col bg-slate-50 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 text-slate-950"
      >
        <Dialog open={confirmExit} onOpenChange={setConfirmExit}>
          <DialogContent className="!z-[140] w-[calc(100%-32px)] max-w-sm rounded-3xl bg-white p-6 text-slate-950">
            <DialogTitle className="text-2xl font-black">Avbryta testet?</DialogTitle>
            <DialogDescription>Dina slag i det här testet sparas inte.</DialogDescription>
            <Button
              onClick={returnToLanding}
              className="min-h-12 rounded-xl bg-slate-950 text-white"
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
        <HcpTestProgress current={index + 1} total={shots.length} label="Inspel" />
        <section className="shrink-0 text-center">
          <p className="text-xs font-semibold text-slate-500">{cfg.inputLabel} · 9 slag</p>
          <h1 className="mt-0.5 text-[clamp(30px,5dvh,48px)] font-black leading-none">
            Slag {index + 1}
          </h1>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[.16em] text-slate-400">
            Mål
          </p>
          <div className="flex items-baseline justify-center leading-none">
            <span className="text-[clamp(44px,7dvh,66px)] font-black tracking-[-.03em]">
              {current.target}
            </span>
            <span className="ml-1 text-xl font-bold text-slate-400">m</span>
          </div>
        </section>
        <section className="mt-2 shrink-0 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <label htmlFor="approach-carry" className="block text-center text-sm font-bold text-slate-700">
            Carrylängd
          </label>
          <div className="my-2 grid grid-cols-[48px_1fr_48px] items-center gap-2">
            <Button type="button" variant="outline" onClick={() => adjustDistance(-1)}
              aria-label="Minska carry med 1 meter"
              className="h-12 w-12 rounded-xl bg-white p-0 font-black">−1</Button>
            <div className="flex min-w-0 items-baseline justify-center">
              <input id="approach-carry" inputMode="decimal" value={actualEntry}
                onFocus={(event) => event.currentTarget.select()}
                onChange={(event) => { setActualEntry(event.target.value); setDistanceActive(true); }}
                aria-label="Faktisk carrylängd i meter"
                className="w-28 min-w-0 bg-transparent text-center text-5xl font-black leading-none text-slate-950 outline-none focus:text-blue-700"
              />
              <span className="text-base font-semibold text-slate-500">m</span>
            </div>
            <Button type="button" variant="outline" onClick={() => adjustDistance(1)}
              aria-label="Öka carry med 1 meter"
              className="h-12 w-12 rounded-xl bg-white p-0 font-black">+1</Button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[-10, -5, 5, 10].map((delta) => (
              <Button key={delta} type="button" variant="outline" onClick={() => adjustDistance(delta)}
                className="min-h-10 bg-white text-slate-800">
                {delta > 0 ? "+" : ""}{delta}
              </Button>
            ))}
          </div>
          <div className="my-3 border-t border-slate-200" />
          <p className="text-center text-sm font-bold text-slate-700">Sidled från mållinjen</p>
          <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Riktning för sidled">
            <button type="button" aria-pressed={side === -1}
              onClick={() => setSide(-1)}
              className={`min-h-11 rounded-xl border text-sm font-bold ${side === -1 ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
              ← Vänster
            </button>
            <button type="button" aria-pressed={lateral === 0 && side === null}
              onClick={() => { setLateral(0); setSide(null); }}
              className={`min-h-11 rounded-xl border text-sm font-bold ${lateral === 0 && side === null ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
              Mitt 0 m
            </button>
            <button type="button" aria-pressed={side === 1}
              onClick={() => setSide(1)}
              className={`min-h-11 rounded-xl border text-sm font-bold ${side === 1 ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
              Höger →
            </button>
          </div>
          <div className="mt-2 flex items-baseline justify-center gap-1" aria-live="polite">
            <span className="text-4xl font-black tabular-nums text-slate-950">{lateral}</span>
            <span className="text-sm font-semibold text-slate-500">m</span>
            {lateral > 0 && side !== null && (
              <span className="ml-1 text-sm font-semibold text-blue-700">{side === -1 ? "vänster" : "höger"}</span>
            )}
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {[-5, -1, 1, 5].map((delta) => (
              <button key={delta} type="button"
                aria-label={`${delta > 0 ? "Öka" : "Minska"} sidled med ${Math.abs(delta)} meter`}
                onClick={() => setLateral((value) => Math.max(0, Math.min(80, value + delta)))}
                className="min-h-11 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-800 shadow-sm">
                {delta > 0 ? "+" : ""}{delta}
              </button>
            ))}
          </div>
          {directionMissing ? (
            <p className="mt-2 text-center text-xs font-bold text-amber-700">Välj vänster eller höger innan du registrerar.</p>
          ) : (
            <p className="mt-2 text-center text-xs font-medium text-slate-600">
              Avstånd från mål: <strong className="text-slate-900">{fmt(missDistance(preview))} m</strong>
            </p>
          )}
          {index > 0 && (
            <button type="button" onClick={undo}
              className="mx-auto mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <Undo2 className="h-4 w-4" /> Ändra förra slaget
            </button>
          )}
        </section>
        <div className="mt-auto shrink-0 pt-3">
          <p className="mb-1.5 text-center text-[13px] text-slate-600">
            Slaget landade <strong>{actual} m</strong> och{" "}
            {lateral === 0 ? (
              <strong>på mållinjen</strong>
            ) : (
              <>
                <strong>
                  {lateral} m {side === -1 ? "vänster" : side === 1 ? "höger" : "sidled"}
                </strong>{" "}
                om målet
              </>
            )}
            .
          </p>
          <Button
            onClick={commit}
            disabled={
              directionMissing ||
              !actualEntry.trim() ||
              !Number.isFinite(actual) ||
              actual < 0 ||
              actual > 400
            }
            className="min-h-14 w-full rounded-2xl bg-blue-600 text-base font-black text-white disabled:opacity-40"
          >
            Registrera slag
          </Button>
        </div>
      </main>
    );
  }

  if (phase === "compiling")
    return createPortal(
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-blue-600 to-blue-700 p-6 text-center text-white">
        <span className="mb-7 flex h-16 w-16 items-center justify-center rounded-full bg-white text-blue-600">
          {compile >= 3 ? (
            <Check className="h-9 w-9" />
          ) : (
            <LoaderCircle className="h-9 w-9 motion-safe:animate-spin" />
          )}
        </span>
        <h1 className="text-3xl font-black">
          {compile >= 3 ? "Resultatet klart" : "Sammanställer testet…"}
        </h1>
        <div className="mt-6 w-full max-w-xs space-y-4 text-left text-blue-100">
          {[
            "Sammanställer dina nio slag",
            "Beräknar snitt från flaggan och Precision Score",
            "Förbereder din HCP-analys",
          ].map((text, step) => (
            <p
              key={text}
              className={`flex items-center gap-3 ${step <= compile ? "opacity-100" : "opacity-0"}`}
            >
              {step < compile || compile >= 3 ? (
                <Check className="h-5 w-5" />
              ) : (
                <LoaderCircle className="h-5 w-5 motion-safe:animate-spin" />
              )}
              {text}
            </p>
          ))}
        </div>
      </div>,
      document.body,
    );

  const best = history.length ? Math.min(...history.map((session) => session.pei)) : (result ?? 0);
  const avgMiss = shots.length ? averageMiss(shots) : 0;
  return (
    <main className="mx-auto min-h-[calc(100dvh-58px)] w-full max-w-md bg-slate-50 px-4 pb-10 pt-4 text-slate-950">
      {isActivityComplete(phase) && (
        <ActivityReview input={{ title: cfg.title, outcomes: rawActivityOutcomes(shots) }} />
      )}
      <style>{`@keyframes peiSheen{0%{transform:translateX(-140%);opacity:0}12%{opacity:1}88%{opacity:1}100%{transform:translateX(260%);opacity:0}}.pei-sheen{opacity:0;animation:peiSheen 1.15s ease .2s 1}@media(prefers-reduced-motion:reduce){.pei-sheen{animation:none!important}}`}</style>
      <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-white p-5 text-center shadow-sm">
        <span className="pei-sheen pointer-events-none absolute inset-y-0 w-20 -skew-x-12 bg-gradient-to-r from-transparent via-blue-100/80 to-transparent" />
        <p className="text-xs font-black uppercase text-slate-400">Ditt resultat</p>
        <h1 className="mt-1 text-2xl font-black">{cfg.title} klart</h1>
        <div className="mt-5 rounded-2xl bg-slate-50 p-6">
          <p className="text-6xl font-black">
            {fmt(precisionScoreFromPei(result ?? 0))}
            <span className="text-xl text-slate-400">/100</span>
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-500">Precision Score</p>
          <p className="mt-3 text-lg font-bold">{fmt(avgMiss)} m från flaggan</p>
          <p className="mt-2 text-xs text-slate-500">
            Avvikelse {fmt(result ?? 0)} % av målavståndet
          </p>
          <p className="mt-3 text-xs font-bold text-blue-600">
            Personbästa {fmt(precisionScoreFromPei(best))}/100 · Högre är bättre
          </p>
        </div>
      </section>
      <Button
        onClick={() => setAnalysis(true)}
        className="mt-4 min-h-14 w-full rounded-2xl bg-blue-600 text-base font-black text-white"
      >
        Visa min HCP-analys
      </Button>
      <Button onClick={start} className="mt-4 min-h-14 w-full rounded-2xl bg-slate-950 text-white">
        <RotateCcw />
        Testa igen · 9 slag
      </Button>
      <Button
        variant="outline"
        onClick={returnToLanding}
        className="mt-4 min-h-14 w-full rounded-2xl border-slate-200 bg-white text-slate-900"
      >
        <ArrowLeft />
        Tillbaka till {cfg.title}
      </Button>
      <Dialog open={analysis} onOpenChange={setAnalysis}>
        <DialogContent className="!fixed !inset-0 !h-[100dvh] !max-h-none !w-full !max-w-none !translate-x-0 !translate-y-0 !rounded-none !border-0 !bg-blue-600 !p-0 text-white [&>button]:text-white">
          <DialogTitle className="sr-only">{cfg.title} HCP-analys</DialogTitle>
          <DialogDescription className="sr-only">Ditt estimerade HCP för inspel.</DialogDescription>
          {analysisResult && (
            <StandardHcpAnalysis
              title={`${cfg.title} · HCP-analys`}
              hcp={analysisResult.handicap}
              onClose={() => setAnalysis(false)}
              slides={[
                {
                  key: "shots",
                  content: (
                    <ShotAnalysisList
                      title="Dina nio inspel"
                      rows={shots.map((shot, shotIndex) => ({
                        label: `Slag ${shotIndex + 1} · mål ${shot.target} m`,
                        value: `${fmt(missDistance(shot))} m från flaggan · Precision Score ${fmt(precisionScoreFromPei(shotPei(shot)))}/100`,
                        grade: shotGrade(shotPei(shot)),
                      }))}
                    />
                  ),
                },
                {
                  key: "profile",
                  content: (
                    <section className="text-center">
                      <p className="text-sm font-bold uppercase tracking-widest text-blue-100">
                        Din profil idag
                      </p>
                      <h2 className="mt-4 text-3xl font-black">Precision i testet</h2>
                      <div className="mt-6 space-y-3 text-left">
                        <p className="flex justify-between rounded-2xl bg-white/10 p-4">
                          <span>Snitt från flaggan</span>
                          <strong>{fmt(avgMiss)} m</strong>
                        </p>
                        <p className="flex justify-between rounded-2xl bg-white/10 p-4">
                          <span>Precision Score</span>
                          <strong>{fmt(precisionScoreFromPei(result ?? 0))}/100</strong>
                        </p>
                        <p className="flex justify-between rounded-2xl bg-white/10 p-4">
                          <span>Bästa slag</span>
                          <strong>{fmt(Math.min(...shots.map(missDistance)))} m</strong>
                        </p>
                      </div>
                    </section>
                  ),
                },
                {
                  key: "benchmark",
                  content: (
                    <section className="text-center">
                      <h2 className="text-3xl font-black">Så räknas Precision Score</h2>
                      <p className="mt-6 text-5xl font-black">
                        {fmt(precisionScoreFromPei(result ?? 0))}/100
                      </p>
                      <p className="mt-5 text-blue-100">
                        För varje slag delar vi avståndet från flaggan med målavståndet. Testets
                        snittavvikelse är {fmt(result ?? 0)} %. Precision Score är 100 minus
                        snittavvikelsen, lägst 0.
                      </p>
                      <p className="mt-4 text-blue-100">Högre poäng betyder bättre precision.</p>
                    </section>
                  ),
                },
              ]}
            />
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
