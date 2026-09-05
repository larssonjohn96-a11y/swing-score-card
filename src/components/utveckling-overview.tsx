import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { hcpLabel, type CategorySlug } from "@/lib/sg-handicap";

/* --------------------------------------------------------- 1. Nuvarande nivå */

export function LevelSummary({
  real,
  estimated,
  change90d,
}: {
  real: number | null;
  estimated: number | undefined;
  /** förändring i estimated HCP senaste 3 månaderna, negativt = förbättring */
  change90d: number | undefined;
}) {
  const improving = change90d !== undefined && change90d < 0;
  const flat = change90d === undefined || Math.abs(change90d) < 0.05;
  const Icon = improving ? TrendingDown : TrendingUp;

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-glow)]">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">HCP</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-5xl leading-none">
            {real !== null ? hcpLabel(real) : "–"}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Estimated HCP</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-5xl leading-none text-flag">
            {estimated !== undefined ? hcpLabel(estimated) : "–"}
          </p>
        </div>
      </div>
      <p className="mt-5 flex items-center gap-2 border-t border-border pt-3 text-sm text-muted-foreground">
        {flat ? "Din nivå ligger stabilt de senaste 3 månaderna." : <><span className={`inline-flex items-center gap-1 font-semibold ${improving ? "text-primary" : "text-destructive"}`}><Icon className="h-4 w-4" />{improving ? "↓" : "↑"} {Math.abs(change90d!).toFixed(1).replace(".", ",")}</span>senaste 3 månaderna</>}
      </p>
    </section>
  );
}

export type CategoryVerdict = {
  slug: CategorySlug;
  title: string;
  handicap?: number;
  trend?: number;
  benchmark: number;
  diff?: number;
};

type CategorySort = "game" | "strongest" | "weakest";

const GAME_ORDER: CategorySlug[] = [
  "driving",
  "approach",
  "around-the-green",
  "puttning",
  "speed",
];

function sortRows(rows: CategoryVerdict[], sort: CategorySort) {
  const copy = [...rows];

  if (sort === "game") {
    return copy.sort((a, b) => GAME_ORDER.indexOf(a.slug) - GAME_ORDER.indexOf(b.slug));
  }

  return copy.sort((a, b) => {
    const aMissing = a.handicap === undefined;
    const bMissing = b.handicap === undefined;
    if (aMissing && bMissing) return 0;
    if (aMissing) return 1;
    if (bMissing) return -1;
    return sort === "strongest"
      ? a.handicap! - b.handicap!
      : b.handicap! - a.handicap!;
  });
}

export function CategoryHeatTable({ rows }: { rows: CategoryVerdict[]; benchmarkLabel: string }) {
  const [sort, setSort] = useState<CategorySort>("game");
  const sortedRows = useMemo(() => sortRows(rows, sort), [rows, sort]);

  return (
    <section className="mt-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Handicap per kategori</p>
          <p className="mt-1 text-xs text-muted-foreground">Lägre HCP-nivå = starkare kategori</p>
        </div>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setSort("game")}
          className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${sort === "game" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}
        >
          Spelordning
        </button>
        <button
          type="button"
          onClick={() => setSort("strongest")}
          className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${sort === "strongest" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}
        >
          Starkast → svagast
        </button>
        <button
          type="button"
          onClick={() => setSort("weakest")}
          className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${sort === "weakest" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}
        >
          Svagast → starkast
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {sortedRows.map((r) => {
          const flat = r.trend === undefined || Math.abs(r.trend) < 0.05;
          const improving = r.trend !== undefined && r.trend < -0.05;
          const TrendIcon = flat ? Minus : improving ? ArrowDownRight : ArrowUpRight;
          const trendClass = flat ? "text-muted-foreground" : improving ? "text-primary" : "text-destructive";
          return (
            <Link key={r.slug} to="/utveckling/$slug" params={{ slug: r.slug }} className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-glow)] transition-colors active:bg-tint/60">
              <p className="truncate text-sm font-semibold text-foreground">{r.title}</p>
              <div className="mt-4 flex items-end justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">HCP-nivå</p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-4xl leading-none">{r.handicap !== undefined ? hcpLabel(r.handicap) : "–"}</p>
                </div>
                <div className={`mb-0.5 flex items-center gap-1 ${trendClass}`}>
                  <TrendIcon className="h-5 w-5" />
                  {r.trend !== undefined && !flat && <span className="text-xs font-semibold">{Math.abs(r.trend).toFixed(1).replace(".", ",")}</span>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function FocusCard({ row }: { row: CategoryVerdict | undefined }) {
  if (!row) return null;
  const worsening = row.trend !== undefined && row.trend > 0.05;
  const below = row.diff !== undefined && row.diff < 0;
  return (
    <section className="mt-8 rounded-3xl border border-primary/40 bg-primary/[0.06] p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-primary">Ditt fokus just nu</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-4xl leading-none">{row.title}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{below ? `Du ligger under din jämförelsenivå inom ${row.title}` : `${row.title} är just nu den svagaste delen av din profil`}{worsening ? " och området har försämrats under den senaste perioden." : "."}</p>
      <Link to="/utveckling/$slug" params={{ slug: row.slug }} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Se {row.title}-analys<ArrowRight className="h-4 w-4" /></Link>
    </section>
  );
}
