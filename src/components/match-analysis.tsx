import { useState } from "react";
import { ArrowRight, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./ui/dialog";
import { useSubscription } from "@/lib/subscription";
import { ACTIVITY_CATEGORIES, type ActivityCategory } from "@/lib/activity-review";
import { buildPlayerMatchReview, type MatchReviewHole } from "@/lib/match-review";

const tones = [
  "bg-teal-50 text-teal-700",
  "bg-blue-50 text-blue-700",
  "bg-emerald-50 text-emerald-700",
  "bg-slate-100 text-slate-600",
  "bg-orange-50 text-orange-700",
  "bg-rose-50 text-rose-700",
];
export function MatchAnalysis({
  kind,
  names,
  holes,
}: {
  kind: string;
  names: [string, string];
  holes: readonly MatchReviewHole[];
}) {
  const { canViewDetailedBreakdowns } = useSubscription();
  const [details, setDetails] = useState(false);
  const [filter, setFilter] = useState<ActivityCategory | null>(null);
  const reviews = [
    buildPlayerMatchReview(kind, holes, "blue"),
    buildPlayerMatchReview(kind, holes, "red"),
  ];
  const hcpCards = (blue: boolean) => (
    <div className="grid grid-cols-2 gap-3">
      {reviews.map((review, i) => (
        <div
          key={i}
          className={`min-w-0 rounded-2xl p-4 text-center ${blue ? "bg-white/10 text-white" : "bg-blue-50 text-blue-700"}`}
        >
          <p className="break-words text-sm font-bold leading-snug">{names[i]}</p>
          <p className="mt-2 text-xs">Estimerad HCP-nivå</p>
          <p className="mt-2 text-3xl font-black tabular-nums leading-tight">{review.hcp}</p>
        </div>
      ))}
    </div>
  );
  return (
    <Dialog
      onOpenChange={() => {
        setDetails(false);
        setFilter(null);
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-bold leading-snug text-white shadow-md"
        >
          {!canViewDetailedBreakdowns && <Lock className="h-4 w-4 shrink-0" />}HCP-analys för båda
          <ArrowRight className="h-4 w-4 shrink-0" />
        </button>
      </DialogTrigger>
      <DialogContent
        className={`max-h-[90dvh] w-[calc(100%-24px)] max-w-md overflow-y-auto rounded-[26px] p-5 sm:rounded-[26px] ${canViewDetailedBreakdowns && !details ? "border-blue-600 bg-blue-600 text-white [&>button]:text-white" : "bg-white text-slate-950"}`}
      >
        <DialogTitle className="pr-8 text-xl font-bold">Matchanalys</DialogTitle>
        <DialogDescription
          className={canViewDetailedBreakdowns && !details ? "text-blue-100" : "text-slate-500"}
        >
          Bådas resultat från den här matchen.
        </DialogDescription>
        {!canViewDetailedBreakdowns ? (
          <div>
            <p>Lås upp matchanalysen med SG4+.</p>
            <Link
              to="/premium"
              className="mt-4 block rounded-xl bg-blue-600 p-3 text-center font-bold text-white"
            >
              Se SG4+
            </Link>
          </div>
        ) : (
          <>
            {hcpCards(!details)}
            {reviews.some((r) => r.hcp === "–") && (
              <p className="text-sm leading-relaxed">
                – betyder att underlag eller HCP-modell saknas.
              </p>
            )}
            {!details ? (
              <button
                onClick={() => setDetails(true)}
                className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-bold text-blue-700"
              >
                Se slag för slag
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <>
                <section>
                  <h3 className="mb-3 font-bold">Kategorisering</h3>
                  <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 px-3 pb-2 text-sm font-bold">
                    <span>Slag</span>
                    {names.map((n, i) => (
                      <span key={i} className="break-words text-center">
                        {n}
                      </span>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    {ACTIVITY_CATEGORIES.map((category, index) => (
                      <button
                        key={category}
                        aria-pressed={filter === category}
                        onClick={() => setFilter(filter === category ? null : category)}
                        className={`grid min-h-11 w-full grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${tones[index]} ${filter === category ? "ring-2 ring-blue-500" : ""}`}
                      >
                        <span>{category}</span>
                        {reviews.map((r, i) => (
                          <strong key={i} className="text-center">
                            {r.counts[index].count}
                          </strong>
                        ))}
                      </button>
                    ))}
                  </div>
                </section>
                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold">Hål för hål</h3>
                    {filter && (
                      <button
                        onClick={() => setFilter(null)}
                        className="min-h-11 text-sm text-blue-700"
                      >
                        Visa alla
                      </button>
                    )}
                  </div>
                  {reviews[0].outcomes.map((row, index) => {
                    const pair = [row, reviews[1].outcomes[index]];
                    if (filter && !pair.some((r) => r?.category === filter)) return null;
                    return (
                      <div key={index} className="rounded-2xl border border-slate-200 p-3">
                        <p className="mb-3 text-sm font-bold">
                          Hål {index + 1}
                          {row.context ? ` · ${row.context}` : ""}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {pair.map((r, i) => (
                            <div key={i} className="min-w-0">
                              <p
                                className={`break-words text-sm font-bold ${i ? "text-red-700" : "text-blue-700"}`}
                              >
                                {names[i]}
                              </p>
                              <p className="mt-1 text-sm leading-relaxed">{r?.result ?? "–"}</p>
                              {r?.category && (
                                <span
                                  className={`mt-2 inline-block rounded-lg px-2 py-1 text-xs ${tones[ACTIVITY_CATEGORIES.indexOf(r.category)]}`}
                                >
                                  {r.category}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {filter &&
                    !reviews.some((r) => r.outcomes.some((o) => o.category === filter)) && (
                      <p className="text-sm text-slate-500">Inga slag i denna kategori.</p>
                    )}
                </section>
                <p className="text-xs leading-relaxed text-slate-500">
                  Estimat för matchen, inte officiellt handicap. Sudden death ingår inte. Chipp-HCP
                  använder uppskattat avstånd från resultatzonerna och samma modell som chippspelet.
                  Putt-HCP använder startavstånd och antal puttar.
                </p>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
