import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { TestCategoryTabs } from "@/components/test-category-tabs";

export const Route = createFileRoute("/standardiserade-tester")({
  head: () => ({
    meta: [
      { title: "Avancerade tester – SG4" },
      { name: "description", content: "Avancerade tester för erfarna golfare som vill utveckla specifika delar av sitt spel." },
    ],
  }),
  component: StandardizedTestsPage,
});

type TestCard = {
  to: string;
  title: string;
  label: string;
  distance?: string;
  description: string;
  tone: string;
  search?: Record<string, string>;
};

type TestSection = {
  title: string;
  subtitle: string;
  tests: TestCard[];
};

const EXISTING_SECTIONS: TestSection[] = [
  {
    title: "Puttning",
    subtitle: "Startlinje, kortputt och längdkontroll",
    tests: [
      { to: "/tutor-test", title: "Tutor Test", label: "Startlinje", description: "Mät hur konsekvent du startar bollen på rätt linje.", tone: "bg-[#5B4B9A]" },
      { to: "/pga-tour-18-puttar", title: "18 Puttar", label: "Scoring", description: "Benchmark över flera puttlängder.", tone: "bg-[#5B4B9A]" },
      { to: "/lagputt", title: "Lag Putt", label: "Längdkontroll", description: "Mät fart och proximity på längre puttar.", tone: "bg-[#5B4B9A]" },
      { to: "/klock-putt", title: "Klockputt", label: "Kortputt", description: "Standardiserad kontroll runt hålet.", tone: "bg-[#5B4B9A]" },
      { to: "/50-bollar", title: "25-bollsövningen", label: "Kortputt", description: "Fem bollar från 1–5 meter. Håla ut varje boll och räkna alla slag.", tone: "bg-[#5B4B9A]", search: { from: "tester" } },
    ],
  },
  {
    title: "Bollkontroll",
    subtitle: "Form, höjd och bollflykt",
    tests: [
      { to: "/shot-shaping", title: "Shot Shaping", label: "Bollkontroll", description: "Testa kontroll över höjd, draw och fade.", tone: "bg-[#394B6A]" },
    ],
  },
  {
    title: "Närspel",
    subtitle: "Chip, pitch och upp & in",
    tests: [
      { to: "/8-bollar", title: "8 Bollar", label: "Precision", description: "Ett snabbt standardtest för närspelsprecision.", tone: "bg-[#28705C]" },
      { to: "/upp-och-in", title: "Upp & In", label: "Scoring", description: "Mät förmågan att rädda slag runt green.", tone: "bg-[#28705C]" },
      { to: "/bunker-traning", title: "Bunkerträning", label: "Bunkerprecision", description: "Träna olika lies och avstånd i bunker och följ var bollen stannar.", tone: "bg-[#28705C]" },
    ],
  },
  {
    title: "Inspel",
    subtitle: "Precision med wedge och järn",
    tests: [
      { to: "/approach-pei-wedge", title: "PEI Wedge", label: "Wedge", distance: "50–120 m", description: "Mät precision med wedge på 18 varierade avstånd.", tone: "bg-[#2D6396]" },
      { to: "/approach-pei-iron", title: "PEI Iron", label: "Järn", distance: "120–190 m", description: "Mät precision med järn på 18 varierade avstånd.", tone: "bg-[#2D6396]" },
    ],
  },
];

const TEST_ORDER = ["Inspel", "Närspel", "Puttning", "Bollkontroll"] as const;
const TEST_SECTIONS = TEST_ORDER
  .map(title => EXISTING_SECTIONS.find(section => section.title === title))
  .filter((section): section is TestSection => Boolean(section));

function TestCardView({ test }: { test: TestCard }) {
  return (
    <div className={`relative h-[248px] w-[188px] shrink-0 overflow-hidden rounded-[26px] border border-black/[.04] text-white shadow-sm ${test.tone}`}>
      <Link to={test.to as any} search={(test.search ?? {}) as any} className="absolute inset-0 flex flex-col px-4.5 pb-4.5 pt-5">
        <div className="min-h-0">
          <h3 className="font-display text-[30px] leading-[.95] tracking-[-.01em]">{test.title}</h3>
          {test.distance && <p className="mt-2 text-[15px] font-bold leading-none text-white">{test.distance}</p>}
          <p className="mt-2 line-clamp-4 text-[13px] font-medium leading-[1.4] text-white/80">{test.description}</p>
        </div>
        <span className="mt-auto w-fit max-w-full truncate rounded-full border border-white/20 bg-black/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.13em] text-white/85 backdrop-blur-sm">
          {test.label}
        </span>
      </Link>
    </div>
  );
}

function StandardizedTestsPage() {
  const [puttingFilter, setPuttingFilter] = useState<"all" | "startlinje" | "langdkontroll" | "kortputt">("all");
  const filteredPuttingTests = (tests: TestCard[]) => puttingFilter === "all" ? tests : tests.filter(test => {
    if (puttingFilter === "startlinje") return test.label.toLowerCase().includes("startlinje") || test.title === "Tutor Test";
    if (puttingFilter === "kortputt") return test.label.toLowerCase().includes("kortputt") || test.title === "Klockputt" || test.title === "25-bollsövningen";
    return test.label.toLowerCase().includes("längdkontroll") || test.title === "Lag Putt";
  });
  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-28">
      <TestCategoryTabs selected="advanced" />

      <div className="px-5 pt-6">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Testa & utveckla</p>
        <h1 className="mt-1 text-[42px] font-black leading-[.98] tracking-[-.02em] text-foreground">Avancerade tester</h1>
        <div className="mt-4 max-w-sm space-y-3 text-[17px] font-medium leading-[1.5] text-muted-foreground">
          <p>Avancerade tester för erfarna golfare som vill ta sitt spel till nästa nivå.</p>
          <p>Testa och utveckla specifika delar av spelet, slå PB och utmana din precision, kontroll och stabilitet.</p>
        </div>
      </div>
      <div className="space-y-8 px-5 pt-8">
        {TEST_SECTIONS.map(section => <section key={section.title}>
          <div className="px-0.5"><h2 className="text-[24px] font-black leading-none text-foreground">{section.title}</h2><p className="mt-1.5 text-[10px] font-black uppercase tracking-[.16em] text-muted-foreground">{section.subtitle}</p>
          {section.title === "Puttning" ? <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{([["all","Alla"],["startlinje","Startlinje"],["kortputt","Kortputtar"],["langdkontroll","Längdkontroll"]] as const).map(([id,label]) => <button key={id} type="button" onClick={() => setPuttingFilter(id)} className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold transition ${puttingFilter === id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-transparent text-muted-foreground"}`}>{label}</button>)}</div> : null}</div>
          <div className="-mx-5 mt-3.5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{(section.title === "Puttning" ? filteredPuttingTests(section.tests) : section.tests).map(test => <TestCardView key={`${section.title}-${test.title}`} test={test} />)}</div>
        </section>)}
      </div>
    </main>
  );
}
