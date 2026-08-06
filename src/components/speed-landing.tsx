import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Gauge, Radar, Target, TrendingUp, Zap } from "lucide-react";
import { SpeedHero } from "@/components/speed-visuals";

const VALUE_ITEMS = [
  { icon: Zap, label: "Snitt- och toppfart" },
  { icon: Gauge, label: "Speed HCP" },
  { icon: Target, label: "Smash factor" },
  { icon: TrendingUp, label: "Analys av jämnhet mellan slagen" },
];

/**
 * Utförlig landningssida för Speed Test, nådd via ett kompakt kort på
 * kategorisidan. Samma visuella språk som Approach Test/Off the Tee.
 */
export function SpeedLanding({ lastResultLabel }: { lastResultLabel?: string }) {
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
        <SpeedHero />
      </div>

      <p className="mt-6 text-xs uppercase tracking-[0.3em] text-flag">Off the Tee</p>
      <h1 className="mt-2 text-5xl leading-none">Speed Test</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        Mäter din bollhastighet över 6 drives och visar var du ligger jämfört med andra
        handicapnivåer. Fart är den enskilt största faktorn bakom längd från tee.
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
          Innan du börjar väljer du var mätningen görs – simulator eller range – och med vilken
          maskin, eftersom olika system mäter olika högt. Sedan slår du 6 drives och registrerar
          ball speed (obligatoriskt) och club head speed (valfritt) för varje slag.
        </p>
      </section>

      <section className="mt-8 flex items-start gap-3 rounded-3xl border border-border bg-card p-5">
        <Radar className="mt-0.5 h-5 w-5 shrink-0 text-flag" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          Resultatet räknas alltid på samma sätt oavsett maskin, men vi visar vilken utrustning du
          använde så att du kan jämföra rättvist över tid.
        </p>
      </section>

      {lastResultLabel ? (
        <p className="mt-6 text-center text-xs text-muted-foreground">{lastResultLabel}</p>
      ) : null}

      <Link
        to="/speed"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
      >
        Starta Speed Test
        <ArrowRight className="h-5 w-5" />
      </Link>
      <p className="mt-3 text-center text-xs text-muted-foreground">Tar ca 5 minuter</p>
    </main>
  );
}
