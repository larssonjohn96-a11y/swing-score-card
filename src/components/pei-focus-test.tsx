import { ActivityReview } from "@/components/activity-review";
import { rawActivityOutcomes, isActivityComplete } from "@/lib/activity-review";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { LEGACY_KEYS } from "@/lib/sessions/keys";
import { recordSessionSaved } from "@/lib/sessions/sync";
import { LIGHT_SURFACE } from "@/routes/8-bollar";

export type FocusKind = "wedge" | "iron";
type Shot = { target: number; actual: number; lateral: number };
type Session = { id: string; date: string; pei: number; shots?: Shot[] };

/** Fasta, stigande målavstånd för Wedge PEI – ett slag per avstånd, samma sekvens varje gång. */
export const WEDGE_TARGETS = [30, 40, 50, 60, 70, 80, 90, 100, 110] as const;
/** Fasta, stigande målavstånd för Iron PEI – nio slag som täcker 120–175 m. */
export const IRON_TARGETS = [120, 125, 135, 140, 150, 155, 165, 170, 175] as const;

type FocusConfig = {
  title: string;
  /** Avståndsband – endast använt av tester utan fasta targets. */
  min: number;
  max: number;
  shotCount: number;
  key: string;
  testId: string;
  intro: string;
  targets?: readonly number[];
};

const CONFIG: Record<FocusKind, FocusConfig> = {
  wedge: { title: "Wedge PEI", min: 30, max: 110, shotCount: WEDGE_TARGETS.length, key: LEGACY_KEYS.peiWedge, testId: "pei-wedge", targets: WEDGE_TARGETS, intro: "9 slag på fasta, stigande avstånd från 30 till 110 m. Ett slag per avstånd, i samma ordning varje gång." },
  iron: { title: "Iron PEI", min: 120, max: 175, shotCount: IRON_TARGETS.length, key: LEGACY_KEYS.peiIron, testId: "pei-iron", targets: IRON_TARGETS, intro: "9 slag på fasta, stigande avstånd från 120 till 175 m. Ett slag per avstånd, i samma ordning varje gång." },
};

function generateDistances(min: number, max: number, count: number) {
  const width = (max - min) / count;
  const values = Array.from({ length: count }, (_, i) => Math.round(min + i * width + Math.random() * width));
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
  const [confirmAbort, setConfirmAbort] = useState(false);
  const [savedSessions, setSavedSessions] = useState<Session[]>(() => load(cfg.key));
  useEffect(() => {
    if (phase !== "test") return;
    const previous = document.documentElement.dataset.sg4TestActive;
    document.documentElement.dataset.sg4TestActive = "true";
    return () => {
      if (previous === undefined) delete document.documentElement.dataset.sg4TestActive;
      else document.documentElement.dataset.sg4TestActive = previous;
    };
  }, [phase]);
  const personalBest = savedSessions.length ? Math.min(...savedSessions.map(session => session.pei)) : null;
  const leaderboard = [...savedSessions].sort((a, b) => a.pei - b.pei).slice(0, 5);
  function abortTest() {
    setConfirmAbort(false);
    setShots([]);
    setIndex(0);
    setPhase("intro");
  }

  function start() {
    const distances = cfg.targets ? [...cfg.targets] : generateDistances(cfg.min, cfg.max, cfg.shotCount);
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
      const sessions = load(cfg.key);
      const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
      const record: Session = { id, date: new Date().toISOString(), pei, shots: updated };
      localStorage.setItem(cfg.key, JSON.stringify([...sessions, record]));
      setSavedSessions([...sessions, record]);
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
      <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-3 pb-20 pt-4 text-slate-950">
        <section className="rounded-[24px] border border-blue-200/80 bg-white px-3 pb-4 pt-5 shadow-sm">
          <div className="text-center">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-blue-600">PEI PRECISION CHALLENGE</p>
            <h1 className="mt-1 font-display text-[38px] font-black leading-tight">{kind === "wedge" ? "Hur precis är din wedge?" : "Hur precisa är dina järn?"}</h1>
            <p className="mx-auto mt-1 max-w-xs text-sm leading-relaxed text-slate-500">Testa din precision på nio fasta avstånd, följ din utveckling och slå ditt personbästa.</p>
          </div>
          <img src="/Approach_shot.png" alt="Golfspelare slår ett inspel mot green" className="mt-4 h-[170px] w-full rounded-2xl object-cover" />
          <div className="mt-3 grid grid-cols-3 divide-x divide-slate-200 rounded-2xl bg-slate-50 py-3 text-center">
            <div className="px-1"><p className="text-lg font-bold text-blue-600">✓</p><p className="text-xs font-bold">PEI %</p><p className="text-[10px] text-slate-500">Din precision</p></div>
            <div className="px-1"><p className="text-lg font-bold text-blue-600">✓</p><p className="text-xs font-bold">9 slag</p><p className="text-[10px] text-slate-500">{cfg.min}–{cfg.max} meter</p></div>
            <div className="px-1"><p className="text-lg font-bold text-blue-600">✓</p><p className="text-xs font-bold">Jämför</p><p className="text-[10px] text-slate-500">Dina resultat</p></div>
          </div>
          <button onClick={start} className="mt-4 min-h-14 w-full rounded-2xl bg-blue-600 text-base font-black text-white shadow-sm hover:bg-blue-700">Starta PEI-Test</button>
          <p className="mt-2 text-center text-xs text-slate-500">9 slag · {cfg.min}–{cfg.max} m · Fasta stigande avstånd</p>
        </section>
        <div className="mt-5 flex items-center justify-between px-2 py-3 text-sm">
          <span className="font-semibold">🏆 Ditt personbästa</span>
          <span className="font-bold tabular-nums">{personalBest === null ? "–" : personalBest.toFixed(2) + " %"}</span>
        </div>
        <section className="mt-2 overflow-hidden rounded-2xl border border-blue-200/80 bg-white">
          <div className="border-b border-slate-200 p-4"><h2 className="text-base font-black">🏆 Topplista</h2><p className="mt-1 text-xs text-slate-500">Dina bästa PEI-test · lägre procent är bättre</p></div>
          {leaderboard.length ? (
            <div className="divide-y divide-slate-100">
              {leaderboard.map((session, i) => (
                <div key={session.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="flex items-center gap-3"><span className="w-5 text-center font-bold text-blue-600">{i + 1}</span><div><p className="font-semibold">Test {savedSessions.length - savedSessions.indexOf(session)}</p><p className="text-xs text-slate-500">{new Date(session.date).toLocaleDateString("sv-SE")}</p></div></div>
                  <strong className="tabular-nums">{session.pei.toFixed(2)} %</strong>
                </div>
              ))}
            </div>
          ) : <p className="px-4 py-7 text-center text-sm text-slate-500">Genomför ditt första test för att ta plats på topplistan.</p>}
          <Link to={kind === "wedge" ? "/approach-pei-wedge-historik" : "/approach-pei-iron-historik"} className="block border-t border-slate-200 p-3 text-center text-xs font-bold text-blue-600">Se alla resultat →</Link>
        </section>
      </main>
    );
  }

  if (phase === "test") {
    const current = shots[index];
    const preview = { ...current, actual, lateral };
    const lengthDelta = actual - current.target;
    const progress = Math.round((index / shots.length) * 100);

    return (
      <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-36 pt-3 text-foreground">
{isActivityComplete(phase) && <ActivityReview input={{ title: kind === "iron" ? "Iron PEI" : "Wedge PEI", outcomes: rawActivityOutcomes(shots) }} />}
        <div className="flex items-center justify-between">
          <span className="w-10" aria-hidden="true" />
          <span className="text-sm font-semibold">Slag {index + 1} / {shots.length}</span>
          <button type="button" onClick={() => setConfirmAbort(true)} className="flex items-center gap-1 text-xs text-slate-600"><X className="h-4 w-4" /> Avbryt test</button>
        </div>

        {confirmAbort && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/50 px-6" role="presentation">
            <div role="alertdialog" aria-modal="true" aria-labelledby="pei-abort-title" aria-describedby="pei-abort-description" className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
              <h2 id="pei-abort-title" className="text-xl font-black">Avbryta testet?</h2>
              <p id="pei-abort-description" className="mt-2 text-sm text-slate-600">Dina slag i det pågående testet sparas inte. Du återgår till {cfg.title}.</p>
              <button type="button" onClick={() => setConfirmAbort(false)} className="mt-5 w-full rounded-xl bg-blue-600 py-3 font-bold text-white">Fortsätt testet</button>
              <button type="button" onClick={abortTest} className="mt-2 w-full rounded-xl border border-slate-200 py-3 font-semibold text-slate-700">Ja, avbryt testet</button>
            </div>
          </div>
        )}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200/65"><div className="h-full rounded-full bg-blue-500/70" style={{ width: `${progress}%` }} /></div>

        <section className="mt-3 rounded-3xl border border-slate-300/85 bg-gradient-to-br from-slate-200/82 via-slate-100/75 to-white/65 px-4 py-4 text-center shadow-[0_18px_42px_-30px_rgba(15,23,42,.42)] backdrop-blur-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Mål</p>
          <p className="mt-1 font-display text-5xl leading-none text-slate-700">{current.target}<span className="ml-1 text-lg text-slate-500">m</span></p>
        </section>

        <section className="mt-3 rounded-3xl border border-slate-300/80 bg-white/68 p-4 shadow-[0_18px_42px_-32px_rgba(15,23,42,.35)] backdrop-blur-2xl">
          <button type="button" onClick={() => setDistanceActive(true)} className="w-full text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Faktisk längd</p>
            <p className={`mt-1 font-display text-5xl leading-none transition-colors ${distanceActive ? "text-slate-950" : "text-slate-500/70"}`}>{actual}<span className="ml-1 text-lg">m</span></p>
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
              <div><p className="text-[9px] uppercase text-slate-500">Mål</p><p className="font-semibold">{current.target} m</p></div>
              <div><p className="text-[9px] uppercase text-slate-500">Längd</p><p className="font-semibold">{actual} m</p></div>
              <div><p className="text-[9px] uppercase text-slate-500">Sidled</p><p className="font-semibold">{lateral} m</p></div>
              <div><p className="text-[9px] uppercase text-slate-500">PEI</p><p className="font-semibold">{shotPei(preview).toFixed(1)}%</p></div>
            </div>
            <p className="mt-1 text-center text-[10px] text-slate-500">Total miss {missDistance(preview).toFixed(1)} m</p>
          </div>
          <button onClick={commit} className="mx-auto mt-2 flex w-full max-w-md items-center justify-center gap-2 rounded-2xl border border-blue-300/75 bg-gradient-to-br from-blue-500/[0.18] via-blue-400/[0.13] to-white/55 py-3.5 font-display text-xl text-blue-800 shadow-[0_18px_40px_-28px_rgba(37,99,235,.75)] backdrop-blur-2xl">{index === shots.length - 1 ? "Avsluta test" : "Nästa slag"}<ArrowRight className="h-5 w-5" /></button>
        </div>
      </main>
    );
  }

  const history = load(cfg.key);
  const best = history.length ? Math.min(...history.map((session) => session.pei)) : result!;

  return (
    <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-6 pb-16 pt-8 text-foreground">
{isActivityComplete(phase) && <ActivityReview input={{ title: kind === "iron" ? "Iron PEI" : "Wedge PEI", outcomes: rawActivityOutcomes(shots) }} />}
      <p className="mt-7 text-xs uppercase tracking-[0.22em] text-slate-500">{cfg.title}</p>
      <h1 className="mt-1 text-4xl">Resultat</h1>
      <div className="mt-5 rounded-3xl border border-slate-300/80 bg-white/68 p-6 text-center shadow-[0_18px_42px_-30px_rgba(15,23,42,.35)] backdrop-blur-2xl"><p className="text-xs text-slate-500">PEI</p><p className="font-display text-7xl text-blue-700">{result?.toFixed(2)}%</p><p className="mt-2 text-xs text-slate-500">PB {best.toFixed(2)}%</p></div>
      <Link to={kind === "wedge" ? "/approach-pei-wedge-historik" : "/approach-pei-iron-historik"} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300/80 bg-white/58 py-4 font-semibold backdrop-blur-xl"><BarChart3 className="h-4 w-4" /> Resultat över tid</Link>
      <button onClick={start} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-300/75 bg-blue-500/[0.12] py-4 font-display text-xl text-blue-800 backdrop-blur-2xl"><RotateCcw className="h-5 w-5" /> Kör igen</button>
    </main>
  );
}
