import { ApproachLevelCarousel, LevelStar } from "@/components/approach-level-carousel";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Flag, Star, Trophy, Undo2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { APPROACH_HCP_LEVELS, APPROACH_MODEL_VERSION, approachHcpLabel, approachZoneRadius, type ApproachHcp } from "@/lib/approach-hcp-model";
import { bestStars, isStarLevelUnlocked, loadStarRounds, starCount, starStatus, starTargets, storeStarRound, type ApproachStarRound } from "@/lib/approach-star-game";
import type { FocusKind } from "@/lib/pei-ranking";
const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 1 });
function Stars({ hits, best }: { hits?: boolean[]; best?: number }) {
  return <div className="flex justify-center gap-1" aria-label={`${hits ? starCount(hits) : best ?? 0} av 9 stjärnor`}>{Array.from({length:9},(_,i)=><Star key={i} aria-hidden="true" className={`h-5 w-5 ${hits ? hits[i] ? "fill-amber-400 text-amber-400" : i < hits.length ? "text-slate-400" : "text-slate-200" : i < (best ?? 0) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}/>)}</div>;
}
export function ApproachStarGame() {
  const [kind,setKind]=useState<FocusKind>("wedge");
  const [hcp,setHcp]=useState<ApproachHcp>(20);
  const [history,setHistory]=useState<ApproachStarRound[]>([]);
  const [round,setRound]=useState<ApproachStarRound|null>(null);
  const [feedback,setFeedback]=useState("");
  const [error,setError]=useState(false);
  const [abort,setAbort]=useState(false);
  const lock=useRef(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useHideBottomNav(true);
  useEffect(()=>{const saved=loadStarRounds();setHistory(saved);const last=saved.at(-1);if(last){setKind(last.kind);setHcp(isStarLevelUnlocked(saved,last.kind,last.hcp)?last.hcp:10);}return()=>{if(timer.current)clearTimeout(timer.current);};},[]);
  const finished=round?.hits.length===9;
  const targets=starTargets(round?.kind??kind);
  const target=targets[Math.min(round?.hits.length??0,8)];
  const radius=Math.round(approachZoneRadius(target,round?.hcp??hcp)*2)/2;
  const levelIndex=APPROACH_HCP_LEVELS.indexOf(hcp);
  const unlocked=isStarLevelUnlocked(history,kind,hcp);
  const score=starCount(round?.hits??[]);
  const nextLevel=round ? APPROACH_HCP_LEVELS[APPROACH_HCP_LEVELS.indexOf(round.hcp)+1] : undefined;
  const button="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold active:scale-[.98]";
  function save(r:ApproachStarRound){try{setHistory(storeStarRound(r));setError(false);}catch{setError(true);}}
  function start(level:ApproachHcp=hcp){if(!isStarLevelUnlocked(history,kind,level))return;if(timer.current)clearTimeout(timer.current);lock.current=false;setFeedback("");setError(false);setHcp(level);setRound({id:crypto.randomUUID(),date:new Date().toISOString(),kind,hcp:level,model:APPROACH_MODEL_VERSION,hits:[]});}
  function answer(hit:boolean){if(!round||finished||lock.current)return;lock.current=true;const r={...round,hits:[...round.hits,hit]};setRound(r);setFeedback(hit?"En stjärna!":"Nästa möjlighet väntar");if(r.hits.length===9)save(r);timer.current=setTimeout(()=>{lock.current=false;setFeedback("");},500);}
  function undo(){if(!round?.hits.length)return;if(timer.current)clearTimeout(timer.current);lock.current=false;setFeedback("");const r={...round,hits:round.hits.slice(0,-1)};setRound(r);save(r);}
  function changeKind(k:FocusKind){setKind(k);const last=history.filter(r=>r.kind===k).at(-1)?.hcp??20;setHcp(isStarLevelUnlocked(history,k,last)?last:10);}
  return <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col bg-slate-50 px-4 pb-[max(16px,env(safe-area-inset-bottom))] text-slate-950">
    <header className="flex min-h-16 items-center justify-between gap-3 pt-[env(safe-area-inset-top)]">{round?<span className="font-bold">Flaggjakten</span>:<Link to="/spel" className="flex items-center gap-2 font-bold"><ArrowLeft size={20}/> Spel</Link>}{round&&<button onClick={()=>finished?setRound(null):setAbort(true)} className="min-h-11 text-sm font-semibold text-slate-500">{finished?"Till nivåerna":"Avbryt spel"}</button>}</header>
    {!round?<div className="space-y-5 pb-6">
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 text-white"><img src="/Approach_shot.png" alt="" className="h-44 w-full object-cover opacity-70"/><div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent"/><div className="absolute bottom-5 left-5"><h1 className="text-4xl font-black">Flaggjakten</h1><p className="mt-2 text-sm">9 slag · 7 stjärnor klarar nivån</p></div></section>
      <section aria-label="Välj avstånd"><h2 className="mb-3 text-lg font-black"><span className="mr-2 text-blue-600">1.</span> Välj avstånd</h2><div className="grid grid-cols-2 gap-2">{(["wedge","iron"] as const).map(k=><button key={k} onClick={()=>changeKind(k)} aria-pressed={kind===k} className={`min-h-20 rounded-2xl border px-3 py-3 font-bold transition-colors ${kind===k?"border-blue-600 bg-blue-600 text-white":"border-slate-200 bg-white text-slate-950"}`}><span className="block">{k==="wedge"?"Korta inspel":"Inspel järn"}</span><span className="mt-1 block text-sm">{k==="wedge"?"30–110 m":"120–175 m"}</span></button>)}</div></section>
      <section aria-label="Välj svårighet"><h2 className="text-lg font-black"><span className="mr-2 text-blue-600">2.</span> Välj svårighet</h2><ApproachLevelCarousel history={history} kind={kind} hcp={hcp} onSelect={setHcp}/><p className="mt-2 text-center text-xs text-slate-500">Svep mellan nivåerna · 7/9 klarar · 9/9 full pott</p></section>
      {!unlocked&&<p className="text-center text-sm font-semibold text-slate-500">Klara HCP {approachHcpLabel(APPROACH_HCP_LEVELS[levelIndex-1])} med minst 7/9 för att låsa upp HCP {approachHcpLabel(hcp)}.</p>}
      <button disabled={!unlocked} onClick={()=>start()} className="min-h-14 w-full rounded-2xl bg-blue-600 text-lg font-black text-white disabled:bg-slate-200 disabled:text-slate-500">{unlocked?`Spela HCP ${approachHcpLabel(hcp)}`:`HCP ${approachHcpLabel(hcp)} är låst`}</button>
      <details className="rounded-2xl border border-slate-200 bg-white p-4"><summary className="font-semibold">Alla nivåer och stjärnrekord</summary><div className="mt-3 divide-y divide-slate-100">{APPROACH_HCP_LEVELS.map(level=>{const best=bestStars(history,kind,level);return <button key={level} onClick={()=>setHcp(level)} className="flex min-h-14 w-full items-center justify-between gap-2 text-sm"><span className="font-bold">HCP {approachHcpLabel(level)}</span><span className="flex flex-col items-center py-2"><LevelStar score={best??0}/><span className="text-xs text-slate-500">{best??0}/9</span><span className="mt-1 text-xs font-semibold text-green-700">{!isStarLevelUnlocked(history,kind,level)?"Låst":best!==null&&best>=7?"✓ Klarad":""}</span></span></button>;})}</div></details>
      <details className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600"><summary className="font-semibold">Så fungerar målzonerna</summary><p className="mt-3">Cirkeln gäller åt alla håll från flaggan, även diagonalt. Bedöm bollens slutliga position. På gränsen räknas som inom. Mät mot samma flagga som du siktar på.</p><p className="mt-3">Preliminära SG4-utmaningar enligt samma modell som inspelstestet. De är inte verifierade HCP-gränser. HCP 40 är en extrapolering. 7/9 klarar spelet, inte ett officiellt handicap.</p><p className="mt-3">Stjärnorna är bästa enskilda omgången per nivå och sparas på den här enheten. Använd samma miljö för jämförbara försök.</p></details>
    </div>:<>
      <div className="flex items-center justify-between py-3 text-sm font-bold text-slate-500"><span>{round.kind==="wedge"?"Wedge 30–110 m":"Järn 120–175 m"} · HCP {approachHcpLabel(round.hcp)}</span><span>{Math.min(round.hits.length+1,9)}/9 slag</span></div>
      <Stars hits={round.hits}/>
      {finished?<section className="flex flex-1 flex-col justify-center gap-5 py-6 text-center"><Trophy size={48} className="mx-auto text-amber-400"/><h1 className="text-3xl font-black">{starStatus(round.hits)==="perfect"?"Full pott!":score>=7?"Nivån klarad!":"Nästa gång tar du fler"}</h1><div className="rounded-3xl border border-blue-100 bg-white p-6"><p className="text-6xl font-black">{score}<span className="text-2xl text-slate-400">/9</span></p><p className="mt-3 font-bold">{round.kind==="wedge"?"Wedge 30–110 m":"Järn 120–175 m"} · HCP {approachHcpLabel(round.hcp)}</p><p className="mt-2 text-sm text-slate-500">Personbästa: {Math.max(score,bestStars(history,round.kind,round.hcp)??0)}/9</p><p className="mt-3 text-sm text-slate-500">{score===9?"Alla nio slag inom målzonen.":score>=7?"Klarad – spela om för full pott eller prova svårare.":`${7-score} fler träffar behövs för att klara nivån.`}</p></div>{score>=7&&nextLevel!==undefined&&<button onClick={()=>start(nextLevel)} className="min-h-14 rounded-2xl bg-blue-600 font-black text-white">Utmana HCP {approachHcpLabel(nextLevel)}</button>}<button onClick={()=>start(round.hcp)} className={button}>Spela igen · HCP {approachHcpLabel(round.hcp)}</button><button onClick={()=>setRound(null)} className="min-h-12 font-bold text-blue-600">Visa alla nivåer</button></section>:<section className="flex flex-1 flex-col justify-between gap-3 py-4">
        <div className="text-center"><p className="text-sm font-bold uppercase tracking-widest text-slate-400">Mål</p><h1 className="mt-1 text-6xl font-black">{target}<span className="ml-1 text-2xl text-slate-400">m</span></h1></div>
        <div className="relative mx-auto grid h-[clamp(190px,30dvh,260px)] w-full max-w-xs grid-cols-[1fr_1.5fr_1fr] grid-rows-[1fr_1.5fr_1fr] items-center justify-items-center overflow-hidden rounded-3xl bg-rose-50" aria-label={`Cirkelformad zon: ${fmt(radius)} meter vänster, höger, kort och lång`}><div className="absolute left-1/2 top-1/2 aspect-square h-[74%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blue-500 bg-blue-50"/><span className="relative col-start-2 text-center text-xs font-semibold text-slate-600">Långt<br/><strong>{fmt(radius)} m</strong></span><span className="relative col-start-1 row-start-2 text-center text-xs font-semibold text-slate-600">Vänster<br/><strong>{fmt(radius)} m</strong></span><div className="relative col-start-2 row-start-2 flex flex-col items-center"><Flag size={26} className="text-blue-600"/><span className="mt-1 text-[10px] font-bold text-blue-700">FLAGGAN</span></div><span className="relative col-start-3 row-start-2 text-center text-xs font-semibold text-slate-600">Höger<br/><strong>{fmt(radius)} m</strong></span><span className="relative col-start-2 row-start-3 text-center text-xs font-semibold text-slate-600">Kort<br/><strong>{fmt(radius)} m</strong></span></div>
        <p className="text-center text-xs text-slate-500">Cirkeln gäller även diagonalt · på linjen är inom</p>
        <p role="status" aria-live="polite" className="min-h-6 text-center text-sm font-bold text-blue-600">{feedback||`Stanna inom ${fmt(radius)} m från flaggan`}</p>
        <div className="grid grid-cols-2 gap-3"><button disabled={!!feedback} onClick={()=>answer(true)} className="min-h-16 rounded-2xl bg-blue-600 text-lg font-black text-white disabled:opacity-50">Inom zonen ★</button><button disabled={!!feedback} onClick={()=>answer(false)} className="min-h-16 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 font-bold text-rose-700 disabled:opacity-50">Utanför</button></div>
      </section>}
      {error&&<button onClick={()=>save(round)} className="py-2 text-sm text-red-600">Kunde inte spara. Tryck för att försöka igen.</button>}
      <button disabled={!round.hits.length} onClick={undo} className="flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-slate-500 disabled:opacity-30"><Undo2 size={16}/> Ångra senaste slaget</button>
    </>}
    <Dialog open={abort} onOpenChange={setAbort}><DialogContent><DialogTitle>Avbryta spelet?</DialogTitle><DialogDescription>Den pågående omgången sparas inte.</DialogDescription><button onClick={()=>setAbort(false)} className="min-h-12 rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white">Fortsätt spela</button><button onClick={()=>{setAbort(false);setRound(null);}} className={button}>Avbryt spel</button></DialogContent></Dialog>
  </main>;
}
