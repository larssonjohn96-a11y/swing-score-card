import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  computeBiggestOpportunity,
  computeCategoryHandicaps,
  computeEstimatedHandicap,
  loadRealHandicap,
  saveRealHandicap,
  type CategoryHandicap,
  type Opportunity,
} from "@/lib/sg-handicap";
import { CategoryGrid, HighScoreCard, OpportunityCard } from "@/components/home-dashboard";
import { PlayerCard } from "@/components/rating-card";
import { computeRatingCard, loadCardProfile, type RatingCardData } from "@/lib/rating-card";
import { RadarCard } from "@/components/progress-dashboard";
import { topScores, type Highlight } from "@/lib/highlights";
import { pushPlayerSnapshot } from "@/lib/friends-cloud";

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
  opportunity: Opportunity | undefined;
  highlights: Highlight[];
  card: RatingCardData;
};

function loadHomeData(): HomeData {
  const real = loadRealHandicap();
  const cats = computeCategoryHandicaps();
  return {
    real,
    cats,
    estimated: computeEstimatedHandicap(cats),
    opportunity: computeBiggestOpportunity(cats),
    highlights: topScores(),
    card: computeRatingCard(real),
  };
}

function Home() {
  const { user, displayName } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);

  useEffect(() => {
    setData(loadHomeData());
    if (user) void pushPlayerSnapshot();
  }, [user]);

  function handleSaveHandicap(value: number) {
    saveRealHandicap(value);
    setData(loadHomeData());
    if (user) void pushPlayerSnapshot();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-6">
      <div className="flex items-center justify-between">
        <span className="font-display text-2xl leading-none tracking-wide text-foreground">
          SG4
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <Link
            to="/konto"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {displayName ?? (user ? "Konto" : "Logga in")}
          </Link>
        </div>
      </div>

      {data && (
        <div className="mt-4">
          <PlayerCard
            data={data.card}
            profile={loadCardProfile()}
            playerName={displayName ?? "Golfspelare"}
            onSaveHandicap={handleSaveHandicap}
          />

          <div className="mt-10">
            <RadarCard cats={data.cats} totalHandicap={data.estimated} />
          </div>
          <CategoryGrid cats={data.cats} />
          <HighScoreCard highlights={data.highlights} />
          <OpportunityCard opportunity={data.opportunity} />

          <Link
            to="/tester"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
          >
            Gör ett test
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Alla resultat sparas lokalt och på ditt konto.
      </p>
    </main>
  );
}
