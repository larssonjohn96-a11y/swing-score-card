import { Link, createFileRoute } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";

export const Route = createFileRoute("/tester")({
  head: () => ({
    meta: [
      { title: "Alla tester – SG4" },
      {
        name: "description",
        content: "Testa din nivå inom approach, putting, off the tee och shortgame.",
      },
      { property: "og:title", content: "Alla tester – SG4" },
      {
        property: "og:description",
        content: "Välj en kategori, gör testet och få din HCP-nivå.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TesterPage,
});

type CardConfig = {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
};

const CARDS: CardConfig[] = [
  {
    slug: "approach",
    eyebrow: "Inspel mot green",
    title: "Approach",
    description: "Precision, avståndskontroll och känsla på inspel mot green.",
  },
  {
    slug: "puttning",
    eyebrow: "På greenen",
    title: "Putting",
    description: "Tester för längdkänsla, riktning och korta puttar.",
  },
  {
    slug: "driving",
    eyebrow: "Utslag",
    title: "Off the Tee",
    description: "Längd, precision och träffsäkerhet från tee.",
  },
  {
    slug: "around-the-green",
    eyebrow: "Runt greenen",
    title: "Shortgame",
    description: "Chip, pitch, bunker och svåra lägen runt greenen.",
  },
];

function TesterPage() {
  const cards = CARDS.filter((c) => CATEGORIES.some((cat) => cat.slug === c.slug));

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-10">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Din nivå
        </p>
        <h1 className="mt-1 text-4xl leading-none">Tester</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Välj en kategori, gör testet och få din HCP-nivå.
        </p>
      </header>

      <section className="mt-6 space-y-3">
        {cards.map(({ slug, eyebrow, title, description }) => (
          <Link
            key={slug}
            to="/kategori/$slug"
            params={{ slug }}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm transition-colors hover:border-primary"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {eyebrow}
              </p>
              <h2 className="mt-0.5 text-2xl leading-none">{title}</h2>
              <p className="mt-1.5 text-sm leading-snug text-muted-foreground">{description}</p>
              <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">
                HCP-test
              </span>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </section>

      <section className="mt-8 border-t border-border pt-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Ej HCP-grundande
        </p>
        <Link
          to="/traning"
          className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm transition-colors hover:border-primary"
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl leading-none">Träningstester</h2>
            <p className="mt-1.5 text-sm leading-snug text-muted-foreground">
              Puttning, närspel, wedges och shot shaping. Följ progress utan att påverka ditt HCP.
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Link>
      </section>

    </main>
  );
}
