import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Heart, Trophy, Undo2 } from "lucide-react";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { CARRY_OPTIONS, FAIRWAY_SIDES, addFairwayShot, fairwayHighScores, fairwayProgress, loadFairwayRounds, storeFairwayRound, type FairwayOutcome, type FairwayRound } from "@/lib/fairway-ladder";

export function FairwayLadder() {
  const [carry, setCarry] = useState(200);
  const [round, setRound] = useState<FairwayRound | null>(null);
  const [history, setHistory] = useState<FairwayRound[]>([]);
  const [feedback, setFeedback] = useState("");
  const [saveError, setSaveError] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const locked = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useHideBottomNav(true);
  useEffect(() => { setHistory(loadFairwayRounds()); return () => { if (timer.current) clearTimeout(timer.current); }; }, []);
  const progress = fairwayProgress(round?.shots ?? []);
  const scores = fairwayHighScores(history, round?.carry ?? carry);
  function persist(next: FairwayRound) {
    try { setHistory(storeFairwayRound(next)); setSaveError(false); } catch { setSaveError(true); }
  }
  function start() {
    locked.current = false; setFeedback(""); setSaveError(false);
    setRound({ id: crypto.randomUUID(), date: new Date().toISOString(), carry, shots: [] });
  }
  function shoot(outcome: FairwayOutcome) {
    if (!round || locked.current || progress.finished) return;
    locked.current = true;
    const next = { ...round, shots: addFairwayShot(round.shots, outcome) };
    setRound(next);
    setFeedback(outcome === "hit" ? "Träff!" : "Ett hjärta förlorat");
    if (fairwayProgress(next.shots).finished) persist(next);
    timer.current = setTimeout(() => { locked.current = false; setFeedback(""); }, 550);
  }
  function undo() {
    if (!round?.shots.length) return;
    if (timer.current) clearTimeout(timer.current);
    locked.current = false; setFeedback("");
    const next = { ...round, shots: round.shots.slice(0, -1) };
    setRound(next); persist(next);
  }
  const button = "min-h-12 rounded-2xl border border-slate-200 bg-white px-3 py-3 font-bold shadow-sm active:scale-[.98] disabled:opacity-50";
  return <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-slate-50 px-4 pb-[max(16px,env(safe-area-inset-bottom))] text-slate-950">
    <header className="flex min-h-16 items-center justify-between gap-3 pt-[env(safe-area-inset-top)]">
      {round ? <span className="font-bold">Fairwaystegen</span> : <Link to="/spel" className="flex items-center gap-2 font-bold"><ArrowLeft size={20}/> Spel</Link>}
      {round && !progress.finished ? <button onClick={() => setConfirmExit(true)} className="min-h-11 text-sm font-semibold text-slate-500">Avbryt spel</button> : round ? <button onClick={() => setRound(null)} className="min-h-11 text-sm font-semibold">Till startsidan</button> : null}
    </header>
    {!round ? <div className="space-y-5 pb-6">
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 text-white"><img src="/Off_the_tee.png" alt="" className="h-52 w-full object-cover opacity-70"/><div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent"/><div className="absolute bottom-5 left-5"><p className="text-xs font-bold uppercase tracking-widest text-blue-200">Driver · 8 nivåer</p><h1 className="mt-1 text-4xl font-black">Fairwaystegen</h1></div></section>
      <p className="text-slate-600">En träff tar dig vidare. Fairwayen krymper från ±20 till ±1 meter. Hur långt når du med tre hjärtan?</p>
      <label className="block rounded-3xl border border-slate-200 bg-white p-5"><span className="font-bold">Välj minsta carry</span><select value={carry} onChange={e => setCarry(Number(e.target.value))} className="mt-3 min-h-12 w-full rounded-xl bg-slate-100 px-3 text-xl font-black" aria-label="Minsta carry">{CARRY_OPTIONS.map(n => <option key={n} value={n}>{n} m</option>)}</select><span className="mt-3 block text-xs leading-relaxed text-slate-500">Bedöm landningspunkten. Kortare än vald carry kostar ett hjärta. På gränsen räknas som träff. Smala zoner kräver tillförlitlig mätning.</span></label>
      <button onClick={start} className="min-h-14 w-full rounded-2xl bg-blue-600 text-lg font-black text-white">Starta spelet</button>
      <section className="rounded-3xl border border-slate-200 bg-white p-5"><h2 className="flex items-center gap-2 font-black"><Trophy size={19}/> Mina rekord · {carry} m</h2><p className="mt-1 text-xs text-slate-500">Sparade på den här enheten · samma carry jämförs</p>{scores.length ? <ol className="mt-3 divide-y divide-slate-100">{scores.slice(0,5).map((r,i) => {const p = fairwayProgress(r.shots);return <li key={r.id} className="flex items-center justify-between gap-2 py-3 text-sm"><span>{i+1}. {r.carry} m · {p.cleared}/8 nivåer<br/><span className="text-xs text-slate-500">{new Date(r.date).toLocaleDateString("sv-SE")} · {r.shots.length} slag</span></span><strong>{p.cleared ? `±${FAIRWAY_SIDES[p.cleared-1]} m` : "Ingen klarad"}<span className="block text-right text-xs text-rose-500">{p.lives} ♥ kvar</span></strong></li>;})}</ol> : <p className="mt-4 text-sm text-slate-500">Spela din första omgång på {carry} m.</p>}</section>
    </div> : <>
      <div className="flex items-center justify-between py-3"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Minst {round.carry} m carry</span><div className="flex gap-1.5" aria-label={`${progress.lives} av 3 hjärtan kvar`}>{[0,1,2].map(i => <Heart key={i} size={27} aria-hidden="true" className={`transition-all duration-300 ${i < progress.lives ? "fill-rose-500 text-rose-500" : "fill-transparent text-slate-300"}`}/>)}</div></div>
      <div className="grid grid-cols-8 gap-1.5">{FAIRWAY_SIDES.map((_,i) => <span key={i} className={`h-2 rounded-full ${i < progress.cleared ? "bg-blue-600" : i === progress.cleared && !progress.finished ? "bg-blue-300" : "bg-slate-200"}`}/>)}</div>
      {progress.finished ? <section className="flex flex-1 flex-col justify-center gap-5 py-6 text-center"><Trophy className="mx-auto text-blue-600" size={48}/><h1 className="text-3xl font-black">{progress.won ? "Alla nivåer klarade!" : "Omgången klar"}</h1><div className="rounded-3xl border border-blue-100 bg-white p-6"><p className="text-sm font-bold text-slate-500">{round.carry} m carry · Högsta klarade nivå</p><p className="mt-3 text-6xl font-black">{progress.cleared}<span className="text-2xl text-slate-400">/8</span></p><p className="mt-3 font-bold">{progress.cleared ? `±${FAIRWAY_SIDES[progress.cleared-1]} m från mållinjen` : "Ingen nivå klarad ännu"}</p><p className="mt-2 text-sm text-slate-500">{round.shots.length} slag · {progress.lives} hjärtan kvar</p><p className="mt-3 text-xs text-slate-500">Vänster {round.shots.filter(s=>s==="left").length} · Höger {round.shots.filter(s=>s==="right").length} · För kort {round.shots.filter(s=>s==="short").length}</p>{scores[0]?.id === round.id && <p className="mt-4 font-black text-blue-600">Ditt bästa resultat på {round.carry} m!</p>}</div>{saveError && <button onClick={()=>persist(round)} className="text-sm text-red-600">Resultatet kunde inte sparas. Tryck för att försöka igen.</button>}<button onClick={start} className="min-h-14 rounded-2xl bg-blue-600 text-lg font-black text-white">Spela igen · {round.carry} m</button><button onClick={()=>setRound(null)} className={button}>Byt carry / Visa rekord</button></section> : <section className="flex flex-1 flex-col justify-between gap-3 py-4">
        <div className="text-center"><p className="text-sm font-bold text-slate-500">Nivå {progress.cleared+1} av 8</p><h1 className="mt-1 text-5xl font-black">±{progress.side} m</h1><p className="mt-2 text-sm text-slate-500">{progress.side*2} m bred korridor</p></div>
        <div className="relative mx-auto h-[clamp(100px,23dvh,230px)] w-full overflow-hidden rounded-3xl bg-blue-100/50" aria-label={`Fairway ${progress.side*2} meter bred`}><div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-x-2 border-blue-500 bg-blue-500/20 transition-[width] duration-500" style={{width:`${Math.max(5,progress.side/20*85)}%`}}/><div className="absolute inset-y-0 left-1/2 border-l border-dashed border-blue-600/50"/><span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-xs font-bold">{round.carry} m</span><span className="absolute left-1/2 top-4 -translate-x-1/2 text-3xl">⚑</span></div>
        <p role="status" aria-live="polite" className={`min-h-6 text-center text-sm font-bold ${feedback === "Träff!" ? "text-blue-600" : "text-rose-500"}`}>{feedback || "Var landade bollen?"}</p>
        <div><div className="grid grid-cols-3 gap-2"><button disabled={!!feedback} onClick={()=>shoot("left")} className={button}>← Vänster</button><button disabled={!!feedback} onClick={()=>shoot("hit")} className="min-h-16 rounded-2xl bg-blue-600 font-black text-white shadow-sm disabled:opacity-50">Träff ✓</button><button disabled={!!feedback} onClick={()=>shoot("right")} className={button}>Höger →</button></div><button disabled={!!feedback} onClick={()=>shoot("short")} className={`${button} mt-2 w-full text-slate-600`}>För kort · under {round.carry} m</button></div>
      </section>}
      <button disabled={!round.shots.length} onClick={undo} className="flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-slate-500 disabled:opacity-30"><Undo2 size={16}/> Ångra senaste slaget</button>
    </>}
    {confirmExit && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-5" role="dialog" aria-modal="true" aria-labelledby="fairway-abort"><div className="w-full max-w-sm rounded-3xl bg-white p-6"><h2 id="fairway-abort" className="text-xl font-black">Avbryta spelet?</h2><p className="mt-2 text-sm text-slate-500">Den pågående omgången sparas inte.</p><button onClick={()=>setConfirmExit(false)} className="mt-5 min-h-12 w-full rounded-xl bg-blue-600 font-bold text-white">Fortsätt spela</button><button onClick={()=>{setConfirmExit(false);setRound(null);}} className="mt-2 min-h-12 w-full font-semibold">Avbryt spel</button></div></div>}
  </main>;
}
