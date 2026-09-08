import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, CircleMinus, Clock3, MapPinned, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import {
  adjustCarryForConditions,
  analyzeGap,
  BAG_CLUB_LIBRARY,
  clubAgeDays,
  clubLastUpdatedAt,
  completeBagMap,
  INDOOR_REFERENCE_ELEVATION_M,
  INDOOR_REFERENCE_TEMPERATURE_C,
  isPutterLabel,
  latestCompletedBagMap,
  MAX_BAG_CLUBS,
  medianCarry,
  type BagMap,
  type GapStatus,
} from "@/lib/map-my-bag";

export const Route = createFileRoute("/min-bag")({
  head: () => ({ meta: [{ title: "Min Bag – SG4" }] }),
  component: MinBagPage,
});

const TEMPERATURES = Array.from({ length: 61 }, (_, index) => index - 10);
const ELEVATIONS = Array.from({ length: 111 }, (_, index) => -500 + index * 50);

const BAG_EDITOR_GROUPS = [
  { title: "Putter", clubs: ["Putter"] },
  { title: "Woods", clubs: ["Driver", "Mini Driver", "2W", "3W", "4W", "5W", "7W", "9W", "11W"] },
  { title: "Hybrids", clubs: ["2H", "3H", "4H", "5H", "6H", "7H"] },
  { title: "Irons", clubs: ["1i", "2i", "3i", "4i", "5i", "6i", "7i", "8i", "9i", "Driving Iron"] },
  { title: "Wedges", clubs: ["PW", "AW", "GW", "SW", "LW", "46°", "48°", "50°", "52°", "54°", "56°", "58°", "60°", "62°", "64°"] },
] as const;

type OpenGap = {
  clubLabel: string;
  nextLabel: string;
  gap: number;
  status: GapStatus;
  targetCarry: number | null;
} | null;

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

function parseIron(label: string) {
  const match = label.trim().match(/^(\d)i$/i);
  return match ? Number(match[1]) : null;
}

function wedgeLoft(label: string): number | null {
  const clean = label.trim().toUpperCase();
  const degree = clean.match(/^(\d{2})°$/);
  if (degree) return Number(degree[1]);
  if (clean === "PW") return 46;
  if (clean === "AW" || clean === "GW") return 50;
  if (clean === "SW") return 56;
  if (clean === "LW") return 60;
  return null;
}

function gapRecommendation(clubLabel: string, nextLabel: string, status: GapStatus, targetCarry: number | null) {
  if (status === "tight") {
    return "De här två klubborna täcker nästan samma carry. Kontrollera loft och träffbild – om överlappet består kan en av platserna i bagen användas bättre någon annanstans.";
  }

  const firstIron = parseIron(clubLabel);
  const secondIron = parseIron(nextLabel);
  if (firstIron != null && secondIron != null && Math.abs(firstIron - secondIron) === 2) {
    const missing = (firstIron + secondIron) / 2;
    return `Överväg ett ${missing}i för att fylla luckan runt ${Math.round(targetCarry ?? 0)} m.`;
  }

  const firstLoft = wedgeLoft(clubLabel);
  const secondLoft = wedgeLoft(nextLabel);
  if (firstLoft != null && secondLoft != null && Math.abs(firstLoft - secondLoft) >= 6) {
    const midpoint = Math.round(((firstLoft + secondLoft) / 2) / 2) * 2;
    return `Överväg en ${midpoint}° wedge mellan ${clubLabel} och ${nextLabel}. Sikta på ungefär ${Math.round(targetCarry ?? 0)} m carry.`;
  }

  return `Försök fylla luckan med en klubb som går ungefär ${Math.round(targetCarry ?? 0)} m carry, eller kontrollera om någon av de två befintliga carry-längderna behöver mappas om.`;
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

function rebuildBagFromSelection(current: BagMap, selectedLabels: string[]) {
  const now = new Date().toISOString();
  const selected = Array.from(new Set(selectedLabels));
  if (!selected.some(isPutterLabel)) selected.push("Putter");

  const retainedByLabel = new Map(current.clubs.map((club) => [club.label.toLowerCase(), club]));
  const libraryLabels = BAG_CLUB_LIBRARY as readonly string[];
  const known = libraryLabels.filter((label) => selected.includes(label) && !isPutterLabel(label));
  const custom = selected.filter((label) => !libraryLabels.includes(label) && !isPutterLabel(label));
  const orderedLabels = [...known, ...custom, "Putter"].slice(0, MAX_BAG_CLUBS);

  const rebuilt: BagMap = {
    ...current,
    id: `${Date.now()}-bag-edit`,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    completedAt: undefined,
    clubs: orderedLabels.map((label, order) => {
      const retained = retainedByLabel.get(label.toLowerCase());
      return retained
        ? { ...retained, order }
        : { id: `${Date.now()}-${order}-${label}`, label, order, shots: [] };
    }),
  };

  return completeBagMap(rebuilt, false);
}

function MinBagPage() {
  const [latest, setLatest] = useState(() => latestCompletedBagMap());
  const clubs = latest ? [...latest.clubs].reverse() : [];
  const [adjusted, setAdjusted] = useState(false);
  const [temperature, setTemperature] = useState(INDOOR_REFERENCE_TEMPERATURE_C);
  const [elevation, setElevation] = useState(INDOOR_REFERENCE_ELEVATION_M);
  const [openGap, setOpenGap] = useState<OpenGap>(null);
  const [showBagEditor, setShowBagEditor] = useState(false);
  const [bagSelection, setBagSelection] = useState<string[]>([]);

  function resetConditions() {
    setTemperature(INDOOR_REFERENCE_TEMPERATURE_C);
    setElevation(INDOOR_REFERENCE_ELEVATION_M);
  }

  function openBagEditor() {
    if (!latest) return;
    const labels = latest.clubs.map((club) => club.label);
    if (!labels.some(isPutterLabel)) labels.push("Putter");
    setBagSelection(Array.from(new Set(labels)).slice(0, MAX_BAG_CLUBS));
    setShowBagEditor(true);
  }

  function toggleBagClub(label: string) {
    if (isPutterLabel(label)) return;
    setBagSelection((current) => {
      if (current.includes(label)) return current.filter((item) => item !== label);
      if (current.length >= MAX_BAG_CLUBS) return current;
      return [...current, label];
    });
  }

  function saveBagSelection() {
    if (!latest || bagSelection.length !== MAX_BAG_CLUBS || !bagSelection.some(isPutterLabel)) return;
    const rebuilt = rebuildBagFromSelection(latest, bagSelection);
    setLatest(rebuilt);
    setOpenGap(null);
    setShowBagEditor(false);
  }

  const currentLabelsNotInPicker = latest
    ? latest.clubs.map((club) => club.label).filter((label) => !BAG_EDITOR_GROUPS.some((group) => group.clubs.some((item) => item === label)))
    : [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-6">
      <header className="flex items-center justify-between gap-3">
        <Link to="/tester" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="flex items-center gap-2">
          <Link to="/map-my-bag" className="rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold">Map My Bag</Link>
          {latest ? (
            <button
              type="button"
              onClick={openBagEditor}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[11px] font-semibold"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Ändra bag
            </button>
          ) : null}
        </div>
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
                  <NativeWheel label="Temperatur" value={temperature} unit="°C" values={TEMPERATURES} onChange={setTemperature} />
                  <NativeWheel label="Höjd" value={elevation} unit="m" values={ELEVATIONS} onChange={setElevation} />
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">På iPhone öppnas systemets scrollhjul. Inget tangentbord behövs. Justeringen ändrar inte din sparade stock-bag.</p>
              </div>
            ) : null}
          </section>

          <section className="mt-4 overflow-visible rounded-2xl border border-border bg-card">
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
              const extremeWide = gapAnalysis?.status === "wide" && gapAnalysis.gap >= 23;

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
                    <div className="relative shrink-0 text-right">
                      <div>
                        {adjusted && stock != null ? <span className="mr-2 text-xs text-muted-foreground line-through">{Math.round(stock)}</span> : null}
                        <span className="font-display text-3xl tabular-nums">{shown != null ? Math.round(shown) : "–"}</span>
                        <span className="ml-1 text-xs text-muted-foreground">{shown != null ? "m carry" : ""}</span>
                      </div>
                      {gapAnalysis?.flagged && nextClub ? (
                        <button
                          type="button"
                          aria-label={`Visa gap-varning mellan ${club.label} och ${nextClub.label}`}
                          onClick={() => setOpenGap((current) => current?.clubLabel === club.label && current?.nextLabel === nextClub.label ? null : {
                            clubLabel: club.label,
                            nextLabel: nextClub.label,
                            gap: gapAnalysis.gap,
                            status: gapAnalysis.status,
                            targetCarry: gapAnalysis.targetCarry,
                          })}
                          className={`ml-auto mt-1 inline-flex h-7 items-center gap-1 rounded-full px-2 text-[10px] font-semibold ${
                            gapAnalysis.status === "tight"
                              ? "bg-sky-500/10 text-sky-700"
                              : extremeWide
                                ? "bg-red-500/10 text-red-700"
                                : "bg-amber-400/15 text-amber-700"
                          }`}
                        >
                          {gapAnalysis.status === "tight" ? <CircleMinus className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                          {Math.round(gapAnalysis.gap)} m
                        </button>
                      ) : null}

                      {openGap && nextClub && openGap.clubLabel === club.label && openGap.nextLabel === nextClub.label ? (
                        <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-2xl border border-border bg-background p-4 text-left shadow-lg">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className={`text-xs font-semibold ${openGap.status === "tight" ? "text-sky-700" : openGap.gap >= 23 ? "text-red-700" : "text-amber-700"}`}>
                                {openGap.status === "tight" ? "Klubborna överlappar" : openGap.gap >= 23 ? "Mycket stort gap" : "Stort gap"}
                              </p>
                              <p className="mt-1 text-sm font-semibold">{openGap.clubLabel} → {openGap.nextLabel} · {Math.round(openGap.gap)} m</p>
                            </div>
                            <button type="button" onClick={() => setOpenGap(null)} className="rounded-full p-1 text-muted-foreground"><X className="h-4 w-4" /></button>
                          </div>
                          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                            {openGap.status === "tight"
                              ? "Skillnaden är så liten att klubborna i praktiken kan fylla samma funktion."
                              : `Riktmärket är ungefär 10–14 m. Här finns en lucka på ${Math.round(openGap.gap)} m.`}
                          </p>
                          <div className="mt-3 rounded-xl bg-muted/60 p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Rekommendation</p>
                            <p className="mt-1 text-xs leading-relaxed">{gapRecommendation(openGap.clubLabel, openGap.nextLabel, openGap.status, openGap.targetCarry)}</p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Riktmärke: ungefär 10–14 m mellan fulla carry-längder. Tryck på en markering till höger för förklaring och rekommendation.</p>
          <Link to="/map-my-bag" className="mt-4 flex w-full items-center justify-center rounded-2xl border border-border bg-card py-4 font-semibold">Se historik / mappa om</Link>
        </>
      )}

      {showBagEditor && latest ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label="Ändra bag">
          <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-3xl bg-background p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Bygg om din bag</p>
                <h2 className="mt-1 text-2xl font-semibold">Välj 14 klubbor</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Klicka i och ur klubbor. Dina befintliga carry-värden följer med på klubbor du behåller. Nya klubbor får mappas när du vill.</p>
              </div>
              <button type="button" onClick={() => setShowBagEditor(false)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border"><X className="h-4 w-4" /></button>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2.5">
              <span className="text-xs font-semibold">Valda klubbor</span>
              <span className={`text-sm font-semibold tabular-nums ${bagSelection.length === MAX_BAG_CLUBS ? "text-primary" : "text-foreground"}`}>{bagSelection.length}/{MAX_BAG_CLUBS}</span>
            </div>

            <div className="mt-4 space-y-5">
              {BAG_EDITOR_GROUPS.map((group) => (
                <section key={group.title}>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{group.title}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.clubs.map((label) => {
                      const selected = bagSelection.includes(label);
                      const locked = isPutterLabel(label);
                      const disabled = !selected && bagSelection.length >= MAX_BAG_CLUBS;
                      return (
                        <button
                          key={label}
                          type="button"
                          disabled={locked || disabled}
                          onClick={() => toggleBagClub(label)}
                          className={`min-h-10 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                            selected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-foreground"
                          } disabled:opacity-50`}
                        >
                          {selected ? "✓ " : ""}{label}{locked ? " · krävs" : ""}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}

              {currentLabelsNotInPicker.length ? (
                <section>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Övriga i din bag</p>
                  <div className="flex flex-wrap gap-2">
                    {currentLabelsNotInPicker.map((label) => {
                      const selected = bagSelection.includes(label);
                      const disabled = !selected && bagSelection.length >= MAX_BAG_CLUBS;
                      return (
                        <button
                          key={label}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleBagClub(label)}
                          className={`min-h-10 rounded-full border px-3 py-2 text-xs font-semibold ${selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"} disabled:opacity-50`}
                        >
                          {selected ? "✓ " : ""}{label}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </div>

            <div className="sticky bottom-0 mt-6 bg-background pt-3">
              <button
                type="button"
                disabled={bagSelection.length !== MAX_BAG_CLUBS || !bagSelection.some(isPutterLabel)}
                onClick={saveBagSelection}
                className="flex w-full items-center justify-center rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground disabled:opacity-40"
              >
                Spara bag · {bagSelection.length}/{MAX_BAG_CLUBS}
              </button>
              {bagSelection.length < MAX_BAG_CLUBS ? <p className="mt-2 text-center text-[11px] text-muted-foreground">Välj {MAX_BAG_CLUBS - bagSelection.length} klubb{MAX_BAG_CLUBS - bagSelection.length === 1 ? "" : "ar"} till.</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
