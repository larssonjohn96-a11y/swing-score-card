import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { computeRatings, weakestCategory, type CategoryRating } from "@/lib/focus";
import { LevelToggle } from "@/components/level-toggle";
import { DEFAULT_LEVEL, getLevel, loadLevel, saveLevel, type LevelKey } from "@/lib/levels";

export function TrainingFocus() {
  const [ratings, setRatings] = useState<CategoryRating[] | null>(null);
  const [level, setLevel] = useState<LevelKey>(DEFAULT_LEVEL);

  useEffect(() => {
    const stored = loadLevel();
    setLevel(stored);
    setRatings(computeRatings(stored));
  }, []);

  function pickLevel(key: LevelKey) {
    setLevel(key);
    saveLevel(key);
    setRatings(computeRatings(key));
  }

  if (!ratings) return null;
  const weakest = weakestCategory(ratings);
  const sorted = [...ratings].sort(
    (a, b) => (a.rating ?? 999) - (b.rating ?? 999),
  );

  return (
    <section className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-glow)]">
      <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Träningsfokus</h2>

      <p className="mt-3 text-xs text-muted-foreground">Jämför mot nivå</p>
      <div className="mt-2">
        <LevelToggle value={level} onChange={pickLevel} />
      </div>

      {weakest ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Just nu ligger du lägst i{" "}
          <span className="font-semibold text-flag">{weakest.title}</span> – lägg mest tid där.
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Kör minst ett test så räknar vi ut vilken kategori du behöver träna mest på.
        </p>
      )}

      <div className="mt-4 space-y-3">
        {sorted.map((r) => (
          <Link
            key={r.slug}
            to="/kategori/$slug"
            params={{ slug: r.slug }}
            className="block"
          >
            <div className="flex items-baseline justify-between text-sm">
              <span
                className={
                  weakest?.slug === r.slug ? "font-semibold text-flag" : "text-foreground"
                }
              >
                {r.title}
              </span>
              <span className="text-xs text-muted-foreground">
                {typeof r.rating === "number" ? `${Math.round(r.rating)} / 100` : "Ingen data"}
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${
                  weakest?.slug === r.slug ? "bg-flag" : "bg-primary"
                }`}
                style={{ width: `${typeof r.rating === "number" ? r.rating : 0}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{r.detail}</p>
          </Link>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        100 = {getLevel(level).label}-nivå. Byt nivå ovan för att jämföra mot 30, 20, 10 eller 0 hcp,
        PGA Tour eller tourens long hitters.
      </p>
    </section>
  );
}
