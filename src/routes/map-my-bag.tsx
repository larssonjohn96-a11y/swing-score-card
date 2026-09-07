import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, ChevronRight, History, RotateCcw, Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  acceptedShots,
  clubComplete,
  completeBagMap,
  completedClubCount,
  createBagMap,
  loadBagDraft,
  loadBagHistory,
  medianCarry,
  nextRecommendedClub,
  saveBagDraft,
  type BagClub,
  type BagMap,
} from "@/lib/map-my-bag";

export const Route = createFileRoute("/map-my-bag")({
  head: () => ({ meta: [{ title: "Map My Bag – SG4" }] }),
  component: MapMyBagPage,
});

function MapMyBagPage() {
  const [map, setMap] = useState<BagMap>(() => loadBagDraft() ?? createBagMap());
  const [selectedClubId, setSelectedClubId] = useState<string>(() => (loadBagDraft() ?? createBagMap()).clubs[0].id);
  const [carry, setCarry] = useState("");
  const [showClubPicker, setShowClubPicker] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [completedView, setCompletedView] = useState<BagMap | null>(null);

  useEffect(() => { if (map.status === "draft") saveBagDraft(map); }, [map]);

  const selected = map.clubs.find((club) => club.id === selectedClubId) ?? map.clubs[0];
  const suggested = useMemo(() => nextRecommendedClub(map), [map]);
  const doneCount = completedClubCount(map);
  const allDone = doneCount === map.clubs.length;
  const history = loadBagHistory();

  function updateClub(updater: (club: BagClub) => BagClub) {
    setMap((current) => ({ ...current, clubs: current.clubs.map((club) => club.id === selected.id ? updater(club) : club) }));
  }

  function registerAccepted() {
    const value = Number(carry.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0 || !selected) return;
    updateClub((club) => ({ ...club, shots: [...club.shots, { carry: value, accepted: true, createdAt: new Date().toISOString() }] }));
    setCarry("");
  }

  function registerMiss() {
    updateClub((club) => ({ ...club, shots: [...club.shots, { carry: 0, accepted: false, createdAt: new Date().toISOString() }] }));
    setCarry("");
  }

  function chooseNext() {
    const next = nextRecommendedClub(map);
    if (next) setSelectedClubId(next.id);
  }

  function finish() {
    if (!allDone) return;
    const completed = completeBagMap(map);
    setCompletedView(completed);
  }

  if (completedView) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Map My Bag</p>
        <h1 className="mt-1 text-4xl leading-none">Din bag är mappad</h1>
        <p className="mt-2 text-sm text-muted-foreground">Stock carry från senaste färdiga kalibreringen.</p>
        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          {completedView.clubs.map((club, index) => {
            const carryValue = medianCarry(club);
            const prev = index > 0 ? medianCarry(completedView.clubs[index - 1]) : null;
            const gap = carryValue != null && prev != null ? carryValue - prev : null;
            return (
              <div key={club.id} className="flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0">
                <span className="font-semibold">{club.label}</span>
                <div className="text-right"><span className="font-display text-2xl">{carryValue != null ? Math.round(carryValue) : "–"}</span><span className="ml-1 text-xs text-muted-foreground">m</span>{gap != null ? <p className="text-[10px] text-muted-foreground">+{Math.round(gap)} m gap</p> : null}</div>
              </div>
            );
          })}
        </section>
        <Link to="/min-bag" className="mt-5 flex w-full items-center justify-center rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">Öppna Min Bag</Link>
        <button onClick={() => { const next = createBagMap(); setMap(next); setSelectedClubId(next.clubs[0].id); setCompletedView(null); }} className="mt-3 flex w-full items-center justify-center rounded-2xl border border-border bg-card py-4 font-semibold">Starta ny kalibrering</button>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-6">
      <header className="flex items-center justify-between gap-3">
        <Link to="/tester" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="flex gap-2">
          <Link to="/min-bag" className="rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold">Min Bag</Link>
          <button onClick={() => setShowHistory((value) => !value)} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold"><History className="h-3.5 w-3.5" /> Historik</button>
        </div>
      </header>

      {showHistory ? (
        <section className="mt-4 rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tidigare Bag Maps</p>
          {history.length ? <div className="mt-2 space-y-2">{history.map((row) => <button key={row.id} onClick={() => setCompletedView(row)} className="flex w-full items-center justify-between rounded-xl bg-muted/50 px-3 py-3 text-left"><div><p className="text-sm font-semibold">{new Date(row.completedAt || row.updatedAt).toLocaleDateString("sv-SE")}</p><p className="text-xs text-muted-foreground">{row.location || "Ingen plats"} · {row.clubs.length} klubbor</p></div><ChevronRight className="h-4 w-4 text-muted-foreground" /></button>)}</div> : <p className="mt-2 text-xs text-muted-foreground">Inga färdiga tester ännu.</p>}
        </section>
      ) : null}

      <div className="mt-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Bag calibration</p>
        <h1 className="mt-1 text-4xl leading-none">Map My Bag</h1>
        <p className="mt-2 text-sm text-muted-foreground">3 godkända slag per klubb. Median carry blir din stock-längd.</p>
      </div>

      <section className="mt-5 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pågående test</p><p className="mt-1 text-sm font-semibold">{doneCount} av {map.clubs.length} klubbor klara</p></div>
          <span className="text-xs font-semibold text-primary">Autosparat</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${(doneCount / map.clubs.length) * 100}%` }} /></div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input value={map.location || ""} onChange={(e) => setMap((current) => ({ ...current, location: e.target.value }))} placeholder="Plats, valfritt" className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none" />
          <select value={map.environment || "outdoor"} onChange={(e) => setMap((current) => ({ ...current, environment: e.target.value as "outdoor" | "indoor" }))} className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm"><option value="outdoor">Utomhus</option><option value="indoor">Indoor</option></select>
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-border bg-card p-5 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Nu mappar du</p>
        <h2 className="mt-2 font-display text-6xl leading-none">{selected.label}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{acceptedShots(selected).length} av 3 godkända slag</p>
        {medianCarry(selected) != null ? <p className="mt-3 text-sm font-semibold text-primary">Median just nu: {Math.round(medianCarry(selected)!)} m</p> : null}

        <div className="mt-5 flex items-center gap-2">
          <input inputMode="decimal" value={carry} onChange={(e) => setCarry(e.target.value)} placeholder="Carry i meter" className="min-w-0 flex-1 rounded-2xl border border-border bg-background px-4 py-4 text-center text-xl font-semibold outline-none focus:border-primary" />
          <button onClick={registerAccepted} className="inline-flex h-[58px] w-[58px] items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Check className="h-5 w-5" /></button>
        </div>
        <button onClick={registerMiss} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><X className="h-3.5 w-3.5" /> Miss-träff · räknas inte</button>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Rekommenderad nästa</p><p className="mt-1 text-xl font-semibold">{suggested?.label ?? "Alla klara"}</p></div>{suggested ? <button onClick={() => setSelectedClubId(suggested.id)} className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Välj</button> : null}</div>
        <button onClick={() => setShowClubPicker((value) => !value)} className="mt-3 flex w-full items-center justify-between border-t border-border pt-3 text-sm font-semibold"><span>Välj annan klubb</span><ChevronRight className="h-4 w-4" /></button>
        {showClubPicker ? <div className="mt-3 grid grid-cols-3 gap-2">{map.clubs.map((club) => <button key={club.id} onClick={() => { setSelectedClubId(club.id); setShowClubPicker(false); }} className={`rounded-xl border px-2 py-3 text-sm font-semibold ${selectedClubId === club.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"}`}>{clubComplete(club) ? "✓ " : ""}{club.label}</button>)}</div> : null}
      </section>

      {clubComplete(selected) && !allDone ? <button onClick={chooseNext} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">Nästa klubb <ChevronRight className="h-4 w-4" /></button> : null}
      {allDone ? <button onClick={finish} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground"><Save className="h-4 w-4" /> Färdigställ Bag Map</button> : null}
      <button onClick={() => { const fresh = createBagMap(); setMap(fresh); setSelectedClubId(fresh.clubs[0].id); }} className="mt-3 flex w-full items-center justify-center gap-2 py-3 text-xs font-semibold text-muted-foreground"><RotateCcw className="h-3.5 w-3.5" /> Starta om</button>
    </main>
  );
}
