import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, ArrowRight, Compass, Ruler, Target } from "lucide-react";
import { PuttingHero } from "@/components/shortputt-visuals";

const MEASURES = [
  { icon: Target, label: "Precision på 1–3 meter" },
  { icon: Ruler, label: "Skillnader mellan avstånd" },
  { icon: Compass, label: "Skillnader mellan riktningar" },
  { icon: AlertTriangle, label: "Ditt viktigaste träningsområde" },
];

/**
 * Utförlig landningssida för Short Putting Test, nådd via ett kompakt kort
 * på kategorisidan. Samma visuella språk som Approach Test/Off the Tee,
 * men innehållet fokuserar på syfte och nytta snarare än instruktioner.
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
        Mäter din precision på korta puttar – 1 till 3 meter – och visar exakt var du tappar slag.
        Korta puttar avgör många scorer, så testet hjälper dig hitta rätt träningsfokus.
      </p>

      <section className="mt-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Det här mäter testet
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {MEASURES.map(({ icon: Icon, label }) => (
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
          12 puttar från fyra riktningar runt hålet. Du registrerar bara Satt eller Missad efter
          varje putt. Detaljerna visas när du startar.
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
      <p className="mt-3 text-center text-xs text-muted-foreground">Tar ca 15–20 minuter</p>
    </main>
  );
}
