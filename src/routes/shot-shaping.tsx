import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BarChart3, Grid3x3, Repeat, Shuffle } from "lucide-react";
import { LIGHT_SURFACE } from "./8-bollar";

export const Route = createFileRoute("/shot-shaping")({
  head: () => ({
    meta: [
      { title: "Shot Shaping – Träningstester | SG4" },
      { name: "description", content: "Tre träningstester för bollkontroll: växlande draw/fade, 9 Window Drill och konstant shape." },
    ],
  }),
  component: ShotShapingFamily,
});

const TESTS = [
  { to: "/shot-shaping-vaxlande" as const, title: "Växlande shape", meta: "10 slag · draw / fade varannat", description: "Byt bollform på begäran, slag efter slag.", icon: Shuffle },
  { to: "/shot-shaping-9-window" as const, title: "9 Window Drill", meta: "9 slag · höjd + shape", description: "Kontrollera både höjd och bollform i nio fönster.", icon: Grid3x3 },
  { to: "/shot-shaping-konstant" as const, title: "Konstant shape", meta: "10 slag · draw eller fade", description: "Mät hur repeterbar din valda bollform är.", icon: Repeat },
];

function ShotShapingFamily() {
  const glass = "border-slate-200/90 bg-white/72 shadow-[0_18px_48px_-34px_rgba(15,23,42,0.38)] backdrop-blur-2xl";
  const testGlass = "border-slate-200/95 bg-gradient-to-br from-slate-50/90 via-white/76 to-blue-50/55 shadow-[0_18px_44px_-32px_rgba(15,23,42,0.34)] backdrop-blur-2xl";

  return (
    <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-24 pt-6 text-foreground">
      <div className="flex items-center justify-between">
        <Link to="/traning" search={{ category: undefined }} className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${glass}`}><ArrowLeft className="h-4 w-4" /></Link>
        <Link to="/shot-shaping-vaxlande-historik" className="inline-flex items-center gap-2 rounded-full border border-slate-400/70 bg-slate-200/75 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-[0_12px_30px_-24px_rgba(15,23,42,.45)] backdrop-blur-xl"><BarChart3 className="h-4 w-4 text-slate-700" />Analys & framsteg</Link>
      </div>

      <section className="mt-5 overflow-hidden rounded-[30px] border border-slate-300/80 bg-white/82 p-5 shadow-[0_20px_48px_-32px_rgba(15,23,42,0.42)] backdrop-blur-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Träningstester</p>
        <h1 className="mt-2 font-display text-4xl leading-none">Shot Shaping</h1>
        <p className="mt-3 max-w-[30ch] text-[13px] leading-relaxed text-slate-600">Träna kontroll över bollens form och höjd. Välj test och följ din utveckling.</p>
      </section>

      <div className="mt-5 mb-2 flex items-center justify-between">
        <h2 className="font-display text-2xl leading-none">Tester</h2>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">3 tester</span>
      </div>

      <div className="space-y-3">
        {TESTS.map(({ to, title, meta, description, icon: Icon }) => (
          <Link key={to} to={to} className={`group flex items-center gap-4 rounded-3xl border p-4 transition-all active:scale-[0.99] ${testGlass}`}>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-200/80 bg-blue-500/[0.09] text-blue-600 shadow-[0_10px_24px_-18px_rgba(37,99,235,.55)]"><Icon className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block font-display text-2xl leading-none">{title}</span><span className="mt-1.5 block text-xs leading-relaxed text-slate-600">{description}</span><span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-600">{meta}</span></span>
            <ArrowRight className="h-4 w-4 shrink-0 text-blue-500 transition-transform group-active:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </main>
  );
}
