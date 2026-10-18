import { useEffect, useRef } from "react";
import { Check, Lock, Star } from "lucide-react";
import { APPROACH_HCP_LEVELS, approachHcpLabel, type ApproachHcp } from "@/lib/approach-hcp-model";
import { bestStars, isStarLevelUnlocked, type ApproachStarRound } from "@/lib/approach-star-game";
import type { FocusKind } from "@/lib/pei-ranking";

export function LevelStar({ score }: { score: number }) {
  return <span className="relative inline-block h-9 w-9" role="img" aria-label={`${score} av 9 stjärnor`}>
    <Star className="absolute inset-0 h-9 w-9 fill-slate-200 text-slate-300"/>
    <span className="absolute inset-y-0 left-0 overflow-hidden" style={{width:`${Math.max(0,Math.min(9,score))/9*100}%`}}><Star className="h-9 w-9 max-w-none fill-amber-400 text-amber-500"/></span>
  </span>;
}
export function ApproachLevelCarousel({history,kind,hcp,onSelect}:{history:ApproachStarRound[];kind:FocusKind;hcp:ApproachHcp;onSelect:(hcp:ApproachHcp)=>void}) {
  const ref=useRef<HTMLDivElement>(null);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>{const el=ref.current;if(el)el.scrollTo({left:APPROACH_HCP_LEVELS.indexOf(hcp)*el.clientWidth/3,behavior:"instant"});},[hcp,kind]);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  function scroll(){if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>{const el=ref.current;if(!el)return;const index=Math.max(0,Math.min(APPROACH_HCP_LEVELS.length-1,Math.round(el.scrollLeft/(el.clientWidth/3))));onSelect(APPROACH_HCP_LEVELS[index]);},180);}
  return <div ref={ref} onScroll={scroll} aria-label="HCP-nivåer, svep vänster eller höger" className="mt-3 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <span className="basis-1/3 shrink-0" aria-hidden="true"/>
    {APPROACH_HCP_LEVELS.map(level=>{const score=bestStars(history,kind,level)??0;const unlocked=isStarLevelUnlocked(history,kind,level);return <div key={level} className="basis-1/3 shrink-0 snap-center px-1"><button onClick={()=>onSelect(level)} aria-pressed={level===hcp} aria-label={`HCP ${approachHcpLabel(level)}, ${score}/9${unlocked?"":", låst"}`} className={`flex min-h-40 w-full flex-col items-center rounded-2xl border px-1 py-3 ${level===hcp?"border-blue-600 bg-blue-50 ring-1 ring-blue-600":"border-slate-200 bg-white"}`}><span className="text-[10px] font-semibold text-slate-500">{level===hcp?"Vald nivå":"HCP-utmaning"}</span><strong className="mt-1 text-lg">HCP {approachHcpLabel(level)}</strong><span className="mt-2"><LevelStar score={score}/></span><span className="text-xs font-bold text-slate-500">{score}/9</span><span className="mt-2 flex min-h-4 items-center gap-1 text-[10px] font-bold">{!unlocked?<><Lock size={12}/><span>Låst</span></>:score>=7?<><Check size={13} className="text-green-600"/><span className="text-green-700">{score===9?"Full pott":"Klarad"}</span></>:null}</span></button></div>;})}
    <span className="basis-1/3 shrink-0" aria-hidden="true"/>
  </div>;
}
