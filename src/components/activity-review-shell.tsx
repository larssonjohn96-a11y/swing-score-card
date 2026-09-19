import type { ReactNode } from "react";
import { ArrowRight, Lock, Sparkles, TrendingDown } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSubscription } from "@/lib/subscription";

/** The only review card/dialog shell. All activity models supply data and detail content. */
export function ActivityReviewShell({
  title,
  compact = false,
  hcp,
  summary,
  positive,
  negative,
  activity = "training",
  onOpenChange,
  children,
}: {
  title: string;
  compact?: boolean;
  hcp?: string | null;
  summary: string;
  positive?: string | null;
  negative?: string | null;
  activity?: "training" | "match";
  onOpenChange?: () => void;
  children: ReactNode;
}) {
  const { canViewDetailedBreakdowns } = useSubscription();
  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group mt-3 block w-full rounded-[22px] border border-blue-200 bg-gradient-to-br from-white to-blue-50 p-3.5 text-left text-slate-950 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
        >
          {!compact && (
            <>
              <span className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-[9px] font-black uppercase tracking-[.12em] text-blue-700">
                    {title}
                  </span>
                  <span className="mt-1 block font-display text-3xl leading-none">
                    {canViewDetailedBreakdowns
                      ? hcp
                        ? `HCP ${hcp}`
                        : "Din resultatöversikt"
                      : "Se din analys"}
                  </span>
                </span>
                <span className="text-right text-xs text-slate-500">{summary}</span>
              </span>
              {(positive || negative) && (
                <span className="mt-2.5 flex flex-wrap gap-2">
                  {positive && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-1 text-[11px] font-bold text-teal-800">
                      <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                      {positive}
                    </span>
                  )}
                  {negative && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-1 text-[11px] font-bold text-orange-800">
                      <TrendingDown aria-hidden="true" className="h-3.5 w-3.5" />
                      {negative}
                    </span>
                  )}
                </span>
              )}
            </>
          )}
          <span
            className={`${compact ? "" : "mt-3"} flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-bold text-white shadow-sm group-hover:bg-emerald-700`}
          >
            {!canViewDetailedBreakdowns && <Lock aria-hidden="true" className="h-4 w-4" />}
            {compact
              ? "Visa analys"
              : activity === "match"
                ? "Visa matchanalys"
                : "Visa passanalys"}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-24px)] overflow-y-auto rounded-[26px] border-slate-200 bg-white p-5 text-slate-950 sm:rounded-[26px]">
        <DialogTitle className="pr-6 font-display text-2xl">{title}</DialogTitle>
        <DialogDescription className="sr-only">Aktivitetens resultat och analys.</DialogDescription>
        {canViewDetailedBreakdowns ? (
          children
        ) : (
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm">Lås upp hela aktivitetsanalysen med SG4+.</p>
            <Link
              to="/premium"
              className="mt-4 block rounded-xl bg-emerald-600 p-3 text-center font-bold text-white"
            >
              Se SG4+
            </Link>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
