import { useMemo, useState } from "react";
import { ChevronRight, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSubscription } from "@/lib/subscription";
import { buildPuttingMatchReview, type ReviewHole } from "@/lib/putting-match-review";
import { formatPuttingDistance } from "@/lib/putting-match";

const decimal = (value: number) => value.toFixed(1).replace(".", ",");

export function PuttingMatchReview({ holes }: { holes: readonly ReviewHole[] }) {
  const review = useMemo(() => buildPuttingMatchReview(holes), [holes]);
  const { canViewDetailedBreakdowns } = useSubscription();
  const [filter, setFilter] = useState<string | null>(null);
  const hcp = review.hcpBand ? `${review.hcpBand.low}–${review.hcpBand.high}` : "–";
  const visibleRows = review.rows.filter((row) => !filter || row.category.id === filter);

  return (
    <Dialog onOpenChange={() => setFilter(null)}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="mt-4 flex w-full items-center gap-3 rounded-[26px] border border-blue-200 bg-gradient-to-br from-white to-blue-50 p-5 text-left text-slate-950 shadow-sm focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-black uppercase tracking-[0.15em] text-blue-700">
              Matchens HCP-rating · Putting
            </span>
            <span className="mt-2 block font-display text-3xl">
              {canViewDetailedBreakdowns ? `HCP ${hcp}` : "Se din HCP-nivå"}
            </span>
            <span className="mt-1 block text-xs text-slate-500">
              {review.hcpBand ? "Preliminär nivå · " : "Begränsat underlag · "}
              {review.rows.length} hål
            </span>
            <span className="mt-3 block text-sm font-bold text-blue-700">
              Se matchens breakdown
            </span>
          </span>
          {canViewDetailedBreakdowns ? (
            <ChevronRight className="h-6 w-6 shrink-0 text-blue-600" />
          ) : (
            <Lock className="h-5 w-5 shrink-0 text-blue-600" />
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-24px)] overflow-y-auto rounded-[28px] border-slate-200 bg-white p-5 text-slate-950 sm:rounded-[28px]">
        <DialogTitle className="pr-6 font-display text-2xl">Match Review</DialogTitle>
        <DialogDescription className="text-slate-500">
          Din putting · {review.rows.length} ordinarie hål. Sudden death ingår inte.
        </DialogDescription>
        {!canViewDetailedBreakdowns ? (
          <div className="rounded-2xl bg-blue-50 p-5">
            <Lock className="mb-3 h-6 w-6 text-blue-600" />
            <h3 className="font-display text-xl">Förstå din HCP-nivå med SG4+</h3>
            <p className="mt-2 text-sm text-slate-600">
              Lås upp matchens estimerade puttingnivå, kategorier, bästa hål och en genomgång hål
              för hål.
            </p>
            <Link
              to="/premium"
              className="mt-4 block rounded-xl bg-blue-600 px-4 py-3 text-center font-bold text-white"
            >
              Se SG4+
            </Link>
          </div>
        ) : (
          <>
            <section className="rounded-2xl bg-blue-50 p-5 text-center">
              <p className="text-xs font-bold text-blue-700">Estimerad puttingnivå för matchen</p>
              <p className="mt-2 font-display text-4xl">HCP {hcp}</p>
              <p className="mt-2 text-xs text-slate-600">
                {review.hcpBand
                  ? "Preliminär modellnivå · låg tillförlitlighet"
                  : "Minst tre registrerade hål behövs för ett estimat."}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Inte ditt totala eller officiella handicap.
              </p>
            </section>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ["Snittputtar", decimal(review.average)],
                ["Enputtar", review.onePutts],
                ["3+ puttar", review.threePutts],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3">
                  <p className="font-display text-2xl">{value}</p>
                  <p className="text-[10px] text-slate-500">{label}</p>
                </div>
              ))}
            </div>
            <section>
              <h3 className="mb-2 font-bold">Kategorisering</h3>
              <p className="mb-3 text-xs text-slate-500">
                Hela hålets resultat jämfört med SG4:s HCP 20-modell på samma startavstånd. Tryck
                för att filtrera.
              </p>
              <div className="space-y-1">
                {review.categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={filter === category.id}
                    onClick={() => setFilter(filter === category.id ? null : category.id)}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${category.tone} ${filter === category.id ? "ring-2 ring-blue-600" : ""}`}
                  >
                    <span aria-hidden="true" className="w-6 text-center text-lg font-black">
                      {category.symbol}
                    </span>
                    <span className="flex-1 text-sm font-semibold">{category.label}</span>
                    <span className="font-display text-xl">{category.count}</span>
                  </button>
                ))}
              </div>
            </section>
            {review.best && (
              <section className="rounded-2xl border border-teal-100 bg-teal-50 p-4">
                <p className="text-xs font-bold text-teal-700">Bästa hålet relativt avståndet</p>
                <p className="mt-1 font-bold">
                  Hål {review.best.hole} · {formatPuttingDistance(review.best.distance)} ·{" "}
                  {review.best.putts} {review.best.putts === 1 ? "putt" : "puttar"}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {review.best.category.label}. Ett enskilt hål ger ingen egen HCP-nivå.
                </p>
              </section>
            )}
            {review.biggestLoss && (
              <section className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                <p className="text-xs font-bold text-orange-700">Största tappet</p>
                <p className="mt-1 font-bold">
                  Hål {review.biggestLoss.hole} ·{" "}
                  {formatPuttingDistance(review.biggestLoss.distance)} · {review.biggestLoss.putts}{" "}
                  puttar
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {decimal(-review.biggestLoss.gained)} fler puttar än modellens förväntan.
                </p>
              </section>
            )}
            <section>
              <h3 className="mb-2 font-bold">Avståndsprofil</h3>
              <div className="divide-y divide-slate-100">
                {review.bands.map((band) => (
                  <div key={band.label} className="flex justify-between gap-2 py-3 text-sm">
                    <span>
                      {band.label} <span className="text-xs text-slate-500">{band.range}</span>
                    </span>
                    <span className="text-right">
                      {band.average === null
                        ? "Inga hål"
                        : `${decimal(band.average)} puttar/hål · ${band.count} hål`}
                    </span>
                  </div>
                ))}
              </div>
            </section>
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-bold">Hål för hål</h3>
                {filter && (
                  <button
                    type="button"
                    onClick={() => setFilter(null)}
                    className="min-h-11 px-2 text-sm font-bold text-blue-700"
                  >
                    Visa alla
                  </button>
                )}
              </div>
              {!visibleRows.length && (
                <p className="text-sm text-slate-500">Inga hål i den här kategorin.</p>
              )}
              <div className="space-y-2">
                {visibleRows.map((row) => (
                  <div key={row.hole} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold">
                        Hål {row.hole} · {formatPuttingDistance(row.distance)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold ${row.category.tone}`}
                      >
                        {row.category.label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">
                      {row.putts} {row.putts === 1 ? "putt" : "puttar"} · förväntat{" "}
                      {decimal(row.expected)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {decimal(Math.abs(row.gained))} {row.gained >= 0 ? "färre" : "fler"} puttar än
                      HCP 20-modellen.
                    </p>
                  </div>
                ))}
              </div>
            </section>
            <details className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
              <summary className="cursor-pointer font-bold">Så beräknas reviewn</summary>
              <p className="mt-2 leading-relaxed">
                Startavstånd och antal puttar jämförs med SG4:s befintliga scratch- och HCP
                20-kurvor. HCP-bandet är en grov modelluppskattning, inte ett statistiskt
                konfidensintervall. Modellen är inte validerad för match-HCP och extrapoleras över
                HCP 20. Ett kort pass påverkas mycket av dagsform och green. Inga missriktningar
                eller enskilda returputtar registreras. Reviewn ändrar inte ditt etablerade HCP.
              </p>
            </details>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
