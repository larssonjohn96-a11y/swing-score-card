import { Link, createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Dumbbell, Target, Trophy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { COACHES } from "@/lib/coach-putting";
import { LIGHT_SURFACE } from "./8-bollar";

export const Route = createFileRoute("/tester")({
  head: () => ({
    meta: [
      { title: "Train & Test – SG4" },
      { name: "description", content: "Träna med coach, gör handicaptest och följ dina benchmarks i SG4." },
      { property: "og:title", content: "Train & Test – SG4" },
      { property: "og:description", content: "Practice Mode, Handicap Test och benchmarks samlat i ett flöde." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrainAndTestPage,
});

type PracticeCategory = "putting" | "around-the-green" | "bunker";
type SectionId = "practice" | "hcp" | "benchmark";

const PRACTICE_CATEGORIES: Array<{
  id: PracticeCategory;
  eyebrow: string;
  title: string;
  detail: string;
}> = [
  { id: "putting", eyebrow: "Putting", title: "Puttning", detail: "Startlinje · fart · press" },
  { id: "around-the-green", eyebrow: "Short game", title: "Chippning", detail: "Avstånd · lie · precision" },
  { id: "bunker", eyebrow: "Sand", title: "Bunker", detail: "Avstånd · kontroll · scoring" },
];

const BENCHMARKS = [
  { to: "/pga-tour-18-puttar" as const, eyebrow: "Putting", title: "18 puttar", detail: "PGA Tour-inspirerat benchmark" },
  { to: "/driver-konsekvens" as const, eyebrow: "Driver", title: "Konsekvens", detail: "Spridning och kontroll från tee" },
  { to: "/approach-pei-valj" as const, eyebrow: "Approach", title: "PEI Approach", detail: "Precision för wedge och järn" },
  { to: "/tutor-test" as const, eyebrow: "Putting", title: "Tutor Test", detail: "Startlinje och kontroll" },
];

function TrainAndTestPage() {
  const [compactHeader, setCompactHeader] = useState(false);
  const practiceRef = useRef<HTMLElement>(null);
  const hcpRef = useRef<HTMLElement>(null);
  const benchmarkRef = useRef<HTMLElement>(null);
  const alma = COACHES.find((coach) => coach.id === "alma") ?? COACHES[0];

  useEffect(() => {
    const onScroll = () => setCompactHeader(window.scrollY > 72);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const jumpTo = (section: SectionId) => {
    const target = section === "practice" ? practiceRef.current : section === "hcp" ? hcpRef.current : benchmarkRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background pb-28 text-foreground">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/86 px-5 pt-[max(12px,env(safe-area-inset-top))] shadow-[0_10px_30px_-28px_rgba(15,23,42,.7)] backdrop-blur-2xl">
        <div className="flex h-12 items-center justify-between">
          <Link
            to="/"
            aria-label="Tillbaka till hem"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300/80 bg-white/72 shadow-sm active:scale-[.96]"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>

          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-slate-500">SG4</p>
            <p className="font-display text-[22px] leading-none text-slate-950">Train &amp; Test</p>
          </div>

          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300/80 bg-white/72 text-slate-600">
            <Dumbbell className="h-[18px] w-[18px]" />
          </span>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ${compactHeader ? "max-h-0 translate-y-[-6px] opacity-0" : "max-h-20 translate-y-0 opacity-100"}`}
        >
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-3 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button type="button" onClick={() => jumpTo("practice")} className="shrink-0 rounded-full border border-slate-300/90 bg-white/80 px-4 py-2.5 text-xs font-bold text-slate-800 active:scale-[.97]">
              Practice
            </button>
            <button type="button" onClick={() => jumpTo("hcp")} className="shrink-0 rounded-full border border-slate-300/90 bg-white/80 px-4 py-2.5 text-xs font-bold text-slate-800 active:scale-[.97]">
              HCP Test
            </button>
            <button type="button" onClick={() => jumpTo("benchmark")} className="shrink-0 rounded-full border border-slate-300/90 bg-white/80 px-4 py-2.5 text-xs font-bold text-slate-800 active:scale-[.97]">
              Benchmarks
            </button>
          </div>
        </div>
      </header>

      <div className="px-5 pt-5">
        <section className="relative overflow-hidden rounded-[30px] border border-sky-200/80 bg-gradient-to-br from-sky-100 via-white to-blue-100/75 p-5 shadow-[0_24px_54px_-34px_rgba(37,99,235,.45)]">
          <div className="pointer-events-none absolute -right-9 -top-8 h-40 w-40 rounded-full bg-blue-300/20 blur-2xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[.19em] text-blue-600">Practice Mode</p>
              <h1 className="mt-2 font-display text-[37px] leading-[.98] text-slate-950">Träna med coach</h1>
              <p className="mt-3 max-w-[27ch] text-[13px] leading-relaxed text-slate-600">Välj område och låt coachen styra nästa slag, avstånd och fokus.</p>
            </div>
            <div className="flex h-20 w-20 shrink-0 items-center justify-center text-[54px] leading-none">{alma.emoji}</div>
          </div>

          <div className="relative mt-5 grid grid-cols-[1fr_auto] gap-2.5">
            <Link
              to="/coach"
              className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 font-display text-lg text-white shadow-sm active:scale-[.99]"
            >
              Starta Practice <ChevronRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => jumpTo("hcp")}
              aria-label="Visa HCP Test"
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-300/80 bg-white/78 text-slate-800 active:scale-[.97]"
            >
              <Target className="h-5 w-5" />
            </button>
          </div>
        </section>

        <section ref={practiceRef} className="scroll-mt-24 pt-7">
          <SectionHeading title="Träna med coach" count="3 områden" />
          <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PRACTICE_CATEGORIES.map((item, index) => (
              <Link
                key={item.id}
                to="/coach"
                search={{ category: item.id }}
                className={`relative min-h-[196px] w-[168px] shrink-0 snap-start overflow-hidden rounded-[25px] border p-4 shadow-[0_18px_42px_-30px_rgba(15,23,42,.55)] active:scale-[.985] ${
                  index === 0
                    ? "border-blue-200 bg-gradient-to-br from-blue-100 via-white to-sky-50"
                    : index === 1
                      ? "border-emerald-200 bg-gradient-to-br from-emerald-100 via-white to-teal-50"
                      : "border-amber-200 bg-gradient-to-br from-amber-100 via-white to-orange-50"
                }`}
              >
                <span className="block text-[9px] font-black uppercase tracking-[.17em] text-slate-500">{item.eyebrow}</span>
                <span className="mt-2 block font-display text-[27px] leading-none text-slate-950">{item.title}</span>
                <span className="mt-2 block text-[11px] leading-snug text-slate-600">{item.detail}</span>
                <span className="absolute bottom-4 left-4 right-4 flex items-center justify-between border-t border-slate-300/65 pt-3 text-[10px] font-bold text-slate-700">
                  Coach förvald <ChevronRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section ref={hcpRef} className="scroll-mt-24 pt-7">
          <SectionHeading title="Handicap Test" count="4 kategorier" />
          <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CATEGORIES.map((category) => (
              <Link
                key={category.slug}
                to="/kategori/$slug"
                params={{ slug: category.slug }}
                className="relative min-h-[190px] w-[168px] shrink-0 snap-start overflow-hidden rounded-[25px] border border-violet-200/90 bg-gradient-to-br from-violet-100/80 via-white to-fuchsia-50/70 p-4 shadow-[0_18px_42px_-30px_rgba(15,23,42,.5)] active:scale-[.985]"
              >
                <span className="block text-[9px] font-black uppercase tracking-[.17em] text-violet-600">HCP</span>
                <span className="mt-2 block font-display text-[25px] leading-none text-slate-950">{category.title}</span>
                <span className="mt-2 block text-[11px] leading-snug text-slate-600">{category.subtitle}</span>
                <span className="absolute bottom-4 left-4 right-4 flex items-center justify-between border-t border-violet-200/75 pt-3 text-[10px] font-bold text-slate-700">
                  Öppna test <ChevronRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section ref={benchmarkRef} className="scroll-mt-24 pt-7">
          <SectionHeading title="Benchmarks & challenges" count="4 tester" />
          <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {BENCHMARKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="relative min-h-[184px] w-[168px] shrink-0 snap-start overflow-hidden rounded-[25px] border border-slate-300/85 bg-gradient-to-br from-slate-100 via-white to-slate-50 p-4 shadow-[0_18px_42px_-30px_rgba(15,23,42,.5)] active:scale-[.985]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300/80 bg-white/75 text-slate-700">
                  <Trophy className="h-4 w-4" />
                </span>
                <span className="mt-3 block text-[9px] font-black uppercase tracking-[.17em] text-slate-500">{item.eyebrow}</span>
                <span className="mt-1 block font-display text-[23px] leading-none text-slate-950">{item.title}</span>
                <span className="mt-2 block text-[11px] leading-snug text-slate-600">{item.detail}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function SectionHeading({ title, count }: { title: string; count: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <h2 className="font-display text-[27px] leading-none text-slate-950">{title}</h2>
      <span className="shrink-0 text-[9px] font-black uppercase tracking-[.15em] text-slate-500">{count}</span>
    </div>
  );
}
