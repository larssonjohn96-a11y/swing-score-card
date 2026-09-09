import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { computeStableCategoryHandicaps } from "@/lib/category-index";
import {
  CATEGORY_LABELS,
  computeEstimatedHandicap,
  hcpLabel,
  loadRealHandicap,
  type CategoryHandicap,
  type CategorySlug,
} from "@/lib/sg-handicap";

const ORDER: CategorySlug[] = ["driving", "approach", "around-the-green", "puttning", "speed"];
type SortMode = "order" | "strong" | "weak";

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: "order", label: "Spelordning" },
  { value: "strong", label: "Starkast" },
  { value: "weak", label: "Svagast" },
];

export function StableCategoryStatsSection() {
  const [cats, setCats] = useState<CategoryHandicap[]>([]);
  const [sort, setSort] = useState<SortMode>("order");

  useEffect(() => {
    const real = loadRealHandicap();
    setCats(computeStableCategoryHandicaps(undefined, real ?? undefined));
  }, []);

  const total = computeEstimatedHandicap(cats);
  const sorted = useMemo(() => {
    if (sort === "order") return ORDER.map((slug) => cats.find((c) => c.slug === slug)).filter(Boolean) as CategoryHandicap[];
    return [...cats].sort((a, b) => {
      const av = a.handicap ?? Number.POSITIVE_INFINITY;
      const bv = b.handicap ?? Number.POSITIVE_INFINITY;
      return sort === "strong" ? av - bv : bv - av;
    });
  }, [cats, sort]);

  return (
    <section className="mt-14 border-t border-border pt-10">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Din spelprofil</p>
        <h2 className="mt-1 font-display text-3xl leading-none">Handicap per kategori</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Lägre HCP-nivå = starkare kategori</p>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-muted/45 p-1" role="group" aria-label="Sortera kategorier">
        <div className="grid grid-cols-3 gap-1">
          {SORT_OPTIONS.map((option) => {
            const active = sort === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSort(option.value)}
                aria-pressed={active}
                className={`min-w-0 rounded-xl px-2 py-2.5 text-[11px] font-semibold transition-colors ${
                  active
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground active:bg-card"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 rounded-3xl border border-border bg-card p-6 text-center shadow-[var(--shadow-glow)]">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Estimated HCP</p>
        <p className="mt-2 font-display text-5xl leading-none text-primary">{total !== undefined ? hcpLabel(total) : "–"}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {sorted.map((cat) => (
          <Link
            key={cat.slug}
            to="/utveckling/$slug"
            params={{ slug: cat.slug }}
            className="flex min-h-40 flex-col items-center justify-center rounded-3xl border border-border bg-card p-4 text-center shadow-[var(--shadow-glow)] active:bg-tint/60"
          >
            <p className="w-full truncate text-sm font-semibold">{CATEGORY_LABELS[cat.slug]}</p>
            <p className="mt-5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">HCP-nivå</p>
            <p className="mt-1 font-display text-4xl leading-none">{cat.handicap !== undefined ? hcpLabel(cat.handicap) : "–"}</p>
            {cat.isBaseline ? <p className="mt-2 text-[9px] uppercase tracking-wide text-muted-foreground">Startnivå</p> : <span className="mt-2 h-3" />}
          </Link>
        ))}
      </div>
    </section>
  );
}
