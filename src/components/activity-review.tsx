import { useState } from "react";
import { ActivityReviewShell } from "./activity-review-shell";
import { buildActivityReview, type ActivityReviewInput } from "@/lib/activity-review";

export function ActivityReview({
  input,
  activity = "training",
}: {
  input: ActivityReviewInput;
  activity?: "training" | "match";
}) {
  const review = buildActivityReview(input);
  const [filter, setFilter] = useState<"all" | "good" | "poor">("all");
  if (!review.outcomes.length && review.handicap === null && !review.summary) return null;
  const rows = review.outcomes.filter((row) => filter === "all" || row.quality === filter);
  const hcp =
    review.handicap === null
      ? null
      : review.handicap < 0
        ? `+${Math.abs(review.handicap).toFixed(1)}`
        : review.handicap.toFixed(1).replace(".", ",");
  return (
    <ActivityReviewShell
      title={review.title}
      hcp={hcp}
      summary={review.summary ?? `${review.outcomes.length} försök`}
      positive={review.good ? `${review.good} bra resultat` : null}
      negative={review.poor ? `${review.poor} att förbättra` : null}
      activity={activity}
      onOpenChange={() => setFilter("all")}
    >
      <section className="rounded-2xl bg-blue-50 p-4 text-center">
        <p className="text-xs text-blue-700">{hcp ? "Estimerad HCP-nivå" : "Resultat"}</p>
        <p className="mt-1 font-display text-3xl">
          {hcp ? `HCP ${hcp}` : (review.summary ?? `${review.outcomes.length} försök`)}
        </p>
      </section>
      {(review.good > 0 || review.poor > 0) && (
        <div className="flex flex-wrap gap-2">
          {(["all", "good", "poor"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`rounded-xl border px-3 py-2 text-sm ${filter === value ? "border-blue-600 bg-blue-50" : "border-slate-200"}`}
            >
              {value === "all"
                ? "Alla"
                : value === "good"
                  ? `Bra (${review.good})`
                  : `Att förbättra (${review.poor})`}
            </button>
          ))}
        </div>
      )}
      <section className="space-y-2">
        <h3 className="font-bold">Försök för försök</h3>
        {rows.map((row, index) => (
          <div key={`${row.label}-${index}`} className="rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-bold">{row.label}</p>
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
          Klassificering visas bara när aktivitetens resultat definierar träff eller miss. Ingen
          teknisk orsak eller missriktning antas utan registrerat underlag.
        </p>
      </details>
    </ActivityReviewShell>
  );
}
