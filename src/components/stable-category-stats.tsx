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
    <section className="mt-12 border-t border-border pt-9">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Din spelprofil</p>
          <h2 className="mt-1 font-display text-3xl leading-none">Handicap per kategori</h2>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Lägre HCP-nivå = starkare kategori</p>
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)} className="shrink-0 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold outline-none">
          <option value="order">Spelordning</option>
          <option value="strong">Starkast först</option>
          <option value="weak">Svagast först</option>
        </select>
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
