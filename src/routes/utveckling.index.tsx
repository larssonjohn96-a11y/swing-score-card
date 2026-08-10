import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  categoriesToImprove,
  computeCategoryHandicaps,
  computeEstimatedHandicap,
  computeRatingChange,
  computeRatingTimeline,
  loadRealHandicap,
  ratingFromHandicap,
  type CategoryHandicap,
  type RatingPoint,
} from "@/lib/sg-handicap";
import {
  CategoryStatsSection,
  OverviewCard,
  RadarCard,
  TrendChartsCard,
} from "@/components/progress-dashboard";
import { computeAllPatterns, type PatternFact } from "@/lib/cross-test-patterns";
import { Compass } from "lucide-react";

export const Route = createFileRoute("/utveckling/")({
  head: () => ({
    meta: [
      { title: "Utveckling – ditt analyscenter | SG4" },
      {
        name: "description",
        content:
          "Se hur ditt spel utvecklas över tid: jämförelseanalys och stats per kategori i ett analyscenter.",
      },
    ],
  }),
  component: UtvecklingPage,
});

type Period = 30 | 90 | 365 | null;

type Data = {
  real: number | null;
  cats: CategoryHandicap[];
  totalHandicap: number | undefined;
  totalRating: number | undefined;
  change30d: number | undefined;
};

function loadData(): Data {
  const real = loadRealHandicap();
  const cats = computeCategoryHandicaps(undefined, real ?? undefined);
  const total = computeEstimatedHandicap(cats);
  return {
    real,
    cats,
    totalHandicap: total,
    totalRating: total !== undefined ? ratingFromHandicap(total) : undefined,
    change30d: computeRatingChange(30),
  };
}

function UtvecklingPage() {
  const [data, setData] = useState<Data | null>(null);
  const [period, setPeriod] = useState<Period>(90);
  const [timeline, setTimeline] = useState<RatingPoint[]>([]);
  const [patterns, setPatterns] = useState<PatternFact[]>([]);

  useEffect(() => {
    setData(loadData());
    setPatterns(computeAllPatterns());
  }, []);

  useEffect(() => {
    setTimeline(computeRatingTimeline(period));
  }, [period]);

  const hasAnyData = (data?.cats.filter((c) => c.count > 0).length ?? 0) > 0;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-10">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">SG4</p>
      <h1 className="mt-2 text-4xl leading-none">Utveckling</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Ditt analyscenter — se vad som blivit bättre, vad som fortfarande kostar slag och vilka
        tester som ger störst effekt att träna på.
      </p>

      {!data ? null : !hasAnyData ? (
        <p className="mt-10 rounded-3xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
          Kör ditt första test för att börja bygga din utveckling här.
        </p>
      ) : (
        <div className="mt-6">
          <OverviewCard
            real={data.real}
            estimated={data.totalHandicap}
            totalRating={data.totalRating}
            change30d={data.change30d}
          />

          <RadarCard cats={data.cats} totalHandicap={data.totalHandicap} />

          <CategoryStatsSection />

          {patterns.length > 0 && (
            <section className="mt-8">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Ditt mönster
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Kopplingar mellan dina tester — ren fakta, ingen rådgivning.
              </p>
              <div className="mt-3 space-y-2">
                {patterns.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Compass className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-tight">{p.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {p.body}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <TrendChartsCard points={timeline} period={period} onPeriodChange={setPeriod} />

          {(() => {
            const improve = categoriesToImprove(data.cats, 1);
            return improve.length ? (
              <p className="mt-8 text-center text-xs text-muted-foreground">
                Störst effekt just nu: träna {improve[0].title}.
              </p>
            ) : null;
          })()}
        </div>
      )}
    </main>
  );
}
