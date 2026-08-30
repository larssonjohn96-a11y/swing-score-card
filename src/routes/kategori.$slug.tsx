import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Dumbbell, Target } from "lucide-react";
import { findCategory, CATEGORIES, type Category, type CategoryTest } from "@/lib/categories";
import { loadBunkerSessions } from "@/lib/bunker";
import { loadSpeedSessions } from "@/lib/speed";
import { loadLongDriveSessions, sessionBest } from "@/lib/longdrive";
import { loadFairwaySessions, fairwayHitRate } from "@/lib/fairway";
import { loadOffTeeSessions } from "@/lib/offtee-store";
import { TeeHero } from "@/components/offtee-visuals";
import { PuttingHero } from "@/components/shortputt-visuals";
import { SpeedHero } from "@/components/speed-visuals";
import { ShortGameHero } from "@/components/shortgame-visuals";
import { BunkerHero } from "@/components/bunker-visuals";
import { LagPuttHero } from "@/components/lagputt-visuals";
import { ApproachLoopIllustration } from "@/components/approach-loop-illustration";

const TEST_THUMBNAILS: Partial<Record<CategoryTest["to"], () => React.ReactNode>> = {
  "/approach": () => <ApproachLoopIllustration className="h-32 w-full" />,
  "/offtee-test": () => <TeeHero className="h-32 w-full" />,
  "/short-putting-test": () => <PuttingHero className="h-32 w-full" />,
  "/putting": () => <PuttingHero className="h-32 w-full" />,
  "/speed-test": () => <SpeedHero className="h-32 w-full" />,
  "/narspel-test": () => <ShortGameHero className="h-32 w-full" />,
  "/bunker-test": () => <BunkerHero className="h-32 w-full" />,
  "/lagputt-test": () => <LagPuttHero className="h-32 w-full" />,
};

const CARD_TITLES: Partial<Record<CategoryTest["to"], string>> = {
  "/approach": "Inspelstest",
  "/offtee-test": "Off the Tee",
  "/speed-test": "Speed",
  "/bunker-test": "Bunkerslag",
  "/narspel-test": "Närspelstest",
  "/short-putting-test": "Short Putting",
  "/lagputt-test": "Lag Putt",
  "/putting": "Putting Test",
};

const PUTTING_TRAINING_TESTS = [
  {
    to: "/50-bollar" as const,
    title: "50-bollsövningen",
    subtitle: "50 puttar från 1–5 meter. Följ score, personbästa och utveckling över tid.",
    meta: "Ej HCP-grundande",
  },
  {
    to: "/lagputt-test" as const,
    title: "Lag Putt",
    subtitle: "Träna längdkontroll från 8–18 meter och följ hur nära hålet du lämnar bollen.",
    meta: "Ej HCP-grundande",
  },
];

const APPROACH_TRAINING_TESTS = [
  {
    to: "/approach-pei" as const,
    title: "18-bollars PEI",
    subtitle: "18 fasta inspel mellan 50–220 meter. Mät procentuell miss och följ precisionen över tid.",
    meta: "Ej HCP-grundande",
  },
];

export const Route = createFileRoute("/kategori/$slug")({
  loader: ({ params }) => {
    const category = findCategory(params.slug);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Kategorin hittades inte" }] };
    const { title, description } = loaderData.category;
    return {
      meta: [
        { title: `${title} – golftester` },
        {
          name: "description",
          content: `${description} Kör testerna och följ utvecklingen över tid.`,
        },
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
      <Link to="/" className="mt-6 inline-block rounded-full border border-border px-4 py-2 text-sm">
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
      "/bunker-test": d.length
        ? `Senast ${d[d.length - 1].avgProximity.toFixed(2)} m i snitt`
        : undefined,
      "/offtee-test": lastOfftee ? `Senast ${lastOfftee.score.toFixed(0)} / 100` : undefined,
    });
  }, []);

  const coreTests =
    category.slug === "puttning"
      ? category.tests.filter((test) => test.to !== "/lagputt-test" && test.to !== "/50-bollar")
      : category.tests;

  const trainingTests =
    category.slug === "puttning"
      ? PUTTING_TRAINING_TESTS
      : category.slug === "approach"
        ? APPROACH_TRAINING_TESTS
        : [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-10">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{category.subtitle}</p>
          <h1 className="text-4xl leading-none">{category.title}</h1>
        </div>
        <Link
          to="/"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground"
        >
          Tillbaka
        </Link>
      </header>
      {category.slug !== "approach" && (
        <p className="mt-3 text-sm text-muted-foreground">{category.description}</p>
      )}

      <section className="mt-8">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-flag">Core-tester</p>
          <h2 className="mt-1 text-2xl leading-none">SG4 HCP</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Resultaten används för din SG4-profil och HCP.
          </p>
        </div>
        <div className="space-y-4">
          {coreTests.map((t: CategoryTest) => {
            const thumb = TEST_THUMBNAILS[t.to];
            const title = CARD_TITLES[t.to] ?? t.title;
            return (
              <Link
                key={t.to}
                to={t.to}
                className="block rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-glow)] transition-colors hover:border-primary"
              >
                <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-2xl bg-primary/5">
                  {thumb ? thumb() : <Target className="h-8 w-8 text-flag" />}
                </div>
                <p className="mt-4 text-xs uppercase tracking-[0.3em] text-flag">HCP-grundande</p>
                <h3 className="mt-1 text-3xl leading-none">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.subtitle}</p>
                {last[t.to] ? <p className="mt-2 text-xs text-muted-foreground">{last[t.to]}</p> : null}
              </Link>
            );
          })}
        </div>
      </section>

      {trainingTests.length ? (
        <section className="mt-10 border-t border-border pt-8">
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <Dumbbell className="h-5 w-5 text-muted-foreground" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Träningstester
              </p>
              <h2 className="mt-1 text-2xl leading-none">Träna & följ progress</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Benchmarks och övningar för träning. Påverkar inte SG4 HCP.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {trainingTests.map((test) => (
              <Link
                key={test.to}
                to={test.to}
                className="flex items-center gap-4 rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-glow)] transition-colors hover:border-primary"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Dumbbell className="h-5 w-5 text-muted-foreground" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xl leading-none">{test.title}</span>
                  <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                    {test.subtitle}
                  </span>
                  <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {test.meta}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <nav className="mt-10">
        <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Andra kategorier</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {CATEGORIES.filter((c) => c.slug !== category.slug).map((c) => (
            <Link
              key={c.slug}
              to="/kategori/$slug"
              params={{ slug: c.slug }}
              className="rounded-2xl border border-border bg-card px-3 py-3 text-center text-sm text-muted-foreground"
            >
              {c.title}
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
