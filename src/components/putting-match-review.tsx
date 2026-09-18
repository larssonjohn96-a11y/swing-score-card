import { useMemo, useState } from "react";
import { ActivityReviewShell } from "./activity-review-shell";
import { buildPuttingMatchReview, type ReviewHole } from "@/lib/putting-match-review";
import { formatPuttingDistance } from "@/lib/putting-match";

const decimal = (value: number) => value.toFixed(1).replace(".", ",");

export function PuttingMatchReview({
  holes,
  activity = "match",
}: {
  holes: readonly ReviewHole[];
  activity?: "match" | "training";
}) {
  const isTraining = activity === "training";
  const review = useMemo(() => buildPuttingMatchReview(holes), [holes]);
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

  return (
    <ActivityReviewShell
      title="Estimerad HCP-nivå · Putting"
      hcp={review.hcpBand ? hcp : null}
      summary={`${review.total} puttar · ${review.rows.length} hål`}
      positive={highlight}
      negative={bigLosses ? `${bigLosses} ${bigLosses === 1 ? "stort tapp" : "stora tapp"}` : null}
      activity={activity}
      onOpenChange={() => setFilter(null)}
    >
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
          Hela hålets resultat jämfört med SG4:s HCP 20-modell på samma startavstånd. Tryck för att
          filtrera.
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
            Hål {review.biggestLoss.hole} · {formatPuttingDistance(review.biggestLoss.distance)} ·{" "}
            {review.biggestLoss.putts} puttar
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
                {decimal(Math.abs(row.gained))} {row.gained >= 0 ? "färre" : "fler"} puttar än HCP
                20-modellen.
              </p>
            </div>
          ))}
        </div>
      </section>
      <details className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
        <summary className="cursor-pointer font-bold">Så beräknas reviewn</summary>
        <p className="mt-2 leading-relaxed">
          Startavstånd och antal puttar jämförs med SG4:s befintliga scratch- och HCP 20-kurvor.
          HCP-bandet är en grov modelluppskattning, inte ett statistiskt konfidensintervall.
          Modellen är inte validerad för aktivitets-HCP och extrapoleras över HCP 20. Ett kort pass
          påverkas mycket av dagsform och green. Inga missriktningar eller enskilda returputtar
          registreras.{" "}
          {isTraining
            ? "Alla registrerade hål i passet ingår, även coachutmaningar."
            : "Sudden death ingår inte."}{" "}
          Reviewn ändrar inte ditt etablerade eller officiella HCP.
        </p>
      </details>
    </ActivityReviewShell>
  );
}
