import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, User } from "lucide-react";
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
            className="mt-7 block overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-transform active:scale-[0.99]"
          >
            <div className="grid grid-cols-[1fr_auto_1fr] items-stretch">
              <div className="flex items-center gap-3 bg-blue-500/[0.08] px-4 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-blue-500 bg-blue-500/10 text-blue-500">
                  <User className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-blue-600">Du</span>
              </div>
              <div className="flex items-center justify-center bg-foreground px-3 font-display text-lg text-background">VS</div>
              <div className="flex items-center justify-end gap-3 bg-red-500/[0.08] px-4 py-4">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-red-600">Vän</span>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-red-500 bg-red-500/10 text-red-500">
                  <User className="h-4 w-4" />
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-4">
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Head-to-head</span>
                <span className="mt-1 block font-display text-2xl leading-none">Vem vinner?</span>
                <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">Ställ din SG4-profil mot en vän – kategori för kategori.</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </div>
          </Link>

          <StableCategoryStatsSection />

          <Link
            to="/traning-progress"
            search={{ category: undefined }}
            className="mt-5 flex items-center justify-between rounded-3xl border border-border bg-muted/45 px-4 py-4 transition-colors hover:border-primary hover:bg-muted/65"
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
