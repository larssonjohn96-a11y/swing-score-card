import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MapPinned, RotateCcw } from "lucide-react";
import { useState } from "react";
import {
  adjustCarryForConditions,
  INDOOR_REFERENCE_ELEVATION_M,
  INDOOR_REFERENCE_TEMPERATURE_C,
  latestCompletedBagMap,
  medianCarry,
} from "@/lib/map-my-bag";

export const Route = createFileRoute("/min-bag")({
  head: () => ({ meta: [{ title: "Min Bag – SG4" }] }),
  component: MinBagPage,
});

function signed(value: number) {
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}

function MinBagPage() {
  const latest = latestCompletedBagMap();
  const clubs = latest ? [...latest.clubs].reverse() : [];
  const [adjusted, setAdjusted] = useState(false);
  const [temperature, setTemperature] = useState(INDOOR_REFERENCE_TEMPERATURE_C);
  const [elevation, setElevation] = useState(INDOOR_REFERENCE_ELEVATION_M);

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
            <span>Senast kalibrerad {new Date(latest.completedAt || latest.updatedAt).toLocaleDateString("sv-SE")}</span>
            <span>{latest.location || "Ingen plats"}</span>
          </div>

          <section className="mt-5 rounded-2xl border border-border bg-card p-3">
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
                  <label className="rounded-xl border border-border bg-background p-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Temperatur</span>
                    <div className="mt-1 flex items-baseline gap-1"><input type="number" inputMode="decimal" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} className="w-full bg-transparent text-2xl font-semibold outline-none" /><span className="text-sm text-muted-foreground">°C</span></div>
                  </label>
                  <label className="rounded-xl border border-border bg-background p-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Höjd</span>
                    <div className="mt-1 flex items-baseline gap-1"><input type="number" inputMode="numeric" min={-100} max={5000} step={50} value={elevation} onChange={(e) => setElevation(Number(e.target.value))} className="w-full bg-transparent text-2xl font-semibold outline-none" /><span className="text-sm text-muted-foreground">m</span></div>
                  </label>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Beräknad carry. Temperatur och höjd justerar din stock-längd utan att ändra den sparade bagen.</p>
              </div>
            ) : null}
          </section>

          <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
            {clubs.map((club, index) => {
              const stock = medianCarry(club);
              const conditions = stock != null ? adjustCarryForConditions(stock, temperature, elevation) : null;
              const shown = adjusted && conditions ? conditions.adjustedCarry : stock;
              const nextClub = index < clubs.length - 1 ? clubs[index + 1] : null;
              const nextStock = nextClub ? medianCarry(nextClub) : null;
              const nextConditions = nextStock != null ? adjustCarryForConditions(nextStock, temperature, elevation) : null;
              const nextShown = adjusted && nextConditions ? nextConditions.adjustedCarry : nextStock;
              const gap = shown != null && nextShown != null ? shown - nextShown : null;

              return (
                <div key={club.id} className="flex items-center justify-between border-b border-border px-5 py-3.5 last:border-b-0">
                  <div>
                    <span className="text-lg font-semibold">{club.label}</span>
                    {adjusted && conditions ? (
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        Temp {signed(conditions.temperatureDelta)} m · Höjd {signed(conditions.elevationDelta)} m
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <div>
                      {adjusted && stock != null ? <span className="mr-2 text-xs text-muted-foreground line-through">{Math.round(stock)}</span> : null}
                      <span className="font-display text-3xl tabular-nums">{shown != null ? Math.round(shown) : "–"}</span>
                      <span className="ml-1 text-xs text-muted-foreground">m carry</span>
                    </div>
                    {gap != null ? <p className="text-[10px] font-semibold text-muted-foreground">{Math.round(gap)} m till nästa</p> : null}
                  </div>
                </div>
              );
            })}
          </section>
          <Link to="/map-my-bag" className="mt-4 flex w-full items-center justify-center rounded-2xl border border-border bg-card py-4 font-semibold">Se historik / mappa om</Link>
        </>
      )}
    </main>
  );
}
