import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";

type Category = "off-the-tee" | "approach" | "around-the-green" | "putting";

const CATEGORY_IDS: Category[] = ["off-the-tee", "approach", "around-the-green", "putting"];

export const Route = createFileRoute("/traning-progress")({
  validateSearch: (search: Record<string, unknown>) => ({
    category:
      typeof search.category === "string" && CATEGORY_IDS.includes(search.category as Category)
        ? (search.category as Category)
        : undefined,
  }),
  component: TrainingProgressPage,
});

const CATEGORIES: Array<{ id: Category; title: string; description: string }> = [
  { id: "off-the-tee", title: "Off the Tee", description: "Driver, precision och konsekvens" },
  { id: "approach", title: "Approach", description: "Precision och bollkontroll" },
  { id: "around-the-green", title: "Around the Green", description: "Slagvariation och scoring" },
  { id: "putting", title: "Putting", description: "Puttingtester och specifika färdigheter" },
];

type ProgressRoute =
  | "/driver-konsekvens-historik"
  | "/approach-pei-historik"
  | "/8-bollar-historik"
  | "/upp-och-in-historik"
  | "/pga-tour-18-puttar-historik"
  | "/green-reading-historik";

type ProgressItem = {
  title: string;
  description: string;
  to: ProgressRoute;
};

const PROGRESS_TESTS: Record<Category, ProgressItem[]> = {
  "off-the-tee": [
    {
      title: "Driver med konsekvens",
      description: "Följ precision och resultat över tid.",
      to: "/driver-konsekvens-historik",
    },
  ],
  approach: [
    {
      title: "Approach Precision",
      description: "Följ din approachprecision över tid.",
      to: "/approach-pei-historik",
    },
  ],
  "around-the-green": [
    {
      title: "8-bollsövningen",
      description: "Total score, utveckling och profil för chip, pitch, lobb och bunker.",
      to: "/8-bollar-historik",
    },
    {
      title: "Up & Down Challenge",
      description: "Följ scoring och konvertering runt green.",
      to: "/upp-och-in-historik",
    },
  ],
  putting: [
    {
      title: "PGA Tour – 18 Puttar",
      description: "Följ total putting-score över tid.",
      to: "/pga-tour-18-puttar-historik",
    },
    {
      title: "Green Reading",
      description: "Följ din greenläsning över tid.",
      to: "/green-reading-historik",
    },
  ],
};

function TrainingProgressPage() {
  const { category } = Route.useSearch();
  const active = CATEGORIES.find((item) => item.id === category);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-6">
      <header>
        <div className="flex items-center gap-3">
          <Link
            to="/traning"
            aria-label="Tillbaka till Träning"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Träning</p>
            <h1 className="mt-1 font-display text-3xl leading-none">Analys & framsteg</h1>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Här visas bara historik, analys och utveckling från dina träningstester. Resultaten påverkar inte ditt SG4-handicap.
        </p>
      </header>

      {!category ? (
        <section className="mt-7">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Välj kategori</p>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">4 områden</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {CATEGORIES.map((item) => (
              <Link
                key={item.id}
                to="/traning-progress"
                search={{ category: item.id }}
                className="flex min-h-[142px] w-full flex-col justify-between rounded-3xl border border-border bg-card p-4 text-left shadow-[var(--shadow-glow)] transition-colors hover:border-primary"
              >
                <span>
                  <span className="block font-display text-[25px] leading-[0.95]">{item.title}</span>
                  <span className="mt-2 block text-[11px] leading-snug text-muted-foreground">{item.description}</span>
                </span>
                <span className="mt-4 flex items-center justify-between">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-primary">
                    {PROGRESS_TESTS[item.id].length} vy{PROGRESS_TESTS[item.id].length === 1 ? "" : "er"}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="mt-7">
          <Link
            to="/traning-progress"
            search={{ category: undefined }}
            aria-label="Tillbaka till kategorier"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <p className="mt-5 text-xs uppercase tracking-[0.2em] text-primary">{active?.title}</p>
          <h2 className="mt-1 font-display text-3xl leading-none">Analys & framsteg</h2>
          <div className="mt-4 space-y-3">
            {PROGRESS_TESTS[category].map((test) => (
              <Link
                key={test.to}
                to={test.to}
                className="flex w-full items-center gap-4 rounded-3xl border border-border bg-card p-4 text-left shadow-[var(--shadow-glow)] transition-colors hover:border-primary"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-2xl leading-none">{test.title}</span>
                  <span className="mt-1 block text-xs leading-snug text-muted-foreground">{test.description}</span>
                  <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Se analys & framsteg
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
