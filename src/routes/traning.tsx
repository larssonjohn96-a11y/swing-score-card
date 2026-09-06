import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Users } from "lucide-react";

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

const TESTS: Record<Category, TestItem[]> = {
  "off-the-tee": [
    {
      to: "/speed",
      title: "Speed Test",
      description:
        "Mät ball speed och club head speed och följ hur din fart utvecklas över tid. Speed visas i din SG4-profil och spindel, men räknas inte in i Total HCP.",
      meta: "Ball speed · Club speed · PB",
      skill: "Power",
      featured: true,
    },
    {
      to: "/longdrive",
      title: "Longest Drive",
      description:
        "Sex försök med driver. Jaga personbästa i carry och följ både längsta slag och snitt över tid.",
      meta: "6 drives · längsta carry · PB",
      skill: "Distance",
      featured: true,
    },
    {
      to: "/fairway-streak",
      title: "Fairway Streak",
      description:
        "Träffa en 30 m bred fairway och fortsätt så länge du lyckas. Första missen avslutar testet.",
      meta: "1 liv · fairways i rad · PB",
      skill: "Challenge",
      featured: true,
    },
    {
      to: "/driver-konsekvens",
      title: "Driver med konsekvens",
      description:
        "16 drives mot en 30 m fairway där kostnaden för vänster- och högermiss varierar hål för hål.",
      meta: "16 drives · 30 m fairway",
      skill: "Precision & konsekvens",
    },
  ],
  approach: [
    {
      to: "/approach-pei-valj",
      title: "Approach Precision",
      description:
        "Välj Wedge Precision 50–120 m, Iron Precision 120–190 m eller Total Approach 50–220 m.",
      meta: "50–220 m · PEI-metod",
      skill: "Approachprecision",
    },
    {
      to: "/shot-shaping",
      title: "Shot Shaping",
      description: "9 Window, konstant shape och växlande draw/fade.",
      meta: "3 tester · bollkontroll",
      skill: "Bollflykt & shape",
    },
  ],
  "around-the-green": [
    {
      to: "/8-bollar",
      title: "8-bollsövningen",
      description: "Chip, pitch, lobb och bunker från åtta stationer. Fem varv.",
      meta: "40 slag · max 160 poäng",
      skill: "Slagvariation",
    },
    {
      to: "/upp-och-in",
      title: "Up & Down Challenge",
      description: "10 lägen runt green. Spela slaget, putta ut och räkna dina up and downs.",
      meta: "10 situationer · konvertering %",
      skill: "Scoring",
    },
  ],
  putting: [
    {
      to: "/putting-streak",
      title: "Putting Streak",
      description:
        "En putt per nivå från 1 till 10 meter. Sätt den för att gå vidare. Första missen avslutar testet.",
      meta: "1 liv · progressiv stege · PB",
      skill: "Challenge",
      featured: true,
    },
    {
      to: "/pga-tour-18-puttar",
      title: "PGA Tour – 18 Puttar",
      description:
        "18 fasta avstånd från 0,6 till 16 meter. Håla ut och jämför total putting-score mot PGA Tour.",
      meta: "18 hål · 0,6–16 m",
      skill: "Total putting-performance",
    },
    {
      to: "/50-bollar",
      title: "25-bollsövningen",
      description: "Fem bollar från 1–5 meter. Håla ut varje boll och räkna alla slag.",
      meta: "25 bollar · 1–5 meter",
      skill: "Kortputt & hole-out",
    },
    {
      to: "/lagputt",
      title: "Lag putt",
      description: "Långa puttar där resultatet styrs av hur nära hålet bollen stannar.",
      meta: "18 puttar · 8–22 meter",
      skill: "Längdkontroll",
    },
    {
      to: "/tutor-test",
      title: "Tutor",
      description:
        "Isolerar hur konsekvent du kan starta bollen på avsedd linje genom Putting Tutor.",
      meta: "10 puttar · 20-test snitt",
      skill: "Startlinje",
    },
    {
      to: "/green-reading",
      title: "Green Reading",
      description:
        "Brytande puttar där du bedömer om du läste rätt linje, separat från om putten gick i.",
      meta: "10 puttar · max 20 poäng",
      skill: "Greenläsning",
    },
  ],
};

const CATEGORIES: Array<{ id: Category; title: string; description: string }> = [
  { id: "off-the-tee", title: "Off the Tee", description: "Speed, längd och driver-performance" },
  { id: "approach", title: "Approach", description: "Precision och shot shaping" },
  { id: "around-the-green", title: "Around the Green", description: "Slagvariation och scoring runt green" },
  { id: "putting", title: "Putting", description: "Challenges, putting-performance och specifika färdigheter" },
];

function TestCard({ to, title, description, meta, skill, featured }: TestItem) {
  return (
    <Link
      to={to}
      className={`flex w-full items-center gap-4 rounded-3xl border bg-card p-4 text-left shadow-[var(--shadow-glow)] transition-colors hover:border-primary ${
        featured ? "border-primary/35 bg-primary/[0.035]" : "border-border"
      }`}
    >
      <span className="min-w-0 flex-1">
        {skill ? (
          <span className="mb-1.5 inline-flex rounded-full bg-primary/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            {skill}
          </span>
        ) : null}
        <span className="block font-display text-2xl leading-none">{title}</span>
        <span className="mt-1 block text-xs leading-snug text-muted-foreground">{description}</span>
        <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{meta}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function TrainingTestsPage() {
  const { category } = Route.useSearch();
  const active = CATEGORIES.find((i) => i.id === category);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-10">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Performance & träning</p>
        <h1 className="mt-2 font-display text-4xl leading-none">Mät. Slå PB. Bli bättre.</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Här följer du rå prestation och träningsprogress. Speed, längd och övningsresultat påverkar inte Total HCP direkt.
        </p>
      </header>

      {!category ? (
        <section className="mt-7">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Vad vill du mäta eller träna?</p>
          <div className="mt-3 space-y-3">
            {CATEGORIES.map((item) => {
              const count = TESTS[item.id].length;
              return (
                <Link
                  key={item.id}
                  to="/traning"
                  search={{ category: item.id }}
                  className="flex w-full items-center gap-4 rounded-3xl border border-border bg-card p-4"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-2xl leading-none">{item.title}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{item.description}</span>
                    <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{count} tester</span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="mt-7">
          <Link
            to="/traning"
            search={{ category: undefined }}
            aria-label="Tillbaka"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <p className="mt-5 text-xs uppercase tracking-[0.2em] text-primary">{active?.title}</p>
          <h2 className="mt-1 font-display text-3xl leading-none">Performance & träning</h2>
          {category === "off-the-tee" ? (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Speed är en central del av din spelarprofil och visas i spindeldiagrammet, men räknas inte in i Total HCP. Följ fart, längd, streaks och driverkontroll här.
            </p>
          ) : category === "putting" ? (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Jaga PB i Putting Streak eller välj ett djupare test för total putting, kortputt, längdkontroll, startlinje eller greenläsning.
            </p>
          ) : category === "approach" ? (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Träna och mät precision från wedge till långa inspel eller testa din kontroll över bollflykten.
            </p>
          ) : null}
          <div className="mt-4 space-y-3">{TESTS[category].map((test) => <TestCard key={test.to} {...test} />)}</div>
          {category === "around-the-green" ? (
            <a
              href="/8-bollar-grupp"
              className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Users className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Testa 8-bollsövningen tillsammans</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">2–4 spelare · en person registrerar för gruppen</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </a>
          ) : null}
        </section>
      )}

      <Link to="/tester" className="mt-8 inline-block rounded-full border border-border px-4 py-2 text-sm text-muted-foreground">
        Tillbaka till HCP-tester
      </Link>
    </main>
  );
}
