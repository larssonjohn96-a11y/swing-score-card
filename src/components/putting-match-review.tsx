import { useMemo, useState } from "react";
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
import { buildPuttingMatchReview, type ReviewHole } from "@/lib/putting-match-review";
import { formatPuttingDistance } from "@/lib/putting-match";

const decimal = (value: number) => value.toFixed(1).replace(".", ",");

export function PuttingMatchReview({ holes }: { holes: readonly ReviewHole[] }) {
  const review = useMemo(() => buildPuttingMatchReview(holes), [holes]);
  const { canViewDetailedBreakdowns } = useSubscription();
  const [filter, setFilter] = useState<string | null>(null);
  const hcp = review.hcpBand ? `${review.hcpBand.low}–${review.hcpBand.high}` : "–";
  const visibleRows = review.rows.filter((row) => !filter || row.category.id === filter);
  const exceptional = review.categories.find((category) => category.id === "exceptional")!.count;
  const excellent = review.categories.find((category) => category.id === "excellent")!.count;
  const bigLosses = review.categories.find((category) => category.id === "loss")!.count;
  const highlight =
    exceptional > 0
      ? `${exceptional} ${exceptional === 1 ? "exceptionellt hål" : "exceptionella hål"}`
      : excellent > 0
        ? `${excellent} ${excellent === 1 ? "utmärkt hål" : "utmärkta hål"}`
        : null;
  const headline =
    exceptional > 0 && review.best?.putts === 1
      ? `Du satte den från ${formatPuttingDistance(review.best.distance)}`
      : exceptional > 0
        ? "Ett resultat som sticker ut"
        : bigLosses > 0
          ? "Se var puttarna kostade mest"
          : excellent > 0
            ? "Se vad du gjorde riktigt bra"
            : "Upptäck detaljerna bakom din nivå";

  return (
    <Dialog onOpenChange={() => setFilter(null)}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group relative mt-4 block w-full overflow-hidden rounded-[26px] border border-blue-200 bg-gradient-to-br from-white via-blue-50/60 to-indigo-100/70 p-5 text-left text-slate-950 shadow-[0_12px_32px_-18px_rgba(37,99,235,0.45)] transition-shadow hover:shadow-[0_16px_36px_-16px_rgba(37,99,235,0.55)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
        >
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-[10px] font-black uppercase tracking-[0.13em] text-blue-700">
                Estimerad HCP-nivå · Putting
              </span>
              <span className="mt-2 block font-display text-4xl leading-none">
                {canViewDetailedBreakdowns ? `HCP ${hcp}` : "Se din HCP-nivå"}
              </span>
              <span className="mt-2 block text-xs text-slate-500">
                {review.total} puttar · {review.rows.length} hål
              </span>
            </span>
            <span
              aria-hidden="true"
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${exceptional > 0 ? "bg-teal-100 text-teal-700" : "bg-white/90 text-blue-600"}`}
            >
              <Sparkles className="h-6 w-6" />
            </span>
          </span>
          <span className="mt-5 block text-base font-bold leading-snug">{headline}</span>
          {(highlight || bigLosses > 0) && (
            <span className="mt-3 flex flex-wrap gap-2">
              {highlight && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs font-bold text-teal-800">
                  <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                  {highlight}
                </span>
              )}
              {bigLosses > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-bold text-orange-800">
                  <TrendingDown aria-hidden="true" className="h-3.5 w-3.5" />
                  {bigLosses} {bigLosses === 1 ? "stort tapp" : "stora tapp"}
                </span>
              )}
            </span>
          )}
          <span className="mt-3 block text-xs leading-relaxed text-slate-600">
            Se vad som lyfte resultatet och var du kan förbättra dig.
          </span>
          <span className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-[0_6px_16px_-6px_rgba(37,99,235,0.65)] transition-colors group-hover:from-blue-700 group-hover:to-indigo-700">
            {!canViewDetailedBreakdowns && <Lock aria-hidden="true" className="h-4 w-4" />}
            Visa matchanalys
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
            />
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-24px)] overflow-y-auto rounded-[28px] border-slate-200 bg-white p-5 text-slate-950 sm:rounded-[28px]">
        <DialogTitle className="pr-6 font-display text-2xl">Match Review</DialogTitle>
        <DialogDescription className="sr-only">
          Matchens estimerade puttingnivå och resultat hål för hål.
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
              <p className="text-xs font-bold text-blue-700">Estimerad HCP-nivå · Putting</p>
              <p className="mt-2 font-display text-4xl">HCP {hcp}</p>
              <p className="mt-2 text-xs text-slate-600">
                {review.total} puttar · {review.rows.length} hål
              </p>
              {!review.hcpBand && (
                <p className="mt-2 text-xs text-slate-500">
                  Minst tre registrerade hål behövs för ett estimat.
                </p>
              )}
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
                eller enskilda returputtar registreras. Sudden death ingår inte. Reviewn ändrar inte
                ditt etablerade eller officiella HCP.
              </p>
            </details>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
