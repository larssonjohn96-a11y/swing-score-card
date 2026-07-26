import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { computeRatings, type CategoryRating } from "@/lib/focus";
import { buildInsight, type Insight } from "@/lib/coaching";

export function TrainingFocus() {
  const [ratings, setRatings] = useState<CategoryRating[] | null>(null);

  useEffect(() => {
    setRatings(computeRatings());
  }, []);

  if (!ratings) return null;
  const insight: Insight = buildInsight(ratings);
  const sorted = [...ratings].sort((a, b) => (a.rating ?? 999) - (b.rating ?? 999));

  return (
    <section className="mt-6 rounded-3xl border border-border bg-card p-4">
      <h2 className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
        Träningsfokus
      </h2>

      <div className="mt-3 space-y-2">
        {sorted.map((r) => (
          <Link
            key={r.slug}
            to="/kategori/$slug"
            params={{ slug: r.slug }}
            className="flex items-center gap-3"
          >
            <span
              className={`w-40 shrink-0 truncate text-sm ${
                insight.weakest?.slug === r.slug
                  ? "font-semibold text-flag"
                  : "text-foreground"
              }`}
            >
              {r.title}
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className={`block h-full rounded-full ${
                  insight.weakest?.slug === r.slug ? "bg-flag" : "bg-primary"
                }`}
                style={{ width: `${typeof r.rating === "number" ? r.rating : 0}%` }}
              />
            </span>
            <span className="w-12 shrink-0 text-right text-xs text-muted-foreground">
              {typeof r.rating === "number" ? Math.round(r.rating) : "–"}
            </span>
          </Link>
        ))}
      </div>

      {insight.weakest ? (
        <div className="mt-4 rounded-2xl border border-flag/40 bg-flag/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-flag">
            Din största möjlighet
          </p>
          <p className="mt-2 text-sm text-foreground">
            <span className="font-semibold">{insight.weakest.title}</span> är ditt svagaste
            område.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Förbättrar du detta med 10 % kan du spara cirka {insight.strokes} slag per rond.
          </p>
          <Link
            to="/traning"
            className="mt-3 inline-block rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            Se övningar
          </Link>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Kör minst ett test så räknar vi ut vad du behöver träna mest på.
        </p>
      )}

      {insight.strongest ? (
        <div className="mt-3 rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Din styrka</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Snyggt jobbat med <span className="font-semibold text-foreground">
              {insight.strongest.title}
            </span>{" "}
            – det är ditt starkaste område. Håll det vid liv med ett kort pass i veckan.
          </p>
        </div>
      ) : null}
    </section>
  );
}
