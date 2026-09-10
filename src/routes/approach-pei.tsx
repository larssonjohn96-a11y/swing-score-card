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
import { LIGHT_SURFACE } from "./8-bollar";

export const Route = createFileRoute("/approach-pei")({
  head: () => ({
    meta: [
      { title: "18-bollars PEI – Approach träningstest | SG4" },
      { name: "description", content: "18 fasta inspel mellan 50 och 220 meter. Snabbregistrera längd och sidled med knappar och följ PEI över tid. Ej HCP-grundande." },
    ],
  }),
  component: ApproachPeiPage,
});

type Phase = "intro" | "test" | "result";

function StepButtons({ onAdjust, disableNegative = false }: { onAdjust: (delta: number) => void; disableNegative?: boolean }) {
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

function ApproachPeiPage() {
  useHideBottomNav(true);
  const [phase, setPhase] = useState<Phase>("intro");
  const [shots, setShots] = useState<PeiShot[]>(createPeiShots);
  const [index, setIndex] = useState(0);
  const [actualDistance, setActualDistance] = useState<number>(PEI_TARGET_DISTANCES[0]);
  const [lateral, setLateral] = useState(0);
  const [distanceActive, setDistanceActive] = useState(false);
  const [savedSession, setSavedSession] = useState<PeiSession | null>(null);
  const [history, setHistory] = useState<PeiSession[]>(() => loadPeiSessions());

  const current = shots[index];
  const progress = Math.round((index / PEI_SHOT_COUNT) * 100);

  function start() {
    const nextShots = createPeiShots();
    setShots(nextShots);
    setIndex(0);
    setActualDistance(nextShots[0].targetDistance);
    setLateral(0);
    setDistanceActive(false);
    setSavedSession(null);
    setPhase("test");
  }

  function adjustDistance(delta: number) {
    setDistanceActive(true);
    setActualDistance((value) => Math.max(0, value + delta));
  }

  function adjustLateral(delta: number) {
    setLateral((value) => Math.max(0, value + delta));
  }

  function commit() {
    const updated = shots.map((shot, i) => (i === index ? { ...shot, actualDistance, lateral } : shot));
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
    setDistanceActive(false);
  }

  function back() {
    if (index === 0) return;
    const previousIndex = index - 1;
    const previous = shots[previousIndex];
    setIndex(previousIndex);
    setActualDistance(previous.actualDistance || previous.targetDistance);
    setLateral(Math.abs(previous.lateral ?? 0));
    setDistanceActive(true);
  }

  if (phase === "intro") {
    return (
      <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-6 pb-16 pt-8 text-foreground">
        <div className="flex items-center justify-between">
          <Link to="/kategori/$slug" params={{ slug: "approach" }} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300/80 bg-white/68 text-slate-600 backdrop-blur-xl"><ArrowLeft className="h-4 w-4" /></Link>
          <Link to="/approach-pei-historik" className="flex items-center gap-2 rounded-full border border-slate-300/80 bg-white/58 px-4 py-2 text-sm text-slate-600 backdrop-blur-xl"><BarChart3 className="h-4 w-4" /> Historik</Link>
        </div>
        <section className="mt-6 rounded-[30px] border border-slate-300/80 bg-white/76 p-5 shadow-[0_20px_48px_-32px_rgba(15,23,42,.42)] backdrop-blur-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Approach · Träningstest</p>
          <h1 className="mt-2 text-5xl leading-none">18-bollars PEI</h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">Samma 18 målavstånd varje gång. Justera bara faktisk längd och sidled efter varje slag.</p>
        </section>
        <div className="mt-4 rounded-3xl border border-slate-300/80 bg-white/60 p-5 backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Snabb inmatning</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">Längden startar på målavståndet och justeras med ±5 eller ±1 m. Sidled anges bara som antal meter från mållinjen.</p>
        </div>
        <p className="mt-4 rounded-2xl border border-slate-300/80 bg-white/55 p-3 text-xs text-slate-600 backdrop-blur-xl">Ej HCP-grundande · påverkar inte SG4 HCP.</p>
        <button onClick={start} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-300/75 bg-blue-500/[0.12] py-5 font-display text-2xl text-blue-800 shadow-[0_18px_40px_-28px_rgba(37,99,235,.7)] backdrop-blur-2xl">Starta 18 slag <ArrowRight className="h-5 w-5" /></button>
      </main>
    );
  }

  if (phase === "test" && current) {
    const previewShot: PeiShot = { ...current, actualDistance, lateral };
    const lengthDelta = actualDistance - current.targetDistance;

    return (
      <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-36 pt-3 text-foreground">
        <div className="flex items-center justify-between">
          <button onClick={back} disabled={index === 0} className="rounded-full border border-slate-300/75 bg-white/58 p-2 text-slate-600 backdrop-blur-xl disabled:opacity-30"><ArrowLeft className="h-4 w-4" /></button>
          <span className="text-sm font-semibold">Slag {index + 1} / {PEI_SHOT_COUNT}</span>
          <Link to="/kategori/$slug" params={{ slug: "approach" }} className="flex items-center gap-1 text-xs text-slate-600"><X className="h-4 w-4" /> Avbryt</Link>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200/65"><div className="h-full rounded-full bg-blue-500/70" style={{ width: `${progress}%` }} /></div>

        <section className="mt-3 rounded-3xl border border-slate-300/85 bg-gradient-to-br from-slate-200/82 via-slate-100/75 to-white/65 px-4 py-4 text-center shadow-[0_18px_42px_-30px_rgba(15,23,42,.42)] backdrop-blur-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Mål</p>
          <p className="mt-1 font-display text-5xl leading-none text-slate-700">{current.targetDistance}<span className="ml-1 text-lg text-slate-500">m</span></p>
        </section>

        <section className="mt-3 rounded-3xl border border-slate-300/80 bg-white/68 p-4 text-center shadow-[0_18px_42px_-32px_rgba(15,23,42,.35)] backdrop-blur-2xl">
          <button type="button" onClick={() => setDistanceActive(true)} className="w-full text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Faktisk längd</p>
            <p className={`mt-1 font-display text-5xl leading-none transition-colors ${distanceActive ? "text-slate-950" : "text-slate-500/70"}`}>{actualDistance}<span className="ml-1 text-lg">m</span></p>
            <p className="mt-1 text-xs text-slate-500">{lengthDelta === 0 ? "På mål" : lengthDelta < 0 ? `${Math.abs(lengthDelta)} m kort` : `${lengthDelta} m lång`}</p>
          </button>
          <div className="mt-4"><StepButtons onAdjust={adjustDistance} /></div>
        </section>

        <section className="mt-3 rounded-3xl border border-slate-300/80 bg-white/68 p-4 text-center shadow-[0_18px_42px_-32px_rgba(15,23,42,.35)] backdrop-blur-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sidled från mål</p>
          <p className="mt-1 font-display text-5xl leading-none text-slate-950">{lateral}<span className="ml-1 text-lg text-slate-500">m</span></p>
          <p className="mt-1 text-xs text-slate-500">Endast avstånd</p>
          <div className="mt-4"><StepButtons onAdjust={adjustLateral} disableNegative={lateral === 0} /></div>
        </section>

        <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200/70 bg-white/66 px-5 pb-5 pt-3 backdrop-blur-2xl">
          <div className="mx-auto max-w-md rounded-3xl border border-slate-200/80 bg-white/55 px-4 py-3 shadow-[0_16px_36px_-30px_rgba(15,23,42,.4)] backdrop-blur-2xl">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div><p className="text-[9px] uppercase text-slate-500">Mål</p><p className="font-semibold">{current.targetDistance} m</p></div>
              <div><p className="text-[9px] uppercase text-slate-500">Längd</p><p className="font-semibold">{actualDistance} m</p></div>
              <div><p className="text-[9px] uppercase text-slate-500">Sidled</p><p className="font-semibold">{lateral} m</p></div>
              <div><p className="text-[9px] uppercase text-slate-500">PEI</p><p className="font-semibold">{shotPei(previewShot).toFixed(1)}%</p></div>
            </div>
            <p className="mt-1 text-center text-[10px] text-slate-500">Total miss {missDistance(previewShot).toFixed(1)} m</p>
          </div>
          <button onClick={commit} className="mx-auto mt-2 flex w-full max-w-md items-center justify-center gap-2 rounded-2xl border border-blue-300/75 bg-gradient-to-br from-blue-500/[0.18] via-blue-400/[0.13] to-white/55 py-3.5 font-display text-xl text-blue-800 shadow-[0_18px_40px_-28px_rgba(37,99,235,.75)] backdrop-blur-2xl">{index + 1 === PEI_SHOT_COUNT ? "Avsluta test" : "Nästa slag"}<ArrowRight className="h-5 w-5" /></button>
        </div>
      </main>
    );
  }

  const result = savedSession ?? { id: "", date: "", shots, pei: sessionPei(shots) };
  const best = history.length ? Math.min(...history.map((session) => session.pei)) : result.pei;
  const rolling = rollingEightAverage(history);

  return (
    <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-6 pb-16 pt-6 text-foreground">
      <Link to="/kategori/$slug" params={{ slug: "approach" }} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300/80 bg-white/68 text-slate-600 backdrop-blur-xl"><ArrowLeft className="h-4 w-4" /></Link>
      <p className="mt-6 text-xs uppercase tracking-[0.25em] text-slate-500">Approach · Träningstest</p>
      <h1 className="mt-1 text-4xl leading-none">18-bollars PEI</h1>
      <div className="mt-6 rounded-3xl border border-slate-300/80 bg-white/68 p-6 text-center shadow-[0_18px_42px_-30px_rgba(15,23,42,.35)] backdrop-blur-2xl"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Ditt PEI</p><p className="mt-2 font-display text-7xl leading-none text-blue-700">{result.pei.toFixed(2)}%</p><p className="mt-3 text-xs text-slate-500">Lägre är bättre · ej HCP-grundande</p></div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-300/80 bg-white/58 p-4 backdrop-blur-xl"><Trophy className="h-4 w-4 text-blue-600" /><p className="mt-2 text-xs text-slate-500">Personbästa</p><p className="font-display text-3xl">{best.toFixed(2)}%</p></div>
        <div className="rounded-2xl border border-slate-300/80 bg-white/58 p-4 backdrop-blur-xl"><p className="text-xs text-slate-500">Snitt senaste 8</p><p className="mt-6 font-display text-3xl">{rolling !== null ? `${rolling.toFixed(2)}%` : "–"}</p></div>
      </div>
      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-300/80 bg-white/58 backdrop-blur-xl">
        <div className="grid grid-cols-2 border-b border-slate-200/80 bg-white/45 px-4 py-2 text-xs font-semibold"><span>Avstånd</span><span className="text-right">PEI</span></div>
        {PEI_GROUPS.map((group) => <div key={group.label} className="grid grid-cols-2 px-4 py-2 text-sm"><span>{group.label}</span><span className="text-right font-semibold">{groupPei(result.shots, group.min, group.max).toFixed(2)}%</span></div>)}
      </section>
      <Link to="/approach-pei-historik" className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300/80 bg-white/58 py-4 font-semibold backdrop-blur-xl"><BarChart3 className="h-5 w-5" /> Se resultathistorik</Link>
      <button onClick={start} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-300/75 bg-blue-500/[0.12] py-4 font-display text-xl text-blue-800 backdrop-blur-2xl"><RotateCcw className="h-5 w-5" /> Kör igen</button>
    </main>
  );
}
