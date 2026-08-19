import { createFileRoute } from "@tanstack/react-router";
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
  ProfileRadar,
  type CategoryVerdict,
  type DevPeriod,
} from "@/components/utveckling-overview";

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
  totalHandicap: number | undefined;
  change90d: number | undefined;
  rows: CategoryVerdict[];
  benchmarkLabel: string;
};

/** Närmaste jämförelsenivå utifrån spelarens egen nivå. */
function pickBenchmark(level: number | undefined) {
  if (level === undefined) return BENCHMARK_LEVELS[2];
  return [...BENCHMARK_LEVELS].sort(
    (a, b) => Math.abs(a.hcp - level) - Math.abs(b.hcp - level),
  )[0];
}

function loadData(): Data {
  const real = loadRealHandicap();
  const cats = computeCategoryHandicaps(undefined, real ?? undefined);
  const pastCats = computeCategoryHandicaps(new Date(Date.now() - 90 * DAY), real ?? undefined);
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
    totalHandicap: total,
    change90d:
      total !== undefined && pastTotal !== undefined
        ? Math.round((total - pastTotal) * 10) / 10
        : undefined,
    rows,
    benchmarkLabel: bm.label === "Tour" ? "Tour" : `HCP ${bm.label}`,
  };
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
    ? [...data.rows]
        .filter((r) => r.diff !== undefined)
        .sort((a, b) => a.diff! - b.diff!)[0]
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
          Kör ditt första test för att börja bygga din utveckling här.
        </p>
      ) : (
        <div className="mt-6">
          <LevelSummary
            real={data.real}
            estimated={data.totalHandicap}
            change90d={data.change90d}
          />

          <ProfileRadar
            cats={data.cats}
            totalHandicap={data.totalHandicap}
            pastCats={data.pastCats}
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
    </main>
  );
}
