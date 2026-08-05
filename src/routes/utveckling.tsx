import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  categoriesToImprove,
  computeApproachHeatmap,
  computeCategoryHandicaps,
  computeEstimatedHandicap,
  computeHistory,
  computePotentials,
  computePuttingHeatmap,
  computeRatingChange,
  computeRatingTimeline,
  computeSkillGaps,
  computeStrokesLost,
  ratingFromHandicap,
  type CategoryHandicap,
  type HeatmapZone,
  type HistoryEntry,
  type Potential,
  type RatingPoint,
  type SkillGap,
  type StrokesLost,
} from "@/lib/sg-handicap";
import {
  HeatmapsSection,
  HistoryPanel,
  OverviewCard,
  PotentialCard,
  RadarCard,
  SkillGapCard,
  StrokesLostCard,
  TrendChartsCard,
} from "@/components/progress-dashboard";

export const Route = createFileRoute("/utveckling")({
  head: () => ({
    meta: [
      { title: "Utveckling – ditt analyscenter | SG4" },
      {
        name: "description",
        content:
          "Se hur ditt spel utvecklas över tid: spindeldiagram, skill gaps, heatmaps och full testhistorik i ett analyscenter.",
      },
    ],
  }),
  component: UtvecklingPage,
});

type Period = 30 | 90 | 365 | null;

type Data = {
  cats: CategoryHandicap[];
  totalHandicap: number | undefined;
  totalRating: number | undefined;
  change30d: number | undefined;
  skillGaps: SkillGap[];
  strokesLost: StrokesLost[];
  potentials: Potential[];
  approachHeatmap: HeatmapZone[];
  puttingHeatmap: HeatmapZone[];
  history: HistoryEntry[];
};

function loadData(): Data {
  const cats = computeCategoryHandicaps();
  const total = computeEstimatedHandicap(cats);
  return {
    cats,
    totalHandicap: total,
    totalRating: total !== undefined ? ratingFromHandicap(total) : undefined,
    change30d: computeRatingChange(30),
    skillGaps: computeSkillGaps(cats),
    strokesLost: computeStrokesLost(cats),
    potentials: computePotentials(cats),
    approachHeatmap: computeApproachHeatmap(),
    puttingHeatmap: computePuttingHeatmap(),
    history: computeHistory(),
  };
}

function UtvecklingPage() {
  const [data, setData] = useState<Data | null>(null);
  const [period, setPeriod] = useState<Period>(90);
  const [timeline, setTimeline] = useState<RatingPoint[]>([]);

  useEffect(() => {
    setData(loadData());
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
          <OverviewCard totalRating={data.totalRating} change30d={data.change30d} />

          <RadarCard cats={data.cats} totalHandicap={data.totalHandicap} />

          <SkillGapCard gaps={data.skillGaps} />

          <StrokesLostCard items={data.strokesLost} />

          <PotentialCard items={data.potentials} />

          <HeatmapsSection approach={data.approachHeatmap} putting={data.puttingHeatmap} />

          <TrendChartsCard points={timeline} period={period} onPeriodChange={setPeriod} />

          <HistoryPanel entries={data.history} />

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
