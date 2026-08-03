import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Pencil, TrendingDown, TrendingUp, Check } from "lucide-react";
import type { CategoryHandicap, LatestTest, Opportunity } from "@/lib/sg-handicap";

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
          ? `Din nuvarande nivå motsvarar cirka HCP ${fmt(estimated)}.`
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
          {real !== null ? fmt(real) : "–"}
        </p>
      )}

      <div className="mt-4 flex items-baseline justify-between border-t border-border pt-3">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Estimated SG Handicap
        </p>
        <p className="font-[family-name:var(--font-display)] text-2xl leading-none text-flag">
          {estimated !== undefined ? fmt(estimated) : "–"}
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
            {real !== null ? fmt(real) : "–"}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Estimated HCP
          </p>
          <p className="mt-0.5 font-[family-name:var(--font-display)] text-3xl leading-none text-flag">
            {estimated !== undefined ? fmt(estimated) : "–"}
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
  return (
    <section className="mt-6">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Kategori-HCP</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {cats.map((c) => (
          <div key={c.slug} className="rounded-2xl border border-border bg-card p-3">
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              {c.title}
            </p>
            {c.handicap !== undefined ? (
              <>
                <p className="mt-1 font-[family-name:var(--font-display)] text-2xl leading-none">
                  HCP {fmt(c.handicap)}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <Trend value={c.trend} />
                  {c.latestScore !== undefined && (
                    <span className="text-[11px] text-muted-foreground">
                      SG {Math.round(c.latestScore)}
                    </span>
                  )}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(4, Math.min(100, (36 - c.handicap) * 2.6))}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Inget test ännu</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* --------------------------------------------------- Din största möjlighet */

export function OpportunityCard({ opportunity }: { opportunity: Opportunity | undefined }) {
  if (!opportunity) return null;
  return (
    <section className="mt-6 rounded-3xl border border-primary/40 bg-primary/[0.06] p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-primary">Din största möjlighet</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-none">
        {opportunity.title}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Förbättrar du {opportunity.title} med cirka 10 % uppskattas du kunna sänka ditt handicap med
        ungefär {fmt(opportunity.impact)} slag.
      </p>
      <Link
        to="/kategori/$slug"
        params={{ slug: opportunity.slug }}
        className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
      >
        Se rekommenderade tester
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

/* -------------------------------------------------------------- Senaste tester */

export function LatestTestsCard({ tests }: { tests: LatestTest[] }) {
  if (!tests.length) return null;
  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Senaste tester</p>
        <Link to="/historik" className="text-xs font-medium text-flag">
          Visa historik
        </Link>
      </div>
      <div className="mt-3 space-y-2">
        {tests.map((t) => (
          <div
            key={t.key}
            className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
          >
            <div>
              <p className="font-semibold">{t.title}</p>
              {t.handicap !== undefined && (
                <p className="text-xs text-muted-foreground">Estimated HCP {fmt(t.handicap)}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {t.score !== undefined && (
                <span className="font-[family-name:var(--font-display)] text-xl leading-none">
                  {t.score}
                  <span className="text-xs text-muted-foreground">{t.scoreUnit}</span>
                </span>
              )}
              <Trend value={t.trend} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- Smart Insight */

export function SmartInsightCard({ insight }: { insight: string | undefined }) {
  if (!insight) return null;
  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Smart insight</p>
      <p className="mt-1.5 text-sm leading-relaxed">{insight}</p>
    </section>
  );
}

/* ------------------------------------------------------------------ Nästa mål */

export function GoalCard({
  real,
  estimated,
  target,
  improveCats,
}: {
  real: number | null;
  estimated: number | undefined;
  target: number | undefined;
  improveCats: CategoryHandicap[];
}) {
  if (target === undefined) return null;
  return (
    <section className="mt-6 rounded-3xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Nästa mål</p>
      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Officiellt
          </p>
          <p className="mt-0.5 font-[family-name:var(--font-display)] text-2xl leading-none">
            {real !== null ? fmt(real) : "–"}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Estimated</p>
          <p className="mt-0.5 font-[family-name:var(--font-display)] text-2xl leading-none text-flag">
            {estimated !== undefined ? fmt(estimated) : "–"}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Mål</p>
          <p className="mt-0.5 font-[family-name:var(--font-display)] text-2xl leading-none text-primary">
            {fmt(target)}
          </p>
        </div>
      </div>
      {improveCats.length > 0 && (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Du behöver förbättra främst {improveCats.map((c) => c.title).join(" och ")} för att nå HCP{" "}
          {fmt(target)}.
        </p>
      )}
    </section>
  );
}
