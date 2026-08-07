import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { findCategory, CATEGORIES, type Category, type CategoryTest } from "@/lib/categories";
import { loadBunkerSessions } from "@/lib/bunker";
import { loadSpeedSessions } from "@/lib/speed";
import { loadLongDriveSessions, sessionBest } from "@/lib/longdrive";
import { loadFairwaySessions, fairwayHitRate } from "@/lib/fairway";
import { loadPrecisionSessions } from "@/lib/precision-store";
import { loadOffTeeSessions } from "@/lib/offtee-store";
import { GreenHero } from "@/components/precision-visuals";
import { TeeHero } from "@/components/offtee-visuals";
import { PuttingHero } from "@/components/shortputt-visuals";
import { SpeedHero } from "@/components/speed-visuals";

/** Liten hero-thumbnail per test, samma illustration som testets egen landningssida. */
const TEST_THUMBNAILS: Partial<Record<CategoryTest["to"], () => React.ReactNode>> = {
  "/approach": () => <GreenHero className="h-16 w-16" />,
  "/offtee-test": () => <TeeHero className="h-16 w-16" />,
  "/short-putting-test": () => <PuttingHero className="h-16 w-16" />,
  "/speed-test": () => <SpeedHero className="h-16 w-16" />,
};

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
    const sp = loadSpeedSessions();
    const ld = loadLongDriveSessions();
    const fw = loadFairwaySessions();
    const precision = loadPrecisionSessions();
    const lastPrecision = precision[precision.length - 1];
    const offtee = loadOffTeeSessions();
    const lastOfftee = offtee[offtee.length - 1];
    setLast({
      "/fairway": fw.length
        ? `Senast ${fw[fw.length - 1].points.toFixed(0)} p · ${(fairwayHitRate(fw[fw.length - 1].drives) * 100).toFixed(0)}% fairway`
        : undefined,
      "/longdrive": ld.length
        ? `Senast ${sessionBest(ld[ld.length - 1]).toFixed(0)} ${ld[ld.length - 1].unit} längsta carry`
        : undefined,
      "/speed-test": sp.length
        ? `Senast ${sp[sp.length - 1].avgBallSpeed.toFixed(1)} mph ball speed`
        : undefined,
      "/bunker": d.length ? `Senast ${d[d.length - 1].avgFeet.toFixed(1)} fot i snitt` : undefined,
      "/approach":
        lastPrecision?.score !== undefined
          ? `Senast ${lastPrecision.score.toFixed(0)} / 100`
          : undefined,
      "/offtee-test": lastOfftee ? `Senast ${lastOfftee.score.toFixed(0)} / 100` : undefined,
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
          category.tests.map((t: CategoryTest) => {
            const thumb = TEST_THUMBNAILS[t.to];
            return (
              <Link
                key={t.to}
                to={t.to}
                className="block rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-glow)] transition-colors hover:border-primary"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/5">
                    {thumb ? thumb() : <Target className="h-6 w-6 text-flag" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-2xl leading-none">{t.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-flag">
                      {t.result}
                    </p>
                    {last[t.to] ? (
                      <p className="mt-1 text-xs text-muted-foreground">{last[t.to]}</p>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })
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
