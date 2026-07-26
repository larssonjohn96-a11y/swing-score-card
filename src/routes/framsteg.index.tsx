import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, TrendingUp } from "lucide-react";
import { categoryProgress, type CategoryProgress } from "@/lib/progress";

export const Route = createFileRoute("/framsteg/")({
  head: () => ({
    meta: [
      { title: "Framsteg – följ din utveckling per kategori | SG4" },
      {
        name: "description",
        content:
          "Se hur du utvecklas i driving, approach, around the green och puttning – och klicka in på varje enskilt test.",
      },
      { property: "og:title", content: "Framsteg – följ din utveckling per kategori" },
      {
        property: "og:description",
        content: "Progress per kategori och per test, med grafer över tid.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const [cats, setCats] = useState<CategoryProgress[]>([]);

  useEffect(() => {
    setCats(categoryProgress());
  }, []);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-10">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">SG4</p>
      <h1 className="mt-2 flex items-center gap-2 font-display text-4xl leading-none">
        <TrendingUp className="h-7 w-7 text-primary" />
        Framsteg
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Välj en kategori för att se utvecklingen i varje test över tid.
      </p>

      <div className="mt-8 space-y-3">
        {cats.map((c) => {
          const withData = c.summaries.filter((s) => s.points.length);
          return (
            <Link
              key={c.slug}
              to="/framsteg/$slug"
              params={{ slug: c.slug }}
              className="flex items-center justify-between gap-3 rounded-3xl border border-border bg-card p-5 transition-colors hover:border-primary"
            >
              <div>
                <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  {c.subtitle}
                </span>
                <h2 className="mt-1 font-display text-2xl leading-none">{c.title}</h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  {c.summaries.length === 0
                    ? "Inga tester ännu"
                    : withData.length === 0
                      ? `${c.summaries.length} test · inga resultat än`
                      : `${withData.length} av ${c.summaries.length} test · ${c.sessions} registrerade pass`}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </Link>
          );
        })}
      </div>

      <Link
        to="/"
        className="mt-8 inline-block rounded-full border border-border px-4 py-2 text-sm text-muted-foreground"
      >
        Till menyn
      </Link>
    </main>
  );
}
