import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Star } from "lucide-react";

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
      { to: "/green-reading", title: "Green Reading", label: "Läsning", description: "Testa beslut och greenläsning.", tone: "bg-[#5B4B9A]" },
      { to: "/klock-putt", title: "Klockputt", label: "Kortputt", description: "Standardiserad kontroll runt hålet.", tone: "bg-[#5B4B9A]" },
      { to: "/50-bollar", title: "25-bollsövningen", label: "Kortputt", description: "Fem bollar från 1–5 meter. Håla ut varje boll och räkna alla slag.", tone: "bg-[#5B4B9A]", search: { from: "tester" } },
      { to: "/putting-streak", title: "Putting Streak", label: "Challenge", description: "En putt per nivå från 1 till 10 meter. Första missen avslutar testet.", tone: "bg-[#5B4B9A]" },
      { to: "/lagputt-ladder", title: "Lag Putt Ladder", label: "Challenge", description: "Börja på 8 meter och klättra upp genom längre lagputtar.", tone: "bg-[#5B4B9A]" },
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
    subtitle: "Precision, wedges och bollkontroll",
    tests: [
      { to: "/par-3-challenge", title: "Par 3 Challenge", label: "6 slag", description: "6 par 3-slag från korta, medium och långa distanser.", tone: "bg-[#2D6396]" },
      { to: "/approach-pei-valj", title: "PEI Approach", label: "Precision", description: "Mät inspelsprecision över flera avstånd.", tone: "bg-[#2D6396]" },
      { to: "/approach-pei-wedge", title: "PEI Wedge", label: "Wedge", description: "Precision med wedges från kontrollerade avstånd.", tone: "bg-[#2D6396]" },
      { to: "/approach-pei-iron", title: "PEI Iron", label: "Järn", description: "Benchmark för järnslag och proximity.", tone: "bg-[#2D6396]" },
      { to: "/wedge-stege", title: "Wedge Stege", label: "Distance control", description: "Mät avståndskontroll genom flera wedgezoner.", tone: "bg-[#2D6396]" },
    ],
  },
  {
    title: "Off the Tee",
    subtitle: "Precision, konsekvens och längd",
    tests: [
      { to: "/driver-konsekvens", title: "Driver Consistency", label: "Konsekvens", description: "Mät spridning och stabilitet med driver.", tone: "bg-[#7A5638]" },
      { to: "/fairway-streak", title: "Fairway Accuracy", label: "Precision", description: "Mät hur ofta du hittar din valda korridor.", tone: "bg-[#7A5638]" },
      { to: "/longdrive", title: "Long Drive", label: "Längd", description: "Benchmark för maxlängd och bollhastighet.", tone: "bg-[#7A5638]" },
      { to: "/speed", title: "Speed Test", label: "Power", description: "Mät ball speed och club head speed och följ din fart över tid.", tone: "bg-[#7A5638]" },
    ],
  },
];

const TEST_ORDER = ["Off the Tee", "Inspel", "Närspel", "Puttning", "Bollkontroll"] as const;
const TEST_SECTIONS = TEST_ORDER
  .map(title => EXISTING_SECTIONS.find(section => section.title === title))
  .filter((section): section is TestSection => Boolean(section));

const FAVORITES_KEY = "sg4-test-favorites-v1";
function TestCardView({ test, favorite, onToggleFavorite }: { test: TestCard; favorite: boolean; onToggleFavorite: () => void }) {
  return (
    <div className={`relative h-[220px] w-[164px] shrink-0 overflow-hidden rounded-[24px] border border-black/[.04] text-white shadow-sm ${test.tone}`}>
      <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3">
        <span className="max-w-[105px] truncate rounded-full border border-white/20 bg-black/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.13em] text-white/85 backdrop-blur-sm">
          {test.label}
        </span>
        <button type="button" aria-label={favorite ? `Ta bort ${test.title} från favoriter` : `Lägg till ${test.title} i favoriter`} aria-pressed={favorite} onClick={onToggleFavorite} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/15 text-white backdrop-blur-md transition active:scale-95">
          <Star className={`h-4.5 w-4.5 ${favorite ? "fill-amber-300 text-amber-300" : "text-white"}`} />
        </button>
      </div>
      <Link to={test.to as any} search={(test.search ?? {}) as any} className="absolute inset-0 flex flex-col justify-end px-4 pb-4 pt-16">
        <h3 className="font-display text-[27px] leading-[.94] tracking-[-.01em]">{test.title}</h3>
        <p className="mt-2.5 line-clamp-3 text-[12px] font-medium leading-[1.35] text-white/78">{test.description}</p>
      </Link>
    </div>
  );
}

function StandardizedTestsPage() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [puttingFilter, setPuttingFilter] = useState<"all" | "startlinje" | "green-reading" | "langdkontroll" | "kortputt">("all");
  const [favoriteFilter, setFavoriteFilter] = useState<"all" | "puttning" | "narspel" | "inspel" | "utslag">("all");
  useEffect(() => {
    try { const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]"); if (Array.isArray(parsed)) setFavorites(parsed.filter((item): item is string => typeof item === "string")); } catch {}
  }, []);
  const allTests = useMemo(() => TEST_SECTIONS.flatMap(section => section.tests), []);
  const favoriteTests = favorites.map(to => allTests.find(test => test.to === to)).filter((test): test is TestCard => Boolean(test));
  const streakChallenges: TestCard[] = [
    { to: "/fairway-streak", title: "Fairways i rad", label: "Utslag", description: "Hur många fairways kan du träffa i rad innan första missen?", tone: "bg-[#9A4E34]" },
    { to: "/streak-challenge", title: "Inspel i rad", label: "Inspel", description: "Träffa din valda målzon. Hur många klarar du i rad?", tone: "bg-[#9A4E34]", search: { type: "approach" } },
    { to: "/putting-streak", title: "Putts i rad", label: "Puttning", description: "Sätt putten och fortsätt. Första missen avslutar streaken.", tone: "bg-[#9A4E34]" },
    { to: "/streak-challenge", title: "Bunkerslag i rad", label: "Närspel", description: "Träffa din valda målzon från bunker. Hur många klarar du i rad?", tone: "bg-[#9A4E34]", search: { type: "bunker" } },
  ];
  const favoriteCategory = (test: TestCard) => {
    const section = TEST_SECTIONS.find(section => section.tests.some(item => item.to === test.to))?.title;
    if (section === "Puttning") return "puttning";
    if (section === "Närspel") return "narspel";
    if (section === "Inspel") return "inspel";
    if (section === "Off the Tee" || section === "Speed") return "utslag";
    return null;
  };
  const visibleFavoriteTests = favoriteFilter === "all" ? favoriteTests : favoriteTests.filter(test => favoriteCategory(test) === favoriteFilter);
  const filteredPuttingTests = (tests: TestCard[]) => puttingFilter === "all" ? tests : tests.filter(test => {
    if (puttingFilter === "startlinje") return test.label.toLowerCase().includes("startlinje") || test.title === "Tutor Test";
    if (puttingFilter === "green-reading") return test.label.toLowerCase().includes("läsning") || test.title === "Green Reading";
    if (puttingFilter === "kortputt") return test.label.toLowerCase().includes("kortputt") || test.title === "Klockputt" || test.title === "25-bollsövningen";
    return test.label.toLowerCase().includes("längdkontroll") || test.title === "Lag Putt";
  });
  function toggleFavorite(to: string) {
    setFavorites(current => {
      const next = current.includes(to) ? current.filter(item => item !== to) : [...current, to];
      try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }
  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-28">
      <header className="sticky top-0 z-30 border-b border-slate-200/75 bg-background/92 px-5 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="grid grid-cols-[40px_1fr_40px] items-center">
          <Link to="/" aria-label="Tillbaka" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 text-center">
            <p className="text-[9px] font-bold uppercase tracking-[.18em] text-slate-400">SG4</p>
            <p className="truncate text-[15px] font-bold text-slate-950">Avancerade tester</p>
          </div>
          <span aria-hidden="true" />
        </div>
      </header>

      <div className="px-5 pt-6">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Testa & utveckla</p>
        <h1 className="mt-1 text-[42px] font-black leading-[.98] tracking-[-.02em] text-foreground">Avancerade tester</h1>
        <div className="mt-4 max-w-sm space-y-3 text-[17px] font-medium leading-[1.5] text-muted-foreground">
          <p>Avancerade tester för erfarna golfare som vill ta sitt spel till nästa nivå.</p>
          <p>Testa och utveckla specifika delar av spelet, slå PB och utmana din precision, kontroll och stabilitet.</p>
        </div>
      </div>
      <div className="space-y-8 px-5 pt-8">
        <section>
          <div className="px-0.5">
            <h2 className="text-[24px] font-black leading-none text-foreground">Mina favoriter</h2>
            <p className="mt-1.5 text-[10px] font-black uppercase tracking-[.16em] text-muted-foreground">Tester du gillar</p>
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {([["all","Alla"],["puttning","Puttning"],["narspel","Närspel"],["inspel","Inspel"],["utslag","Utslag"]] as const).map(([id,label]) => <button key={id} type="button" onClick={() => setFavoriteFilter(id)} className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold transition ${favoriteFilter === id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-transparent text-muted-foreground"}`}>{label}</button>)}
            </div>
          </div>
          <div className="-mx-5 mt-3.5 flex min-h-[221px] gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {visibleFavoriteTests.length ? visibleFavoriteTests.map(test => <TestCardView key={`favorite-${test.to}`} test={test} favorite onToggleFavorite={() => toggleFavorite(test.to)} />) : <div className="flex h-[220px] w-[164px] shrink-0 flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/60 px-4 text-center"><Star className="h-6 w-6 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-500">Ingen favorit sparad</p><p className="mt-1 text-[11px] leading-snug text-slate-400">Stjärnmarkera ett test för att lägga det här.</p></div>}
          </div>
        </section>
        {TEST_SECTIONS.map(section => <section key={section.title}>
          <div className="px-0.5"><h2 className="text-[24px] font-black leading-none text-foreground">{section.title}</h2><p className="mt-1.5 text-[10px] font-black uppercase tracking-[.16em] text-muted-foreground">{section.subtitle}</p>
          {section.title === "Puttning" ? <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{([["all","Alla"],["startlinje","Startlinje"],["green-reading","Green reading"],["kortputt","Kortputtar"],["langdkontroll","Längdkontroll"]] as const).map(([id,label]) => <button key={id} type="button" onClick={() => setPuttingFilter(id)} className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold transition ${puttingFilter === id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-transparent text-muted-foreground"}`}>{label}</button>)}</div> : null}</div>
          <div className="-mx-5 mt-3.5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{(section.title === "Puttning" ? filteredPuttingTests(section.tests) : section.tests).map(test => <TestCardView key={`${section.title}-${test.title}`} test={test} favorite={favorites.includes(test.to)} onToggleFavorite={() => toggleFavorite(test.to)} />)}</div>
        </section>)}
        <section>
          <div className="px-0.5">
            <h2 className="text-[24px] font-black leading-none text-foreground">Streak Challenge</h2>
            <p className="mt-1.5 text-[10px] font-black uppercase tracking-[.16em] text-muted-foreground">Hur många klarar du i rad?</p>
          </div>
          <div className="-mx-5 mt-3.5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {streakChallenges.map((test, index) => <TestCardView key={`streak-${test.title}-${index}`} test={test} favorite={favorites.includes(test.to)} onToggleFavorite={() => toggleFavorite(test.to)} />)}
          </div>
        </section>
      </div>
    </main>
  );
}
