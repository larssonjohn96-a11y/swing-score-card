import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, Bookmark, Check, ChevronRight, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import {
  approximateShotLevel,
  comparePuttingShot,
  deleteShotReference,
  loadSavedShotReferences,
  puttingShotValue,
  saveShotReference,
  shotValueLabel,
  type SavedShotReference,
} from "@/lib/shot-value";

export const Route = createFileRoute("/shot-value")({
  head: () => ({ meta: [{ title: "Shot Value | SG4" }] }),
  component: ShotValuePage,
});

type Category = "putting" | "approach" | "around" | "offtee";

const CATEGORY_OPTIONS: Array<{ key: Category; label: string; ready: boolean }> = [
  { key: "putting", label: "Putting", ready: true },
  { key: "approach", label: "Approach", ready: false },
  { key: "around", label: "Around Green", ready: false },
  { key: "offtee", label: "Off the Tee", ready: false },
];

const START_PRESETS = [1, 1.5, 2, 3, 5, 8, 10, 15, 20];
const LEAVE_PRESETS = [0.3, 0.6, 1, 1.5, 2, 3];

const COMMON = [
  { title: "Kortputt · 1 m", start: 1, outcomes: [{ label: "Sänkt", holed: true, leave: 0 }, { label: "60 cm kvar", holed: false, leave: 0.6 }] },
  { title: "Kortputt · 2 m", start: 2, outcomes: [{ label: "Sänkt", holed: true, leave: 0 }, { label: "1 m kvar", holed: false, leave: 1 }] },
  { title: "Mellanputt · 5 m", start: 5, outcomes: [{ label: "30 cm kvar", holed: false, leave: 0.3 }, { label: "1,5 m kvar", holed: false, leave: 1.5 }] },
  { title: "Lag putt · 10 m", start: 10, outcomes: [{ label: "60 cm kvar", holed: false, leave: 0.6 }, { label: "2 m kvar", holed: false, leave: 2 }] },
  { title: "Lag putt · 15 m", start: 15, outcomes: [{ label: "1 m kvar", holed: false, leave: 1 }, { label: "3 m kvar", holed: false, leave: 3 }] },
  { title: "Långputt · 20 m", start: 20, outcomes: [{ label: "1 m kvar", holed: false, leave: 1 }, { label: "3 m kvar", holed: false, leave: 3 }] },
];

function signed(value: number) {
  const rounded = Math.round(value * 10) / 10;
  const text = Math.abs(rounded).toFixed(1).replace(".", ",");
  return `${rounded > 0 ? "+" : rounded < 0 ? "−" : ""}${text}`;
}

function ShotValuePage() {
  useHideBottomNav(true);
  const [category, setCategory] = useState<Category>("putting");
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [startDistance, setStartDistance] = useState(2);
  const [holed, setHoled] = useState(true);
  const [remainingDistance, setRemainingDistance] = useState(0.6);
  const [showResult, setShowResult] = useState(false);
  const [saved, setSaved] = useState<SavedShotReference[]>(() => loadSavedShotReferences());
  const [savedFeedback, setSavedFeedback] = useState(false);

  const result = useMemo(() => comparePuttingShot(startDistance, holed, remainingDistance), [startDistance, holed, remainingDistance]);
  const approximateLevel = useMemo(() => approximateShotLevel(result), [result]);
  const hcp10 = result.find((row) => row.level === "hcp10")?.value ?? 0;

  function calculate() {
    setShowResult(true);
    setSavedFeedback(false);
  }

  function saveCurrent() {
    setSaved(saveShotReference(startDistance, holed, remainingDistance));
    setSavedFeedback(true);
  }

  function removeSaved(id: string) {
    setSaved(deleteShotReference(id));
  }

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-md bg-background px-5 pb-10 pt-[max(1rem,env(safe-area-inset-top))] text-foreground">
      <header className="grid grid-cols-[40px_1fr_40px] items-center">
        <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card" aria-label="Tillbaka"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="text-center"><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">SG4 Reference</p><h1 className="font-display text-3xl uppercase">Shot Value</h1></div>
        <span />
      </header>

      <section className="mt-7 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-foreground text-background"><BarChart3 className="h-8 w-8" /></div>
        <h2 className="mt-5 font-display text-4xl uppercase leading-none">Vad är slaget värt?</h2>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">Ett enkelt facit i fickan. Se ungefär vilken nivå ett enskilt slag motsvarar och hur mycket mark det vinner eller tappar mot olika spelarnivåer.</p>
        <button type="button" onClick={() => { setCalculatorOpen(true); setShowResult(false); }} className="mt-5 w-full rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">Beräkna ett slag</button>
      </section>

      <section className="mt-7">
        <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Snabbguide</p><h2 className="mt-1 font-display text-2xl uppercase">Vanliga referensslag</h2></div><span className="text-[10px] font-semibold text-muted-foreground">Putting beta</span></div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {CATEGORY_OPTIONS.map((item) => <button key={item.key} type="button" disabled={!item.ready} onClick={() => setCategory(item.key)} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold ${category === item.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"} disabled:opacity-35`}>{item.label}{!item.ready ? " · snart" : ""}</button>)}
        </div>

        <div className="mt-4 space-y-3">
          {COMMON.map((card) => {
            const normal = puttingShotValue(card.start, card.outcomes[0].holed, card.outcomes[0].leave, "hcp10");
            return <article key={card.title} className="overflow-hidden rounded-3xl border border-border bg-card">
              <div className="border-b border-border px-4 py-3"><p className="text-sm font-bold">{card.title}</p><p className="mt-0.5 text-[11px] text-muted-foreground">Jämfört mot HCP 10</p></div>
              {card.outcomes.map((outcome, index) => {
                const value = puttingShotValue(card.start, outcome.holed, outcome.leave, "hcp10");
                return <button key={outcome.label} type="button" onClick={() => { setStartDistance(card.start); setHoled(outcome.holed); setRemainingDistance(outcome.leave); setCalculatorOpen(true); setShowResult(true); }} className={`grid w-full grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 text-left ${index ? "border-t border-border/60" : ""}`}>
                  <div><p className="text-sm font-semibold">{outcome.label}</p><p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{shotValueLabel(value)}</p></div>
                  <span className={`rounded-xl px-2.5 py-1.5 text-sm font-bold tabular-nums ${value > 0.1 ? "bg-primary/10 text-primary" : value < -0.1 ? "bg-red-500/10 text-red-600" : "bg-muted text-foreground"}`}>{signed(value)}</span>
                </button>;
              })}
              <div className="px-4 pb-3 pt-1 text-[10px] text-muted-foreground">Skillnaden mellan utfallen är {Math.abs(normal - puttingShotValue(card.start, card.outcomes[1].holed, card.outcomes[1].leave, "hcp10")).toFixed(1).replace(".", ",")} slag.</div>
            </article>;
          })}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Ditt facit</p><h2 className="mt-1 font-display text-2xl uppercase">Mina referensslag</h2></div><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{saved.length}</span></div>
        {saved.length ? <div className="mt-4 overflow-hidden rounded-3xl border border-border bg-card">{saved.map((item, index) => {
          const value = puttingShotValue(item.startDistanceM, item.holed, item.remainingDistanceM, "hcp10");
          return <div key={item.id} className={`flex items-center gap-3 px-4 py-3.5 ${index ? "border-t border-border/70" : ""}`}>
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="rounded-full bg-tint-strong px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-primary">Putting</span>{item.count > 1 ? <span className="text-[10px] text-muted-foreground">×{item.count}</span> : null}</div><p className="mt-1.5 text-sm font-semibold">{item.startDistanceM} m → {item.holed ? "Sänkt" : `${item.remainingDistanceM} m kvar`}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{shotValueLabel(value)} · vs HCP 10 {signed(value)}</p></div>
            <button type="button" onClick={() => removeSaved(item.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground" aria-label="Ta bort"><Trash2 className="h-4 w-4" /></button>
          </div>;
        })}</div> : <div className="mt-4 rounded-3xl border border-dashed border-border bg-card/60 p-6 text-center"><Bookmark className="mx-auto h-5 w-5 text-muted-foreground"/><p className="mt-2 text-sm font-semibold">Inga sparade referensslag ännu</p><p className="mt-1 text-xs text-muted-foreground">Beräkna ett slag och spara det som ditt eget facit.</p></div>}
      </section>

      <p className="mt-7 text-center text-[10px] leading-relaxed text-muted-foreground">Shot Value v1 använder en förenklad SG4-referensmodell för putting. Resultat visas med avsiktlig avrundning och ska läsas som ungefärliga riktmärken, inte exakt strokes-gained-data.</p>

      {calculatorOpen ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label="Beräkna Shot Value">
        <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl bg-background p-5 shadow-xl">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Shot Value · Putting</p><h2 className="mt-1 font-display text-3xl uppercase">Beräkna slag</h2></div><button type="button" onClick={() => setCalculatorOpen(false)} className="rounded-full border border-border px-3 py-2 text-xs font-semibold">Stäng</button></div>

          {!showResult ? <>
            <section className="mt-5"><p className="text-xs font-semibold">1. Hur lång var putten?</p><div className="mt-3 flex flex-wrap gap-2">{START_PRESETS.map((value) => <button key={value} type="button" onClick={() => setStartDistance(value)} className={`rounded-full border px-3 py-2 text-xs font-semibold ${startDistance === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{String(value).replace(".", ",")} m</button>)}</div></section>
            <section className="mt-5"><p className="text-xs font-semibold">2. Vad blev utfallet?</p><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setHoled(true)} className={`rounded-2xl border p-4 text-left ${holed ? "border-primary bg-primary/10" : "border-border bg-card"}`}><p className="font-semibold">Sänkt</p><p className="mt-1 text-xs text-muted-foreground">Bollen i hål</p></button><button type="button" onClick={() => setHoled(false)} className={`rounded-2xl border p-4 text-left ${!holed ? "border-primary bg-primary/10" : "border-border bg-card"}`}><p className="font-semibold">Inte sänkt</p><p className="mt-1 text-xs text-muted-foreground">Ange hur långt som blev kvar</p></button></div>{!holed ? <div className="mt-3 flex flex-wrap gap-2">{LEAVE_PRESETS.map((value) => <button key={value} type="button" onClick={() => setRemainingDistance(value)} className={`rounded-full border px-3 py-2 text-xs font-semibold ${remainingDistance === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{String(value).replace(".", ",")} m kvar</button>)}</div> : null}</section>
            <button type="button" onClick={calculate} className="mt-6 w-full rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">Visa slagvärde</button>
          </> : <>
            <section className="mt-5 rounded-3xl bg-foreground p-5 text-background text-center"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">Det här enskilda slaget</p><p className="mt-2 font-display text-4xl uppercase">≈ {approximateLevel?.label ?? "–"}</p><p className="mt-2 text-sm opacity-80">{startDistance} m → {holed ? "sänkt" : `${remainingDistance} m kvar`}</p></section>
            <section className="mt-4"><div className="mb-3 text-center"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Värde mot olika nivåer</p><h3 className="mt-1 font-display text-2xl uppercase">{shotValueLabel(hcp10)} slag</h3></div><div className="overflow-hidden rounded-3xl border border-border bg-card">{result.map((row, index) => <div key={row.level} className={`grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3.5 ${index ? "border-t border-border/70" : ""}`}><div><p className="text-sm font-semibold">mot {row.label}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{row.value > 0.1 ? "Du vann mark" : row.value < -0.1 ? "Du tappade mark" : "Ungefär neutral"}</p></div><span className={`rounded-xl px-3 py-1.5 text-base font-bold tabular-nums ${row.value > 0.1 ? "bg-primary/10 text-primary" : row.value < -0.1 ? "bg-red-500/10 text-red-600" : "bg-muted"}`}>{signed(row.value)}</span></div>)}</div></section>
            <p className="mt-4 rounded-2xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">{hcp10 > 0.1 ? `Bra slag — du vann ungefär ${Math.abs(Math.round(hcp10 * 10) / 10).toFixed(1).replace(".", ",")} slag mot en HCP 10-spelare.` : hcp10 < -0.1 ? `Kostsamt slag — du tappade ungefär ${Math.abs(Math.round(hcp10 * 10) / 10).toFixed(1).replace(".", ",")} slag mot en HCP 10-spelare.` : "Slaget var ungefär neutralt mot en HCP 10-spelare."}</p>
            <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={saveCurrent} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground">{savedFeedback ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}{savedFeedback ? "Sparat" : "Spara referens"}</button><button type="button" onClick={() => setShowResult(false)} className="rounded-2xl border border-border bg-card py-3.5 text-sm font-semibold">Nytt slag</button></div>
            <Link to="/kategori/$slug" params={{ slug: "puttning" }} className="mt-3 flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5"><div><p className="text-sm font-semibold">Liknande slag i SG4</p><p className="mt-0.5 text-xs text-muted-foreground">Öppna puttingtester och träna detta område.</p></div><span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">Träna detta <ChevronRight className="h-4 w-4" /></span></Link>
          </>}
        </div>
      </div> : null}
    </main>
  );
}
