import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { ChartCard } from "@/components/chart-card";
import { HeatmapCard, HistoryPanel } from "@/components/progress-dashboard";
import { ApproachDeepAnalysis } from "@/components/approach-deep-analysis";
import { PremiumLockLine } from "@/components/premium-lock";
import { useSubscription } from "@/lib/subscription";
import { CATEGORY_LABELS, computeCategoryDetail, hcpLabel, ratingFromHandicap, type CategoryDetail, type CategorySlug, type HcpTimelinePoint } from "@/lib/sg-handicap";
import { computeStableCategoryHandicaps, computeStableCategoryHcpTimeline } from "@/lib/category-index";

const VALID_SLUGS=Object.keys(CATEGORY_LABELS) as CategorySlug[];
const CATEGORY_INTRO:Record<CategorySlug,string>={approach:"Inspel mot green – precision, avståndskontroll och bollflykt.",driving:"Prestation från tee – precision, konsekvens och fart.","around-the-green":"Scoring runt green – närspel, bunker och slagvariation.",puttning:"Hela din puttingprofil – kortputt, längdkontroll, startlinje och greenläsning.",speed:"Din bollhastighet och kraftöverföring med driver."};
type HubItem={title:string;subtitle:string;to:string};
const TRAINING:Record<CategorySlug,HubItem[]>={
 driving:[{title:"Driver med konsekvens",subtitle:"Precision & konsekvens · 16 drives",to:"/driver-konsekvens-historik"}],
 approach:[{title:"PEI Precision",subtitle:"Approachprecision",to:"/approach-pei-historik"},{title:"Wedgestege",subtitle:"Avståndskontroll 40–90 m",to:"/wedge-stege-historik"},{title:"9 Window Drill",subtitle:"Höjd × bollkurva",to:"/shot-shaping-9-window-historik"},{title:"Constant Shot Shape",subtitle:"Repeterbar draw eller fade",to:"/shot-shaping-konstant-historik"},{title:"Alternating Shot Shape",subtitle:"Växla draw och fade",to:"/shot-shaping-vaxlande-historik"}],
 "around-the-green":[{title:"8-bollsövningen",subtitle:"Chip, pitch, lobb & bunker",to:"/8-bollar-historik"},{title:"Up & Down Challenge",subtitle:"Scoring från 10 lägen",to:"/upp-och-in-historik"}],
 puttning:[{title:"Tutor",subtitle:"Startlinje",to:"/tutor-test-historik"},{title:"Green Reading",subtitle:"Greenläsning",to:"/green-reading-historik"},{title:"Lag putt",subtitle:"Längdkontroll",to:"/lagputt-historik"},{title:"25-bollsövningen",subtitle:"Kortputt & hole-out",to:"/50-bollar-resultat"},{title:"PGA Tour – 18 Puttar",subtitle:"Total putting-performance",to:"/pga-tour-18-puttar-historik"}],
 speed:[]
};
const HCP_TEST_LINK:Record<CategorySlug,{to:string;label:string}>={driving:{to:"/kategori/driving",label:"Off the Tee HCP-test"},approach:{to:"/kategori/approach",label:"Approach HCP-test"},"around-the-green":{to:"/kategori/around-the-green",label:"Around the Green HCP-test"},puttning:{to:"/kategori/puttning",label:"Putting HCP-test"},speed:{to:"/speed-test",label:"Speed Test"}};

export const Route=createFileRoute("/utveckling/$slug")({loader:({params})=>{if(!VALID_SLUGS.includes(params.slug as CategorySlug))throw notFound();return{slug:params.slug as CategorySlug}},head:({loaderData})=>({meta:[{title:loaderData?`${CATEGORY_LABELS[loaderData.slug]} – Analys | SG4`:"Kategorin hittades inte"}]}),notFoundComponent:()=> <main className="mx-auto max-w-md px-5 pt-16"><h1 className="font-display text-4xl">Kategorin finns inte</h1></main>,component:CategoryDetailPage});

function RowLink({item}:{item:HubItem}){return <Link to={item.to} className="flex min-h-[66px] items-center gap-3 px-4 py-3 active:bg-tint"><div className="min-w-0 flex-1"><p className="text-[15px] font-semibold">{item.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.subtitle}</p></div><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground"/></Link>}

function CategoryDetailPage(){
 const{slug}=Route.useLoaderData() as{slug:CategorySlug};const[detail,setDetail]=useState<CategoryDetail|null>(null);const[hcpTimeline,setHcpTimeline]=useState<HcpTimelinePoint[]>([]);const{canViewFullHistory}=useSubscription();
 useEffect(()=>{const raw=computeCategoryDetail(slug);const stable=computeStableCategoryHandicaps().find(c=>c.slug===slug);setDetail({...raw,handicap:stable?.handicap,trend:stable?.trend,score:stable?.handicap!==undefined?ratingFromHandicap(stable.handicap):raw.score});setHcpTimeline(computeStableCategoryHcpTimeline(slug,null))},[slug]);
 if(!detail)return null;const chart=hcpTimeline.filter(p=>p.rolling!==undefined);const vals=chart.map(p=>p.rolling??0);const domain:[number,number]=vals.length?[Math.floor(Math.min(...vals)-2),Math.ceil(Math.max(...vals)+2)]:[-5,30];const training=TRAINING[slug];const hcpTest=HCP_TEST_LINK[slug];
 return <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-7">
  <Link to="/utveckling" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"><ArrowLeft className="h-4 w-4"/></Link>
  <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Kategoriöversikt</p><h1 className="mt-1 font-display text-4xl leading-none">{detail.title}</h1><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{CATEGORY_INTRO[slug]}</p>
  <section className="mt-5 rounded-3xl border border-primary/20 bg-card p-5 shadow-[var(--shadow-glow)]"><div className="flex items-end justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Kategori-HCP</p><p className="mt-1 font-display text-6xl leading-none text-primary">{detail.handicap!==undefined?hcpLabel(detail.handicap):"–"}</p></div><div className="text-right"><p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Trend</p><p className={`mt-1 font-display text-2xl ${detail.trend!==undefined&&detail.trend<0?"text-primary":detail.trend!==undefined&&detail.trend>0?"text-destructive":""}`}>{detail.trend!==undefined?hcpLabel(detail.trend):"–"}</p></div></div></section>

  {slug==="approach"&&<div className="mt-5"><ApproachDeepAnalysis/></div>}
  {detail.keyMetrics.length>0&&slug!=="approach"&&<section className="mt-6"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Vad består din {detail.title.toLowerCase()} av?</p><div className="mt-3 grid grid-cols-2 gap-2">{detail.keyMetrics.map(m=><div key={m.label} className="rounded-2xl border border-border bg-card p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{m.label}</p><p className="mt-1 font-display text-2xl">{m.value}</p></div>)}</div></section>}

  {detail.heatmap.length>0&&slug!=="approach"&&<section className="mt-6"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Detaljer</p><div className="mt-3"><HeatmapCard title={slug==="puttning"?"Putting per avstånd":"Prestation per avstånd"} zones={detail.heatmap} unit={slug==="puttning"?"%":""}/></div></section>}

  <section className="mt-7"><div className="flex items-end justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Tester</p><h2 className="mt-1 text-2xl font-semibold">Mät kategorin</h2></div></div><div className="mt-3 overflow-hidden rounded-3xl border border-border bg-card"><Link to={hcpTest.to} className="flex min-h-[68px] items-center gap-3 px-4 py-3"><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">HCP-grundande</p><p className="mt-0.5 text-[15px] font-semibold">{hcpTest.label}</p><p className="text-xs text-muted-foreground">Påverkar ditt stabiliserade kategori-HCP</p></div><ChevronRight className="h-4 w-4 text-muted-foreground"/></Link></div></section>

  {training.length>0&&<section className="mt-6"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Träningstester</p><h2 className="mt-1 text-2xl font-semibold">Fördjupa {detail.title}</h2><p className="mt-1 text-sm text-muted-foreground">Varje test isolerar en specifik färdighet. Öppna för progress och historik.</p><div className="mt-3 divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card">{training.map(item=><RowLink key={item.to} item={item}/>)}</div></section>}

  <section className="mt-7"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Kategoriutveckling</p><ChartCard title={`${detail.title} HCP över tid`}>{chart.length<2?<p className="py-10 text-center text-sm text-muted-foreground">Kör minst två HCP-test för att se utvecklingen.</p>:<div className="h-56 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={canViewFullHistory?chart:chart.slice(-3)} margin={{top:10,right:10,bottom:0,left:-20}}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/><XAxis dataKey="date" tick={{fontSize:10}} stroke="var(--muted-foreground)"/><YAxis domain={domain} reversed tick={{fontSize:10}} stroke="var(--muted-foreground)"/><Tooltip formatter={(v:number)=>[hcpLabel(v),"Kategori-HCP"]}/><Line type="monotone" dataKey="rolling" stroke="var(--primary)" strokeWidth={3} dot={{r:3}}/></LineChart></ResponsiveContainer></div>}</ChartCard>{!canViewFullHistory&&chart.length>3&&<PremiumLockLine label={`Se alla ${chart.length} tester`}/>}</section>
  <HistoryPanel entries={detail.history} limit={canViewFullHistory?undefined:5}/>
 </main>
}
