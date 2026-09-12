import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, Check, ChevronRight, Crosshair, Grid3x3 } from "lucide-react";
import { useState } from "react";
import { LIGHT_SURFACE } from "./8-bollar";

type Category = "off-the-tee" | "approach" | "around-the-green" | "putting";
const CATEGORY_IDS: Category[] = ["off-the-tee", "approach", "around-the-green", "putting"];

export const Route = createFileRoute("/traning")({
  validateSearch: (search: Record<string, unknown>) => ({
    category:
      typeof search.category === "string" && CATEGORY_IDS.includes(search.category as Category)
        ? (search.category as Category)
        : undefined,
  }),
  component: TrainingTestsPage,
});

type TestRoute =
  | "/speed"
  | "/longdrive"
  | "/fairway-streak"
  | "/putting-streak"
  | "/lagputt-ladder"
  | "/klock-putt"
  | "/driver-konsekvens"
  | "/lagputt"
  | "/50-bollar"
  | "/tutor-test"
  | "/pga-tour-18-puttar"
  | "/8-bollar"
  | "/approach-pei-valj"
  | "/green-reading"
  | "/upp-och-in"
  | "/shot-shaping";

type TestItem = {
  to: TestRoute;
  title: string;
  description: string;
  meta: string;
  skill?: string;
  featured?: boolean;
};

type PuttingFilter = "all" | "short" | "start-line" | "distance" | "green-read";

const PUTTING_FILTERS: Array<{ id: PuttingFilter; label: string }> = [
  { id: "all", label: "Alla" },
  { id: "short", label: "Kortputt" },
  { id: "start-line", label: "Startlinje" },
  { id: "distance", label: "Längdkontroll" },
  { id: "green-read", label: "Green read" },
];

const TESTS: Record<Category, TestItem[]> = {
  "off-the-tee": [
    { to: "/speed", title: "Speed Test", description: "Mät ball speed och club head speed och följ hur din fart utvecklas över tid. Speed visas i din SG4-profil och spindel, men räknas inte in i Total HCP.", meta: "Ball speed · Club speed · PB", skill: "Power", featured: true },
    { to: "/longdrive", title: "Longest Drive", description: "Sex försök med driver. Jaga personbästa i carry och följ både längsta slag och snitt över tid.", meta: "6 drives · längsta carry · PB", skill: "Distance", featured: true },
    { to: "/fairway-streak", title: "Fairway Streak", description: "Träffa en 30 m bred fairway och fortsätt så länge du lyckas. Första missen avslutar testet.", meta: "1 liv · fairways i rad · PB", skill: "Challenge", featured: true },
    { to: "/driver-konsekvens", title: "Driver med konsekvens", description: "16 drives mot en 30 m fairway där kostnaden för vänster- och högermiss varierar hål för hål.", meta: "16 drives · 30 m fairway", skill: "Precision & konsekvens" },
  ],
  approach: [
    { to: "/approach-pei-valj", title: "Approach Precision", description: "Precision från wedge till långa inspel.", meta: "50–220 m · PEI-metod", skill: "Approachprecision" },
    { to: "/shot-shaping", title: "Shot Shaping", description: "Kontrollera höjd, draw och fade.", meta: "3 tester · bollkontroll", skill: "Bollflykt & shape" },
  ],
  "around-the-green": [
    { to: "/8-bollar", title: "8-bollsövningen", description: "Chip, pitch, lobb och bunker från åtta stationer. Fem varv.", meta: "40 slag · max 160 poäng", skill: "Slagvariation" },
    { to: "/upp-och-in", title: "Up & Down Challenge", description: "10 lägen runt green. Spela slaget, putta ut och räkna dina up and downs.", meta: "10 situationer · konvertering %", skill: "Scoring" },
  ],
  putting: [
    { to: "/putting-streak", title: "Putting Streak", description: "En putt per nivå från 1 till 10 meter. Sätt den för att gå vidare. Första missen avslutar testet.", meta: "1 liv · progressiv stege · PB", skill: "Challenge", featured: true },
    { to: "/lagputt-ladder", title: "Lag Putt Ladder", description: "Börja på 8 meter och gå upp två meter per nivå. Håla ut på högst två puttar för att gå vidare. Tre puttar avslutar testet.", meta: "8–30 m · max 2 puttar · PB", skill: "Challenge", featured: true },
    { to: "/klock-putt", title: "Klockan", description: "12 puttar från klockan 12, 3, 6 och 9. En putt från 1, 2 och 3 meter på varje position och totalpoäng upp till 16.", meta: "12 puttar · score 0–16 · 20-test snitt", skill: "Scoring", featured: true },
    { to: "/pga-tour-18-puttar", title: "PGA Tour – 18 Puttar", description: "18 fasta avstånd från 0,6 till 16 meter. Håla ut och jämför total putting-score mot PGA Tour.", meta: "18 hål · 0,6–16 m", skill: "Total putting-performance" },
    { to: "/50-bollar", title: "25-bollsövningen", description: "Fem bollar från 1–5 meter. Håla ut varje boll och räkna alla slag.", meta: "25 bollar · 1–5 meter", skill: "Kortputt & hole-out" },
    { to: "/lagputt", title: "Lag putt", description: "Långa puttar där resultatet styrs av hur nära hålet bollen stannar.", meta: "18 puttar · 8–22 meter", skill: "Längdkontroll" },
    { to: "/tutor-test", title: "Tutor", description: "Isolerar hur konsekvent du kan starta bollen på avsedd linje genom Putting Tutor.", meta: "10 puttar · 20-test snitt", skill: "Startlinje" },
    { to: "/green-reading", title: "Green Reading", description: "Brytande puttar där du bedömer om du läste rätt linje, separat från om putten gick i.", meta: "10 puttar · max 20 poäng", skill: "Greenläsning" },
  ],
};

type CategoryItem = {
  id: Category;
  title: string;
  svTitle: string;
  description: string;
  hero: string;
};

const CATEGORIES: CategoryItem[] = [
  { id: "off-the-tee", title: "Off the Tee", svTitle: "Utslag", description: "Fart, längd och driverkontroll", hero: "Fart, längd och driverkontroll." },
  { id: "approach", title: "Approach", svTitle: "Inspel", description: "Precision och bollkontroll", hero: "Precision och bollkontroll." },
  { id: "around-the-green", title: "Around the Green", svTitle: "Närspel", description: "Närspel och scoring", hero: "Slagvariation, närspel och scoring." },
  { id: "putting", title: "Putting", svTitle: "Puttning", description: "Startlinje och längdkontroll", hero: "Träna rätt del av puttningen — från startlinje och kortputtar till green read och längdkontroll." },
];

function matchesPuttingFilter(test: TestItem, filter: PuttingFilter) {
  if (filter === "all") return true;
  if (filter === "short") return ["/putting-streak", "/klock-putt", "/50-bollar", "/pga-tour-18-puttar"].includes(test.to);
  if (filter === "start-line") return ["/tutor-test", "/klock-putt", "/50-bollar"].includes(test.to);
  if (filter === "distance") return ["/lagputt-ladder", "/lagputt", "/putting-streak", "/pga-tour-18-puttar"].includes(test.to);
  return test.to === "/green-reading";
}

function TestCard({ to, title, description, meta, skill }: TestItem) {
  const Icon = to === "/shot-shaping" || to === "/tutor-test" ? Grid3x3 : Crosshair;
  return (
    <Link
      to={to}
      className="group flex w-full items-center gap-4 rounded-3xl border border-slate-300/80 bg-gradient-to-br from-slate-100/88 via-white/78 to-slate-100/72 p-4 text-left shadow-[0_18px_44px_-32px_rgba(15,23,42,.4)] backdrop-blur-2xl transition-all active:scale-[0.99]"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-300/80 bg-white/58 text-slate-700 shadow-[0_10px_24px_-18px_rgba(15,23,42,.35)]">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        {skill ? <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">{skill}</span> : null}
        <span className="mt-1 block font-display text-2xl leading-none text-slate-900">{title}</span>
        <span className="mt-1.5 block text-xs leading-relaxed text-slate-600">{description}</span>
        <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">{meta}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-500 transition-transform group-active:translate-x-0.5" />
    </Link>
  );
}

function TrainingTestsPage() {
  const { category } = Route.useSearch();
  const active = CATEGORIES.find((i) => i.id === category);
  const [selectedTrainingCategory, setSelectedTrainingCategory] = useState<Category | null>(null);
  const [puttingFilter, setPuttingFilter] = useState<PuttingFilter>("all");
  const visibleTests = category === "putting" ? TESTS.putting.filter((test) => matchesPuttingFilter(test, puttingFilter)) : category ? TESTS[category] : [];

  return (
    <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-28 pt-6 text-foreground">
      {!category ? (
        <>
          <section className="rounded-[30px] border border-slate-300/80 bg-gradient-to-br from-slate-100/88 via-white/82 to-slate-100/74 p-5 shadow-[0_20px_48px_-32px_rgba(15,23,42,.42)] backdrop-blur-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Performance & träning</p>
            <h1 className="mt-2 font-display text-4xl leading-none text-slate-950">Mät. Slå PB. Bli bättre.</h1>
            <p className="mt-3 max-w-[31ch] text-[13px] leading-relaxed text-slate-600">Följ prestation och träningsprogress. Resultaten påverkar inte Total HCP direkt.</p>
          </section>

          <section className="mt-6">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">Kategori</p>
                <h2 className="mt-1 font-display text-3xl leading-none text-slate-950">Vad vill du träna?</h2>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">4 områden</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((item) => {
                const selected = selectedTrainingCategory === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedTrainingCategory(item.id)}
                    className={`group relative flex min-h-[174px] flex-col justify-between rounded-3xl border p-4 text-left backdrop-blur-2xl transition-all active:scale-[0.99] ${selected ? "border-blue-300/90 bg-gradient-to-br from-blue-100/72 via-white/82 to-sky-50/74 shadow-[0_20px_46px_-30px_rgba(37,99,235,.48)] ring-2 ring-blue-400/45" : "border-slate-300/80 bg-gradient-to-br from-slate-100/88 via-white/78 to-slate-100/72 shadow-[0_18px_44px_-32px_rgba(15,23,42,.4)]"}`}
                  >
                    {selected ? (
                      <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border border-blue-200 bg-white/90 text-blue-600 shadow-sm">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    ) : null}
                    <span className="block min-h-[102px] pr-5">
                      <span className="block min-h-[14px] text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">{item.title}</span>
                      <span className="mt-1 block min-h-[30px] font-display text-[26px] leading-none text-slate-950">{item.svTitle}</span>
                      <span className="mt-2 block min-h-[34px] text-[11px] leading-snug text-slate-600">{item.description}</span>
                    </span>
                    <span className="mt-4 flex items-center justify-between">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">{TESTS[item.id].length} tester</span>
                      <ChevronRight className={`h-4 w-4 shrink-0 transition-all ${selected ? "translate-x-0.5 text-blue-600" : "text-slate-500"}`} />
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedTrainingCategory ? (
              <Link
                to="/traning"
                search={{ category: selectedTrainingCategory }}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-300/80 bg-gradient-to-r from-sky-100/92 via-blue-100/88 to-cyan-100/82 py-4 font-display text-xl text-sky-900 shadow-[0_18px_38px_-26px_rgba(14,165,233,.6)] backdrop-blur-2xl transition-all active:scale-[0.99]"
              >
                Nästa <ChevronRight className="h-5 w-5" />
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-200/60 bg-sky-100/35 py-4 font-display text-xl text-sky-500/55 opacity-55 backdrop-blur-2xl"
              >
                Nästa <ChevronRight className="h-5 w-5" />
              </button>
            )}

            <Link
              to="/traning-progress"
              className="mt-4 flex w-full items-center gap-4 rounded-3xl border border-slate-300/80 bg-white/72 p-4 text-left shadow-[0_18px_44px_-32px_rgba(15,23,42,.35)] backdrop-blur-2xl transition-all active:scale-[0.99]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-300/80 bg-slate-100/80 text-slate-700">
                <BarChart3 className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-950">Analys & framsteg</span>
                <span className="mt-1 block text-[11px] leading-snug text-slate-600">En central analyssida per kategori med utveckling, historik och data samlat.</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" />
            </Link>
          </section>
        </>
      ) : (
        <section>
          <div className="flex items-center justify-between">
            <Link to="/traning" search={{ category: undefined }} aria-label="Tillbaka" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300/80 bg-white/70 shadow-sm backdrop-blur-xl"><ArrowLeft className="h-4 w-4" /></Link>
            <span className="rounded-full border border-slate-300/80 bg-slate-100/75 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600 backdrop-blur-xl">Träning</span>
          </div>

          <div className="mt-5 rounded-[30px] border border-slate-300/85 bg-gradient-to-br from-slate-100/88 via-white/82 to-slate-100/74 p-5 shadow-[0_20px_48px_-32px_rgba(15,23,42,.44)] backdrop-blur-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{active?.title.toUpperCase()}</p>
            <h2 className="mt-2 font-display text-4xl leading-none">{active?.svTitle}</h2>
            <p className="mt-3 text-[13px] leading-relaxed text-slate-600">{active?.hero}</p>
          </div>

          {category === "putting" ? (
            <>
              <Link to="/putting-data" className="mt-4 flex items-center justify-between rounded-3xl border border-slate-300/80 bg-white/62 px-4 py-3.5 shadow-[0_16px_36px_-30px_rgba(15,23,42,.5)] backdrop-blur-2xl">
                <span>
                  <span className="block text-sm font-semibold text-slate-900">Se central puttinganalys</span>
                  <span className="mt-0.5 block text-[11px] text-slate-600">Sänkprocent, längdkontroll, 3-putt-risk och puttingdata samlat</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
              </Link>

              <div className="mt-5">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Snabbfilter</p>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {PUTTING_FILTERS.map((filter) => {
                    const activeFilter = puttingFilter === filter.id;
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setPuttingFilter(filter.id)}
                        className={`shrink-0 rounded-full border px-4 py-2.5 text-[11px] font-bold transition-all active:scale-[0.97] ${activeFilter ? "border-slate-900 bg-slate-900 text-white shadow-sm" : "border-slate-300/85 bg-white/68 text-slate-600 backdrop-blur-xl"}`}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}

          <div className="mb-2 mt-5 flex items-center justify-between">
            <h2 className="font-display text-2xl leading-none">Tester</h2>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{category === "putting" ? `${visibleTests.length} av ${TESTS.putting.length}` : `${TESTS[category].length} områden`}</span>
          </div>
          <div className="space-y-3">{visibleTests.map((test) => <TestCard key={test.to} {...test} />)}</div>
        </section>
      )}
    </main>
  );
}