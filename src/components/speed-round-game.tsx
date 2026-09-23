import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Undo2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpeedChallengeAnalysis } from "@/components/speed-challenge-analysis";
import { driverDistancePotential } from "@/lib/driver-distance-potential";
import {
  courseStorageKey,
  emptyCourse,
  fromMph,
  objectiveResult,
  parseCourse,
  reduceCourse,
  speedHistoryBaseline,
  toMph,
  validShot,
  type CourseAction,
  type CourseRound,
  type SpeedUnit,
} from "@/lib/speed-course";
import { mergeSpeedRounds, syncSpeedRounds } from "@/lib/speed-cloud";

const fmt = (value: number, digits = 1) => value.toFixed(digits).replace(".", ",");
const unitLabel = (mph: number, unit: SpeedUnit) => `${fmt(fromMph(mph, unit))} ${unit}`;

function SpeedMeter({ value, average, pb, unit, celebration = false }: { value: number | null; average: number | null; pb: number | null; unit: SpeedUnit; celebration?: boolean }) {
  const maximum = Math.max(190, value ?? 0, average ?? 0, pb ?? 0) + 10;
  const position = (mph: number) => `${Math.max(3, Math.min(97, (mph / maximum) * 100))}%`;
  return (
    <div className={`relative mx-auto h-[310px] w-full max-w-[260px] ${celebration ? "motion-safe:animate-pulse" : ""}`} aria-label="Bollhastighetsmätare">
      <div className="absolute bottom-0 left-1/2 h-[278px] w-20 -translate-x-1/2 overflow-hidden rounded-t-full rounded-b-2xl border-[6px] border-blue-100 bg-slate-100 shadow-inner">
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-blue-700 via-blue-500 to-cyan-300 transition-[height] duration-700 motion-reduce:transition-none" style={{ height: value ? position(value) : "8%" }} />
        {[25, 50, 75].map((mark) => <span key={mark} className="absolute left-0 right-0 border-t border-white/70" style={{ bottom: `${mark}%` }} />)}
      </div>
      <div className="absolute bottom-0 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full border-[6px] border-blue-100 bg-blue-600 shadow-lg"><Zap className="m-auto mt-6 h-9 w-9 text-white" /></div>
      {average !== null && <div className="absolute left-[calc(50%+48px)] flex items-center gap-2" style={{ bottom: position(average) }}><span className="h-px w-5 bg-blue-400" /><span className="whitespace-nowrap text-[11px] font-bold text-blue-700">Snitt {unitLabel(average, unit)}</span></div>}
      {pb !== null && <div className="absolute right-[calc(50%+48px)] flex items-center gap-2" style={{ bottom: position(pb) }}><span className="whitespace-nowrap text-[11px] font-black text-slate-800">PB {unitLabel(pb, unit)}</span><span className="h-px w-5 bg-slate-700" /></div>}
      {value !== null && <div className="absolute left-1/2 z-10 -translate-x-1/2 rounded-full bg-slate-950 px-3 py-1 text-sm font-black text-white shadow-md transition-[bottom] duration-700 motion-reduce:transition-none" style={{ bottom: position(value) }}>{unitLabel(value, unit)}</div>}
    </div>
  );
}

export function SpeedRoundGame({ userId, authLoading }: { userId: string | null; authLoading: boolean; playerName: string; onExit: () => void }) {
  const [state, setState] = useState(emptyCourse);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<"intro" | "test" | "result">("intro");
  const [resultId, setResultId] = useState<string | null>(null);
  const [unit, setUnit] = useState<SpeedUnit>("mph");
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const celebrated = useRef(new Set<string>());
  const stateRef = useRef(state);
  const key = courseStorageKey(userId);

  useEffect(() => {
    if (authLoading) return;
    try {
      const restored = parseCourse(localStorage.getItem(key));
      stateRef.current = restored;
      setState(restored);
      const savedUnit = localStorage.getItem("sg4-speed-round-unit");
      if (savedUnit === "km/h") setUnit("km/h");
      if (restored.active) setView("test");
    } finally { setReady(true); }
  }, [authLoading, key]);

  useEffect(() => {
    if (!ready || !userId) return;
    let alive = true;
    void syncSpeedRounds(userId).then((synced) => {
      if (!alive) return;
      const next = mergeSpeedRounds(stateRef.current, synced.history);
      stateRef.current = next;
      setState(next);
    }).catch(() => undefined);
    return () => { alive = false; };
  }, [ready, userId]);

  const history = state.history.filter((round) => round.status === "full" && round.holes.flat().length === 3);
  const baseline = speedHistoryBaseline(history);
  const active = state.active;
  const shotIndex = active ? active.holes.length - 1 : 0;
  const currentRound = state.history.find((round) => round.id === resultId) ?? null;
  const displayedSpeed = active?.holes.flat().at(-1)?.ballSpeed ?? null;
  const numeric = Number(value.trim().replace(",", "."));
  const mph = toMph(numeric, unit);
  const valid = value.trim() !== "" && validShot({ ballSpeed: mph });

  function commit(action: CourseAction) {
    const previous = stateRef.current;
    const next = reduceCourse(previous, action);
    if (next === previous) return false;
    stateRef.current = next;
    setState(next);
    localStorage.setItem(key, JSON.stringify(next));
    if (next.history.length > previous.history.length) {
      const saved = next.history.at(-1);
      if (saved) { setResultId(saved.id); setView("result"); }
      if (userId) void syncSpeedRounds(userId).catch(() => undefined);
    }
    return true;
  }

  function start() {
    const snapshot = speedHistoryBaseline(stateRef.current.history);
    if (!commit({ type: "start", id: crypto.randomUUID(), at: Date.now(), baselineAverage: snapshot.average, baselinePb: snapshot.pb })) return;
    setValue("");
    setFeedback(null);
    setResultId(null);
    setView("test");
  }

  function register() {
    if (!valid || saving || !active || active.phase !== "play") return;
    setSaving(true);
    const normalized = Number(mph.toFixed(1));
    if (!commit({ type: "score", shot: { ballSpeed: normalized } })) { setSaving(false); return; }
    const average = active.baselineAverage ?? null;
    const pb = active.baselinePb ?? null;
    setFeedback(pb !== null && normalized > pb ? "Nytt personbästa!" : average !== null && normalized > average ? `Över ditt snitt! +${fmt(normalized - average)} mph` : "Slaget är registrerat");
    window.setTimeout(() => setSaving(false), 350);
  }

  function next() {
    if (!active || active.phase !== "result") return;
    setValue("");
    setFeedback(null);
    commit({ type: "next", at: Date.now() });
  }

  function changeUnit(next: SpeedUnit) {
    if (value.trim() && Number.isFinite(numeric)) setValue(String(Number(fromMph(toMph(numeric, unit), next).toFixed(1))));
    setUnit(next);
    localStorage.setItem("sg4-speed-round-unit", next);
  }

  const resultData = currentRound ? objectiveResult(currentRound) : null;
  const resultPb = currentRound?.baselinePb ?? null;
  const resultAverage = currentRound?.baselineAverage ?? null;
  const newPb = !!resultData && resultPb !== null && resultData.topBallSpeed > resultPb;
  const aboveAverage = !!resultData && resultAverage !== null && resultData.topBallSpeed > resultAverage;
  const firstResult = !!resultData && resultPb === null && resultAverage === null;
  const potential = resultData ? driverDistancePotential(resultData.topBallSpeed) : null;
  const carryInterval = potential ? { low: Math.max(0, potential.carry - 10), high: potential.carry + 10 } : null;
  const celebrate = !!currentRound && newPb && !celebrated.current.has(currentRound.id);
  if (celebrate && currentRound) celebrated.current.add(currentRound.id);
  const nextGoal = baseline.pb !== null ? baseline.pb + 1 : null;

  if (!ready) return <main className="p-8 text-center">Laddar Ball Speed Challenge…</main>;
  return (
    <main className="mx-auto min-h-[calc(100dvh-58px)] max-w-md overflow-x-hidden bg-slate-50 px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-4 text-slate-950">
      {view === "intro" ? (
        <div className="space-y-4">
          <section className="text-center">
            <p className="text-xs font-black uppercase text-blue-600">Ball Speed Challenge</p>
            <h1 className="mt-1 text-4xl font-black">Hur snabb är du?</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">Testa din speed, upptäck din potentiella längd och se ditt Speed-HCP.</p>
          </section>
          <section className="rounded-3xl border border-blue-100 bg-white px-3 pb-5 pt-4 shadow-sm">
            <SpeedMeter value={null} average={baseline.average} pb={baseline.pb} unit={unit} />
            {baseline.count ? <div className="text-center"><p className="font-black text-slate-900">PB {unitLabel(baseline.pb ?? 0, unit)}</p><p className="mt-1 text-sm text-blue-700">Nästa mål: {unitLabel(nextGoal ?? 0, unit)}</p><p className="mt-1 text-xs text-slate-500">Snitt av bästa slaget i {baseline.count} {baseline.count === 1 ? "test" : "senaste test"}</p></div> : <div className="text-center"><p className="font-black">Var hamnar du?</p><p className="mt-1 text-xs text-slate-500">Ditt första test skapar din startnivå.</p></div>}
            <Button onClick={start} className="mt-4 min-h-14 w-full rounded-2xl bg-blue-600 text-base font-black text-white hover:bg-blue-700">Testa min speed</Button>
            <p className="mt-3 text-center text-xs font-semibold text-slate-500">3 slag · Driver · Kräver hastighetsmätare</p>
          </section>
          <section className="grid grid-cols-2 gap-2 text-sm">
            {["Speed-HCP", "Potentiell längd", "Åldersjämförelse", "Vänner när data finns"].map((label) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-3 font-bold text-slate-700">{label}</div>)}
          </section>
        </div>
      ) : view === "test" && active ? (
        <div className="space-y-3">
          <section className="flex items-center justify-between"><div><p className="text-xs font-black uppercase text-blue-600">Slag {shotIndex + 1} av 3</p><h1 className="text-2xl font-black">Bollhastighet</h1></div><div className="flex rounded-xl bg-blue-50 p-1">{(["mph", "km/h"] as const).map((item) => <Button key={item} variant="ghost" onClick={() => changeUnit(item)} aria-pressed={unit === item} className={`h-9 rounded-lg px-3 ${unit === item ? "bg-blue-600 text-white hover:bg-blue-600 hover:text-white" : "text-blue-700"}`}>{item}</Button>)}</div></section>
          <section className="rounded-3xl border border-blue-100 bg-white px-3 py-3">
            <SpeedMeter value={displayedSpeed} average={active.baselineAverage ?? null} pb={active.baselinePb ?? null} unit={unit} celebration={feedback === "Nytt personbästa!"} />
            {active.phase === "play" ? <div className="mx-auto max-w-xs"><label htmlFor="ball-speed" className="sr-only">Bollhastighet</label><div className="flex h-20 items-center rounded-2xl border-2 border-blue-200 bg-slate-50 px-4 focus-within:border-blue-500"><input id="ball-speed" inputMode="decimal" autoFocus value={value} onChange={(event) => setValue(event.target.value)} placeholder="–" className="min-w-0 flex-1 bg-transparent text-center text-5xl font-black tabular-nums outline-none" /><span className="w-12 text-sm font-bold text-slate-500">{unit}</span></div>{value.trim() && !valid && <p role="alert" className="mt-2 text-center text-xs text-red-700">Ange en hastighet över 0 och högst {fmt(fromMph(250, unit))} {unit}.</p>}<Button disabled={!valid || saving} onClick={register} className="mt-3 min-h-14 w-full rounded-2xl bg-blue-600 text-base font-black text-white hover:bg-blue-700">Registrera slag</Button></div> : <div className="text-center"><p className={`text-lg font-black ${feedback?.startsWith("Nytt") ? "text-blue-700" : "text-slate-800"}`}>{feedback}</p><Button onClick={next} className="mt-3 min-h-14 w-full rounded-2xl bg-blue-600 text-base font-black text-white hover:bg-blue-700">{shotIndex === 2 ? "Se resultat" : "Nästa slag"}</Button><Button variant="ghost" onClick={() => { commit({ type: "undo" }); setFeedback(null); setValue(String(Number(fromMph(displayedSpeed ?? 0, unit).toFixed(1)))); }} className="mt-1 min-h-11 text-slate-500"><Undo2 /> Ändra slag</Button></div>}
          </section>
        </div>
      ) : currentRound && resultData ? (
        <div className="space-y-4">
          {celebrate && <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden motion-reduce:hidden">{Array.from({ length: 18 }, (_, index) => <span key={index} className="absolute top-0 h-3 w-2 animate-bounce bg-blue-500" style={{ left: `${5 + index * 5}%`, animationDelay: `${index * 45}ms`, animationDuration: `${700 + (index % 4) * 120}ms` }} />)}</div>}
          <section className={`rounded-3xl border bg-white p-5 text-center shadow-sm ${newPb ? "border-blue-400 shadow-blue-200" : "border-blue-100"}`}>
            <p className="text-xs font-black uppercase text-blue-600">Ditt resultat</p>
            <h1 className="mt-1 text-2xl font-black">{newPb ? "Nytt personbästa!" : aboveAverage ? `Över ditt snitt! +${fmt(resultData.topBallSpeed - (resultAverage ?? 0))} mph` : firstResult ? "Din startnivå är satt" : "Ball Speed Challenge klar"}</h1>
            <p className="mt-4 text-6xl font-black tabular-nums text-blue-700">{unitLabel(resultData.topBallSpeed, unit)}</p>
            <p className="mt-1 text-sm text-slate-500">Bästa bollhastighet</p>
            <div className="mt-5 flex justify-center gap-2">{currentRound.holes.flat().map((shot, index) => <span key={index} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold tabular-nums">{unitLabel(shot.ballSpeed, unit)}</span>)}</div>
          </section>
          {carryInterval && <section className="rounded-3xl border border-blue-100 bg-blue-50 p-5"><p className="text-xs font-black uppercase text-blue-600">Potentiell driverlängd</p><p className="mt-1 text-4xl font-black text-blue-800">ca {carryInterval.low}–{carryInterval.high} m</p><p className="mt-2 text-sm text-slate-600">Uppskattad carry vid bra launch och spinn.</p></section>}
          <SpeedChallengeAnalysis round={currentRound} history={state.history} />
          <Button onClick={start} className="min-h-14 w-full rounded-2xl bg-slate-950 text-base font-black text-white hover:bg-slate-800"><RotateCcw /> Testa igen · 3 slag</Button>
        </div>
      ) : null}
    </main>
  );
}
