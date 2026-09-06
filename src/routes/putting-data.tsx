import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { useMemo } from "react";
import { lagHoleOutStats, lagProximityStats, puttingMakeStats } from "@/lib/putting-global";

export const Route = createFileRoute("/putting-data")({
  head: () => ({
    meta: [
      { title: "Puttingdata – alla tester samlat | SG4" },
      {
        name: "description",
        content:
          "Samlad puttingdata från flera SG4-tester: träffprocent per avståndszon, lagputt hole-out och längdkontroll.",
      },
    ],
  }),
  component: PuttingDataPage,
});

const fmt = (value: number, decimals = 0) => value.toFixed(decimals).replace(".", ",");

const SHORT_PUTT_BINS = [
  { min: 0, max: 1, label: "0–1 m" },
  { min: 1, max: 2, label: "1–2 m" },
  { min: 2, max: 3, label: "2–3 m" },
  { min: 3, max: 4, label: "3–4 m" },
  { min: 4, max: 5, label: "4–5 m" },
] as const;

type ShortPuttBin = {
  label: string;
  made: number;
  attempts: number;
  pct: number;
  sources: number;
};

function shortPuttBins(): ShortPuttBin[] {
  const exact = puttingMakeStats();

  return SHORT_PUTT_BINS.map((bin, index) => {
    const rows = exact.filter((row) =>
      index === 0
        ? row.distance >= bin.min && row.distance <= bin.max
        : row.distance > bin.min && row.distance <= bin.max,
    );
    const made = rows.reduce((sum, row) => sum + row.made, 0);
    const attempts = rows.reduce((sum, row) => sum + row.attempts, 0);
    const sources = rows.reduce((sum, row) => sum + row.sources, 0);

    return {
      label: bin.label,
      made,
      attempts,
      pct: attempts ? (made / attempts) * 100 : 0,
      sources,
    };
  });
}

function PuttingDataPage() {
  const makeStats = useMemo(() => puttingMakeStats(), []);
  const shortStats = useMemo(() => shortPuttBins(), []);
  const lagHoleOut = useMemo(() => lagHoleOutStats(), []);
  const lagProximity = useMemo(() => lagProximityStats(), []);
  const totalStarts = makeStats.reduce((sum, row) => sum + row.attempts, 0);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-24 pt-8">
      <header>
        <Link
          to="/traning"
          search={{ category: "putting" }}
          aria-label="Tillbaka"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="mt-6 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BarChart3 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Global skill data</p>
            <h1 className="mt-1 font-display text-4xl leading-none">Puttingdata</h1>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          En putt räknas efter avståndet den faktiskt slogs från — inte vilket test den kom från. Kortputtar från alla kompatibla tester slås ihop i fem tydliga avståndszoner.
        </p>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-border bg-card p-5 text-center shadow-[var(--shadow-glow)]">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Registrerade starter</p>
          <p className="mt-1 font-display text-5xl leading-none text-primary">{totalStarts}</p>
          <p className="mt-1 text-xs text-muted-foreground">från flera tester</p>
        </div>
        <div className="rounded-3xl border border-border bg-card p-5 text-center">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Kortputtzoner</p>
          <p className="mt-1 font-display text-5xl leading-none">5</p>
          <p className="mt-1 text-xs text-muted-foreground">0–5 meter</p>
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Kortputt</p>
            <h2 className="font-display text-3xl">Sänkprocent</h2>
          </div>
          <span className="text-xs text-muted-foreground">alla kompatibla tester</span>
        </div>
        <div className="mt-3 space-y-2">
          {shortStats.map((row) => (
            <div key={row.label} className="rounded-2xl border border-border bg-card px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-display text-2xl">{row.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.attempts ? `${row.made} satta av ${row.attempts}` : "Ingen data ännu"}
                  </p>
                </div>
                <p className="font-display text-3xl text-primary">{row.attempts ? `${fmt(row.pct)}%` : "–"}</p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, row.pct))}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Lagputt · håla ut</p>
        <h2 className="font-display text-3xl">Puttar till hål</h2>
        <p className="mt-1 text-xs text-muted-foreground">Data där testet faktiskt registrerar antal puttar, t.ex. Lag Putt Ladder och PGA Tour 18.</p>
        <div className="mt-3 space-y-2">
          {lagHoleOut.length ? lagHoleOut.map((row) => (
            <div key={row.distance} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
              <div>
                <p className="font-display text-2xl">{row.distance} m</p>
                <p className="text-xs text-muted-foreground">{row.attempts} starter · {fmt(row.onePuttPct)}% 1-putt · {fmt(row.threePuttPct)}% 3-putt+</p>
              </div>
              <div className="text-right">
                <p className="font-display text-3xl text-primary">{fmt(row.avgPutts, 2)}</p>
                <p className="text-[10px] text-muted-foreground">snitt puttar</p>
              </div>
            </div>
          )) : <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">Ingen hole-out-data på lagputtar ännu.</p>}
        </div>
      </section>

      <section className="mt-7">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Lagputt · längdkontroll</p>
        <h2 className="font-display text-3xl">Första putten</h2>
        <p className="mt-1 text-xs text-muted-foreground">Separat från hole-out så att vi inte blandar olika typer av mätning.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {lagProximity.length ? lagProximity.map((row) => (
            <div key={row.distance} className="rounded-2xl border border-border bg-card p-3">
              <p className="font-display text-2xl">{row.distance} m</p>
              <p className="mt-1 text-sm font-semibold text-primary">{fmt(row.within1mPct)}% inom 1 m</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{row.attempts} puttar · {fmt(row.holedPct)}% hålade</p>
            </div>
          )) : <p className="col-span-2 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">Ingen längdkontrolldata ännu.</p>}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">Principen framåt</p>
        <p className="mt-1">Testet äger själva gamet och scoren. Den underliggande slagdatan ägs av spelarprofilen. Samma princip kan användas för Approach och Around the Green: avstånd, resultat och slagtyp kan aggregeras globalt oavsett vilket test som skapade datan.</p>
      </section>
    </main>
  );
}
