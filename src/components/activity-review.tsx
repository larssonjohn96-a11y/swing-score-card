import { useState } from "react";
import { ActivityReviewShell } from "./activity-review-shell";
import {
  buildActivityReview,
  type ActivityReviewInput,
  type ActivityCategory,
} from "@/lib/activity-review";

const categoryStyle: Record<ActivityCategory, string> = {
  Exceptionellt: "bg-teal-50 text-teal-700",
  Utmärkt: "bg-blue-50 text-blue-700",
  Bra: "bg-emerald-50 text-emerald-700",
  Förväntat: "bg-slate-100 text-slate-600",
  Svagt: "bg-orange-50 text-orange-700",
  "Stort tapp": "bg-rose-50 text-rose-700",
};

export function ActivityReview({
  input,
  activity = "training",
  compact = false,
}: {
  input: ActivityReviewInput;
  compact?: boolean;
  activity?: "training" | "match";
}) {
  const review = buildActivityReview(input);
  const [filter, setFilter] = useState<"all" | ActivityCategory>("all");
  if (!review.outcomes.length && review.handicap === null && !review.summary) return null;
  const rows = review.outcomes.filter((row) => filter === "all" || row.category === filter);
  const hcp =
    review.handicap === null
      ? null
      : review.handicap < 0
        ? `+${Math.abs(review.handicap).toFixed(1)}`
        : review.handicap.toFixed(1).replace(".", ",");
  return (
    <ActivityReviewShell
      compact={compact}
      title={review.title}
      hcp={hcp}
      summary={review.summary ?? `${review.outcomes.length} försök`}
      positive={
        review.counts[0].count
          ? `${review.counts[0].count} exceptionella slag`
          : review.good
            ? `${review.good} bra resultat`
            : null
      }
      negative={
        review.counts[5].count
          ? `${review.counts[5].count} stora tapp`
          : review.poor
            ? `${review.poor} att förbättra`
            : null
      }
      activity={activity}
      onOpenChange={() => setFilter("all")}
    >
      <section className="rounded-2xl bg-blue-50 p-4 text-center">
        <p className="text-xs text-blue-700">{hcp ? "Estimerad HCP-nivå" : "Resultat"}</p>
        <p className="mt-1 font-display text-3xl">
          {hcp ? `HCP ${hcp}` : (review.summary ?? `${review.outcomes.length} försök`)}
        </p>
      </section>
      <section className="space-y-1.5">
        <h3 className="font-bold">Kategorisering</h3>
        <p className="pb-1 text-xs text-slate-500">
          Momentets resultat enligt SG4:s bedömningsregler. Tryck för att filtrera.
        </p>
        {review.counts.map(({ category, count }) => (
          <button
            key={category}
            type="button"
            aria-pressed={filter === category}
            onClick={() => setFilter(filter === category ? "all" : category)}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm ${categoryStyle[category]} ${filter === category ? "ring-2 ring-blue-500" : ""}`}
          >
            <span>{category}</span>
            <strong>{count}</strong>
          </button>
        ))}
        {review.outcomes.some((row) => !row.category) && (
          <p className="text-xs text-slate-500">
            {review.outcomes.filter((row) => !row.category).length} försök saknar tillräckligt
            underlag för kategorisering.
          </p>
        )}
      </section>
      {review.best && (
        <section className="rounded-2xl border border-teal-100 bg-teal-50 p-4">
          <p className="text-xs font-bold text-teal-700">Bästa slaget i passet</p>
          <p className="mt-1 text-sm font-bold">
            {review.best.label} · {review.best.result}
          </p>
          {review.best.context && (
            <p className="mt-1 text-xs text-slate-600">{review.best.context}</p>
          )}
          <p className="mt-1 text-xs text-teal-700">
            {review.best.category}. {review.best.basis}
          </p>
        </section>
      )}
      {review.worst && (
        <section className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
          <p className="text-xs font-bold text-orange-700">Största tappet i passet</p>
          <p className="mt-1 text-sm font-bold">
            {review.worst.label} · {review.worst.result}
          </p>
          {review.worst.context && (
            <p className="mt-1 text-xs text-slate-600">{review.worst.context}</p>
          )}
          <p className="mt-1 text-xs text-orange-700">
            {review.worst.category}. {review.worst.basis}
          </p>
        </section>
      )}
      <section className="space-y-2">
        <h3 className="font-bold">Försök för försök</h3>
        {filter !== "all" && (
          <button type="button" onClick={() => setFilter("all")} className="text-sm text-blue-700">
            Visa alla försök
          </button>
        )}
        {rows.map((row, index) => (
          <div key={`${row.label}-${index}`} className="rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-bold">{row.label}</p>
            {row.category && (
              <span
                className={`mt-1 inline-block rounded-lg px-2 py-1 text-xs ${categoryStyle[row.category]}`}
              >
                {row.category}
              </span>
            )}
            {row.context && <p className="mt-1 text-xs text-slate-500">{row.context}</p>}
            <p
              className={`mt-1 text-sm ${row.quality === "good" ? "text-teal-700" : row.quality === "poor" ? "text-orange-700" : "text-slate-600"}`}
            >
              {row.result}
            </p>
          </div>
        ))}
        {!rows.length && <p className="text-sm text-slate-500">Inga försök i denna kategori.</p>}
      </section>
      <details className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
        <summary>Om analysen</summary>
        <p className="mt-2">
          {review.handicap === null
            ? "HCP-modell saknas för detta format. Här visas registrerade resultat utan en uppskattad handicapnivå."
            : "HCP hämtas från aktivitetens befintliga beräkning."}{" "}
          Kategorierna följer preliminära regler för resultatzon, relativ avvikelse eller
          träff/miss. Förväntat är en regelkategori, inte en verifierad HCP-20-jämförelse. Bästa
          slag och största tapp rangordnas med samma regel inom passet; tapp anges inte i förlorade
          slag. Reglerna kan kalibreras utan att ändra registrerade resultat. Modellversion{" "}
          {review.version}.
        </p>
      </details>
    </ActivityReviewShell>
  );
}
