import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Compass,
  Gauge,
  Map,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { TeeHero } from "@/components/offtee-visuals";

const VALUE_ITEMS = [
  { icon: Target, label: "Off the Tee Score 0–100" },
  { icon: Gauge, label: "Driving Handicap" },
  { icon: Map, label: "Spridningskarta" },
  { icon: Sparkles, label: "Längd jämfört med andra golfare" },
  { icon: TrendingUp, label: "Out of Bounds (OB)" },
  { icon: Compass, label: "Jämnhet" },
  { icon: AlertTriangle, label: "Upptäckta missmönster" },
];

/**
 * Utförlig landningssida för Off the Tee Test, nådd via ett kompakt kort på
 * kategorisidan. Samma visuella språk som Approach Test-landningen.
 */
export function OffTeeLanding({ lastResultLabel }: { lastResultLabel?: string }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-6">
      <Link
        to="/kategori/$slug"
        params={{ slug: "driving" }}
        aria-label="Tillbaka"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <div className="mt-4">
        <TeeHero />
      </div>

      <p className="mt-6 text-xs uppercase tracking-[0.3em] text-flag">Off the Tee</p>
      <h1 className="mt-2 text-5xl leading-none">Off the Tee Test</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        Slå 6 drives mot samma fairway och få en uppskattning av din Driving Handicap baserat på
        längd, precision och jämnhet.
      </p>

      <section className="mt-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Efter testet får du
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {VALUE_ITEMS.map(({ icon: Icon, label }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-3">
              <Icon className="h-5 w-5 text-flag" />
              <p className="mt-2 text-sm font-medium leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Så går testet till
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          6 drives mot samma standardiserade fairway. Bara tre tal per slag – carry, totalt avstånd
          och sidled från mitten. Ingen klubba att välja. Din Driving Handicap byggs sedan av längd,
          hur ofta du håller bollen i spel (Out of Bounds) och hur jämn du är slag för slag.
        </p>
      </section>

      {lastResultLabel ? (
        <p className="mt-6 text-center text-xs text-muted-foreground">{lastResultLabel}</p>
      ) : null}

      <Link
        to="/offtee"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
      >
        Starta Off the Tee Test
        <ArrowRight className="h-5 w-5" />
      </Link>
      <p className="mt-3 text-center text-xs text-muted-foreground">Tar ca 8–10 minuter</p>
    </main>
  );
}
