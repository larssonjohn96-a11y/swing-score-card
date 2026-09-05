import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { useMemo, useState } from "react";
import { loadSessions, saveSession } from "@/lib/training/core";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

export const Route = createFileRoute("/driver-konsekvens")({
  head: () => ({ meta: [{ title: "Driver med konsekvens | SG4" }] }),
  component: DriverConsistencyPage,
});

const HOLES = [
  { left: 0, hit: 1, right: 0 },
  { left: -1, hit: 1, right: 0 },
  { left: 0, hit: 1, right: -1 },
  { left: -1, hit: 1, right: -1 },
  { left: 0, hit: 1, right: 0 },
  { left: -2, hit: 1, right: 0 },
  { left: 0, hit: 1, right: -1 },
  { left: -1, hit: 1, right: -1 },
  { left: 0, hit: 2, right: 0 },
  { left: -1, hit: 1, right: 0 },
  { left: 0, hit: 1, right: -2 },
  { left: -1, hit: 1, right: -1 },
  { left: 0, hit: 2, right: 0 },
  { left: -2, hit: 2, right: 0 },
  { left: 0, hit: 2, right: -2 },
  { left: -1, hit: 2, right: -1 },
] as const;

function DriverConsistencyPage() {
  const [phase, setPhase] = useState<"intro" | "test" | "result">("intro");
  const [index, setIndex] = useState(0);
  const [shots, setShots] = useState<number[]>([]);
  useHideBottomNav(phase === "test");

  const current = HOLES[index];
  const total = useMemo(() => shots.reduce((a, b) => a + b, 0), [shots]);

  function start() { setIndex(0); setShots([]); setPhase("test"); }
  function register(value:number) {
    const next=[...shots,value];
    if(index===HOLES.length-1){ saveSession("driver-konsekvens",next); setShots(next); setPhase("result"); }
    else { setShots(next); setIndex((v)=>v+1); }
  }

  const previous=loadSessions("driver-konsekvens");
  const best=previous.length?Math.max(...previous.map(s=>s.total)):null;
  const fairways=shots.filter((v,i)=>v===HOLES[i]?.hit).length;

  if(phase==="intro") return <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-20 pt-8">
    <div className="flex items-center justify-between">
      <Link to="/traning" search={{category:"off-the-tee"}} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card" aria-label="Tillbaka"><ArrowLeft className="h-4 w-4"/></Link>
      <Link to="/driver-konsekvens-historik" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground"><BarChart3 className="h-3.5 w-3.5"/> Progress</Link>
    </div>
    <p className="mt-7 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Off the Tee · Träningstest</p>
    <h1 className="mt-2 font-display text-4xl leading-none">Driver med konsekvens</h1>
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">16 drives. Fairway är 30 meter bred. Varje hål har olika konsekvens för vänster- och högermiss, precis som på bana.</p>
    <div className="mt-6 rounded-3xl border border-border bg-card p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Så fungerar det</p>
      <div className="mt-3 space-y-2 text-sm"><p>• Slå 16 drivers på range eller bana.</p><p>• Välj Vänster miss, Fairway eller Höger miss.</p><p>• Poängen varierar per hål beroende på vilken sida som är farlig.</p><p>• Högre totalpoäng är bättre.</p></div>
      <p className="mt-4 rounded-2xl bg-tint/70 p-3 text-xs text-muted-foreground">Syfte: förstå både din träffprocent och åt vilket håll dina kostsamma missar kommer.</p>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-border bg-card p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Slag</p><p className="mt-1 font-display text-3xl">16</p></div><div className="rounded-2xl border border-border bg-card p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">PB</p><p className="mt-1 font-display text-3xl">{best??"–"}</p></div></div>
    <button onClick={start} className="mt-6 w-full rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">Starta test</button>
  </main>;

  if(phase==="test") return <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-8 pt-5">
    <div className="flex items-center justify-between"><button onClick={()=>index>0?(setIndex(index-1),setShots(shots.slice(0,-1))):setPhase("intro")} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card" aria-label="Tillbaka"><ArrowLeft className="h-4 w-4"/></button><span className="text-sm font-semibold">Hål {index+1} av 16</span><span className="w-10"/></div>
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:`${((index+1)/16)*100}%`}}/></div>
    <section className="mt-7 rounded-3xl border border-border bg-card p-6 text-center"><p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Fairway</p><p className="mt-2 font-display text-5xl">30 m</p><p className="mt-2 text-sm text-muted-foreground">Registrera var driven slutade</p></section>
    <div className="mt-5 grid grid-cols-3 gap-3">
      {[{label:"Vänster",value:current.left},{label:"Fairway",value:current.hit},{label:"Höger",value:current.right}].map(o=><button key={o.label} onClick={()=>register(o.value)} className={`rounded-2xl border p-5 text-center ${o.label==="Fairway"?"border-primary/30 bg-primary/[0.07]":"border-border bg-card"}`}><span className="block text-sm font-semibold">{o.label}</span><span className={`mt-3 block font-display text-4xl ${o.label==="Fairway"?"text-primary":o.value<0?"text-destructive":"text-foreground"}`}>{o.value>0?`+${o.value}`:o.value}</span><span className="mt-1 block text-[10px] text-muted-foreground">poäng</span></button>)}
    </div>
    <div className="mt-5 flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm"><span className="text-muted-foreground">Poäng hittills</span><strong>{total}</strong></div>
  </main>;

  const result=shots.reduce((a,b)=>a+b,0); const isPb=best===null||result>=best;
  return <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-7">
    <div className="flex items-center gap-3"><Link to="/traning" search={{category:"off-the-tee"}} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card" aria-label="Tillbaka"><ArrowLeft className="h-4 w-4"/></Link><div><h1 className="text-lg font-semibold">Driver med konsekvens</h1><p className="text-xs text-muted-foreground">Resultat</p></div></div>
    <section className={`mt-5 rounded-3xl border p-6 text-center ${isPb?"border-primary/30 bg-primary/[0.07]":"border-border bg-card"}`}><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Totalpoäng</p><p className="mt-2 font-display text-7xl leading-none">{result}</p>{isPb?<p className="mt-3 text-xs font-semibold text-primary">Personbästa</p>:<p className="mt-3 text-xs text-muted-foreground">PB {best}</p>}</section>
    <div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-border bg-card p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Fairways</p><p className="mt-1 font-display text-3xl">{fairways}/16</p></div><div className="rounded-2xl border border-border bg-card p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Träffprocent</p><p className="mt-1 font-display text-3xl">{Math.round((fairways/16)*100)}%</p></div></div>
    <Link to="/driver-konsekvens-historik" className="mt-4 flex w-full items-center justify-center rounded-2xl border border-border py-4 font-semibold">Se progress</Link><button onClick={start} className="mt-3 w-full rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">Kör igen</button>
  </main>;
}
