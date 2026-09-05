import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
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
    <section className="mt-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Handicap per kategori</p>
          <p className="mt-1 text-xs text-muted-foreground">Lägre HCP-nivå = starkare kategori</p>
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)} className="rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold outline-none">
          <option value="order">Spelordning</option>
          <option value="strong">Starkast först</option>
          <option value="weak">Svagast först</option>
        </select>
      </div>

      <div className="mt-3 rounded-3xl border border-border bg-card p-5 text-center shadow-[var(--shadow-glow)]">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Estimated HCP</p>
        <p className="mt-1 font-display text-5xl leading-none text-primary">{total !== undefined ? hcpLabel(total) : "–"}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {sorted.map((cat) => {
          const flat = cat.trend === undefined || Math.abs(cat.trend) < 0.05;
          const improving = cat.trend !== undefined && cat.trend < -0.05;
          const TrendIcon = flat ? Minus : improving ? ArrowDownRight : ArrowUpRight;
          const trendClass = flat ? "text-muted-foreground" : improving ? "text-primary" : "text-destructive";
          return (
            <Link key={cat.slug} to="/utveckling/$slug" params={{ slug: cat.slug }} className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-glow)] active:bg-tint/60">
              <p className="truncate text-sm font-semibold">{CATEGORY_LABELS[cat.slug]}</p>
              <div className="mt-4 flex items-end justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">HCP-nivå</p>
                  <p className="mt-1 font-display text-4xl leading-none">{cat.handicap !== undefined ? hcpLabel(cat.handicap) : "–"}</p>
                  {cat.isBaseline ? <p className="mt-1 text-[9px] uppercase tracking-wide text-muted-foreground">Startnivå</p> : null}
                </div>
                <div className={`mb-0.5 flex items-center gap-1 ${trendClass}`}>
                  <TrendIcon className="h-5 w-5" />
                  {!flat && cat.trend !== undefined ? <span className="text-xs font-semibold">{Math.abs(cat.trend).toFixed(1).replace(".", ",")}</span> : null}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
