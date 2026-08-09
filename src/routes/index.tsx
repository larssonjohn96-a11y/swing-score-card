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
import { OpportunityCard, BiggestGapCard } from "@/components/home-dashboard";
import { useSubscription } from "@/lib/subscription";
import { PlayerCard } from "@/components/rating-card";
import { computeRatingCard, loadCardProfile, type RatingCardData } from "@/lib/rating-card";
import { RadarCard } from "@/components/progress-dashboard";
import { pushPlayerSnapshot } from "@/lib/friends-cloud";
import { AppStoryLauncher } from "@/components/app-story";

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
    card: computeRatingCard(real),
  };
}

function Home() {
  const { user, displayName } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);
  const { isPlus } = useSubscription();

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

      <div className="mt-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl leading-none tracking-wide">
          LÄR KÄNNA DITT SPEL
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Mät ditt spel. Se vad du gör bäst, vad du behöver förbättra och hur du står dig mot andra.
        </p>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground/60">
          Testa · Utvecklas · Jämför
        </p>
      </div>

      <AppStoryLauncher />

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
          <OpportunityCard opportunity={data.opportunity} />
          <BiggestGapCard cats={data.cats} isPlus={isPlus} />

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
