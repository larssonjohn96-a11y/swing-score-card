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
import { GreenHero } from "@/components/precision-visuals";

const VALUE_ITEMS = [
  { icon: Target, label: "Approach Score 0–100" },
  { icon: Gauge, label: "Uppskattad handicapnivå" },
  { icon: Map, label: "Spridningskarta" },
  { icon: Sparkles, label: "Personlig analys" },
  { icon: TrendingUp, label: "Identifierade styrkor" },
  { icon: Compass, label: "Förbättringsområden" },
  { icon: AlertTriangle, label: "Upptäckta missmönster" },
];

/**
 * Utförlig landningssida för ett specifikt test (Approach Test), nådd via
 * ett kompakt kort på kategorisidan. Stor hero, kort värdeladdad ingress,
 * värdet först – tekniska detaljer längre ned.
 */
export function ApproachLanding({ lastResultLabel }: { lastResultLabel?: string }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-6">
      <Link
        to="/kategori/$slug"
        params={{ slug: "approach" }}
        aria-label="Tillbaka"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <div className="mt-4">
        <GreenHero />
      </div>

      <p className="mt-6 text-xs uppercase tracking-[0.3em] text-flag">Approach</p>
      <h1 className="mt-2 text-5xl leading-none">Approach Test</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        Se exakt hur nära flaggan du landar – avstånd för avstånd. Testet avslöjar mönstren bakom
        dina inspel och vad som avgör hur många birdiechanser du skapar.
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

      <section className="mt-8 rounded-3xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Vem passar testet för
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Dig som vill skärpa precisionen mot green, skapa fler birdiechanser och förstå exakt var
          dina inspel brister – kort, långt, till vänster eller höger.
        </p>
      </section>

      <section className="mt-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Så går testet till
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          18 slag från 9 avstånd mellan 55 och 165 meter, två slag per avstånd. Efter varje slag
          registrerar du carry och sidled – resultatet räknas fram när alla slag är klara.
        </p>
      </section>

      {lastResultLabel ? (
        <p className="mt-6 text-center text-xs text-muted-foreground">{lastResultLabel}</p>
      ) : null}

      <Link
        to="/precision"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
      >
        Starta Approach Test
        <ArrowRight className="h-5 w-5" />
      </Link>
      <p className="mt-3 text-center text-xs text-muted-foreground">Tar ca 10 minuter</p>
    </main>
  );
}
