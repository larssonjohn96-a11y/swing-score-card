import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Star } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";

export const Route = createFileRoute("/standardiserade-tester")({
  head: () => ({
    meta: [
      { title: "Testa & utveckla ditt spel – SG4" },
      { name: "description", content: "Bibliotek med standardiserade golftester för specifika delar av spelet." },
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
  imageSrc?: string;
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
      { to: "/tutor-test", title: "Tutor Test", label: "Startlinje", description: "Mät hur konsekvent du startar bollen på rätt linje.", tone: "bg-[#4955a7]", imageSrc: "/b01e80c1-ac1d-4d11-81f0-5b9f362d0777.png" },
      { to: "/pga-tour-18-puttar", title: "18 Puttar", label: "Scoring", description: "Benchmark över flera puttlängder.", tone: "bg-[#a94c57]", imageSrc: "/b01e80c1-ac1d-4d11-81f0-5b9f362d0777.png" },
      { to: "/lagputt", title: "Lag Putt", label: "Längdkontroll", description: "Mät fart och proximity på längre puttar.", tone: "bg-[#7b6a9c]" },
      { to: "/green-reading", title: "Green Reading", label: "Läsning", description: "Testa beslut och greenläsning.", tone: "bg-[#426b5d]" },
      { to: "/klock-putt", title: "Klockputt", label: "Kortputt", description: "Standardiserad kontroll runt hålet.", tone: "bg-[#9a5d78]" },
      { to: "/50-bollar", title: "25-bollsövningen", label: "Kortputt", description: "Fem bollar från 1–5 meter. Håla ut varje boll och räkna alla slag.", tone: "bg-[#3c8068]", search: { from: "tester" } },
    ],
  },
  {
    title: "Närspel",
    subtitle: "Chip, pitch och upp & in",
    tests: [
      { to: "/8-bollar", title: "8 Bollar", label: "Precision", description: "Ett snabbt standardtest för närspelsprecision.", tone: "bg-[#6757c7]", imageSrc: "/b01e80c1-ac1d-4d11-81f0-5b9f362d0777.png" },
      { to: "/upp-och-in", title: "Upp & In", label: "Scoring", description: "Mät förmågan att rädda slag runt green.", tone: "bg-[#247760]" },
    ],
  },
  {
    title: "Inspel",
    subtitle: "Precision, wedges och bollkontroll",
    tests: [
      { to: "/par-3-challenge", title: "Par 3 Challenge", label: "6 slag", description: "6 par 3-slag från korta, medium och långa distanser.", tone: "bg-[#255f9c]" },
      { to: "/approach-pei-valj", title: "PEI Approach", label: "Precision", description: "Mät inspelsprecision över flera avstånd.", tone: "bg-[#217d8c]" },
      { to: "/approach-pei-wedge", title: "PEI Wedge", label: "Wedge", description: "Precision med wedges från kontrollerade avstånd.", tone: "bg-[#3a8790]" },
      { to: "/approach-pei-iron", title: "PEI Iron", label: "Järn", description: "Benchmark för järnslag och proximity.", tone: "bg-[#3475a8]" },
      { to: "/shot-shaping", title: "Shot Shaping", label: "Bollkontroll", description: "Testa kontroll över olika bollflykter.", tone: "bg-[#59618a]" },
      { to: "/wedge-stege", title: "Wedge Stege", label: "Distance control", description: "Mät avståndskontroll genom flera wedgezoner.", tone: "bg-[#7b6b47]" },
    ],
  },
  {
    title: "Off the Tee",
    subtitle: "Precision, konsekvens och längd",
    tests: [
      { to: "/driver-konsekvens", title: "Driver Consistency", label: "Konsekvens", description: "Mät spridning och stabilitet med driver.", tone: "bg-[#a76632]" },
      { to: "/fairway-streak", title: "Fairway Accuracy", label: "Precision", description: "Mät hur ofta du hittar din valda korridor.", tone: "bg-[#3f6f58]" },
      { to: "/longdrive", title: "Long Drive", label: "Längd", description: "Benchmark för maxlängd och bollhastighet.", tone: "bg-[#485368]" },
    ],
  },
];

// The former HCP tests now live alongside the other tests for each skill.
// Read the existing registry so each original protocol remains accessible.
const CATEGORY_SECTION: Record<string, string> = {
  puttning: "Puttning", "around-the-green": "Närspel", approach: "Inspel", driving: "Off the Tee",
};
const TEST_SECTIONS_UNSORTED: TestSection[] = EXISTING_SECTIONS.map(section => {
  const additions = CATEGORIES.filter(category => CATEGORY_SECTION[category.slug] === section.title)
    .flatMap(category => category.tests.map(test => ({
      to: test.to, title: test.title, label: "Nivåtest", description: test.subtitle,
      tone: section.tests[0]?.tone ?? "bg-[#334155]",
    })));
  const tests = [...additions, ...section.tests];
  return { ...section, tests: tests.filter((test, i) => tests.findIndex(t => t.to === test.to) === i) };
});
TEST_SECTIONS_UNSORTED.push({ title: "Speed", subtitle: "Bollhastighet och längdpotential", tests: [
  { to: "/speed-test", title: "Ball Speed Test", label: "Bollhastighet", description: "Mät din bollhastighet och få analys av din nivå och driverpotential.", tone: "bg-[#7a4f32]" },
] });
const TEST_ORDER = ["Speed", "Off the Tee", "Inspel", "Puttning", "Närspel"] as const;
const TEST_SECTIONS = TEST_ORDER
  .map(title => TEST_SECTIONS_UNSORTED.find(section => section.title === title))
  .filter((section): section is TestSection => Boolean(section));

const FAVORITES_KEY = "sg4-test-favorites-v1";
const FOCUS_BLOCKS_KEY = "sg4-focus-blocks-v1";
type FocusCategory = "Puttning" | "Närspel" | "Inspel" | "Off the Tee";
type FocusBlock = { id: string; category: FocusCategory; weeks: number; testPaths: string[]; startedAt: string; endedAt?: string };

function TestCardView({ test, favorite, onToggleFavorite }: { test: TestCard; favorite: boolean; onToggleFavorite: () => void }) {
  return (
    <div className={`relative h-[220px] w-[164px] shrink-0 overflow-hidden rounded-[24px] border border-black/[.04] text-white ${test.tone}`}>
      {test.imageSrc && (
        <>
          <img src={test.imageSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/18 to-black/5" />
        </>
      )}
      <div className="absolute inset-x-0 top-0 z-20 flex h-[34%] items-start justify-end p-3">
        <button type="button" aria-label={favorite ? `Ta bort ${test.title} från favoriter` : `Lägg till ${test.title} i favoriter`} aria-pressed={favorite} onClick={onToggleFavorite} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-md transition active:scale-95">
          <Star className={`h-5 w-5 ${favorite ? "fill-amber-300 text-amber-300" : "text-white"}`} />
        </button>
      </div>
      <Link to={test.to as any} search={(test.search ?? {}) as any} className="absolute inset-x-0 bottom-0 z-10 flex h-[66%] flex-col justify-end px-4 pb-4 pt-3">
        <h3 className="font-display text-[25px] leading-[.95]">{test.title}</h3>
        <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-white/72">{test.description}</p>
      </Link>
    </div>
  );
}

function StandardizedTestsPage() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [puttingFilter, setPuttingFilter] = useState<"all" | "startlinje" | "green-reading" | "langdkontroll" | "kortputt">("all");
  const [favoriteFilter, setFavoriteFilter] = useState<"all" | "puttning" | "narspel" | "inspel" | "utslag">("all");
  const [tab, setTab] = useState<"focus" | "library">("focus");
  const [focusBlocks, setFocusBlocks] = useState<FocusBlock[]>([]);
  const [focusCategory, setFocusCategory] = useState<FocusCategory>("Närspel");
  const [focusWeeks, setFocusWeeks] = useState(4);
  const [focusTests, setFocusTests] = useState<string[]>([]);
  useEffect(() => {
    try { const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]"); if (Array.isArray(parsed)) setFavorites(parsed.filter((item): item is string => typeof item === "string")); } catch {}
    try { const parsed = JSON.parse(localStorage.getItem(FOCUS_BLOCKS_KEY) ?? "[]"); if (Array.isArray(parsed)) setFocusBlocks(parsed); } catch {}
  }, []);
  const allTests = useMemo(() => TEST_SECTIONS.flatMap(section => section.tests), []);
  const favoriteTests = favorites.map(to => allTests.find(test => test.to === to)).filter((test): test is TestCard => Boolean(test));
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
  const activeFocus = focusBlocks.find(block => !block.endedAt);
  const completedFocus = focusBlocks.filter(block => block.endedAt);
  const focusSection = TEST_SECTIONS.find(section => section.title === focusCategory);
  function saveFocusBlocks(next: FocusBlock[]) {
    setFocusBlocks(next);
    try { localStorage.setItem(FOCUS_BLOCKS_KEY, JSON.stringify(next)); } catch {}
  }
  function startFocusBlock() {
    if (focusTests.length < 2 || focusTests.length > 4) return;
    saveFocusBlocks([{ id: crypto.randomUUID(), category: focusCategory, weeks: focusWeeks, testPaths: focusTests, startedAt: new Date().toISOString() }, ...focusBlocks]);
    setFocusTests([]);
  }
  function finishFocusBlock() {
    if (!activeFocus) return;
    saveFocusBlocks(focusBlocks.map(block => block.id === activeFocus.id ? { ...block, endedAt: new Date().toISOString() } : block));
  }
  function toggleFavorite(to: string) {
    setFavorites(current => {
      const next = current.includes(to) ? current.filter(item => item !== to) : [...current, to];
      try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }
  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-28">
      <div className="px-5 pt-5">
        <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
          <button type="button" onClick={() => setTab("focus")} className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${tab === "focus" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Mitt fokus</button>
          <button type="button" onClick={() => setTab("library")} className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${tab === "library" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Testbibliotek</button>
        </div>
      </div>
      {tab === "focus" ? <div className="px-5 pb-8 pt-6">
        {!activeFocus ? <>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Periodiserat fokus</p>
          <h1 className="mt-1 font-display text-[40px] leading-none text-foreground">Bli tydligt bättre på en del</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Fokusera extra på en del av spelet under en begränsad period, medan resten kan hållas på underhållsnivå. SG4 samlar samma tester i ett block så du kan se utvecklingen från början till slut.</p>
          <div className="mt-5 rounded-[24px] border border-blue-100 bg-blue-50/60 p-4">
            <p className="text-sm font-bold text-slate-900">Så fungerar ett fokusblock</p>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p><Check className="mr-2 inline h-4 w-4 text-blue-600" />Välj en del av spelet.</p>
              <p><Check className="mr-2 inline h-4 w-4 text-blue-600" />Välj 2–4 tester · 3 rekommenderas.</p>
              <p><Check className="mr-2 inline h-4 w-4 text-blue-600" />Arbeta fokuserat i 2–6 veckor.</p>
              <p><Check className="mr-2 inline h-4 w-4 text-blue-600" />Jämför testresultaten från start till slut.</p>
            </div>
          </div>
          <h2 className="mt-8 text-xl font-black">1. Välj fokus</h2>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(["Puttning","Närspel","Inspel","Off the Tee"] as FocusCategory[]).map(category => <button key={category} type="button" onClick={() => { setFocusCategory(category); setFocusTests([]); }} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold ${focusCategory === category ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600"}`}>{category}</button>)}
          </div>
          <h2 className="mt-7 text-xl font-black">2. Välj längd</h2>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {[2,3,4,5,6].map(weeks => <button key={weeks} type="button" onClick={() => setFocusWeeks(weeks)} className={`rounded-2xl border py-3 text-sm font-bold ${focusWeeks === weeks ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white"}`}>{weeks}<span className="block text-[9px] font-medium opacity-70">v</span></button>)}
          </div>
          <p className="mt-2 text-xs text-slate-400">4 veckor rekommenderas.</p>
          <h2 className="mt-7 text-xl font-black">3. Välj tester</h2>
          <p className="mt-1 text-xs text-slate-500">{focusTests.length}/4 valda · välj 2–4, helst 3.</p>
          <div className="mt-3 space-y-2">
            {(focusSection?.tests ?? []).map(test => { const selected = focusTests.includes(test.to); return <button key={test.to} type="button" onClick={() => setFocusTests(current => selected ? current.filter(path => path !== test.to) : current.length < 4 ? [...current, test.to] : current)} className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left ${selected ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`}><span><strong className="block text-sm">{test.title}</strong><span className="text-xs text-slate-500">{test.description}</span></span>{selected ? <Check className="h-5 w-5 shrink-0 text-blue-600" /> : null}</button>})}
          </div>
          <button type="button" disabled={focusTests.length < 2} onClick={startFocusBlock} className="mt-6 min-h-12 w-full rounded-2xl bg-blue-600 px-4 font-bold text-white disabled:opacity-35">Starta fokusblock</button>
        </> : <>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Aktivt fokusblock</p>
          <h1 className="mt-1 font-display text-[40px] leading-none">{activeFocus.category}</h1>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500"><CalendarDays className="h-4 w-4" />{activeFocus.weeks} veckor · start {new Date(activeFocus.startedAt).toLocaleDateString("sv-SE")}</div>
          <div className="mt-6 space-y-3">{activeFocus.testPaths.map(path => { const test = allTests.find(item => item.to === path); return test ? <Link key={path} to={test.to as any} search={(test.search ?? {}) as any} className="block rounded-[22px] border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-blue-600">Fokustest</p><h2 className="mt-1 text-xl font-black">{test.title}</h2><p className="mt-1 text-xs text-slate-500">{test.description}</p></Link> : null; })}</div>
          <button type="button" onClick={finishFocusBlock} className="mt-6 min-h-12 w-full rounded-2xl border border-slate-300 bg-white font-bold">Avsluta block</button>
        </>}
        {completedFocus.length ? <section className="mt-10"><h2 className="text-xl font-black">Tidigare block</h2><div className="mt-3 space-y-2">{completedFocus.map(block => <div key={block.id} className="rounded-2xl border border-slate-200 bg-white p-4"><strong>{block.category}</strong><p className="mt-1 text-xs text-slate-500">{block.weeks} veckor · {block.testPaths.length} tester · avslutat {new Date(block.endedAt!).toLocaleDateString("sv-SE")}</p></div>)}</div></section> : null}
      </div> : <>
      <div className="px-5 pt-6">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Testa & utveckla</p>
        <h1 className="mt-1 font-display text-[38px] leading-none text-foreground">Testa & utveckla ditt spel</h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">Mät, fokusera och följ din utveckling.</p>
      </div>

      <div className="space-y-8 px-5 pt-8">
        <section>
          <div className="px-0.5">
            <h2 className="text-[24px] font-black leading-none text-foreground">Mina favoriter</h2>
            <p className="mt-1.5 text-[10px] font-black uppercase tracking-[.16em] text-muted-foreground">Dina sparade tester</p>
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {([
                ["all", "Alla"],
                ["puttning", "Puttning"],
                ["narspel", "Närspel"],
                ["inspel", "Inspel"],
                ["utslag", "Utslag"],
              ] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setFavoriteFilter(id)} className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold transition ${favoriteFilter === id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-transparent text-muted-foreground"}`}>{label}</button>)}
            </div>
          </div>
          <div className="-mx-5 mt-3.5 flex min-h-[221px] gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {visibleFavoriteTests.length ? visibleFavoriteTests.map(test => <TestCardView key={`favorite-${test.to}`} test={test} favorite onToggleFavorite={() => toggleFavorite(test.to)} />) : (
              <div className="flex h-[220px] w-[164px] shrink-0 flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/60 px-4 text-center">
                <Star className="h-6 w-6 text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-500">Ingen favorit sparad</p>
                <p className="mt-1 text-[11px] leading-snug text-slate-400">Stjärnmarkera ett test för att lägga det här.</p>
              </div>
            )}
          </div>
        </section>
        {TEST_SECTIONS.map((section) => (
          <section key={section.title}>
            <div className="px-0.5">
              <h2 className="text-[24px] font-black leading-none text-foreground">{section.title}</h2>
              <p className="mt-1.5 text-[10px] font-black uppercase tracking-[.16em] text-muted-foreground">{section.subtitle}</p>
              {section.title === "Puttning" ? <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {([
                  ["all", "Alla"],
                  ["startlinje", "Startlinje"],
                  ["green-reading", "Green reading"],
                  ["kortputt", "Kortputtar"],
                  ["langdkontroll", "Längdkontroll"],
                ] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setPuttingFilter(id)} className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold transition ${puttingFilter === id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-transparent text-muted-foreground"}`}>{label}</button>)}
              </div> : null}
            </div>
            <div className="-mx-5 mt-3.5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {(section.title === "Puttning" ? filteredPuttingTests(section.tests) : section.tests).map((test) => <TestCardView key={`${section.title}-${test.title}`} test={test} favorite={favorites.includes(test.to)} onToggleFavorite={() => toggleFavorite(test.to)} />)}
            </div>
          </section>
        ))}
      </div>
      </>}
    </main>
  );
}
