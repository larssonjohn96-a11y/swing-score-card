import { useEffect, useMemo, useState } from "react";
import { Check, Target, X } from "lucide-react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import type { CategoryHandicap, CategorySlug } from "@/lib/sg-handicap";
import { hcpLabel, ratingFromHandicap } from "@/lib/sg-handicap";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { collectApproachShots, approachProximity } from "@/lib/approach-global";
import { collectPuttStarts, collectLagHoleOutStarts } from "@/lib/putting-global";
import { loadOffTeeSessions } from "@/lib/offtee-store";
import { collectAroundGreenShots } from "@/lib/around-green-global";

const TITLES: Record<CategorySlug,string>={driving:"Utslag",approach:"Inspel","around-the-green":"Närspel",puttning:"Puttning",speed:"Speed"};

type Focus={title:string;detail:string;metric:string;sample:number};

function avg(xs:number[]){return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0}
function pct(n:number){return Math.round(n)+"%"}

function concreteFocus(slug:CategorySlug):Focus{
 if(slug==="puttning"){
  const short=collectPuttStarts().filter(x=>x.distance>0&&x.distance<=3&&x.pooledBenchmarkEligible!==false);
  const lag=collectLagHoleOutStarts().filter(x=>x.distance>=8&&x.distance<=20);
  const shortRate=short.length?short.filter(x=>x.firstPuttHoled).length/short.length*100:undefined;
  const three=lag.length?lag.filter(x=>x.strokes>=3).length/lag.length*100:undefined;
  if(shortRate!==undefined&&three!==undefined&&three>18)return{title:"Färre 3-puttar från 8–20 m",detail:"Prioritera fartkontroll på långa puttar.",metric:pct(three)+" 3-puttar",sample:lag.length};
  if(shortRate!==undefined)return{title:"Bättre puttning 0–3 m",detail:"Träna startlinje och konvertering på korta puttar.",metric:pct(shortRate)+" sänkta",sample:short.length};
  return{title:"Bygg puttdata 0–3 m",detail:"Gör Putting HCP-testet för en konkret rekommendation.",metric:"Mer data behövs",sample:0};
 }
 if(slug==="approach"){
  const shots=collectApproachShots(),bins=[[50,75],[75,100],[100,125],[125,150],[150,200]] as const;
  const rows=bins.map(([lo,hi])=>{const s=shots.filter(x=>x.target>=lo&&x.target<hi);return{lo,hi,s,error:s.length?avg(s.map(x=>approachProximity(x)/x.target*100)):0}}).filter(x=>x.s.length);
  const worst=[...rows].sort((a,b)=>b.error-a.error)[0];
  return worst?{title:"Bättre precision "+worst.lo+"–"+worst.hi+" m",detail:"Träna längd + sidled i intervallet där din relativa miss är störst.",metric:Math.round(worst.error)+"% relativ miss",sample:worst.s.length}:{title:"Bygg inspelsdata",detail:"Gör Approach HCP-testet för att hitta ditt svagaste avstånd.",metric:"Mer data behövs",sample:0};
 }
 if(slug==="driving"){
  const shots=loadOffTeeSessions().flatMap(s=>s.shots.filter(x=>x.filled));
  const avgSide=shots.length?avg(shots.map(x=>Math.abs(x.sidled))):0;
  const penalty=shots.length?shots.filter(x=>Math.abs(x.sidled)>28).length/shots.length*100:0;
  return shots.length?{title:penalty>15?"Färre stora drivermissar":"Tajtare driverspridning",detail:penalty>15?"Prioritera att hålla bollen borta från penalty-zonen.":"Behåll längden och minska sidledsmissen.",metric:penalty>15?pct(penalty)+" stora missar":avgSide.toFixed(1).replace(".",",")+" m snitt sidled",sample:shots.length}:{title:"Bygg driverdata",detail:"Gör Utslag HCP-testet för en konkret rekommendation.",metric:"Mer data behövs",sample:0};
 }
 if(slug==="around-the-green"){
  const shots=collectAroundGreenShots();
  const bins=[[0,10],[10,20],[20,30],[30,60]] as const;
  const rows=bins.map(([lo,hi])=>{const s=shots.filter(x=>x.startDistance>=lo&&x.startDistance<hi);return{lo,hi,s,p:s.length?avg(s.map(x=>x.proximity)):0}}).filter(x=>x.s.length);
  const worst=[...rows].sort((a,b)=>b.p-a.p)[0];
  return worst?{title:"Närmare hål från "+worst.lo+"–"+worst.hi+" m",detail:"Träna avståndet där din genomsnittliga närhet är svagast.",metric:worst.p.toFixed(1).replace(".",",")+" m från hål",sample:worst.s.length}:{title:"Bygg närspelsdata",detail:"Gör Närspel HCP-testet för en konkret rekommendation.",metric:"Mer data behövs",sample:0};
 }
 return{title:"Öka din speed",detail:"Gör Ball Speed-testet och följ utvecklingen över tid.",metric:"Ball speed",sample:0};
}

export function LowerHcpAssessment({cats,totalHandicap}:{cats:CategoryHandicap[];totalHandicap:number|undefined}){
 const [open,setOpen]=useState(false),[pulse,setPulse]=useState(false);
 useHideBottomNav(open);
 const tested=useMemo(()=>cats.filter(c=>c.handicap!==undefined),[cats]);
 const weakest=useMemo(()=>tested.length?[...tested].sort((a,b)=>b.handicap!-a.handicap!)[0]:undefined,[tested]);
 const strongest=useMemo(()=>tested.length?[...tested].sort((a,b)=>a.handicap!-b.handicap!)[0]:undefined,[tested]);
 const focus=useMemo(()=>weakest?concreteFocus(weakest.slug):undefined,[weakest]);
 const radar=useMemo(()=>cats.filter(c=>c.handicap!==undefined).map(c=>({subject:TITLES[c.slug],value:ratingFromHandicap(c.handicap!),slug:c.slug})),[cats]);
 useEffect(()=>{if(!open)return;setPulse(false);const id=window.setTimeout(()=>setPulse(true),500);return()=>window.clearTimeout(id)},[open]);

 return <>
  <button type="button" onClick={()=>setOpen(true)} className="mt-6 w-full rounded-[26px] bg-gradient-to-br from-blue-600 to-indigo-700 p-5 text-left text-white shadow-sm">
   <div className="flex min-h-[116px] flex-col justify-between"><div className="flex justify-between"><span className="text-[10px] font-black uppercase tracking-[.18em] text-white/70">HCP-analys</span>{totalHandicap!==undefined?<strong className="text-3xl">{hcpLabel(totalHandicap)}</strong>:null}</div><div><h2 className="text-[27px] font-black leading-none">Sänk mitt HCP</h2><p className="mt-2 text-sm text-white/75">{weakest?"Fokusera på "+TITLES[weakest.slug]+" → "+(focus?.title??""):"Gör HCP-testerna för din personliga plan."}</p></div></div>
  </button>

  {open&&<div className="fixed inset-0 z-[220] overflow-y-auto bg-[#f4f7fb] text-slate-950">
   <div className="mx-auto min-h-dvh w-full max-w-md pb-[max(28px,env(safe-area-inset-bottom))]">
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 pb-3 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur">
     <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">HCP-analys</p><h1 className="text-xl font-black">Sänk mitt HCP</h1></div>
     <button onClick={()=>setOpen(false)} aria-label="Stäng" className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100"><X className="h-5 w-5"/></button>
    </header>

    <main className="px-5 pt-5">
     {radar.length>=3?<section className="overflow-hidden rounded-[28px] border border-blue-100 bg-white shadow-sm">
      <div className="flex items-center justify-between px-5 pt-5"><div><p className="text-xs font-bold text-slate-500">Din spelprofil</p><p className="mt-1 text-lg font-black">Styrka vs svaghet</p></div>{totalHandicap!==undefined?<div className="text-right"><p className="text-[10px] font-bold uppercase text-slate-400">Total</p><strong className="text-3xl">HCP {hcpLabel(totalHandicap)}</strong></div>:null}</div>
      <div className="relative h-[285px]">
       <ResponsiveContainer width="100%" height="100%"><RadarChart data={radar} outerRadius="68%"><PolarGrid stroke="#dbe4f0"/><PolarAngleAxis dataKey="subject" tick={{fontSize:11,fontWeight:700,fill:"#475569"}} tickLine={false}/><PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false}/><Radar dataKey="value" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.18} strokeWidth={3} isAnimationActive animationDuration={900} dot={(p:any)=>{const row=radar[p.index],weak=row?.slug===weakest?.slug,strong=row?.slug===strongest?.slug;return <circle key={p.index} cx={p.cx} cy={p.cy} r={weak||strong?(pulse?9:6):4} fill={weak?"#ef4444":strong?"#10b981":"#2563eb"} stroke="white" strokeWidth={3} style={{transition:"r .35s ease"}}/>}}/></RadarChart></ResponsiveContainer>
       {weakest&&<span className="absolute bottom-3 left-4 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600">Fokus: {TITLES[weakest.slug]}</span>}
       {strongest&&<span className="absolute bottom-3 right-4 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">Styrka: {TITLES[strongest.slug]}</span>}
      </div>
     </section>:<section className="rounded-[28px] border border-blue-100 bg-white p-6 text-center"><Target className="mx-auto h-8 w-8 text-blue-600"/><h2 className="mt-3 text-xl font-black">Gör fler HCP-tester</h2><p className="mt-1 text-sm text-slate-500">Minst tre kategorier behövs för en tydlig spelprofil.</p></section>}

     {weakest&&strongest?<section className="mt-5">
      <div className="grid grid-cols-2 gap-3">
       <div className="rounded-2xl border-2 border-red-200 bg-white p-4"><p className="text-[10px] font-black uppercase text-red-500">Utveckla</p><p className="mt-1 text-lg font-black">{TITLES[weakest.slug]}</p><p className="mt-1 text-3xl font-black">HCP {hcpLabel(weakest.handicap!)}</p></div>
       <div className="rounded-2xl border-2 border-emerald-200 bg-white p-4"><p className="text-[10px] font-black uppercase text-emerald-600">Styrka</p><p className="mt-1 text-lg font-black">{TITLES[strongest.slug]}</p><p className="mt-1 text-3xl font-black">HCP {hcpLabel(strongest.handicap!)}</p></div>
      </div>
     </section>:null}

     {focus&&<section className="mt-5 rounded-[28px] bg-slate-950 p-5 text-white">
      <p className="text-[10px] font-black uppercase tracking-[.18em] text-blue-300">Gör detta först</p>
      <h2 className="mt-2 text-[25px] font-black leading-tight">{focus.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{focus.detail}</p>
      <div className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-2 text-sm font-bold">{focus.metric}{focus.sample>0?" · "+focus.sample+" slag":""}</div>
     </section>}

     <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5">
      <p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Nästa loop</p>
      <div className="mt-3 space-y-3">{["Träna fokusområdet","Gör samma HCP-test igen","Behåll styrkan – välj nästa svaghet"].map((x,i)=><div key={x} className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-blue-600">{i+1}</span><strong className="text-sm">{x}</strong>{i===2?<Check className="ml-auto h-4 w-4 text-emerald-500"/>:null}</div>)}</div>
     </section>
    </main>
   </div>
  </div>}
 </>;
}
