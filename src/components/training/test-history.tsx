import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, TrendingDown, TrendingUp, Minus, Trash2, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LIGHT_SURFACE } from "@/routes/8-bollar";
import { dateLabel, deleteSession, loadSessions, type AnalysisSection, type TrainingSession } from "@/lib/training/core";
import { AnalysisSections } from "@/components/training/scored-test";
import type { TrainingTestRoute } from "@/lib/training/routes";

export type TestHistoryProps = {
  testId: string; title: string; testTo: TrainingTestRoute; valueLabel: string; valueSuffix?: string;
  higherIsBetter: boolean; scaleHint?: string; variants?: { id: string; label: string }[];
  breakdown?: (sessions: TrainingSession[]) => AnalysisSection[];
};

function Kpi({ label, value, hint, highlight=false }: { label:string; value:string; hint?:string; highlight?:boolean }) {
  return <div className={`rounded-2xl border p-4 ${highlight ? "border-primary/30 bg-primary/[0.07]" : "border-border bg-card"}`}>
    <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${highlight ? "text-primary" : "text-muted-foreground"}`}>{label}</p>
    <p className={`mt-2 font-display text-3xl leading-none ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
    {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
  </div>;
}

export function TestHistory(props: TestHistoryProps) {
  const [all,setAll]=useState<TrainingSession[]>([]); const [showAll,setShowAll]=useState(false); const [variant,setVariant]=useState(props.variants?.[0]?.id??"");
  useEffect(()=>setAll(loadSessions(props.testId)),[props.testId]);
  const sessions=useMemo(()=>props.variants?all.filter(s=>(s.variant??props.variants?.[0]?.id)===variant):all,[all,variant,props.variants]);
  function remove(id:string){if(typeof window!=="undefined"&&!window.confirm("Vill du ta bort det här testet?"))return;setAll(deleteSession(props.testId,id));}
  const totals=sessions.map(s=>s.total), latest=sessions.at(-1)??null;
  const best=totals.length?(props.higherIsBetter?Math.max(...totals):Math.min(...totals)):0;
  const previous=sessions.length>1?sessions[sessions.length-2]:null;
  const delta=latest&&previous?latest.total-previous.total:null;
  const improved=delta!==null&&(props.higherIsBetter?delta>0:delta<0), worsened=delta!==null&&(props.higherIsBetter?delta<0:delta>0);
  const TrendIcon=improved?TrendingUp:worsened?TrendingDown:Minus;
  const average=totals.length?totals.reduce((a,b)=>a+b,0)/totals.length:0;
  const chartData=sessions.slice(-12).map(s=>({label:dateLabel(s.date),value:s.total}));
  const listed=(showAll?[...sessions].reverse():[...sessions].reverse().slice(0,5)); const suffix=props.valueSuffix?` ${props.valueSuffix}`:"";
  const isPb=!!latest&&latest.total===best;
  return <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-16 pt-6 text-foreground">
    <header className="flex items-center gap-3"><Link to={props.testTo} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"><ArrowLeft className="h-4 w-4"/></Link><div><h1 className="text-lg font-semibold leading-tight">{props.title}</h1><p className="text-xs text-muted-foreground">Progress · träningstest</p></div></header>
    {props.variants?<div className="mt-4 grid grid-cols-2 gap-2">{props.variants.map(v=><button key={v.id} type="button" onClick={()=>setVariant(v.id)} className={`rounded-2xl border py-2.5 text-sm font-semibold transition-colors ${variant===v.id?"border-primary bg-primary text-primary-foreground shadow-sm":"border-border bg-card text-muted-foreground"}`}>{v.label}</button>)}</div>:null}
    {!sessions.length?<section className="mt-8 rounded-3xl border border-dashed border-primary/30 bg-primary/[0.04] p-8 text-center"><p className="font-semibold">Ingen historik ännu</p><p className="mt-2 text-xs text-muted-foreground">Genomför ditt första test så börjar utvecklingen sparas här.</p><Link to={props.testTo} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 font-semibold text-primary-foreground">Gör ett test <ArrowRight className="h-4 w-4"/></Link></section>:<>
      <section className={`mt-5 rounded-3xl border p-5 ${isPb?"border-primary/35 bg-primary/[0.07]":"border-border bg-card"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Senaste</p><p className="mt-2 font-display text-6xl leading-none text-foreground">{latest?.total??0}{props.valueSuffix?<span className="ml-2 text-base text-muted-foreground">{props.valueSuffix}</span>:null}</p></div>{isPb?<span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"><Trophy className="h-3.5 w-3.5"/> PB</span>:null}</div><div className="mt-3 flex items-center gap-2 text-xs"><span className="text-muted-foreground">{props.valueLabel}{props.scaleHint?` · ${props.scaleHint}`:""}</span>{delta!==null?<span className={`ml-auto inline-flex items-center gap-1 font-semibold ${improved?"text-primary":worsened?"text-destructive":"text-muted-foreground"}`}><TrendIcon className="h-4 w-4"/>{delta===0?"Oförändrat":`${Math.abs(delta).toFixed(1).replace(".0","")}${suffix} mot förra`}</span>:null}</div></section>
      <section className="mt-3 grid grid-cols-2 gap-3"><Kpi label="Personbästa" value={`${best}${suffix}`} highlight/><Kpi label="Trend" value={delta===null?"–":improved?"↑ Bättre":worsened?"↓ Sämre":"→ Stabil"} hint={delta===null?"Gör ett test till":"Jämfört med föregående"}/><Kpi label="Snitt" value={average.toFixed(1)} /><Kpi label="Tester" value={String(sessions.length)} /></section>
      <section className="mt-3 rounded-3xl border border-primary/15 bg-card p-4"><div className="flex items-end justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Utveckling</p><p className="mt-1 text-xs text-muted-foreground">{props.higherIsBetter?"Högre är bättre":"Lägre är bättre"}</p></div><span className="text-xs text-muted-foreground">Senaste {chartData.length}</span></div><div className="mt-3 h-48 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{top:8,right:12,bottom:4,left:4}}><defs><linearGradient id={`fill-${props.testId}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22}/><stop offset="100%" stopColor="var(--primary)" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11}/><YAxis width={34} tickLine={false} axisLine={false} fontSize={11}/><Tooltip contentStyle={{borderRadius:12,fontSize:12,border:"1px solid var(--border)"}} formatter={(value:number)=>[`${value}${suffix}`,props.valueLabel]}/><Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={3} fill={`url(#fill-${props.testId})`} dot={{r:3,fill:"var(--primary)",stroke:"var(--card)",strokeWidth:2}} activeDot={{r:5}}/></AreaChart></ResponsiveContainer></div></section>
      {props.breakdown?<AnalysisSections sections={props.breakdown(sessions)}/>:null}
      <section className="mt-3 rounded-3xl border border-border bg-card p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Historik</p><ul className="mt-3 divide-y divide-border">{listed.map(s=><li key={s.id} className="flex items-center justify-between py-3"><span className="text-sm text-muted-foreground">{dateLabel(s.date)}</span><span className="flex items-center gap-3"><span className={`font-semibold tabular-nums ${s.total===best?"text-primary":""}`}>{s.total}{suffix}</span><button onClick={()=>remove(s.id)} aria-label="Ta bort test" className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground active:bg-muted"><Trash2 className="h-4 w-4"/></button></span></li>)}</ul>{sessions.length>5?<button onClick={()=>setShowAll(v=>!v)} className="mt-3 w-full rounded-xl border border-border py-2.5 text-xs font-semibold text-muted-foreground">{showAll?"Visa färre":`Visa fler (${sessions.length-5})`}</button>:null}</section>
      <Link to={props.testTo} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground shadow-sm">Kör testet igen <ArrowRight className="h-4 w-4"/></Link>
    </>}
  </main>;
}
