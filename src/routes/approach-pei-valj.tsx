import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BarChart3, Crosshair, Target } from "lucide-react";
import { LIGHT_SURFACE } from "./8-bollar";

export const Route = createFileRoute("/approach-pei-valj")({
  head: () => ({ meta: [{ title: "Approach Precision – Träningstest | SG4" }] }),
  component: PeiChoosePage,
});

const TESTS = [
  {
    to: "/approach-pei-wedge" as const,
    title: "Wedge Precision",
    range: "50–120 m",
    method: "PEI Wedge",
    description: "Mät hur nära målet du slår dina wedges över varierade avstånd.",
  },
  {
    to: "/approach-pei-iron" as const,
    title: "Iron Precision",
    range: "120–190 m",
    method: "PEI Iron",
    description: "Mät precisionen på dina järninspel över varierade avstånd.",
  },
  {
    to: "/approach-pei" as const,
    title: "Approach Precision",
    range: "50–220 m",
    method: "PEI Total",
    description: "Komplett precisionstest över hela ditt approachspel – från wedge till långa inspel.",
  },
];

function PeiChoosePage() {
  const glass = "border-slate-200/90 bg-white/72 shadow-[0_18px_48px_-34px_rgba(15,23,42,.38)] backdrop-blur-2xl";
  const introGlass = "border-slate-300/80 bg-white/82 shadow-[0_20px_48px_-32px_rgba(15,23,42,.42)] backdrop-blur-2xl";
  const testGlass = "border-slate-200/95 bg-gradient-to-br from-slate-50/90 via-white/76 to-blue-50/55 shadow-[0_18px_44px_-32px_rgba(15,23,42,.34)] backdrop-blur-2xl";

  return (
    <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-20 pt-6 text-foreground">
      <div className="flex items-center justify-between">
        <Link
          to="/traning"
          search={{ category: "approach" }}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${glass}`}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Link to="/approach-pei-historik" className="inline-flex items-center gap-2 rounded-full border border-slate-400/70 bg-slate-200/75 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-[0_12px_30px_-24px_rgba(15,23,42,.45)] backdrop-blur-xl">
          <BarChart3 className="h-4 w-4 text-slate-700" />
          Analys & framsteg
        </Link>
      </div>

      <section className={`mt-5 rounded-[30px] border p-5 ${introGlass}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Approach · Precision</p>
        <h1 className="mt-2 font-display text-4xl leading-none">Approach Precision</h1>
        <p className="mt-3 max-w-[32ch] text-[13px] leading-relaxed text-slate-600">
          Välj den del av inspelet du vill mäta. Alla tre bygger på PEI-metoden, där lägre resultat är bättre.
        </p>
      </section>

      <div className="mb-2 mt-5 flex items-center justify-between">
        <h2 className="font-display text-2xl leading-none">Tester</h2>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">3 tester</span>
      </div>

      <div className="space-y-3">
        {TESTS.map((test, index) => (
          <Link
            key={test.to}
            to={test.to}
            className={`group flex items-center gap-4 rounded-3xl border p-4 transition-all active:scale-[0.99] ${testGlass}`}
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-200/80 bg-blue-500/[0.09] text-blue-600 shadow-[0_10px_24px_-18px_rgba(37,99,235,.55)]">
              {index === 2 ? <Target className="h-5 w-5" /> : <Crosshair className="h-5 w-5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-display text-2xl leading-none">{test.title}</span>
                <span className="shrink-0 text-[11px] font-bold text-blue-600">{test.range}</span>
              </span>
              <span className="mt-1.5 block text-xs leading-relaxed text-slate-600">{test.description}</span>
              <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-600">{test.method}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-blue-500 transition-transform group-active:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </main>
  );
}
