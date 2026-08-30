import { Link, createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Dumbbell } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import {
  ApproachCategoryIcon,
  AroundGreenCategoryIcon,
  DrivingCategoryIcon,
  PuttingCategoryIcon,
} from "@/components/category-icons";

export const Route = createFileRoute("/tester")({
  head: () => ({
    meta: [
      { title: "Alla tester – SG4" },
      {
        name: "description",
        content:
          "Bläddra bland alla golftester i SG4: driving, approach, around the green, puttning och egna träningstester.",
      },
    ],
  }),
  component: TesterPage,
});

const CATEGORY_ICONS: Record<string, (props: { className?: string }) => React.ReactNode> = {
  driving: DrivingCategoryIcon,
  approach: ApproachCategoryIcon,
  "around-the-green": AroundGreenCategoryIcon,
  puttning: PuttingCategoryIcon,
};

function TesterPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-10">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Bläddra</p>
        <h1 className="text-4xl leading-none">Tester</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Välj en kategori för att se och starta dess tester.
        </p>
      </header>

      <section className="mt-6 space-y-4">
        {CATEGORIES.map((c) => {
          const Icon = CATEGORY_ICONS[c.slug];
          return (
            <Link
              key={c.slug}
              to="/kategori/$slug"
              params={{ slug: c.slug }}
              className="flex items-center gap-4 rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-glow)] transition-colors hover:border-primary"
            >
              <span className="shrink-0 overflow-hidden rounded-full">
                {Icon ? <Icon className="h-14 w-14" /> : null}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl leading-none">{c.title}</h2>
                <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {c.subtitle}
                </p>
                <p className="mt-1 text-sm leading-snug text-muted-foreground">{c.description}</p>
                <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-flag">
                  {c.tests.length > 0
                    ? `${c.tests.length} test${c.tests.length === 1 ? "" : "er"}`
                    : "Kommer snart"}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </Link>
          );
        })}

        <Link
          to="/traning"
          className="flex items-center gap-4 rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-glow)] transition-colors hover:border-primary"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground">
            <Dumbbell className="h-7 w-7" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl leading-none">Träningstester</h2>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Egen progress
            </p>
            <p className="mt-1 text-sm leading-snug text-muted-foreground">
              Bygg egna tester för att mäta och följa din träning över tid.
            </p>
            <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-flag">
              Skapa eget test
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Link>
      </section>
    </main>
  );
}
