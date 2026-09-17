import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";

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
};

type TestSection = {
  title: string;
  subtitle: string;
  tests: TestCard[];
};

const TEST_SECTIONS: TestSection[] = [
  {
    title: "Puttning",
    subtitle: "Startlinje, kortputt och längdkontroll",
    tests: [
      { to: "/tutor-test", title: "Tutor Test", label: "Startlinje", description: "Mät hur konsekvent du startar bollen på rätt linje.", tone: "bg-[#4955a7]", imageSrc: "/b01e80c1-ac1d-4d11-81f0-5b9f362d0777.png" },
      { to: "/pga-tour-18-puttar", title: "18 Puttar", label: "Scoring", description: "Benchmark över flera puttlängder.", tone: "bg-[#a94c57]", imageSrc: "/b01e80c1-ac1d-4d11-81f0-5b9f362d0777.png" },
      { to: "/lagputt", title: "Lag Putt", label: "Längdkontroll", description: "Mät fart och proximity på längre puttar.", tone: "bg-[#7b6a9c]" },
      { to: "/green-reading", title: "Green Reading", label: "Läsning", description: "Testa beslut och greenläsning.", tone: "bg-[#426b5d]" },
      { to: "/klock-putt", title: "Klockputt", label: "Kortputt", description: "Standardiserad kontroll runt hålet.", tone: "bg-[#9a5d78]" },
    ],
  },
  {
    title: "Närspel",
    subtitle: "Chip, pitch och upp & in",
    tests: [
      { to: "/8-bollar", title: "8 Bollar", label: "Precision", description: "Ett snabbt standardtest för närspelsprecision.", tone: "bg-[#6757c7]", imageSrc: "/b01e80c1-ac1d-4d11-81f0-5b9f362d0777.png" },
      { to: "/upp-och-in", title: "Upp & In", label: "Scoring", description: "Mät förmågan att rädda slag runt green.", tone: "bg-[#247760]" },
      { to: "/50-bollar", title: "50 Bollar", label: "Närspel", description: "Större test för ett stabilt närspelsbenchmark.", tone: "bg-[#3c8068]" },
      { to: "/bunker-traning", title: "Bunker", label: "Bunker", description: "Mät kontroll och proximity från bunker.", tone: "bg-[#b87936]" },
    ],
  },
  {
    title: "Inspel",
    subtitle: "Precision, wedges och bollkontroll",
    tests: [
      { to: "/par-3-challenge", title: "Par 3 Challenge", label: "9 slag", description: "9 par 3-slag från korta, medium och långa distanser.", tone: "bg-[#255f9c]" },
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

function TestCardView({ test }: { test: TestCard }) {
  return (
    <Link to={test.to as any} className="block w-[164px] shrink-0">
      <article className={`relative flex h-[220px] flex-col justify-end overflow-hidden rounded-[24px] border border-black/[.04] px-4 pb-4 pt-4 text-white ${test.tone}`}>
        {test.imageSrc && (
          <>
            <img src={test.imageSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/18 to-black/5" />
          </>
        )}
        <span className="absolute left-4 top-4 text-[9px] font-black uppercase tracking-[.16em] text-white/70">{test.label}</span>
        <div className="relative z-10">
          <h3 className="font-display text-[25px] leading-[.95]">{test.title}</h3>
          <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-white/72">{test.description}</p>
        </div>
      </article>
    </Link>
  );
}

function StandardizedTestsPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-28">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 px-5 pb-4 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <Link to="/" aria-label="Tillbaka" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"><ArrowLeft className="h-4 w-4" /></Link>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[.18em] text-blue-600">Testbibliotek</p>
            <h1 className="mt-0.5 text-[26px] font-black leading-none text-foreground">Standardiserade tester</h1>
          </div>
        </div>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">Mät specifika delar av spelet med återkommande tester och jämför samma test över tid.</p>
      </header>

      <div className="space-y-8 px-5 pt-6">
        {TEST_SECTIONS.map((section) => (
          <section key={section.title}>
            <div className="flex items-end justify-between gap-3 px-0.5">
              <div>
                <h2 className="text-[24px] font-black leading-none text-foreground">{section.title}</h2>
                <p className="mt-1.5 text-[10px] font-black uppercase tracking-[.16em] text-muted-foreground">{section.subtitle}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            </div>
            <div className="-mx-5 mt-3.5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {section.tests.map((test) => <TestCardView key={`${section.title}-${test.title}`} test={test} />)}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
