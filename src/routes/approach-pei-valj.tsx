import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BarChart3, Crosshair, Target } from "lucide-react";

export const Route = createFileRoute("/approach-pei-valj")({
  head: () => ({ meta: [{ title: "PEI Precision – Approach | SG4" }] }),
  component: PeiChoosePage,
});

const TESTS = [
  { to: "/approach-pei" as const, title: "Total PEI", range: "50–220 m", description: "Originalets standardiserade 18 målavstånd. Benchmark för hela approachspelet." },
  { to: "/approach-pei-wedge" as const, title: "Wedge PEI", range: "50–120 m", description: "18 varierade wedgeavstånd för fokuserad precisionsträning." },
  { to: "/approach-pei-iron" as const, title: "Iron PEI", range: "120–190 m", description: "18 varierade järnavstånd för fokuserad precisionsträning." },
];

function PeiChoosePage() {
  return <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-8">
    <div className="flex items-center justify-between">
      <Link to="/traning" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground"><ArrowLeft className="h-4 w-4" /></Link>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Ej HCP-grundande</span>
    </div>
    <p className="mt-7 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Approach · Träningstest</p>
    <h1 className="mt-1 text-5xl leading-none">PEI Precision</h1>
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Välj hela approachspelet eller fokusera dagens 18 slag på wedge eller järn. Lägre PEI är bättre.</p>
    <div className="mt-7 space-y-3">{TESTS.map((test, index) => <Link key={test.to} to={test.to} className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-glow)] transition-colors hover:border-primary">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">{index === 0 ? <Target className="h-5 w-5" /> : <Crosshair className="h-5 w-5" />}</span>
      <span className="min-w-0 flex-1"><span className="flex items-baseline justify-between gap-2"><span className="text-2xl leading-none">{test.title}</span><span className="shrink-0 text-xs font-semibold text-muted-foreground">{test.range}</span></span><span className="mt-2 block text-xs leading-relaxed text-muted-foreground">{test.description}</span></span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>)}</div>
    <Link to="/approach-pei-historik" className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-4 text-sm font-semibold"><BarChart3 className="h-4 w-4" /> Total PEI-historik</Link>
  </main>;
}
