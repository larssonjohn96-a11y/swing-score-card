import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { findCategory, type Category } from "@/lib/categories";
import { summarize, testsForCategory, type ProgressSummary } from "@/lib/progress";

export const Route = createFileRoute("/framsteg/$slug")({
  loader: ({ params }) => {
    const category = findCategory(params.slug);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Kategorin hittades inte" }, { name: "robots", content: "noindex" }] };
    }
    const { title } = loaderData.category;
    return {
      meta: [
        { title: `Framsteg i ${title} | SG4` },
        {
          name: "description",
          content: `Se hur dina resultat i ${title} utvecklas över tid, test för test.`,
        },
        { property: "og:title", content: `Framsteg i ${title}` },
        { property: "og:description", content: `Utveckling per test i ${title}.` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  notFoundComponent: ProgressCategoryNotFound,
  component: ProgressCategoryPage,
});

function ProgressCategoryNotFound() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-16">
      <h1 className="font-display text-4xl">Kategorin finns inte</h1>
      <Link
        to="/framsteg"
        className="mt-6 inline-block rounded-full border border-border px-4 py-2 text-sm"
      >
        Till framsteg
      </Link>
    </main>
  );
}

function ProgressCategoryPage() {
  const { category } = Route.useLoaderData() as { category: Category };
  const [summaries, setSummaries] = useState<ProgressSummary[]>([]);

  useEffect(() => {
    setSummaries(testsForCategory(category.slug).map(summarize));
  }, [category.slug]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-10">
      <Link to="/framsteg" className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
        ← Framsteg
      </Link>
      <h1 className="mt-3 font-display text-4xl leading-none">{category.title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{category.description}</p>

      {summaries.length === 0 ? (
        <p className="mt-10 rounded-3xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          Inga tester i den här kategorin ännu.
        </p>
      ) : (
        <div className="mt-8 space-y-3">
          {summaries.map((s) => (
            <Link
              key={s.test.id}
              to="/framsteg/$slug/$test"
              params={{ slug: category.slug, test: s.test.id }}
              className="flex items-center justify-between gap-3 rounded-3xl border border-border bg-card p-5 transition-colors hover:border-primary"
            >
              <div>
                <h2 className="font-display text-xl leading-none">{s.test.title}</h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  {s.points.length === 0
                    ? "Inga resultat än"
                    : `${s.points.length} pass · senast ${s.latest!.toFixed(s.test.decimals)} ${s.test.unit}`.trim()}
                </p>
                {s.points.length > 1 && (
                  <p
                    className={`mt-1 text-xs font-medium ${s.delta! >= 0 ? "text-primary" : "text-destructive"}`}
                  >
                    {s.delta! >= 0 ? "+" : ""}
                    {s.delta!.toFixed(s.test.decimals)} sedan start
                  </p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
