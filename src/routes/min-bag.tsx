import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, Check, Clock3, MapPinned, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import {
  adjustCarryForConditions,
  analyzeGap,
  clubAgeDays,
  clubLastUpdatedAt,
  INDOOR_REFERENCE_ELEVATION_M,
  INDOOR_REFERENCE_TEMPERATURE_C,
  isPutterLabel,
  latestCompletedBagMap,
  medianCarry,
} from "@/lib/map-my-bag";

export const Route = createFileRoute("/min-bag")({
  head: () => ({ meta: [{ title: "Min Bag – SG4" }] }),
  component: MinBagPage,
});

const TEMPERATURES = Array.from({ length: 61 }, (_, index) => index - 10);
const ELEVATIONS = Array.from({ length: 111 }, (_, index) => -500 + index * 50);

function signed(value: number) {
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}

function freshnessText(days: number | null, updatedAt: string | null) {
  if (days == null || !updatedAt) return "Ingen mätning ännu";
  if (days === 0) return "Uppdaterad idag";
  if (days === 1) return "Uppdaterad igår";
  if (days < 30) return `Uppdaterad för ${days} dagar sedan`;
  return `Uppdaterad ${new Date(updatedAt).toLocaleDateString("sv-SE")}`;
}

function freshnessClass(days: number | null) {
  if (days == null) return "text-muted-foreground";
  if (days <= 30) return "text-primary";
  if (days <= 90) return "text-foreground";
  return "text-destructive";
}

function NativeWheel({
  label,
  value,
  unit,
  values,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  values: number[];
  onChange: (value: number) => void;
}) {
  return (
    <label className="rounded-xl border border-border bg-background p-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <div className="relative mt-1">
        <select
          aria-label={label}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full appearance-none bg-transparent pr-7 text-2xl font-semibold outline-none"
        >
          {values.map((item) => <option key={item} value={item}>{item} {unit}</option>)}
        </select>
        <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">↕</span>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">Tryck och scrolla</p>
    </label>
  );
}

function MinBagPage() {
  const latest = latestCompletedBagMap();
  const clubs = latest ? [...latest.clubs].reverse() : [];
  const [adjusted, setAdjusted] = useState(false);
  const [temperature, setTemperature] = useState(INDOOR_REFERENCE_TEMPERATURE_C);
  const [elevation, setElevation] = useState(INDOOR_REFERENCE_ELEVATION_M);

  const carryRows = useMemo(() => clubs.filter((club) => medianCarry(club) != null), [clubs]);
  const gapFlags = useMemo(() => carryRows.flatMap((club, index) => {
    const next = carryRows[index + 1];
    if (!next) return [];
    const currentCarry = medianCarry(club);
    const nextCarry = medianCarry(next);
    if (currentCarry == null || nextCarry == null) return [];
    const analysis = analyzeGap(currentCarry, nextCarry);
    return analysis.flagged ? [{ club, next, analysis }] : [];
  }), [carryRows]);

  function resetConditions() {
    setTemperature(INDOOR_REFERENCE_TEMPERATURE_C);
    setElevation(INDOOR_REFERENCE_ELEVATION_M);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-6">
      <header className="flex items-center justify-between gap-3">
        <Link to="/tester" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"><ArrowLeft className="h-4 w-4" /></Link>
        <Link to="/map-my-bag" className="rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold">Map My Bag</Link>
      </header>

      <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Snabbvy på banan</p>
      <h1 className="mt-1 text-4xl leading-none">Min Bag</h1>

      {!latest ? (
        <section className="mt-6 rounded-2xl border border-border bg-card p-5 text-center">
          <MapPinned className="mx-auto h-6 w-6 text-primary" />
          <h2 className="mt-3 text-2xl">Inga stock-längder ännu</h2>
          <p className="mt-2 text-sm text-muted-foreground">Gör Map My Bag för att få en snabb carry-lista att använda på rangen och banan.</p>
          <Link to="/map-my-bag" className="mt-5 flex w-full items-center justify-center rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">Starta Map My Bag</Link>
        </section>
      ) : (
        <>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Bag sparad {new Date(latest.completedAt || latest.updatedAt).toLocaleDateString("sv-SE")}</span>
            <span>{latest.location || "Ingen plats"}</span>
          </div>

          {gapFlags.length ? (
            <section className="mt-5 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted"><AlertTriangle className="h-4 w-4" /></span>
                <div>
                  <p className="text-sm font-semibold">{gapFlags.length} gap att se över</p>
                  <p className="text-[11px] text-muted-foreground">SG4 flaggar stora luckor och klubbor som går nästan lika långt.</p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {gapFlags.map(({ club, next, analysis }) => (
                  <div key={`${club.id}-${next.id}`} className="rounded-xl bg-muted/50 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold">{club.label} → {next.label}</span>
                      <span className="text-xs font-semibold">{Math.round(analysis.gap)} m</span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {analysis.status === "wide"
                        ? `Stor lucka. Du saknar ett naturligt fullslag runt ${Math.round(analysis.targetCarry ?? 0)} m.`
                        : "Klubborna går nästan lika långt. Du kan bära två klubbor för samma jobb."}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : carryRows.length > 1 ? (
            <section className="mt-5 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"><Check className="h-4 w-4" /></span>
              <div><p className="text-sm font-semibold">Jämn gapping</p><p className="text-[11px] text-muted-foreground">Inga tydliga gap-problem i dina uppmätta carry-längder.</p></div>
            </section>
          ) : null}

          <section className="mt-4 rounded-2xl border border-border bg-card p-3">
            <div className="grid grid-cols-2 rounded-xl bg-muted p-1">
              <button onClick={() => setAdjusted(false)} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${!adjusted ? "bg-background shadow-sm" : "text-muted-foreground"}`}>Stock</button>
              <button onClick={() => setAdjusted(true)} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${adjusted ? "bg-background shadow-sm" : "text-muted-foreground"}`}>Justerat</button>
            </div>

            {adjusted ? (
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Spelförhållanden</p>
                    <p className="mt-1 text-xs text-muted-foreground">Indoor-referens: {INDOOR_REFERENCE_TEMPERATURE_C}°C · havsnivå</p>
                  </div>
                  <button onClick={resetConditions} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground"><RotateCcw className="h-3.5 w-3.5" /></button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <NativeWheel label="Temperatur" value={temperature} unit="°C" values={TEMPERATURES} onChange={setTemperature} />
                  <NativeWheel label="Höjd" value={elevation} unit="m" values={ELEVATIONS} onChange={setElevation} />
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">På iPhone öppnas systemets scrollhjul. Inget tangentbord behövs. Justeringen ändrar inte din sparade stock-bag.</p>
              </div>
            ) : null}
          </section>

          <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
            {clubs.map((club, index) => {
              const stock = medianCarry(club);
              const conditions = stock != null ? adjustCarryForConditions(stock, temperature, elevation) : null;
              const shown = adjusted && conditions ? conditions.adjustedCarry : stock;
              const nextClub = clubs.slice(index + 1).find((candidate) => medianCarry(candidate) != null) ?? null;
              const nextStock = nextClub ? medianCarry(nextClub) : null;
              const nextConditions = nextStock != null ? adjustCarryForConditions(nextStock, temperature, elevation) : null;
              const nextShown = adjusted && nextConditions ? nextConditions.adjustedCarry : nextStock;
              const gapAnalysis = shown != null && nextShown != null ? analyzeGap(shown, nextShown) : null;
              const ageDays = clubAgeDays(club);
              const updatedAt = clubLastUpdatedAt(club);

              return (
                <div key={club.id} className="border-b border-border px-5 py-3.5 last:border-b-0">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <span className="text-lg font-semibold">{club.label}</span>
                      {isPutterLabel(club.label) ? (
                        <p className="mt-0.5 text-[10px] text-muted-foreground">Putter · carry ej relevant</p>
                      ) : (
                        <p className={`mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium ${freshnessClass(ageDays)}`}>
                          <Clock3 className="h-3 w-3" /> {freshnessText(ageDays, updatedAt)}
                        </p>
                      )}
                      {adjusted && conditions ? (
                        <p className="mt-0.5 text-[10px] text-muted-foreground">Temp {signed(conditions.temperatureDelta)} m · Höjd {signed(conditions.elevationDelta)} m</p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <div>
                        {adjusted && stock != null ? <span className="mr-2 text-xs text-muted-foreground line-through">{Math.round(stock)}</span> : null}
                        <span className="font-display text-3xl tabular-nums">{shown != null ? Math.round(shown) : "–"}</span>
                        <span className="ml-1 text-xs text-muted-foreground">{shown != null ? "m carry" : ""}</span>
                      </div>
                      {gapAnalysis ? (
                        <p className={`text-[10px] font-semibold ${gapAnalysis.flagged ? "text-destructive" : gapAnalysis.status === "healthy" ? "text-primary" : "text-muted-foreground"}`}>
                          {gapAnalysis.flagged ? "⚠ " : gapAnalysis.status === "healthy" ? "✓ " : ""}{Math.round(gapAnalysis.gap)} m till nästa
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Riktmärke: ungefär 10–14 m mellan fulla carry-längder. SG4 flaggar tydliga luckor över 16 m och överlapp under 8 m.</p>
          <Link to="/map-my-bag" className="mt-4 flex w-full items-center justify-center rounded-2xl border border-border bg-card py-4 font-semibold">Se historik / mappa om</Link>
        </>
      )}
    </main>
  );
}
