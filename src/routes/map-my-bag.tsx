import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, ChevronRight, GripVertical, History, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  acceptedShots,
  addClubToBag,
  BAG_CLUB_LIBRARY,
  clubComplete,
  completeBagMap,
  completedClubCount,
  createBagMap,
  loadBagDraft,
  loadBagHistory,
  medianCarry,
  moveClub,
  nextRecommendedClub,
  removeClubFromBag,
  saveBagDraft,
  type BagClub,
  type BagMap,
} from "@/lib/map-my-bag";

export const Route = createFileRoute("/map-my-bag")({
  head: () => ({ meta: [{ title: "Map My Bag – SG4" }] }),
  component: MapMyBagPage,
});

type View = "landing" | "setup" | "test";

function MapMyBagPage() {
  const initialDraft = loadBagDraft();
  const [view, setView] = useState<View>("landing");
  const [map, setMap] = useState<BagMap>(() => initialDraft ?? createBagMap());
  const [selectedClubId, setSelectedClubId] = useState<string>(() => (initialDraft ?? createBagMap()).clubs[0]?.id ?? "");
  const [carry, setCarry] = useState("");
  const [showClubPicker, setShowClubPicker] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [completedView, setCompletedView] = useState<BagMap | null>(null);
  const [customClub, setCustomClub] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => { if (map.status === "draft") saveBagDraft(map); }, [map]);

  const selected = map.clubs.find((club) => club.id === selectedClubId) ?? map.clubs[0];
  const suggested = useMemo(() => nextRecommendedClub(map), [map]);
  const doneCount = completedClubCount(map);
  const history = loadBagHistory();
  const canFinish = doneCount >= 1;

  function startNew() {
    const fresh = createBagMap();
    setMap(fresh);
    setSelectedClubId(fresh.clubs[0]?.id ?? "");
    setCompletedView(null);
    setView("setup");
  }

  function resume() {
    const draft = loadBagDraft();
    if (!draft) return;
    setMap(draft);
    setSelectedClubId(nextRecommendedClub(draft)?.id ?? draft.clubs[0]?.id ?? "");
    setView("test");
  }

  function updateClub(updater: (club: BagClub) => BagClub) {
    if (!selected) return;
    setMap((current) => ({ ...current, clubs: current.clubs.map((club) => club.id === selected.id ? updater(club) : club) }));
  }

  function registerAccepted() {
    const value = Number(carry.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0 || !selected) return;
    updateClub((club) => ({ ...club, shots: [...club.shots, { carry: value, accepted: true, createdAt: new Date().toISOString() }] }));
    setCarry("");
  }

  function registerMiss() {
    if (!selected) return;
    updateClub((club) => ({ ...club, shots: [...club.shots, { carry: 0, accepted: false, createdAt: new Date().toISOString() }] }));
    setCarry("");
  }

  function addClub(label: string) {
    const next = addClubToBag(map, label);
    setMap(next);
    const added = next.clubs[next.clubs.length - 1];
    if (added) setSelectedClubId(added.id);
    setCustomClub("");
  }

  function removeClub(id: string) {
    const next = removeClubFromBag(map, id);
    setMap(next);
    if (selectedClubId === id) setSelectedClubId(next.clubs[0]?.id ?? "");
  }

  function finish() {
    if (!canFinish) return;
    const completed = completeBagMap(map, true);
    setCompletedView(completed);
    setView("landing");
  }

  if (completedView) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Map My Bag</p>
        <h1 className="mt-1 text-4xl leading-none">Din bag är sparad</h1>
        <p className="mt-2 text-sm text-muted-foreground">{completedView.clubs.length} klubbor · stock carry från denna kalibrering.</p>
        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          {completedView.clubs.map((club, index) => {
            const value = medianCarry(club);
            const prev = index > 0 ? medianCarry(completedView.clubs[index - 1]) : null;
            const gap = value != null && prev != null ? value - prev : null;
            return <div key={club.id} className="flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0"><span className="font-semibold">{club.label}</span><div className="text-right"><span className="font-display text-2xl">{value != null ? Math.round(value) : "–"}</span><span className="ml-1 text-xs text-muted-foreground">m</span>{gap != null ? <p className="text-[10px] text-muted-foreground">{gap >= 0 ? "+" : ""}{Math.round(gap)} m gap</p> : null}</div></div>;
          })}
        </section>
        <Link to="/min-bag" className="mt-5 flex w-full items-center justify-center rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">Öppna Min Bag</Link>
        <button onClick={startNew} className="mt-3 flex w-full items-center justify-center rounded-2xl border border-border bg-card py-4 font-semibold">Starta ny Map My Bag</button>
      </main>
    );
  }

  if (view === "landing") {
    const draft = loadBagDraft();
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-6">
        <header className="flex items-center justify-between gap-3">
          <Link to="/tester" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"><ArrowLeft className="h-4 w-4" /></Link>
          <Link to="/min-bag" className="rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold">Min Bag</Link>
        </header>
        <div className="mt-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Bag calibration</p>
          <h1 className="mt-1 text-4xl leading-none">Map My Bag</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Mappa dina verkliga carry-längder, se tydliga gap mellan klubborna och bygg exakt den bag du faktiskt spelar med.</p>
        </div>

        {draft ? <section className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Pågående Map My Bag</p><p className="mt-1 text-lg font-semibold">{completedClubCount(draft)} klubbor klara</p><p className="mt-1 text-xs text-muted-foreground">Senast sparad {new Date(draft.updatedAt).toLocaleDateString("sv-SE")}</p><button onClick={resume} className="mt-4 flex w-full items-center justify-center rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">Fortsätt tidigare</button></section> : null}

        <button onClick={startNew} className="mt-4 flex w-full items-center justify-center rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">Starta ny Map My Bag</button>
        <Link to="/min-bag" className="mt-3 flex w-full items-center justify-center rounded-2xl border border-border bg-card py-4 font-semibold">Visa Min Bag</Link>
        <button onClick={() => setShowHistory((v) => !v)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 font-semibold"><History className="h-4 w-4" /> Tidigare tester</button>

        {showHistory ? <section className="mt-4 rounded-2xl border border-border bg-card p-4">{history.length ? <div className="space-y-2">{history.map((row) => <button key={row.id} onClick={() => setCompletedView(row)} className="flex w-full items-center justify-between rounded-xl bg-muted/50 px-3 py-3 text-left"><div><p className="text-sm font-semibold">{new Date(row.completedAt || row.updatedAt).toLocaleDateString("sv-SE")}</p><p className="text-xs text-muted-foreground">{row.location || "Ingen plats"} · {row.clubs.length} klubbor</p></div><ChevronRight className="h-4 w-4 text-muted-foreground" /></button>)}</div> : <p className="text-xs text-muted-foreground">Inga färdiga tester ännu.</p>}</section> : null}
      </main>
    );
  }

  if (view === "setup") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-6">
        <header className="flex items-center justify-between"><button onClick={() => setView("landing")} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"><ArrowLeft className="h-4 w-4" /></button><p className="text-xs font-semibold text-muted-foreground">Bygg din bag</p></header>
        <h1 className="mt-6 text-4xl leading-none">Vilka klubbor har du?</h1>
        <p className="mt-2 text-sm text-muted-foreground">Lägg till, ta bort och dra klubborna i den ordning du vill mappa dem. Du kan ha 10, 14, 17 eller fler.</p>

        <section className="mt-5 rounded-2xl border border-border bg-card p-4">
          <div className="space-y-2">{map.clubs.map((club, index) => <div key={club.id} draggable onDragStart={() => setDragIndex(index)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragIndex != null) setMap((current) => moveClub(current, dragIndex, index)); setDragIndex(null); }} className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-3"><GripVertical className="h-4 w-4 text-muted-foreground" /><span className="flex-1 font-semibold">{club.label}</span><button onClick={() => removeClub(club.id)} className="p-1 text-muted-foreground"><Trash2 className="h-4 w-4" /></button></div>)}</div>
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-card p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Lägg till klubb</p><div className="mt-3 flex gap-2"><input value={customClub} onChange={(e) => setCustomClub(e.target.value)} placeholder="T.ex. 48°, 7W, 4H" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-3 text-sm" /><button onClick={() => addClub(customClub)} className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Plus className="h-4 w-4" /></button></div><div className="mt-3 flex flex-wrap gap-2">{BAG_CLUB_LIBRARY.filter((label) => !map.clubs.some((club) => club.label === label)).slice(0, 24).map((label) => <button key={label} onClick={() => addClub(label)} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold">{label}</button>)}</div></section>

        <button disabled={!map.clubs.length} onClick={() => { setSelectedClubId(map.clubs[0]?.id ?? ""); setView("test"); }} className="mt-5 flex w-full items-center justify-center rounded-2xl bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-40">Börja mappa</button>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-6">
      <header className="flex items-center justify-between gap-3"><button onClick={() => setView("landing")} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"><ArrowLeft className="h-4 w-4" /></button><div className="flex gap-2"><button onClick={() => setView("setup")} className="rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold">Redigera bag</button><Link to="/min-bag" className="rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold">Min Bag</Link></div></header>

      <section className="mt-5 rounded-2xl border border-border bg-card p-4"><div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pågående test</p><p className="mt-1 text-sm font-semibold">{doneCount} av {map.clubs.length} klubbor klara</p></div><span className="text-xs font-semibold text-primary">Autosparat</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${map.clubs.length ? (doneCount / map.clubs.length) * 100 : 0}%` }} /></div><div className="mt-3 grid grid-cols-2 gap-2"><input value={map.location || ""} onChange={(e) => setMap((current) => ({ ...current, location: e.target.value }))} placeholder="Plats, valfritt" className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm" /><select value={map.environment || "outdoor"} onChange={(e) => setMap((current) => ({ ...current, environment: e.target.value as "outdoor" | "indoor" }))} className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm"><option value="outdoor">Utomhus</option><option value="indoor">Indoor</option></select></div></section>

      {selected ? <section className="mt-4 rounded-3xl border border-border bg-card p-5 text-center"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Nu mappar du</p><h2 className="mt-2 font-display text-6xl leading-none">{selected.label}</h2><p className="mt-2 text-sm text-muted-foreground">{acceptedShots(selected).length} av 3 godkända slag</p>{medianCarry(selected) != null ? <p className="mt-3 text-sm font-semibold text-primary">Median just nu: {Math.round(medianCarry(selected)!)} m</p> : null}<div className="mt-5 flex items-center gap-2"><input inputMode="decimal" value={carry} onChange={(e) => setCarry(e.target.value)} placeholder="Carry i meter" className="min-w-0 flex-1 rounded-2xl border border-border bg-background px-4 py-4 text-center text-xl font-semibold" /><button onClick={registerAccepted} className="inline-flex h-[58px] w-[58px] items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Check className="h-5 w-5" /></button></div><button onClick={registerMiss} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><X className="h-3.5 w-3.5" /> Miss-träff · räknas inte</button></section> : null}

      <section className="mt-4 rounded-2xl border border-border bg-card p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Rekommenderad nästa</p><p className="mt-1 text-xl font-semibold">{suggested?.label ?? "Alla valda klubbor klara"}</p></div>{suggested ? <button onClick={() => setSelectedClubId(suggested.id)} className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Välj</button> : null}</div><button onClick={() => setShowClubPicker((value) => !value)} className="mt-3 flex w-full items-center justify-between border-t border-border pt-3 text-sm font-semibold"><span>Välj annan klubb</span><ChevronRight className="h-4 w-4" /></button>{showClubPicker ? <div className="mt-3 grid grid-cols-3 gap-2">{map.clubs.map((club) => <button key={club.id} onClick={() => { setSelectedClubId(club.id); setShowClubPicker(false); }} className={`rounded-xl border px-2 py-3 text-sm font-semibold ${selectedClubId === club.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"}`}>{clubComplete(club) ? "✓ " : ""}{club.label}</button>)}</div> : null}</section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Gap hittills</p><div className="mt-3 space-y-2">{map.clubs.filter(clubComplete).map((club, index, rows) => { const value = medianCarry(club); const prev = index > 0 ? medianCarry(rows[index - 1]) : null; const gap = value != null && prev != null ? value - prev : null; return <div key={club.id} className="flex items-center justify-between text-sm"><span className="font-semibold">{club.label}</span><span>{value != null ? `${Math.round(value)} m` : "–"}{gap != null ? <span className="ml-2 text-xs text-muted-foreground">({gap >= 0 ? "+" : ""}{Math.round(gap)})</span> : null}</span></div>; })}</div></section>

      {canFinish ? <button onClick={finish} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground"><Save className="h-4 w-4" /> Färdigställ med {doneCount} klubbor</button> : null}
      <p className="mt-2 text-center text-xs text-muted-foreground">Du behöver inte mappa alla klubbor. Endast färdigmappade klubbor sparas.</p>
      <button onClick={startNew} className="mt-3 flex w-full items-center justify-center gap-2 py-3 text-xs font-semibold text-muted-foreground"><RotateCcw className="h-3.5 w-3.5" /> Starta om</button>
    </main>
  );
}
