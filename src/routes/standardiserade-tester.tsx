import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";

export const Route = createFileRoute("/standardiserade-tester")({
  head: () => ({
    meta: [
      { title: "Standardiserade tester – SG4" },
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
  useEffect(() => {
    try { const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]"); if (Array.isArray(parsed)) setFavorites(parsed.filter((item): item is string => typeof item === "string")); } catch {}
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
  function toggleFavorite(to: string) {
    setFavorites(current => {
      const next = current.includes(to) ? current.filter(item => item !== to) : [...current, to];
      try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }
  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-28">
      <div className="px-5 pt-6">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Testbibliotek</p>
        <h1 className="mt-1 font-display text-[38px] leading-none text-foreground">Testa hela ditt spel</h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">Mät en del i taget och följ samma test över tid.</p>
      </div>

      <div className="space-y-8 px-5 pt-8">
        {favoriteTests.length ? <section>
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
          <div className="-mx-5 mt-3.5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {visibleFavoriteTests.map(test => <TestCardView key={`favorite-${test.to}`} test={test} favorite onToggleFavorite={() => toggleFavorite(test.to)} />)}
          </div>
        </section> : null}
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
    </main>
  );
}
