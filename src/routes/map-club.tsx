import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, ChevronRight, Save, X } from "lucide-react";
import { useState } from "react";
import {
  acceptedShots,
  completeBagMap,
  isPutterLabel,
  latestCompletedBagMap,
  medianCarry,
  type BagClub,
  type BagMap,
} from "@/lib/map-my-bag";

export const Route = createFileRoute("/map-club")({
  head: () => ({ meta: [{ title: "Mappa klubb – SG4" }] }),
  component: MapClubPage,
});

function getQuery() {
  if (typeof window === "undefined") return { club: null as string | null, all: false };
  const params = new URLSearchParams(window.location.search);
  return {
    club: params.get("club"),
    all: params.get("all") === "1",
  };
}

function MapClubPage() {
  const initial = latestCompletedBagMap();
  const query = getQuery();
  const [map, setMap] = useState<BagMap | null>(initial);
  const [targetLabels] = useState<string[]>(() => {
    if (!initial) return [];
    const mappable = initial.clubs.filter((club) => !isPutterLabel(club.label));
    if (query.club) {
      const exact = mappable.find((club) => club.label.toLowerCase() === query.club?.toLowerCase());
      return exact ? [exact.label] : [];
    }
    return mappable.filter((club) => medianCarry(club) == null).map((club) => club.label);
  });
  const targets = targetLabels
    .map((label) => map?.clubs.find((club) => club.label === label) ?? null)
    .filter((club): club is BagClub => club != null);

  const [targetIndex, setTargetIndex] = useState(0);
  const [carry, setCarry] = useState("");

  const selected = targets[targetIndex] ?? null;
  const acceptedCount = selected ? acceptedShots(selected).length : 0;
  const selectedComplete = acceptedCount >= 3;
  const isLast = targetIndex >= targets.length - 1;

  function updateSelected(updater: (club: BagClub) => BagClub) {
    if (!map || !selected) return;
    setMap({
      ...map,
      status: "draft",
      completedAt: undefined,
      updatedAt: new Date().toISOString(),
      clubs: map.clubs.map((club) => club.id === selected.id ? updater(club) : club),
    });
  }

  function registerAccepted() {
    if (!selected) return;
    const value = Number(carry.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) return;
    updateSelected((club) => ({
      ...club,
      shots: [...club.shots, { carry: value, accepted: true, createdAt: new Date().toISOString() }],
    }));
    setCarry("");
  }

  function registerMiss() {
    if (!selected) return;
    updateSelected((club) => ({
      ...club,
      shots: [...club.shots, { carry: 0, accepted: false, createdAt: new Date().toISOString() }],
    }));
    setCarry("");
  }

  function saveAndReturn() {
    if (!map) return;
    completeBagMap({ ...map, status: "draft", completedAt: undefined }, false);
    window.location.href = "/min-bag";
  }

  function nextClub() {
    if (!selectedComplete) return;
    if (isLast) {
      saveAndReturn();
      return;
    }
    setTargetIndex((index) => index + 1);
    setCarry("");
  }

  if (!map) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-6">
        <Link to="/min-bag" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"><ArrowLeft className="h-4 w-4" /></Link>
        <section className="mt-8 rounded-3xl border border-border bg-card p-6 text-center">
          <h1 className="text-3xl">Ingen bag hittades</h1>
          <p className="mt-2 text-sm text-muted-foreground">Skapa eller spara en bag först.</p>
          <Link to="/map-my-bag" className="mt-5 flex w-full items-center justify-center rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">Öppna Map My Bag</Link>
        </section>
      </main>
    );
  }

  if (!targets.length || !selected) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-6">
        <Link to="/min-bag" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"><ArrowLeft className="h-4 w-4" /></Link>
        <section className="mt-8 rounded-3xl border border-border bg-card p-6 text-center">
          <Check className="mx-auto h-7 w-7 text-primary" />
          <h1 className="mt-3 text-3xl">Alla klubbor är mappade</h1>
          <p className="mt-2 text-sm text-muted-foreground">Det finns inga valda klubbor utan carry-värde.</p>
          <Link to="/min-bag" className="mt-5 flex w-full items-center justify-center rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">Tillbaka till Min Bag</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-6">
      <header className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => { window.location.href = "/min-bag"; }}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-semibold text-muted-foreground">
          {targetIndex + 1}/{targets.length} klubb{targets.length === 1 ? "" : "ar"}
        </span>
      </header>

      <section className="mt-6 rounded-3xl border border-border bg-card p-5 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Mappa carry</p>
        <h1 className="mt-2 font-display text-6xl leading-none">{selected.label}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{Math.min(acceptedCount, 3)} av 3 godkända slag</p>

        {medianCarry(selected) != null ? (
          <p className="mt-3 text-sm font-semibold text-primary">Median just nu: {Math.round(medianCarry(selected)!)} m</p>
        ) : null}

        <div className="mt-5 flex items-center gap-2">
          <input
            inputMode="decimal"
            value={carry}
            onChange={(event) => setCarry(event.target.value)}
            placeholder="Carry i meter"
            className="min-w-0 flex-1 rounded-2xl border border-border bg-background px-4 py-4 text-center text-xl font-semibold"
          />
          <button
            type="button"
            onClick={registerAccepted}
            className="inline-flex h-[58px] w-[58px] items-center justify-center rounded-2xl bg-primary text-primary-foreground"
          >
            <Check className="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={registerMiss}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" /> Miss-träff · räknas inte
        </button>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Det här sparas</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Efter tre godkända slag används medianen som klubbans stock carry. Övriga klubbor i din bag behålls oförändrade.
        </p>
      </section>

      <button
        type="button"
        disabled={!selectedComplete}
        onClick={nextClub}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-40"
      >
        {isLast ? <><Save className="h-4 w-4" /> Spara & tillbaka till Min Bag</> : <>Nästa klubb <ChevronRight className="h-4 w-4" /></>}
      </button>
    </main>
  );
}
