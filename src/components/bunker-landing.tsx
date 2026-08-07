import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, ArrowRight, Gauge, Target } from "lucide-react";
import { BunkerHero } from "@/components/bunker-visuals";

const VALUE_ITEMS = [
  { icon: Target, label: "Snittavstånd från hål" },
  { icon: Gauge, label: "Bunker HCP" },
  { icon: AlertTriangle, label: "Svagaste bunkerläge" },
];

/**
 * Landningssida för Bunkerslag – samma format som Närspelstest.
 */
export function BunkerLanding({ lastResultLabel }: { lastResultLabel?: string }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-6">
      <Link
        to="/kategori/$slug"
        params={{ slug: "around-the-green" }}
        aria-label="Tillbaka"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <div className="mt-4">
        <BunkerHero />
      </div>

      <p className="mt-6 text-xs uppercase tracking-[0.3em] text-flag">Around the Green</p>
      <h1 className="mt-2 text-5xl leading-none">Bunkerslag</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        Mäter hur nära hålet du får bollen från de sex vanligaste bunkerlägena – och hur ofta du
        faktiskt kommer upp ur sanden.
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
          6 slag, ett från vardera plant läge, uppförslut, nedförslut, boll över fötterna, boll
          under fötterna och nedgrävt (plugged) läge. Du registrerar bara hur nära hålet bollen
          stannade, som ett intervall – eller att du inte kom upp ur bunkern.
        </p>
      </section>

      {lastResultLabel ? (
        <p className="mt-6 text-center text-xs text-muted-foreground">{lastResultLabel}</p>
      ) : null}

      <Link
        to="/bunker"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
      >
        Starta Bunkerslag
        <ArrowRight className="h-5 w-5" />
      </Link>
      <p className="mt-3 text-center text-xs text-muted-foreground">Tar ca 5 minuter</p>
    </main>
  );
}
