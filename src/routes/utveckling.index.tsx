import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, User } from "lucide-react";
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
          <Link to="/jamfor" className="mt-7 block overflow-hidden rounded-3xl border border-blue-500/30 bg-gradient-to-r from-blue-500/[.08] via-card to-red-500/[.08] shadow-sm active:scale-[.99]">
            <div className="grid grid-cols-[1fr_56px_1fr] items-center">
              <div className="flex h-[68px] items-center gap-2 bg-blue-500/10 px-4 text-blue-600"><span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-blue-500"><User className="h-4 w-4"/></span><strong className="text-xs uppercase tracking-wide">Du</strong></div>
              <div className="flex h-[68px] items-center justify-center bg-foreground font-display text-background">VS</div>
              <div className="flex h-[68px] items-center justify-end gap-2 bg-red-500/10 px-4 text-red-600"><strong className="text-xs uppercase tracking-wide">Vän</strong><span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-red-500"><User className="h-4 w-4"/></span></div>
            </div>
            <div className="flex items-center gap-3 border-t border-border/60 px-5 py-4"><span className="min-w-0 flex-1"><span className="block text-[10px] font-black uppercase tracking-[.18em] text-muted-foreground">Head-to-head</span><strong className="mt-1 block font-display text-2xl">Vem vinner?</strong><span className="mt-1 block text-xs text-muted-foreground">Jämför er nivå sida vid sida.</span></span><ChevronRight className="h-5 w-5 text-red-500"/></div>
          </Link>
        </div>
      )}
    </main>
  );
}
