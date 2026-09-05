import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import {
  BENCHMARK_LEVELS,
  computeCategoryHandicaps,
  computeEstimatedHandicap,
  computeRatingTimeline,
  loadRealHandicap,
  type CategoryHandicap,
  type RatingPoint,
} from "@/lib/sg-handicap";
import {
  CategoryHeatTable,
  DevelopmentChart,
  FocusCard,
  LevelSummary,
  type CategoryVerdict,
  type DevPeriod,
} from "@/components/utveckling-overview";
import { RadarCard } from "@/components/progress-dashboard";

export const Route = createFileRoute("/utveckling/")({
  head: () => ({
    meta: [
      { title: "Utveckling – din nivå och profil | SG4" },
      {
        name: "description",
        content:
          "Se din nivå, din golfprofil, dina styrkor och svagheter och om du blir bättre – en snabb överblick, djupare analys per kategori.",
      },
      { property: "og:title", content: "Utveckling – din nivå och profil | SG4" },
      {
        property: "og:description",
        content: "Nivå, profil, styrkor, fokus och utveckling över tid i SG4.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UtvecklingPage,
});

const DAY = 24 * 60 * 60 * 1000;

type Data = {
  real: number | null;
  cats: CategoryHandicap[];
  pastCats: CategoryHandicap[];
  /** kategori-HCP ett år tillbaka, separat från pastCats (90 dagar) – driver
   *  RadarCard:s "Mig själv (föregående år)"-förval. */
  pastYearCats: CategoryHandicap[];
  totalHandicap: number | undefined;
  change90d: number | undefined;
  rows: CategoryVerdict[];
  benchmarkLabel: string;
};

type TrainingProgressItem = {
  title: string;
  subtitle: string;
  href: string;
};

type TrainingProgressGroup = {
  title: string;
  eyebrow: string;
  items: TrainingProgressItem[];
};

const TRAINING_PROGRESS_GROUPS: TrainingProgressGroup[] = [
  {
    title: "Approach",
    eyebrow: "Inspel mot green",
    items: [
      {
        title: "PEI Precision",
        subtitle: "Wedge, järn och total precision",
        href: "/approach-pei-historik",
      },
      {
        title: "Wedgestege",
        subtitle: "Avståndskontroll 40–90 m",
        href: "/wedge-stege-historik",
      },
      {
        title: "9 Window Drill",
        subtitle: "Höjd × bollkurva",
        href: "/shot-shaping-9-window-historik",
      },
      {
        title: "Constant Shot Shape",
        subtitle: "Repeterbar draw eller fade",
        href: "/shot-shaping-konstant-historik",
      },
      {
        title: "Alternating Shot Shape",
        subtitle: "Växla draw och fade",
        href: "/shot-shaping-vaxlande-historik",
      },
    ],
  },
  {
    title: "Around the Green",
    eyebrow: "Runt greenen",
    items: [
      {
        title: "8-bollsövningen",
        subtitle: "Chip, pitch, lobb och bunker",
        href: "/8-bollar-historik",
      },
      {
        title: "Up & Down Challenge",
        subtitle: "Scoring från 10 greenside-lägen",
        href: "/upp-och-in-historik",
      },
    ],
  },
  {
    title: "Putting",
    eyebrow: "På greenen",
    items: [
      {
        title: "Lag putt",
        subtitle: "Längdkontroll 8–22 m",
        href: "/lagputt-historik",
      },
      {
        title: "50-bollsövningen",
        subtitle: "Kortputt 1–5 m",
        href: "/50-bollar-resultat",
      },
      {
        title: "Green Reading",
        subtitle: "Läsning och startlinje",
        href: "/green-reading-historik",
      },
      {
        title: "Tutor",
        subtitle: "Startlinje · rullande 20-testerssnitt",
        href: "/tutor-test-historik",
      },
    ],
  },
];

/** Närmaste jämförelsenivå utifrån spelarens egen nivå. */
function pickBenchmark(level: number | undefined) {
  if (level === undefined) return BENCHMARK_LEVELS[2];
  return [...BENCHMARK_LEVELS].sort((a, b) => Math.abs(a.hcp - level) - Math.abs(b.hcp - level))[0];
}

function loadData(): Data {
  const real = loadRealHandicap();
  const cats = computeCategoryHandicaps(undefined, real ?? undefined);
  const pastCats = computeCategoryHandicaps(new Date(Date.now() - 90 * DAY), real ?? undefined);
  const pastYearCats = computeCategoryHandicaps(
    new Date(Date.now() - 365 * DAY),
    real ?? undefined,
  );
  const total = computeEstimatedHandicap(cats);
  const pastTotal = computeEstimatedHandicap(pastCats);

  const bm = pickBenchmark(real ?? total);
  const rows: CategoryVerdict[] = cats.map((c) => ({
    slug: c.slug,
    title: c.title,
    handicap: c.handicap,
    trend: c.trend,
    benchmark: bm.categoryHcp[c.slug],
    diff:
      c.handicap !== undefined
        ? Math.round((bm.categoryHcp[c.slug] - c.handicap) * 10) / 10
        : undefined,
  }));

  return {
    real,
    cats,
    pastCats,
    pastYearCats,
    totalHandicap: total,
    change90d:
      total !== undefined && pastTotal !== undefined
        ? Math.round((total - pastTotal) * 10) / 10
        : undefined,
    rows,
    benchmarkLabel: bm.label === "Tour" ? "Tour" : `HCP ${bm.label}`,
  };
}

function TrainingProgressSection() {
  return (
    <section className="mt-9">
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Performance
        </p>
        <h2 className="mt-1 text-2xl font-semibold">Träningstester</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Alla dina träningsmått på ett ställe. Välj ett test för att se resultat, trend och historik.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-glow)]">
        {TRAINING_PROGRESS_GROUPS.map((group, groupIndex) => (
          <div key={group.title} className={groupIndex > 0 ? "border-t border-border" : ""}>
            <div className="bg-tint/70 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                {group.eyebrow}
              </p>
              <h3 className="mt-0.5 text-base font-semibold text-foreground">{group.title}</h3>
            </div>

            <div className="divide-y divide-border">
              {group.items.map((item) => (
                <a
                  key={item.title}
                  href={item.href}
                  className="group flex min-h-[68px] items-center gap-3 bg-card px-4 py-3 transition-colors active:bg-tint/70"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-foreground">{item.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.subtitle}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 text-primary">
                    <span className="text-xs font-semibold">Progress</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function UtvecklingPage() {
  const [data, setData] = useState<Data | null>(null);
  const [period, setPeriod] = useState<DevPeriod>(90);
  const [timeline, setTimeline] = useState<RatingPoint[]>([]);

  useEffect(() => {
    setData(loadData());
  }, []);

  useEffect(() => {
    setTimeline(computeRatingTimeline(period));
  }, [period]);

  const hasAnyData = (data?.cats.filter((c) => c.count > 0).length ?? 0) > 0;
  const focus = data
    ? [...data.rows].filter((r) => r.diff !== undefined).sort((a, b) => a.diff! - b.diff!)[0]
    : undefined;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-10">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">SG4</p>
      <h1 className="mt-2 text-4xl leading-none">Utveckling</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Din nivå, din profil och vad du bör fokusera på – klicka vidare på en kategori för djupare
        analys.
      </p>

      {!data ? null : !hasAnyData ? (
        <p className="mt-10 rounded-3xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
          Kör ditt första HCP-test för att börja bygga din SG4-profil här.
        </p>
      ) : (
        <div className="mt-6">
          <LevelSummary
            real={data.real}
            estimated={data.totalHandicap}
            change90d={data.change90d}
          />

          <RadarCard
            cats={data.cats}
            totalHandicap={data.totalHandicap}
            pastYearCats={data.pastYearCats}
          />

          <CategoryHeatTable rows={data.rows} benchmarkLabel={data.benchmarkLabel} />

          <FocusCard row={focus} />

          <DevelopmentChart
            points={timeline}
            period={period}
            onPeriodChange={setPeriod}
            realHcp={data.real}
          />
        </div>
      )}

      <TrainingProgressSection />
    </main>
  );
}
