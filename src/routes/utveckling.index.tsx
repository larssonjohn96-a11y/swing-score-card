import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { computeEstimatedHandicap, loadRealHandicap, type CategoryHandicap } from "@/lib/sg-handicap";
import { computeStableCategoryHandicaps } from "@/lib/category-index";
import { AnalysisRadarSwitcher } from "@/components/analysis-radar-switcher";
import { StableCategoryStatsSection } from "@/components/stable-category-stats";

export const Route = createFileRoute("/utveckling/")({ component: UtvecklingPage });

const DAY = 86400000;
type Data = {
  real: number | null;
  cats: CategoryHandicap[];
  pastCats: CategoryHandicap[];
  pastYearCats: CategoryHandicap[];
  totalHandicap: number | undefined;
  change90d: number | undefined;
};

function loadData(): Data {
  const real = loadRealHandicap();
  const cats = computeStableCategoryHandicaps(undefined, real ?? undefined);
  const pastCats = computeStableCategoryHandicaps(new Date(Date.now() - 90 * DAY), real ?? undefined);
  const pastYearCats = computeStableCategoryHandicaps(new Date(Date.now() - 365 * DAY), real ?? undefined);
  const total = computeEstimatedHandicap(cats);
  const pastTotal = computeEstimatedHandicap(pastCats);
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
  };
}

function UtvecklingPage() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => setData(loadData()), []);

  const hasData = data?.cats.some((c) => c.count > 0) ?? false;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-10">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">SG4</p>
      <h1 className="mt-2 font-display text-4xl leading-none">Analys</h1>

      {!data ? null : !hasData ? (
        <p className="mt-10 rounded-3xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
          Kör ditt första HCP-test för att börja bygga din SG4-profil.
        </p>
      ) : (
        <div className="mt-6">
          <AnalysisRadarSwitcher cats={data.cats} totalHandicap={data.totalHandicap} />

          <Link
            to="/jamfor"
            className="mt-4 flex items-center gap-3 rounded-3xl border border-primary/30 bg-primary/5 px-4 py-4 transition-colors hover:border-primary"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Users className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Head-to-head</span>
              <span className="mt-0.5 block font-display text-2xl leading-none">Jämför med vän</span>
              <span className="mt-1 block text-xs text-muted-foreground">Spelnivå, speldata, tränings-PB och rekord.</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-primary" />
          </Link>

          <StableCategoryStatsSection />

          <Link
            to="/traning-progress"
            search={{ category: undefined }}
            className="mt-4 flex items-center justify-between rounded-3xl border border-border bg-muted/45 px-4 py-4 transition-colors hover:border-primary hover:bg-muted/65"
          >
            <span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Träning</span>
              <span className="mt-1 block font-display text-2xl leading-none">Träningsprogress</span>
              <span className="mt-1 block text-xs text-muted-foreground">Följ utvecklingen i dina träningstester.</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </Link>
        </div>
      )}
    </main>
  );
}
