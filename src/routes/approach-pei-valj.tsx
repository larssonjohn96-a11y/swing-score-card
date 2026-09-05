import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BarChart3, Crosshair, Target } from "lucide-react";

export const Route = createFileRoute("/approach-pei-valj")({ head: () => ({ meta: [{ title: "Approach Precision – Träningstest | SG4" }] }), component: PeiChoosePage });

const TESTS = [
  { to: "/approach-pei-wedge" as const, title: "Wedge Precision", range: "50–120 m", method: "PEI Wedge", description: "Mät hur nära målet du slår dina wedges över varierade avstånd." },
  { to: "/approach-pei-iron" as const, title: "Iron Precision", range: "120–190 m", method: "PEI Iron", description: "Mät precisionen på dina järninspel över varierade avstånd." },
  { to: "/approach-pei" as const, title: "Approach Precision", range: "50–220 m", method: "PEI Total", description: "Komplett precisionstest över hela ditt approachspel – från wedge till långa inspel." },
];

function PeiChoosePage() { return <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-8">
  <div className="flex items-center justify-between"><Link to="/traning" search={{category:"approach"}} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground"><ArrowLeft className="h-4 w-4" /></Link><span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Ej HCP-grundande</span></div>
  <p className="mt-7 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Approach · Precision</p><h1 className="mt-1 text-5xl leading-none">Approach Precision</h1><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Välj den del av inspelet du vill mäta. Alla tre bygger på PEI-metoden, där lägre resultat är bättre.</p>
  <div className="mt-7 space-y-3">{TESTS.map((test,index)=><Link key={test.to} to={test.to} className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-glow)] transition-colors hover:border-primary"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/[0.07] text-primary">{index===2?<Target className="h-5 w-5"/>:<Crosshair className="h-5 w-5"/>}</span><span className="min-w-0 flex-1"><span className="flex items-baseline justify-between gap-2"><span className="text-2xl leading-none">{test.title}</span><span className="shrink-0 text-xs font-semibold text-primary">{test.range}</span></span><span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{test.method}</span><span className="mt-2 block text-xs leading-relaxed text-muted-foreground">{test.description}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground"/></Link>)}</div>
  <Link to="/approach-pei-historik" className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-4 text-sm font-semibold"><BarChart3 className="h-4 w-4"/> Approach Precision – progress</Link>
</main> }
