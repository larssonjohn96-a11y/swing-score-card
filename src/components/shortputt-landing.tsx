import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, ArrowRight, Compass, Gauge, Map, Target } from "lucide-react";
import { PuttingHero } from "@/components/shortputt-visuals";

const VALUE_ITEMS = [
  { icon: Target, label: "Short Putting Score 0–100" },
  { icon: Gauge, label: "Uppskattat HCP-intervall" },
  { icon: Map, label: "Resultat per avstånd (1/2/3 m)" },
  { icon: Compass, label: "Bästa och svagaste riktning" },
  { icon: AlertTriangle, label: "Upptäckta missmönster" },
];

/**
 * Utförlig landningssida för Short Putting Test, nådd via ett kompakt kort
 * på kategorisidan. Samma visuella språk som Approach Test/Off the Tee.
 */
export function ShortPuttingLanding({ lastResultLabel }: { lastResultLabel?: string }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-6">
      <Link
        to="/kategori/$slug"
        params={{ slug: "puttning" }}
        aria-label="Tillbaka"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <div className="mt-4">
        <PuttingHero />
      </div>

      <p className="mt-6 text-xs uppercase tracking-[0.3em] text-flag">Puttning</p>
      <h1 className="mt-2 text-5xl leading-none">Short Putting Test</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        Slå 24 puttar (2 varv) från fyra riktningar runt hålet och se exakt hur säker du är på korta
        puttar – och om det är avstånd eller sidled som kostar dig flest slag.
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
          Dig som vill sätta fler korta puttar på banan och förstå om det är startlinjen,
          fartkontrollen eller en viss sida av hålet som kostar dig slag.
        </p>
      </section>

      <section className="mt-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Så går testet till
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Innan du börjar väljer du om hålet du puttar mot är rakt eller lutande, så resultatet går
          att jämföra rättvist över tid. Sedan: fyra startlinjer runt hålet – klockan 12, 3, 6 och 9
          – med en putt från vardera 1, 2 och 3 meter, i två varv. Totalt 24 puttar. Du registrerar
          bara Satt eller Missad efter varje putt. En satt putt från 1 m ger 2 poäng, från 2 m 3
          poäng och från 3 m 4 poäng, eftersom en miss från nära håll väger tyngre än en miss från
          längre bort.
        </p>
      </section>

      {lastResultLabel ? (
        <p className="mt-6 text-center text-xs text-muted-foreground">{lastResultLabel}</p>
      ) : null}

      <Link
        to="/kortputt"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
      >
        Starta Short Putting Test
        <ArrowRight className="h-5 w-5" />
      </Link>
      <p className="mt-3 text-center text-xs text-muted-foreground">Tar ca 8 minuter</p>
    </main>
  );
}
