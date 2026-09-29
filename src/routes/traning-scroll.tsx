import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, ChevronRight, Crosshair, Grid3x3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { rankEngineActivities, type EngineSkill } from "@/lib/sg4-engine";
import { recordRecommendationImpressions, recordRecommendationOpen } from "@/lib/sg4-recommender";
import { LIGHT_SURFACE } from "./8-bollar";

type Category = "off-the-tee" | "approach" | "around-the-green" | "putting";

const CATEGORY_ENGINE_SKILL: Record<Category, EngineSkill> = {
  "off-the-tee": "driver",
  approach: "approach",
  "around-the-green": "chip",
  putting: "putting",
};

export const Route = createFileRoute("/traning-scroll")({
  component: TrainingScrollPage,
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
  | "/bunker-traning"
  | "/shot-shaping";

type TestItem = {
  to: TestRoute;
  title: string;
  description: string;
  meta: string;
  skill?: string;
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
    { to: "/speed", title: "Speed Test", description: "Mät ball speed och club head speed och följ hur din fart utvecklas över tid.", meta: "Ball speed · Club speed · PB", skill: "Power" },
    { to: "/longdrive", title: "Longest Drive", description: "Tre försök med driver. Jaga personbästa i total längd och följ snittet över tid.", meta: "3 drives · total längd · PB", skill: "Distance" },
    { to: "/fairway-streak", title: "Fairway Streak", description: "Träffa en 30 m bred fairway och fortsätt så länge du lyckas.", meta: "1 liv · fairways i rad · PB", skill: "Challenge" },
    { to: "/driver-konsekvens", title: "Driver med konsekvens", description: "16 drives mot en 30 m fairway där kostnaden för vänster- och högermiss varierar.", meta: "16 drives · 30 m fairway", skill: "Precision" },
  ],
  approach: [
    { to: "/approach-pei-valj", title: "Approach Precision", description: "Precision från wedge till långa inspel.", meta: "50–220 m · PEI-metod", skill: "Approachprecision" },
    { to: "/shot-shaping", title: "Shot Shaping", description: "Kontrollera höjd, draw och fade.", meta: "3 tester · bollkontroll", skill: "Bollflykt & shape" },
  ],
  "around-the-green": [
    { to: "/8-bollar", title: "8-bollsövningen", description: "Chip, pitch, lobb och bunker från åtta stationer. Fem varv.", meta: "40 slag · max 160 poäng", skill: "Slagvariation" },
    { to: "/upp-och-in", title: "Up & Down Challenge", description: "10 lägen runt green. Följ hur nära flaggan bollen stannar.", meta: "10 situationer · närhet", skill: "Scoring" },
    { to: "/bunker-traning", title: "Bunkerträning", description: "Bygg en bunker-session med olika lies och avstånd.", meta: "5, 10 eller 20 slag", skill: "Bunkerprecision" },
  ],
  putting: [
    { to: "/putting-streak", title: "Putting Streak", description: "En putt per nivå från 1 till 10 meter. Första missen avslutar testet.", meta: "1 liv · progressiv stege · PB", skill: "Challenge" },
    { to: "/lagputt-ladder", title: "Lag Putt Ladder", description: "Börja på 8 meter och gå upp två meter per nivå.", meta: "8–30 m · max 2 puttar · PB", skill: "Challenge" },
    { to: "/klock-putt", title: "Klockan", description: "12 puttar från fyra positioner och tre avstånd.", meta: "12 puttar · score 0–16", skill: "Scoring" },
    { to: "/pga-tour-18-puttar", title: "PGA Tour – 18 Puttar", description: "18 fasta avstånd från 0,6 till 16 meter.", meta: "18 hål · 0,6–16 m", skill: "Total putting" },
    { to: "/50-bollar", title: "25-bollsövningen", description: "Fem bollar från 1–5 meter. Håla ut varje boll och räkna alla slag.", meta: "25 bollar · 1–5 meter", skill: "Kortputt" },
    { to: "/lagputt", title: "Lag putt", description: "Långa puttar där resultatet styrs av hur nära hålet bollen stannar.", meta: "18 puttar · 8–22 meter", skill: "Längdkontroll" },
    { to: "/tutor-test", title: "Tutor", description: "Isolerar hur konsekvent du kan starta bollen på avsedd linje.", meta: "10 puttar · 20-test snitt", skill: "Startlinje" },
    { to: "/green-reading", title: "Green Reading", description: "Brytande puttar där du bedömer om du läste rätt linje.", meta: "10 puttar · max 20 poäng", skill: "Greenläsning" },
  ],
};

const SECTIONS: Array<{ id: Category; eyebrow: string; title: string; description: string }> = [
  { id: "off-the-tee", eyebrow: "Off the Tee", title: "Utslag", description: "Fart, längd och driverkontroll" },
  { id: "approach", eyebrow: "Approach", title: "Inspel", description: "Precision och bollkontroll" },
  { id: "around-the-green", eyebrow: "Around the Green", title: "Närspel", description: "Slagvariation, närspel och scoring" },
  { id: "putting", eyebrow: "Putting", title: "Puttning", description: "Startlinje, kortputt och längdkontroll" },
];

function matchesPuttingFilter(test: TestItem, filter: PuttingFilter) {
  if (filter === "all") return true;
  if (filter === "short") return ["/putting-streak", "/klock-putt", "/50-bollar", "/pga-tour-18-puttar"].includes(test.to);
  if (filter === "start-line") return ["/tutor-test", "/klock-putt", "/50-bollar"].includes(test.to);
  if (filter === "distance") return ["/lagputt-ladder", "/lagputt", "/putting-streak", "/pga-tour-18-puttar"].includes(test.to);
  return test.to === "/green-reading";
}

function TrainingCard({ test }: { test: TestItem }) {
  const Icon = test.to === "/shot-shaping" || test.to === "/tutor-test" ? Grid3x3 : Crosshair;
  return (
    <Link
      to={test.to}
      onClick={() => recordRecommendationOpen(test.to)}
      className="group flex h-[220px] w-[164px] shrink-0 flex-col justify-between rounded-[24px] border border-slate-200 bg-white p-4 text-left shadow-sm transition active:scale-[.98]"
    >
      <div>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <Icon className="h-4.5 w-4.5" />
        </span>
        {test.skill ? <p className="mt-4 text-[9px] font-black uppercase tracking-[.15em] text-slate-400">{test.skill}</p> : null}
        <h3 className="mt-1 font-display text-[24px] leading-[.96] text-slate-950">{test.title}</h3>
        <p className="mt-2 line-clamp-3 text-[11px] leading-snug text-slate-500">{test.description}</p>
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="line-clamp-2 text-[9px] font-bold uppercase tracking-[.11em] text-slate-400">{test.meta}</p>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-active:translate-x-0.5" />
      </div>
    </Link>
  );
}

function TrainingScrollPage() {
  const [puttingFilter, setPuttingFilter] = useState<PuttingFilter>("all");

  const rankedTests = useMemo(() => {
    return Object.fromEntries(
      SECTIONS.map((section) => {
        const source = section.id === "putting"
          ? TESTS.putting.filter((test) => matchesPuttingFilter(test, puttingFilter))
          : TESTS[section.id];
        const ranked = rankEngineActivities(
          source.map((test) => ({ ...test, id: test.to, engineSkill: CATEGORY_ENGINE_SKILL[section.id] })),
          "learning",
        );
        return [section.id, ranked];
      }),
    ) as Record<Category, TestItem[]>;
  }, [puttingFilter]);

  const impressionKey = SECTIONS.flatMap((section) => rankedTests[section.id].map((test) => test.to)).join("|");

  useEffect(() => {
    if (impressionKey) recordRecommendationImpressions(impressionKey.split("|"));
  }, [impressionKey]);

  return (
    <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background pb-28 text-foreground">
      <header className="sticky top-0 z-30 border-b border-slate-200/75 bg-background/92 px-5 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="grid grid-cols-[40px_1fr_40px] items-center">
          <Link to="/" aria-label="Tillbaka" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-[.18em] text-slate-400">SG4</p>
            <p className="text-[15px] font-bold text-slate-950">Träning</p>
          </div>
          <span aria-hidden="true" />
        </div>
      </header>

      <section className="px-5 pt-7">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Practice Area</p>
        <h1 className="mt-1 font-display text-[40px] leading-[.98] text-slate-950">Träna. Mät. Bli bättre.</h1>
        <p className="mt-4 max-w-sm text-[15px] font-medium leading-[1.5] text-slate-600">
          Alla träningsområden på en sida. Scrolla mellan kategorier och välj en utmaning direkt.
        </p>

        <Link to="/traning-progress" className="mt-5 flex items-center gap-3 rounded-[22px] border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><BarChart3 className="h-4.5 w-4.5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-950">Analys & framsteg</span>
            <span className="mt-0.5 block text-[11px] text-slate-500">Se utveckling, historik och resultat från din träning.</span>
          </span>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
      </section>

      <div className="space-y-9 pt-9">
        {SECTIONS.map((section) => (
          <section key={section.id}>
            <div className="px-5">
              <p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-400">{section.eyebrow}</p>
              <div className="mt-1 flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-[30px] leading-none text-slate-950">{section.title}</h2>
                  <p className="mt-1.5 text-[11px] text-slate-500">{section.description}</p>
                </div>
                <span className="shrink-0 text-[9px] font-bold uppercase tracking-[.13em] text-slate-400">{rankedTests[section.id].length} val</span>
              </div>

              {section.id === "putting" ? (
                <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {PUTTING_FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setPuttingFilter(filter.id)}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold transition ${puttingFilter === filter.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-transparent text-slate-500"}`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-3.5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {rankedTests[section.id].map((test) => <TrainingCard key={test.to} test={test} />)}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
