import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BarChart3, RotateCcw, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { LIGHT_SURFACE } from "@/routes/8-bollar";
import { saveSession, type Analysis, type Prompt, type ScoreOption } from "@/lib/training/core";
import type { TrainingBackRoute, TrainingHistoryRoute, TrainingTestRoute } from "@/lib/training/routes";

export type TestVariant = { id:string; label:string; description?:string };
export type ClubGroup = { label:string; clubs:string[] };
export type ScoredTestProps = {
  testId:string; eyebrow:string; title:string; intro:string; backTo:TrainingBackRoute; historyTo:TrainingHistoryRoute; selfTo:TrainingTestRoute;
  options:ScoreOption[]; optionCols?:2|3; prompts?:Prompt[]; promptsFor?:(variantId:string)=>Prompt[]; variants?:TestVariant[]; variantLabel?:string;
  introCards?:{title:string;rows:{label:string;value:string}[];note?:string}[]; runningLabel?:string;
  clubGroups?:ClubGroup[]; liquidGlass?:boolean; hitMissColors?:boolean;
  analyze:(shots:number[],prompts:Prompt[],variant?:string)=>Analysis;
};
type Phase="intro"|"test"|"result";
type TrainingCategory="off-the-tee"|"approach"|"around-the-green"|"putting";
function categoryForTest(route:TrainingTestRoute):{id:TrainingCategory;label:string}{
  if(route==="/driver-konsekvens") return {id:"off-the-tee",label:"Off the Tee"};
  if(route==="/green-reading"||route==="/pga-tour-18-puttar") return {id:"putting",label:"Putting"};
  if(route==="/upp-och-in") return {id:"around-the-green",label:"Around the Green"};
  return {id:"approach",label:"Approach"};
}

export function ScoredTest(props:ScoredTestProps){
  useHideBottomNav(true);
  const[phase,setPhase]=useState<Phase>("intro");
  const[variant,setVariant]=useState<string|undefined>(props.variants?.[0]?.id);
  const[club,setClub]=useState<string|undefined>();
  const[shots,setShots]=useState<number[]>([]);
  const prompts:Prompt[]=props.promptsFor&&variant?props.promptsFor(variant):(props.prompts??[]);
  const total=prompts.length;
  const glass=props.liquidGlass?"border-white/60 bg-white/65 shadow-[0_14px_38px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl":"border-border bg-card";
  function start(){if(props.clubGroups&&!club)return;setShots([]);setPhase("test")}
  function register(value:number){const next=[...shots,value];setShots(next);if(next.length>=total){saveSession(props.testId,next,variant,club);setPhase("result")}}
  function undo(){setShots(s=>s.slice(0,-1))}

  if(phase==="intro")return <main style={LIGHT_SURFACE} className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-background px-5 pb-5 pt-4 text-foreground">
    <div className="flex shrink-0 items-center justify-between"><Link to={props.backTo} className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${glass}`}><ArrowLeft className="h-4 w-4"/></Link><Link to={props.historyTo} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs text-muted-foreground ${glass}`}><BarChart3 className="h-3.5 w-3.5"/> Progress</Link></div>
    <section className={`mt-5 rounded-[28px] border p-5 ${glass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{props.eyebrow}</p>
      <h1 className="mt-2 font-display text-4xl leading-none">{props.title}</h1>
      <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{props.intro}</p>
    </section>
    {props.variants?<div className="mt-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{props.variantLabel??"Välj variant"}</p><div className="mt-2 grid grid-cols-2 gap-2">{props.variants.map(v=><button key={v.id} type="button" onClick={()=>setVariant(v.id)} className={`rounded-2xl border p-3 text-left backdrop-blur-xl transition-all ${variant===v.id?"border-primary/45 bg-primary/12 shadow-sm":"border-white/60 bg-white/60"}`}><span className="block font-display text-2xl leading-none">{v.label}</span>{v.description?<span className="mt-1 block text-[11px] leading-snug text-muted-foreground">{v.description}</span>:null}</button>)}</div></div>:null}
    {props.clubGroups?<div className="mt-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Välj klubba</p><div className="mt-2 space-y-2">{props.clubGroups.map(group=><div key={group.label} className={`rounded-2xl border p-3 ${glass}`}><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{group.label}</p><div className="mt-2 flex flex-wrap gap-2">{group.clubs.map(item=><button key={item} type="button" onClick={()=>setClub(item)} className={`rounded-full border px-3 py-2 text-xs font-semibold transition-all ${club===item?"border-foreground bg-foreground text-background shadow-sm":"border-border/70 bg-white/55 text-foreground"}`}>{item}</button>)}</div></div>)}</div></div>:null}
    {props.introCards?.map(card=><div key={card.title} className={`mt-4 rounded-2xl border p-3.5 ${glass}`}><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{card.title}</p><div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">{card.rows.map(row=><div key={row.label} className="flex items-center justify-between border-b border-border/40 pb-1"><span className="text-muted-foreground">{row.label}</span><span className="font-semibold tabular-nums">{row.value}</span></div>)}</div>{card.note?<p className="mt-2 text-[11px] text-muted-foreground">{card.note}</p>:null}</div>)}
    <button onClick={start} disabled={Boolean(props.clubGroups&&!club)} className="mt-auto flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-35">Starta test <ArrowRight className="h-5 w-5"/></button>
  </main>;

  if(phase==="test"){
    const index=shots.length,prompt=prompts[index],running=shots.reduce((a,b)=>a+b,0);
    return <main style={LIGHT_SURFACE} className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-background px-5 pb-6 text-foreground">
      <div className="flex items-center justify-between pt-[max(1rem,env(safe-area-inset-top))]"><div><span className="text-sm font-semibold">Slag {index+1} av {total}</span>{club?<span className="ml-2 rounded-full border border-border bg-white/60 px-2 py-1 text-[10px] font-semibold text-muted-foreground backdrop-blur-xl">{club}</span>:null}</div><Link to={props.backTo} className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold text-muted-foreground ${glass}`}><X className="h-3.5 w-3.5"/> Avbryt</Link></div>
      <div className={`mt-3 rounded-2xl border p-3 ${glass}`}><div className="flex gap-1">{prompts.map((_,i)=><div key={i} className={`h-2 flex-1 rounded-full ${i<index?"bg-primary":i===index?"bg-primary/50":"bg-muted"}`}/>)}</div></div>
      <section className={`mt-3 flex h-[158px] flex-col items-center justify-center rounded-3xl border px-4 text-center ${glass}`}>{prompt?.tag?<p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{prompt.tag}</p>:null}<p className="mt-2 font-display text-4xl leading-none">{prompt?.primary}</p>{prompt?.secondary?<p className="mt-2 text-sm font-semibold text-primary">{prompt.secondary}</p>:null}</section>
      <div className={`mt-4 grid gap-3 ${props.optionCols===3?"grid-cols-3":"grid-cols-2"}`}>{props.options.map(option=>{
        const hit=props.hitMissColors&&option.value>0;
        const miss=props.hitMissColors&&option.value===0;
        const tone=hit?"border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-700 active:border-emerald-600 active:bg-emerald-500/30":miss?"border-red-500/25 bg-red-500/[0.08] text-red-600 active:border-red-600 active:bg-red-500/30":"border-border bg-card text-primary";
        return <button key={option.label} onClick={()=>register(option.value)} className={`flex h-[104px] flex-col items-center justify-center rounded-3xl border px-1 text-center shadow-[0_14px_28px_-24px_rgba(15,23,42,0.5)] backdrop-blur-xl transition-all active:scale-[0.97] ${tone}`}><span className="font-display text-2xl leading-none">{option.label}</span>{option.hint?<span className="mt-2 text-[11px] font-semibold opacity-70">{option.hint}</span>:null}</button>})}</div>
      <div className={`mt-3 flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${glass}`}><span className="text-muted-foreground">{props.runningLabel??"Hittills"}</span><span className="font-semibold tabular-nums">{running}</span></div>{index>0?<button onClick={undo} className="mt-3 self-center text-xs font-semibold text-muted-foreground">↶ Ändra föregående slag</button>:null}
    </main>;
  }

  const analysis=props.analyze(shots,prompts,variant);const category=categoryForTest(props.selfTo);
  return <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-16 pt-6 text-foreground">
    <header className="flex items-center justify-between"><div className="flex items-center gap-3"><Link to={props.backTo} className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${glass}`}><ArrowLeft className="h-4 w-4"/></Link><div><h1 className="text-lg font-semibold leading-tight">{props.title}</h1><p className="text-xs text-muted-foreground">Resultat{club?` · ${club}`:""}</p></div></div><Link to={props.historyTo} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold text-muted-foreground ${glass}`}><BarChart3 className="h-3.5 w-3.5"/> Progress</Link></header>
    <section className={`mt-5 rounded-3xl border p-6 text-center ${glass}`}><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{analysis.headline.label}</p><p className="mt-2 font-display text-6xl leading-none text-primary">{analysis.headline.value}</p>{analysis.headline.hint?<p className="mt-2 text-xs text-muted-foreground">{analysis.headline.hint}</p>:null}</section>
    {analysis.metrics.length?<section className="mt-3 grid grid-cols-2 gap-3">{analysis.metrics.map(m=><div key={m.label} className={`rounded-2xl border p-4 ${glass}`}><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{m.label}</p><p className="mt-1.5 font-display text-2xl leading-none">{m.value}</p>{m.hint?<p className="mt-1 text-[11px] text-muted-foreground">{m.hint}</p>:null}</div>)}</section>:null}
    <AnalysisSections sections={analysis.sections}/>
    <div className="mt-6 grid gap-3"><button onClick={()=>{setShots([]);setPhase("intro")}} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground"><RotateCcw className="h-4 w-4"/> Kör igen</button><Link to={props.historyTo} className={`flex w-full items-center justify-center gap-2 rounded-2xl border py-4 text-sm font-semibold ${glass}`}><BarChart3 className="h-4 w-4"/> Se progress</Link><Link to="/traning" search={{category:category.id}} className={`flex w-full items-center justify-center gap-2 rounded-2xl border py-4 text-sm font-semibold text-muted-foreground ${glass}`}><ArrowLeft className="h-4 w-4"/> Tillbaka till {category.label}</Link></div>
  </main>;
}

export function AnalysisSections({sections}:{sections:Analysis["sections"]}):ReactNode{return <>{sections.map(section=><section key={section.title} className="mt-3 rounded-2xl border border-border bg-card p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{section.title}</p><div className="mt-3 space-y-2.5">{section.rows.map(row=><div key={row.label}><div className="flex items-center justify-between text-[13px]"><span className="text-muted-foreground">{row.label}</span><span className="font-semibold tabular-nums">{row.value}</span></div>{typeof row.ratio==="number"?<div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:`${Math.max(0,Math.min(1,row.ratio))*100}%`}}/></div>:null}</div>)}</div>{section.note?<p className="mt-3 text-[11px] text-muted-foreground">{section.note}</p>:null}</section>)}</>}
