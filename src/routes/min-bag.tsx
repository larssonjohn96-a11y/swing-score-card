import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MapPinned } from "lucide-react";
import { latestCompletedBagMap, medianCarry } from "@/lib/map-my-bag";

export const Route = createFileRoute("/min-bag")({
  head: () => ({ meta: [{ title: "Min Bag – SG4" }] }),
  component: MinBagPage,
});

function MinBagPage() {
  const latest = latestCompletedBagMap();

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
          <section className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
            {[...latest.clubs].reverse().map((club) => {
              const value = medianCarry(club);
              return (
                <div key={club.id} className="flex items-center justify-between border-b border-border px-5 py-3.5 last:border-b-0">
                  <span className="text-lg font-semibold">{club.label}</span>
                  <div><span className="font-display text-3xl tabular-nums">{value != null ? Math.round(value) : "–"}</span><span className="ml-1 text-xs text-muted-foreground">m carry</span></div>
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
