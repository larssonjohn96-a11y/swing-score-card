import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Dumbbell, Target, Trophy } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/traning")({
  head: () => ({ meta: [{ title: "Träningstester | SG4" }, { name: "description", content: "Färdigbyggda träningstester för putting, around the green, approach och off the tee. Följ din utveckling utan att påverka SG4 HCP." }] }),
  component: TrainingTestsPage,
});
type Category = "putting" | "around-the-green" | "approach" | "off-the-tee";
const CATEGORIES:Array<{id:Category;title:string;description:string;count:number}>=[
  {id:"putting",title:"Putting",description:"Puttning, startlinje och längdkontroll",count:2},
  {id:"around-the-green",title:"Around the Green",description:"Chip, pitch, lobb och bunker",count:1},
  {id:"approach",title:"Approach",description:"Wedges, järn och range targets",count:1},
  {id:"off-the-tee",title:"Off the Tee",description:"Driver, precision och shot shaping",count:0},
];

type TestRoute="/lagputt-test"|"/50-bollar"|"/8-bollar"|"/approach-pei-valj";
function TestCard({to,title,description,meta}:{to:TestRoute;title:string;description:string;meta:string}){
  return <Link to={to} className="flex w-full items-center gap-4 rounded-3xl border border-border bg-card p-4 text-left shadow-[var(--shadow-glow)] transition-colors hover:border-primary"><Icon/><Body title={title} description={description} meta={meta}/><ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground"/></Link>;
}
function Icon(){return <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Trophy className="h-5 w-5"/></span>}
function Body({title,description,meta}:{title:string;description:string;meta:string}){return <span className="min-w-0 flex-1"><span className="block font-display text-2xl leading-none">{title}</span><span className="mt-1 block text-xs leading-snug text-muted-foreground">{description}</span><span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{meta}</span></span>}

function TrainingTestsPage(){const[category,setCategory]=useState<Category|null>(null);return <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-10"><header><p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Träningstester</p><h1 className="mt-2 flex items-center gap-2 font-display text-4xl leading-none"><Dumbbell className="h-7 w-7 text-primary"/>Träna & följ progress</h1><p className="mt-3 text-sm text-muted-foreground">Färdigbyggda tester för sådant golfare redan tränar på. De påverkar inte ditt SG4 HCP.</p></header>
{!category?<section className="mt-7"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Vad vill du träna?</p><div className="mt-3 space-y-3">{CATEGORIES.map(item=><button key={item.id} type="button" onClick={()=>setCategory(item.id)} className="flex w-full items-center gap-4 rounded-3xl border border-border bg-card p-4 text-left shadow-[var(--shadow-glow)] transition-colors hover:border-primary"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Target className="h-5 w-5"/></span><span className="min-w-0 flex-1"><span className="block font-display text-2xl leading-none">{item.title}</span><span className="mt-1 block text-xs text-muted-foreground">{item.description}</span><span className={`mt-2 block text-[10px] font-semibold uppercase tracking-[0.16em] ${item.count?"text-primary":"text-muted-foreground"}`}>{item.count?`${item.count} ${item.count===1?"färdigt test":"färdiga tester"}`:"Fler test kommer"}</span></span><ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground"/></button>)}</div></section>:
<section className="mt-7"><button type="button" onClick={()=>setCategory(null)} className="flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft className="h-3.5 w-3.5"/> Kategorier</button><p className="mt-5 text-xs uppercase tracking-[0.2em] text-primary">{CATEGORIES.find(item=>item.id===category)?.title}</p><h2 className="mt-1 font-display text-3xl leading-none">Träningstester</h2>
{category==="putting"?<div className="mt-4 space-y-3"><TestCard to="/lagputt-test" title="Lag Putt" description="Träna längdkontroll på långa puttar från 8 till 18 meter. Resultatet sparas så att du kan följa utvecklingen." meta="6 puttar · 8–18 meter"/><TestCard to="/50-bollar" title="50-bollsövningen" description="50 puttar från 1 till 5 meter. Räkna varje slag tills alla bollar är hålade och försök slå ditt personbästa." meta="50 bollar · par 72 · PB"/></div>:
category==="around-the-green"?<div className="mt-4 space-y-3"><TestCard to="/kategori/$slug" title="8-bollsövningen" description="Chip, pitch, lobb och bunker från åtta stationer. Fem varv." meta="40 slag · max 160 poäng"/></div>:
category==="approach"?<div className="mt-4 space-y-3"><TestCard to="/approach-pei-valj" title="PEI Precision" description="Mät din precision och följ utvecklingen inom wedge, järn eller hela approachspelet." meta="Wedge · järn · total · score & progress"/></div>:
<div className="mt-4 rounded-3xl border border-dashed border-border p-6 text-center"><Target className="mx-auto h-7 w-7 text-muted-foreground"/><p className="mt-3 text-sm font-semibold">Färdiga tester kommer här</p><p className="mt-1 text-xs text-muted-foreground">Vi bygger de vanligaste etablerade testerna först, istället för att kräva att du sätter upp dem själv.</p></div>}</section>}
<div className="mt-10 border-t border-border pt-5"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Behöver du något eget?</p><p className="mt-1 text-xs text-muted-foreground">Bygg eget test finns kvar som ett sekundärt verktyg och byggs vidare när de viktigaste färdigtesterna är på plats.</p></div><Link to="/tester" className="mt-6 inline-block rounded-full border border-border px-4 py-2 text-sm text-muted-foreground">Tillbaka till tester</Link></main>}
