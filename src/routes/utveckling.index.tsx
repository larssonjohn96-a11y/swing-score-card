import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { computeEstimatedHandicap, loadRealHandicap, type CategoryHandicap } from "@/lib/sg-handicap";
import { computeStableCategoryHandicaps } from "@/lib/category-index";
import { AnalysisRadarSwitcher } from "@/components/analysis-radar-switcher";

export const Route = createFileRoute("/utveckling/")({ component: UtvecklingPage });

type Data = {
  real: number | null;
  cats: CategoryHandicap[];
  totalHandicap: number | undefined;
};

function loadData(): Data {
  const real = loadRealHandicap();
  const cats = computeStableCategoryHandicaps(undefined, real ?? undefined);
  const total = computeEstimatedHandicap(cats);
  return {
    real,
    cats,
    totalHandicap: total,
  };
}

function UtvecklingPage() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => setData(loadData()), []);

  const hasData = data?.cats.some((c) => c.count > 0) ?? false;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-4">
      <div className="pt-3"><p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Jämför</p><h1 className="mt-1 font-display text-[38px] leading-none">Hur står du dig?</h1><p className="mt-3 text-sm text-muted-foreground">Jämför din nivå med olika handicapnivåer eller en vän.</p></div>

      {!data ? null : !hasData ? (
        <p className="mt-10 rounded-3xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
          Spela en runda först för att få en nivå att jämföra.
        </p>
      ) : (
        <div className="mt-6">
          <AnalysisRadarSwitcher cats={data.cats} totalHandicap={data.totalHandicap} />
        </div>
      )}
    </main>
  );
}
