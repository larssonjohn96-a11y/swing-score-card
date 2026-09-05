import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Dumbbell, Target } from "lucide-react";

type Category = "putting" | "around-the-green" | "approach";

const CATEGORY_IDS: Category[] = ["approach", "around-the-green", "putting"];

export const Route = createFileRoute("/traning")({
  validateSearch: (search: Record<string, unknown>) => ({
    category:
      typeof search.category === "string" && CATEGORY_IDS.includes(search.category as Category)
        ? (search.category as Category)
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Träningstester | SG4" },
      {
        name: "description",
        content:
          "Färdigbyggda träningstester för putting, around the green, approach och shot shaping. Följ din utveckling utan att påverka SG4 HCP.",
      },
      { property: "og:title", content: "Träningstester | SG4" },
      {
        property: "og:description",
        content: "Testa, följ progress och träna rätt – helt separat från dina HCP-tester.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrainingTestsPage,
});

type TestRoute =
  | "/lagputt"
  | "/50-bollar"
  | "/tutor-test"
  | "/8-bollar"
  | "/approach-pei-valj"
  | "/green-reading"
  | "/upp-och-in"
  | "/wedge-stege"
  | "/shot-shaping";

type TestItem = { to: TestRoute; title: string; description: string; meta: string };

const TESTS: Record<Category, TestItem[]> = {
  putting: [
    {
      to: "/tutor-test",
      title: "Tutor",
      description:
        "10 puttar genom Putting Tutor. Isolera startlinjen och följ ditt rullande 20-testerssnitt.",
      meta: "10 puttar · startlinje · 20-test snitt",
    },
    {
      to: "/lagputt",
      title: "Lag putt",
      description:
        "18 puttar från 8 till 22 meter. Signerad poäng per putt – lägre totalscore är bättre.",
      meta: "18 puttar · 8–22 meter",
    },
    {
      to: "/50-bollar",
      title: "50-bollsövningen",
      description:
        "50 puttar från 1 till 5 meter. Räkna varje slag tills alla bollar är hålade och slå ditt personbästa.",
      meta: "50 bollar · par 72 · PB",
    },
    {
      to: "/green-reading",
      title: "Green Reading",
      description:
        "10 brytande puttar där du bedömer läsning och startlinje – inte bara om putten föll.",
      meta: "10 puttar · max 20 poäng",
    },
  ],
  "around-the-green": [
    {
      to: "/8-bollar",
      title: "8-bollsövningen",
      description: "Chip, pitch, lobb och bunker från åtta stationer. Fem varv.",
      meta: "40 slag · max 160 poäng",
    },
    {
      to: "/upp-och-in",
      title: "Up & Down Challenge",
      description:
        "10 lägen runt green. Spela slaget, putta ut och räkna dina up and downs.",
      meta: "10 situationer · konvertering %",
    },
  ],
  approach: [
    {
      to: "/approach-pei-valj",
      title: "PEI Precision",
      description:
        "Mät din precision och följ utvecklingen inom wedge, järn eller hela approachspelet.",
      meta: "Wedge · järn · total",
    },
    {
      to: "/wedge-stege",
      title: "Wedgestege",
      description:
        "40 till 90 meter, två bollar per avstånd. Kalibrera dina wedgeavstånd.",
      meta: "12 slag · 40–90 meter",
    },
    {
      to: "/shot-shaping",
      title: "Shot Shaping",
      description:
        "Underfamilj med tre tester: 9 Window Drill, konstant shape och växlande draw/fade.",
      meta: "3 tester · bollkontroll",
    },
  ],
};

const CATEGORIES: Array<{ id: Category; title: string; description: string }> = [
  { id: "approach", title: "Approach", description: "Wedges, järn, avståndskontroll och shot shaping" },
  { id: "around-the-green", title: "Around the Green", description: "Chip, pitch, lobb och bunker" },
  { id: "putting", title: "Putting", description: "Startlinje, greenläsning och längdkontroll" },
];

function TestCard({ to, title, description, meta }: TestItem) {
  return (
    <Link
      to={to}
      className="flex w-full items-center gap-4 rounded-3xl border border-border bg-card p-4 text-left shadow-[var(--shadow-glow)] transition-colors hover:border-primary"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-display text-2xl leading-none">{title}</span>
        <span className="mt-1 block text-xs leading-snug text-muted-foreground">{description}</span>
        <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
          {meta}
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function TrainingTestsPage() {
  const { category } = Route.useSearch();
  const active = CATEGORIES.find((item) => item.id === category);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-10">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Träningstester</p>
        <h1 className="mt-2 flex items-center gap-2 font-display text-4xl leading-none">
          <Dumbbell className="h-7 w-7 text-primary" />
          Träna & följ progress
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Färdigbyggda tester för sådant golfare redan tränar på. De påverkar inte ditt SG4 HCP.
        </p>
      </header>

      {!category ? (
        <section className="mt-7">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Vad vill du träna?
          </p>
          <div className="mt-3 space-y-3">
            {CATEGORIES.map((item) => {
              const count = TESTS[item.id].length;
              return (
                <Link
                  key={item.id}
                  to="/traning"
                  search={{ category: item.id }}
                  className="flex w-full items-center gap-4 rounded-3xl border border-border bg-card p-4 text-left shadow-[var(--shadow-glow)] transition-colors hover:border-primary"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-tint-strong text-primary">
                    <Target className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-2xl leading-none">{item.title}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {item.description}
                    </span>
                    <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                      {count} {count === 1 ? "färdigt test" : "färdiga tester"}
                    </span>
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
          <h2 className="mt-1 font-display text-3xl leading-none">Träningstester</h2>
          <div className="mt-4 space-y-3">
            {TESTS[category].map((test) => (
              <TestCard key={test.to} {...test} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-10 border-t border-border pt-5">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Behöver du något eget?
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Bygg eget test finns kvar som ett sekundärt verktyg och byggs vidare när de viktigaste
          färdigtesterna är på plats.
        </p>
      </div>
      <Link
        to="/tester"
        className="mt-6 inline-block rounded-full border border-border px-4 py-2 text-sm text-muted-foreground"
      >
        Tillbaka till tester
      </Link>
    </main>
  );
}
