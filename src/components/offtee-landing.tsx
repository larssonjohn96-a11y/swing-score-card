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
  { icon: Gauge, label: "Uppskattad OTT-handicap" },
  { icon: Map, label: "Spridningskarta" },
  { icon: Sparkles, label: "Distans- & träffsäkerhetsanalys" },
  { icon: TrendingUp, label: "Klubbstatistik" },
  { icon: Compass, label: "Förbättringsområden" },
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

      <p className="mt-6 text-xs uppercase tracking-[0.3em] text-flag">Driving</p>
      <h1 className="mt-2 text-5xl leading-none">Off the Tee Test</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        Mät din fullständiga prestation från tee genom 12 realistiska utslagsscenarier – längd,
        träffsäkerhet och förmågan att hålla bollen i spel.
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
          Dig som vill slå längre utan att offra träffsäkerheten, hålla fler bollar i spel och
          förstå exakt vilka klubbor och hål som kostar dig slag från tee.
        </p>
      </section>

      <section className="mt-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Så går testet till
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          12 tee-slag på en realistisk blandning av par 4- och par 5-hål – breda och smala fairways,
          dogleger och en risk/reward-station. Välj klubba och registrera carry, totalt avstånd och
          sidled efter varje slag. Klubbvalet påverkar aldrig poängen – bara resultatet av slaget
          räknas.
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
      <p className="mt-3 text-center text-xs text-muted-foreground">Tar ca 10–15 minuter</p>
    </main>
  );
}
