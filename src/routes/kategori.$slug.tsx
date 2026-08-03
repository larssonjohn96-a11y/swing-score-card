import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { findCategory, CATEGORIES, type Category, type CategoryTest } from "@/lib/categories";
import { loadBunkerSessions } from "@/lib/bunker";
import { loadSpeedEntries } from "@/lib/speed";
import { loadLongDriveSessions, sessionBest } from "@/lib/longdrive";
import { loadFairwaySessions, fairwayHitRate } from "@/lib/fairway";

export const Route = createFileRoute("/kategori/$slug")({
  loader: ({ params }) => {
    const category = findCategory(params.slug);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Kategorin hittades inte" }, { name: "robots", content: "noindex" }],
      };
    }
    const { title, description } = loaderData.category;
    return {
      meta: [
        { title: `${title} – golftester` },
        {
          name: "description",
          content: `${description} Kör testerna och följ utvecklingen över tid.`,
        },
        { property: "og:title", content: `${title} – golftester` },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  notFoundComponent: CategoryNotFound,
  component: CategoryPage,
});

function CategoryNotFound() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-16">
      <h1 className="text-4xl">Kategorin finns inte</h1>
      <Link
        to="/"
        className="mt-6 inline-block rounded-full border border-border px-4 py-2 text-sm"
      >
        Till menyn
      </Link>
    </main>
  );
}

function CategoryPage() {
  const { category } = Route.useLoaderData() as { category: Category };
  const [last, setLast] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    const d = loadBunkerSessions();
    const sp = loadSpeedEntries();
    const ld = loadLongDriveSessions();
    const fw = loadFairwaySessions();
    setLast({
      "/fairway": fw.length
        ? `Senast ${fw[fw.length - 1].points.toFixed(0)} p · ${(fairwayHitRate(fw[fw.length - 1].drives) * 100).toFixed(0)}% fairway`
        : undefined,
      "/longdrive": ld.length
        ? `Senast ${sessionBest(ld[ld.length - 1]).toFixed(0)} ${ld[ld.length - 1].unit} längsta carry`
        : undefined,
      "/speed": sp.length
        ? `Senast ${sp[sp.length - 1].ballSpeed.toFixed(1)} mph ball speed`
        : undefined,
      "/bunker": d.length ? `Senast ${d[d.length - 1].avgFeet.toFixed(1)} fot i snitt` : undefined,
    });
  }, []);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-10">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            {category.subtitle}
          </p>
          <h1 className="text-4xl leading-none">{category.title}</h1>
        </div>
        <Link
          to="/"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Tillbaka
        </Link>
      </header>

      <p className="mt-3 text-sm text-muted-foreground">{category.description}</p>

      <section className="mt-8 space-y-4">
        {category.tests.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            Inga tester här ännu. Säg till så lägger vi in dem.
          </div>
        ) : (
          category.tests.map((t: CategoryTest) => (
            <Link
              key={t.to}
              to={t.to}
              className="block rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-glow)] transition-colors hover:border-primary"
            >
              <div className="flex items-start gap-4">
                <div>
                  <h2 className="text-3xl leading-none">{t.title}</h2>
                  <p className="text-sm text-muted-foreground">{t.subtitle}</p>
                </div>
              </div>
              <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                {t.bullets.map((b: string) => (
                  <li key={b} className="flex gap-2">
                    <span className="text-flag">•</span>
                    {b}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs uppercase tracking-[0.2em] text-flag">{t.result}</p>
              {last[t.to] ? (
                <p className="mt-2 text-xs text-muted-foreground">{last[t.to]}</p>
              ) : null}
            </Link>
          ))
        )}
      </section>

      <nav className="mt-10">
        <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
          Andra kategorier
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {CATEGORIES.filter((c) => c.slug !== category.slug).map((c) => (
            <Link
              key={c.slug}
              to="/kategori/$slug"
              params={{ slug: c.slug }}
              className="rounded-2xl border border-border bg-card px-3 py-3 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {c.title}
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
