import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  categoriesToImprove,
  computeBiggestOpportunity,
  computeCategoryHandicaps,
  computeEstimatedHandicap,
  computeEstimatedTrend,
  computeLatestTests,
  getSmartInsight,
  loadRealHandicap,
  nextMilestone,
  saveRealHandicap,
  type CategoryHandicap,
  type LatestTest,
  type Opportunity,
} from "@/lib/sg-handicap";
import {
  CategoryGrid,
  CategoryTestList,
  DevelopmentCard,
  GoalCard,
  LatestTestsCard,
  OpportunityCard,
  RealHandicapCard,
  SmartInsightCard,
} from "@/components/home-dashboard";
import { RadarCard } from "@/components/progress-dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SG4 – Mät. Förbättra. Sänk ditt handicap." },
      {
        name: "description",
        content:
          "SG4 analyserar ditt golfspel och visar exakt vilka delar som kostar flest slag, så att du kan träna smartare och sänka ditt handicap.",
      },
      { property: "og:title", content: "SG4 – Mät. Förbättra. Sänk ditt handicap." },
      {
        property: "og:description",
        content: "Din personliga golfprestanda-dashboard – handicap, kategorier och nästa mål.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

type HomeData = {
  real: number | null;
  cats: CategoryHandicap[];
  estimated: number | undefined;
  estimatedTrend: number | undefined;
  opportunity: Opportunity | undefined;
  latestTests: LatestTest[];
  insight: string | undefined;
};

function loadHomeData(): HomeData {
  const real = loadRealHandicap();
  const cats = computeCategoryHandicaps();
  return {
    real,
    cats,
    estimated: computeEstimatedHandicap(cats),
    estimatedTrend: computeEstimatedTrend(cats),
    opportunity: computeBiggestOpportunity(cats),
    latestTests: computeLatestTests(3),
    insight: getSmartInsight(cats),
  };
}

function Home() {
  const { user, displayName } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);

  useEffect(() => {
    setData(loadHomeData());
  }, []);

  function handleSaveHandicap(value: number) {
    saveRealHandicap(value);
    setData(loadHomeData());
  }

  const target =
    data?.estimated !== undefined
      ? nextMilestone(data.estimated)
      : data?.real !== null && data?.real !== undefined
        ? nextMilestone(data.real)
        : undefined;
  const improveCats = data ? categoriesToImprove(data.cats, 2) : [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <span className="font-display text-4xl leading-none tracking-wide text-foreground">
            SG4
          </span>
          <p className="mt-2 max-w-[15rem] text-lg font-semibold leading-snug">
            Mät. Förbättra. Sänk ditt handicap.
          </p>
          <p className="mt-2 max-w-[16rem] text-sm leading-relaxed text-muted-foreground">
            SG4 analyserar ditt spel och visar exakt vilka delar som kostar flest slag, så att du
            kan träna smartare och sänka ditt handicap.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <Link
            to="/konto"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {displayName ?? (user ? "Konto" : "Logga in")}
          </Link>
        </div>
      </header>

      {data && (
        <div className="mt-6">
          <RealHandicapCard
            real={data.real}
            estimated={data.estimated}
            onSave={handleSaveHandicap}
          />
          <DevelopmentCard
            real={data.real}
            estimated={data.estimated}
            estimatedTrend={data.estimatedTrend}
          />
          <CategoryGrid cats={data.cats} />
          <RadarCard cats={data.cats} totalHandicap={data.estimated} />
          <OpportunityCard opportunity={data.opportunity} />
          <CategoryTestList />
          <LatestTestsCard tests={data.latestTests} />
          <SmartInsightCard insight={data.insight} />
          <GoalCard
            real={data.real}
            estimated={data.estimated}
            target={target}
            improveCats={improveCats}
          />
        </div>
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Alla resultat sparas lokalt och på ditt konto.
      </p>
    </main>
  );
}
