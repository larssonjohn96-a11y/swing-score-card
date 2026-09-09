import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, ChevronRight, GripVertical, History, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CLUB_GROUPS, clubDisplayName } from "@/lib/club-groups";
import {
  acceptedShots,
  addClubToBag,
  canAddClubToBag,
  clubComplete,
  completeBagMap,
  completedClubCount,
  createBagMap,
  hasPutter,
  isPutterLabel,
  loadBagDraft,
  loadBagHistory,
  MAX_BAG_CLUBS,
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
  const [selectedClubId, setSelectedClubId] = useState<string>(() => nextRecommendedClub(initialDraft ?? createBagMap())?.id ?? "");
  const [carry, setCarry] = useState("");
  const [showClubPicker, setShowClubPicker] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [completedView, setCompletedView] = useState<BagMap | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => { if (map.status === "draft") saveBagDraft(map); }, [map]);

  const mappableClubs = map.clubs.filter((club) => !isPutterLabel(club.label));
  const selected = mappableClubs.find((club) => club.id === selectedClubId) ?? mappableClubs[0];
  const suggested = useMemo(() => nextRecommendedClub(map), [map]);
  const doneCount = completedClubCount(map);
  const history = loadBagHistory();
  const bagHasPutter = hasPutter(map);
  const canFinish = doneCount >= 1 && bagHasPutter;

  function startNew() {
    const fresh = createBagMap();
    setMap(fresh);
    setSelectedClubId(nextRecommendedClub(fresh)?.id ?? "");
    setCompletedView(null);
    setView("setup");
  }

  function resume() {
    const draft = loadBagDraft();
    if (!draft || completedClubCount(draft) < 1) return;
    setMap(draft);
    setSelectedClubId(nextRecommendedClub(draft)?.id ?? draft.clubs.find((club) => !isPutterLabel(club.label))?.id ?? "");
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
    const clean = label.trim();
    if (!clean || !canAddClubToBag(map, clean)) return;
    const next = addClubToBag(map, clean);
    setMap(next);
    const added = next.clubs[next.clubs.length - 1];
    if (added && !isPutterLabel(added.label)) setSelectedClubId(added.id);
  }

  function removeClub(id: string) {
    const next = removeClubFromBag(map, id);
    setMap(next);
    if (selectedClubId === id) setSelectedClubId(nextRecommendedClub(next)?.id ?? next.clubs.find((club) => !isPutterLabel(club.label))?.id ?? "");
  }

  function moveDraggedClub(toIndex: number) {
    if (dragIndex == null || dragIndex === toIndex) return;
    setMap((current) => moveClub(current, dragIndex, toIndex));
    setDragIndex(toIndex);
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (dragIndex == null) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-club-index]");
    if (!target) return;
    const toIndex = Number(target.dataset.clubIndex);
    if (Number.isInteger(toIndex)) moveDraggedClub(toIndex);
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
            return <div key={club.id} className="flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0"><span className="font-semibold">{club.label}</span><div className="text-right"><span className="font-display text-2xl">{value != null ? Math.round(value) : "–"}</span>{value != null ? <span className="ml-1 text-xs text-muted-foreground">m</span> : null}{gap != null ? <p className="text-[10px] text-muted-foreground">{gap >= 0 ? "+" : ""}{Math.round(gap)} m gap</p> : null}</div></div>;
          })}
        </section>
        <Link to="/min-bag" className="mt-5 flex w-full items-center justify-center rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">Öppna Min Bag</Link>
        <button onClick={startNew} className="mt-3 flex w-full items-center justify-center rounded-2xl border border-border bg-card py-4 font-semibold">Starta ny Map My Bag</button>
      </main>
    );
  }

  if (view === "landing") {
    const draft = loadBagDraft();
    const resumableDraft = draft && completedClubCount(draft) >= 1 ? draft : null;
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

        {resumableDraft ? <section className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Pågående Map My Bag</p><p className="mt-1 text-lg font-semibold">{completedClubCount(resumableDraft)} klubbor klara</p><p className="mt-1 text-xs text-muted-foreground">Senast sparad {new Date(resumableDraft.updatedAt).toLocaleDateString("sv-SE")}</p><button onClick={resume} className="mt-4 flex w-full items-center justify-center rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">Fortsätt tidigare</button></section> : null}

        <button onClick={startNew} className="mt-4 flex w-full items-center justify-center rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">Starta ny Map My Bag</button>
        <Link to="/min-bag" className="mt-3 flex w-full items-center justify-center rounded-2xl border border-border bg-card py-4 font-semibold">Visa Min Bag</Link>
        <button onClick={() => setShowHistory((v) => !v)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 font-semibold"><History className="h-4 w-4" /> Tidigare tester</button>

        {showHistory ? <section className="mt-4 rounded-2xl border border-border bg-card p-4">{history.length ? <div className="space-y-2">{history.map((row) => <button key={row.id} onClick={() => setCompletedView(row)} className="flex w-full items-center justify-between rounded-xl bg-muted/50 px-3 py-3 text-left"><div><p className="text-sm font-semibold">{new Date(row.completedAt || row.updatedAt).toLocaleDateString("sv-SE")}</p><p className="text-xs text-muted-foreground">{row.location || "Ingen plats"} · {row.clubs.length} klubbor</p></div><ChevronRight className="h-4 w-4 text-muted-foreground" /></button>)}</div> : <p className="text-xs text-muted-foreground">Inga färdiga tester ännu.</p>}</section> : null}
      </main>
    );
  }

  if (view === "setup") {
    const nonPutterCount = map.clubs.filter((club) => !isPutterLabel(club.label)).length;
    const totalCount = nonPutterCount + (bagHasPutter ? 1 : 0);
    const putterSlotReserved = nonPutterCount >= MAX_BAG_CLUBS - 1;

    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-40 pt-6">
        <header className="flex items-center justify-between"><button onClick={() => setView("landing")} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"><ArrowLeft className="h-4 w-4" /></button><p className="text-xs font-semibold text-muted-foreground">Bygg din bag</p></header>
        <h1 className="mt-6 text-4xl leading-none">Din bag</h1>
        <p className="mt-2 text-sm text-muted-foreground">Max 14 klubbor totalt – puttern är en av dem. Du kan alltså välja upp till 13 övriga klubbor.</p>

        <section className="mt-5 rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Valda klubbor</p>
            <span className="text-sm font-semibold tabular-nums text-primary">{totalCount}/{MAX_BAG_CLUBS} klubbor</span>
          </div>
          <div className="space-y-2" onPointerMove={handlePointerMove} onPointerUp={() => setDragIndex(null)} onPointerCancel={() => setDragIndex(null)}>
            {map.clubs.map((club, index) => {
              const carryValue = medianCarry(club);
              return (
                <div
                  key={club.id}
                  data-club-index={index}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (dragIndex != null) setMap((current) => moveClub(current, dragIndex, index)); setDragIndex(null); }}
                  className={`flex items-center gap-3 rounded-xl border bg-background px-3 py-3 transition ${dragIndex === index ? "border-primary bg-primary/5 shadow-sm" : "border-border"}`}
                >
                  <button
                    type="button"
                    aria-label={`Flytta ${club.label}`}
                    onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDragIndex(index); }}
                    onPointerUp={() => setDragIndex(null)}
                    className="touch-none cursor-grab rounded-lg p-1.5 text-muted-foreground active:cursor-grabbing active:bg-muted"
                  >
                    <GripVertical className="h-5 w-5" />
                  </button>
                  <span className="inline-flex h-9 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold tabular-nums">{club.label}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {clubDisplayName(club.label)}
                    {isPutterLabel(club.label) ? <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-primary">Obligatorisk</span> : null}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">{isPutterLabel(club.label) ? "" : carryValue != null ? `${Math.round(carryValue)} m` : "— m"}</span>
                  {isPutterLabel(club.label) ? null : <button aria-label={`Ta bort ${club.label}`} onClick={() => removeClub(club.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><Trash2 className="h-4 w-4" /></button>}
                </div>
              );
            })}
          </div>
        </section>

        {!bagHasPutter ? <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-xs"><span className="font-semibold">Puttern saknas.</span> Lägg till Putter – den krävs för en färdig bag.</div> : null}
        {putterSlotReserved && bagHasPutter ? <div className="mt-3 rounded-xl border border-border bg-muted/50 px-4 py-3 text-xs text-muted-foreground">Bagen är full: 13 klubbor + putter.</div> : null}

        <section className="mt-4 space-y-5">
          {CLUB_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{group.title}</p>
              <div className="flex flex-wrap gap-2">
                {group.clubs.map((label) => {
                  const inBag = map.clubs.find((club) => club.label.toLowerCase() === label.toLowerCase());
                  const disabled = !inBag && !canAddClubToBag(map, label);
                  return (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={!!inBag}
                      disabled={disabled}
                      onClick={() => inBag ? removeClub(inBag.id) : addClub(label)}
                      className={`min-h-11 min-w-11 rounded-full border px-4 text-xs font-semibold transition disabled:opacity-40 ${inBag ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-card text-foreground"}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-5 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur">
          <div className="mx-auto w-full max-w-md">
            <button
              disabled={!mappableClubs.length || !bagHasPutter}
              onClick={() => { setSelectedClubId(nextRecommendedClub(map)?.id ?? mappableClubs[0]?.id ?? ""); setView("test"); }}
              className="flex w-full items-center justify-center rounded-2xl bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-40"
            >
              Spara bag · {totalCount}/{MAX_BAG_CLUBS}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-6">
      <header className="flex items-center justify-between gap-3"><button onClick={() => setView("landing")} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"><ArrowLeft className="h-4 w-4" /></button><div className="flex gap-2"><button onClick={() => setView("setup")} className="rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold">Redigera bag</button><Link to="/min-bag" className="rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold">Min Bag</Link></div></header>

      <section className="mt-5 rounded-2xl border border-border bg-card p-4"><div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pågående test</p><p className="mt-1 text-sm font-semibold">{doneCount} av {mappableClubs.length} klubbor klara</p></div><span className="text-xs font-semibold text-primary">Autosparat</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${mappableClubs.length ? (doneCount / mappableClubs.length) * 100 : 0}%` }} /></div><div className="mt-3 grid grid-cols-2 gap-2"><input value={map.location || ""} onChange={(e) => setMap((current) => ({ ...current, location: e.target.value }))} placeholder="Plats, valfritt" className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm" /><select value={map.environment || "outdoor"} onChange={(e) => setMap((current) => ({ ...current, environment: e.target.value as "outdoor" | "indoor" }))} className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm"><option value="outdoor">Utomhus</option><option value="indoor">Indoor</option></select></div></section>

      {selected ? <section className="mt-4 rounded-3xl border border-border bg-card p-5 text-center"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Nu mappar du</p><h2 className="mt-2 font-display text-6xl leading-none">{selected.label}</h2><p className="mt-2 text-sm text-muted-foreground">{acceptedShots(selected).length} av 3 godkända slag</p>{medianCarry(selected) != null ? <p className="mt-3 text-sm font-semibold text-primary">Median just nu: {Math.round(medianCarry(selected)!)} m</p> : null}<div className="mt-5 flex items-center gap-2"><input inputMode="decimal" value={carry} onChange={(e) => setCarry(e.target.value)} placeholder="Carry i meter" className="min-w-0 flex-1 rounded-2xl border border-border bg-background px-4 py-4 text-center text-xl font-semibold" /><button onClick={registerAccepted} className="inline-flex h-[58px] w-[58px] items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Check className="h-5 w-5" /></button></div><button onClick={registerMiss} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><X className="h-3.5 w-3.5" /> Miss-träff · räknas inte</button></section> : null}

      <section className="mt-4 rounded-2xl border border-border bg-card p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Rekommenderad nästa</p><p className="mt-1 text-xl font-semibold">{suggested?.label ?? "Ingen omappad klubb"}</p></div>{suggested ? <button onClick={() => setSelectedClubId(suggested.id)} className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Välj</button> : null}</div><button onClick={() => setShowClubPicker((value) => !value)} className="mt-3 flex w-full items-center justify-between border-t border-border pt-3 text-sm font-semibold"><span>Välj annan klubb</span><ChevronRight className="h-4 w-4" /></button>{showClubPicker ? <div className="mt-3 grid grid-cols-3 gap-2">{mappableClubs.map((club) => <button key={club.id} onClick={() => { setSelectedClubId(club.id); setShowClubPicker(false); }} className={`rounded-xl border px-2 py-3 text-sm font-semibold ${selectedClubId === club.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"}`}>{clubComplete(club) ? "✓ " : ""}{club.label}</button>)}</div> : null}</section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Gap hittills</p><span className="text-xs text-muted-foreground">{doneCount} mappade</span></div><div className="mt-3 space-y-2">{map.clubs.filter((club) => !isPutterLabel(club.label) && clubComplete(club)).map((club, index, rows) => { const value = medianCarry(club)!; const prev = index > 0 ? medianCarry(rows[index - 1]) : null; const gap = prev != null ? value - prev : null; return <div key={club.id} className="flex items-center justify-between text-sm"><span className="font-semibold">{club.label}</span><div className="text-right"><span className="font-semibold tabular-nums">{Math.round(value)} m</span>{gap != null ? <span className="ml-2 text-xs text-muted-foreground">{gap >= 0 ? "+" : ""}{Math.round(gap)}</span> : null}</div></div>; })}</div></section>

      {canFinish ? <button onClick={finish} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground"><Save className="h-4 w-4" /> Färdigställ med {map.clubs.length} klubbor</button> : null}
      <button onClick={() => { const fresh = createBagMap(); setMap(fresh); setSelectedClubId(nextRecommendedClub(fresh)?.id ?? ""); setView("setup"); }} className="mt-3 flex w-full items-center justify-center gap-2 py-3 text-xs font-semibold text-muted-foreground"><RotateCcw className="h-3.5 w-3.5" /> Starta om</button>
    </main>
  );
}