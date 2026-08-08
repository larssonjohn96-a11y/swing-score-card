import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Pencil, TrendingDown, TrendingUp, Check } from "lucide-react";
import {
  computeCategoryHcpTimeline,
  hcpLabel,
  ratingFromHandicap,
  type CategoryHandicap,
  type Opportunity,
} from "@/lib/sg-handicap";
import { CATEGORIES } from "@/lib/categories";
import type { Highlight } from "@/lib/highlights";

/** Rating (0–100) eller andra icke-handicap-tal. Handicap-tal ska alltid formatteras med hcpLabel. */
function fmt(n: number): string {
  return n.toFixed(1).replace(".", ",");
}

function Trend({ value }: { value?: number }) {
  if (value === undefined || Math.abs(value) < 0.05) return null;
  const improving = value < 0;
  const Icon = improving ? TrendingDown : TrendingUp;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
        improving ? "text-primary" : "text-destructive"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {improving ? "" : "+"}
      {fmt(value)}
    </span>
  );
}

/* --------------------------------------------------------- Verkligt HCP */

export function RealHandicapCard({
  real,
  estimated,
  onSave,
}: {
  real: number | null;
  estimated: number | undefined;
  onSave: (value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(real !== null ? String(real) : "");

  function save() {
    const n = Number(draft.replace(",", "."));
    if (Number.isFinite(n)) onSave(Math.round(n * 10) / 10);
    setEditing(false);
  }

  const insight =
    real !== null && estimated !== undefined
      ? estimated < real
        ? "Du spelar just nu bättre än ditt officiella handicap."
        : estimated > real
          ? `Din nuvarande nivå motsvarar cirka HCP ${hcpLabel(estimated)}.`
          : "Din nivå matchar ditt officiella handicap just nu."
      : undefined;

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-glow)]">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Verkligt handicap
        </p>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setDraft(real !== null ? String(real) : "");
              setEditing(true);
            }}
            aria-label="Redigera verkligt handicap"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="w-28 rounded-xl border border-border bg-transparent px-3 py-1 font-[family-name:var(--font-display)] text-4xl leading-none outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={save}
            aria-label="Spara"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <Check className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <p className="mt-1 font-[family-name:var(--font-display)] text-6xl leading-none">
          {real !== null ? hcpLabel(real) : "–"}
        </p>
      )}

      <div className="mt-4 flex items-baseline justify-between border-t border-border pt-3">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Estimated SG Handicap
        </p>
        <p className="font-[family-name:var(--font-display)] text-2xl leading-none text-flag">
          {estimated !== undefined ? hcpLabel(estimated) : "–"}
        </p>
      </div>

      {insight && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{insight}</p>}
      {real === null && !editing && (
        <p className="mt-3 text-sm text-muted-foreground">
          Lägg till ditt officiella handicap för att se hur din nivå jämförs.
        </p>
      )}
    </section>
  );
}

/* ------------------------------------------------------ Din utveckling */

export function DevelopmentCard({
  real,
  estimated,
  estimatedTrend,
}: {
  real: number | null;
  estimated: number | undefined;
  estimatedTrend: number | undefined;
}) {
  if (real === null && estimated === undefined) return null;
  return (
    <section className="mt-3 rounded-3xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Din utveckling</p>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Real HCP</p>
          <p className="mt-0.5 font-[family-name:var(--font-display)] text-3xl leading-none">
            {real !== null ? hcpLabel(real) : "–"}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Estimated HCP
          </p>
          <p className="mt-0.5 font-[family-name:var(--font-display)] text-3xl leading-none text-flag">
            {estimated !== undefined ? hcpLabel(estimated) : "–"}
          </p>
        </div>
      </div>
      {estimatedTrend !== undefined && Math.abs(estimatedTrend) >= 0.05 && (
        <p className="mt-3 flex items-center gap-1.5 text-sm">
          <Trend value={estimatedTrend} />
          <span className="text-muted-foreground">senaste testen</span>
        </p>
      )}
    </section>
  );
}

/* --------------------------------------------------------- Kategori-HCP */

export function CategoryGrid({ cats }: { cats: CategoryHandicap[] }) {
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});

  useEffect(() => {
    const next: Record<string, number[]> = {};
    for (const c of cats) {
      const points = computeCategoryHcpTimeline(c.slug, 90);
      next[c.slug] = points.map((p) => ratingFromHandicap(p.rolling ?? p.raw ?? 0));
    }
    setSparklines(next);
  }, [cats]);

  return (
    <section className="mt-6">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Kategori-HCP</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {cats.map((c) => {
          const points = sparklines[c.slug] ?? [];
          const content = (
            <>
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                {c.title}
              </p>
              {c.handicap !== undefined ? (
                <>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-2xl leading-none">
                    HCP {hcpLabel(c.handicap)}
                  </p>
                  <div className="mt-2 h-6">
                    {points.length >= 2 ? (
                      <Sparkline values={points} />
                    ) : (
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(4, ratingFromHandicap(c.handicap))}%` }}
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm font-medium text-primary">Gör ett test</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    Inget test ännu
                    <ArrowRight className="h-3 w-3" />
                  </p>
                </>
              )}
            </>
          );

          if (c.handicap === undefined) {
            const link = CATEGORY_LINK[c.slug];
            return (
              <Link
                key={c.slug}
                to={link.to}
                params={link.params}
                className="block rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary"
              >
                {content}
              </Link>
            );
          }

          return (
            <Link
              key={c.slug}
              to="/utveckling/$slug"
              params={{ slug: c.slug }}
              className="block rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary"
            >
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** Liten, mjukt kurvad trendkurva (senaste 90 dagarna) med en pil som visar riktning på slutet. */
export function Sparkline({ values }: { values: number[] }) {
  const w = 100;
  const h = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * w,
    y: h - ((v - min) / span) * (h - 6) - 3,
  }));

  // Mjuk kurva genom punkterna via kubiska bezier-segment (kontrollpunkter vid mittpunkten i x).
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const midX = ((p0.x + p1.x) / 2).toFixed(1);
    d += ` C ${midX} ${p0.y.toFixed(1)}, ${midX} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }

  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const angle = (Math.atan2(last.y - prev.y, last.x - prev.x) * 180) / Math.PI;
  const rising = last.y <= prev.y;
  const tone = rising ? "stroke-primary" : "stroke-destructive";
  const toneFill = rising ? "fill-primary" : "fill-destructive";

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-full w-full overflow-visible"
      preserveAspectRatio="none"
    >
      <path d={d} fill="none" className={tone} strokeWidth="2" strokeLinecap="round" />
      <g transform={`translate(${last.x} ${last.y}) rotate(${angle})`}>
        <path d="M0,-3.2 L5.5,0 L0,3.2 Z" className={toneFill} />
      </g>
    </svg>
  );
}

/* --------------------------------------------------- Din största möjlighet */

const CATEGORY_LINK: Record<
  CategoryHandicap["slug"],
  { to: string; params?: Record<string, string> }
> = {
  approach: { to: "/kategori/$slug", params: { slug: "approach" } },
  driving: { to: "/kategori/$slug", params: { slug: "driving" } },
  "around-the-green": { to: "/kategori/$slug", params: { slug: "around-the-green" } },
  puttning: { to: "/kategori/$slug", params: { slug: "puttning" } },
  speed: { to: "/speed-test" },
};

export function OpportunityCard({ opportunity }: { opportunity: Opportunity | undefined }) {
  if (!opportunity) return null;
  const link = CATEGORY_LINK[opportunity.slug];
  return (
    <section className="mt-6 rounded-3xl border border-primary/40 bg-primary/[0.06] p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-primary">
        {opportunity.reason === "missing" ? "Genomför ett test" : "Rekommenderat fokus"}
      </p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-none">
        {opportunity.title}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {opportunity.reason === "missing"
          ? "Du har inte gjort något test i den här kategorin ännu – börja här för en komplett bild."
          : "Kategorin som just nu ger mest att vinna på att träna vidare."}
      </p>
      <Link
        to={link.to}
        params={link.params}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Till {opportunity.title}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

/* ---------------------------------------------------------------- High score */

export function HighScoreCard({ highlights }: { highlights: Highlight[] }) {
  return (
    <section className="mt-6">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">High score</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {highlights.map((h) => (
          <div key={h.key} className="rounded-2xl border border-border bg-card p-3">
            <p className="text-[11px] uppercase leading-tight tracking-[0.12em] text-muted-foreground">
              {h.label}
            </p>
            {h.value !== undefined ? (
              <p className="mt-1 font-[family-name:var(--font-display)] text-2xl leading-none text-flag">
                {h.value.toFixed(h.decimals).replace(".", ",")}
                <span className="ml-1 text-xs text-muted-foreground">{h.unit}</span>
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">–</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- Tester */

export function CategoryTestList() {
  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Alla tester</p>
        <Link to="/tester" className="text-xs font-medium text-flag">
          Se alla
        </Link>
      </div>
      <div className="mt-3 space-y-3">
        {CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            to="/kategori/$slug"
            params={{ slug: c.slug }}
            className="block rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-glow)] transition-colors hover:border-primary"
          >
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              {c.subtitle}
            </p>
            <h2 className="mt-1 text-3xl leading-none">{c.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-flag">
              {c.tests.length > 0 ? `${c.tests.length} test` : "Kommer snart"}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
