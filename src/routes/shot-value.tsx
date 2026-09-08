import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, Bookmark, ChevronRight, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import {
  approximateShotLevel,
  comparePuttingShot,
  deleteShotReference,
  formatRange,
  loadSavedShotReferences,
  puttingShotValue,
  roundImpactText,
  saveShotReference,
  SHOT_VALUE_SCENARIOS,
  shotValueLabel,
  type SavedShotReference,
  type ShotValueCategory,
  type ShotValueScenario,
} from "@/lib/shot-value";

export const Route = createFileRoute("/shot-value")({
  head: () => ({ meta: [{ title: "Shot Value | SG4" }] }),
  component: ShotValuePage,
});

const CATEGORY_OPTIONS: Array<{ key: ShotValueCategory; label: string }> = [
  { key: "offtee", label: "Off the Tee" },
  { key: "approach", label: "Approach" },
  { key: "around", label: "Around Green" },
  { key: "putting", label: "Putting" },
];

const START_PRESETS = [1, 1.5, 2, 3, 5, 8, 10, 15, 20];
const LEAVE_PRESETS = [0.3, 0.6, 1, 1.5, 2, 3];

function signed(value: number) {
  const rounded = Math.round(value * 10) / 10;
  const text = Math.abs(rounded).toFixed(1).replace(".", ",");
  return `${rounded > 0 ? "+" : rounded < 0 ? "−" : ""}${text}`;
}

function ScenarioCard({ scenario }: { scenario: ShotValueScenario }) {
  const [open, setOpen] = useState(false);
  const range = formatRange(scenario.difference);
  const impact = roundImpactText(scenario);

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-card">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full px-4 py-4 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{scenario.situation}</p>
            <h3 className="mt-1 text-base font-bold leading-tight">{scenario.title}</h3>
          </div>
          <span className="rounded-xl bg-red-500/10 px-2.5 py-1.5 text-sm font-bold text-red-600">{range} slag</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-primary/10 p-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-primary">Bättre läge</p>
            <p className="mt-1 text-sm font-semibold">{scenario.goodLabel}</p>
          </div>
          <div className="rounded-2xl bg-red-500/10 p-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-red-600">Dyrare läge</p>
            <p className="mt-1 text-sm font-semibold">{scenario.badLabel}</p>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-foreground">{scenario.takeaway}</p>
        <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-primary">
          <span>{open ? "Visa mindre" : "Varför spelar det roll?"}</span>
          <ChevronRight className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} />
        </div>
      </button>

      {open ? (
        <div className="border-t border-border bg-muted/35 px-4 py-4">
          {impact ? (
            <div className="rounded-2xl bg-background p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Typisk rondeffekt</p>
              <p className="mt-1 text-lg font-bold">≈ {formatRange(scenario.roundImpact!)} slag</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{impact}</p>
            </div>
          ) : null}
          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">{scenario.benchmarkNote}. Spannet är pedagogiskt och medvetet brett, inte en exakt rondprognos.</p>
        </div>
      ) : null}
    </article>
  );
}

function ShotValuePage() {
  useHideBottomNav(true);
  const [category, setCategory] = useState<ShotValueCategory>("around");
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calcCategory, setCalcCategory] = useState<ShotValueCategory>("putting");
  const [startDistance, setStartDistance] = useState(2);
  const [holed, setHoled] = useState(true);
  const [remainingDistance, setRemainingDistance] = useState(0.6);
  const [showResult, setShowResult] = useState(false);
  const [saved, setSaved] = useState<SavedShotReference[]>(() => loadSavedShotReferences());

  const scenarios = useMemo(() => SHOT_VALUE_SCENARIOS.filter((item) => item.category === category), [category]);
  const categoryScenarios = useMemo(() => SHOT_VALUE_SCENARIOS.filter((item) => item.category === calcCategory), [calcCategory]);
  const result = useMemo(() => comparePuttingShot(startDistance, holed, remainingDistance), [startDistance, holed, remainingDistance]);
  const approximateLevel = useMemo(() => approximateShotLevel(result), [result]);
  const hcp10 = result.find((row) => row.level === "hcp10")?.value ?? 0;

  function removeSaved(id: string) {
    setSaved(deleteShotReference(id));
  }

  function saveCurrent() {
    setSaved(saveShotReference(startDistance, holed, remainingDistance));
  }

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-md bg-background px-5 pb-10 pt-[max(1rem,env(safe-area-inset-top))] text-foreground">
      <header className="grid grid-cols-[40px_1fr_40px] items-center">
        <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card" aria-label="Tillbaka"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="text-center"><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">SG4 Reference</p><h1 className="font-display text-3xl uppercase">Shot Value</h1></div>
        <span />
      </header>

      <section className="mt-7 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-foreground text-background"><BarChart3 className="h-7 w-7" /></div>
        <h2 className="mt-4 font-display text-4xl uppercase leading-none">Vad kostar slaget?</h2>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">Lär dig vilka missar och beslut som faktiskt kostar slag — och hur små skillnader kan bli stora över 18 hål.</p>
        <button type="button" onClick={() => { setCalculatorOpen(true); setShowResult(false); }} className="mt-5 w-full rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">Kolla ett slag</button>

        <div className="mt-4 rounded-3xl border border-border bg-card p-4 text-left">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Små val blir stora över 18 hål</p>
          <p className="mt-2 text-base font-semibold">Att ofta missa short-side kan kosta flera slag under en rond.</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Shot Value visar ett brett spann i stället för att be dig gissa hur ofta situationen händer.</p>
        </div>
      </section>

      <section className="mt-7">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Snabbguide</p><h2 className="mt-1 font-display text-2xl uppercase">Lär dig av kontrasten</h2></div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {CATEGORY_OPTIONS.map((item) => <button key={item.key} type="button" onClick={() => setCategory(item.key)} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold ${category === item.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{item.label}</button>)}
        </div>
        <div className="mt-4 space-y-3">{scenarios.map((scenario) => <ScenarioCard key={scenario.id} scenario={scenario} />)}</div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Ditt facit</p><h2 className="mt-1 font-display text-2xl uppercase">Mina referensslag</h2></div><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{saved.length}</span></div>
        {saved.length ? <div className="mt-4 overflow-hidden rounded-3xl border border-border bg-card">{saved.map((item, index) => {
          const value = puttingShotValue(item.startDistanceM, item.holed, item.remainingDistanceM, "hcp10");
          return <div key={item.id} className={`flex items-center gap-3 px-4 py-3.5 ${index ? "border-t border-border/70" : ""}`}>
            <div className="min-w-0 flex-1"><span className="rounded-full bg-tint-strong px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-primary">Putting</span><p className="mt-1.5 text-sm font-semibold">{item.startDistanceM} m → {item.holed ? "Sänkt" : `${item.remainingDistanceM} m kvar`}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{shotValueLabel(value)} · vs HCP 10 {signed(value)}</p></div>
            <button type="button" onClick={() => removeSaved(item.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground" aria-label="Ta bort"><Trash2 className="h-4 w-4" /></button>
          </div>;
        })}</div> : <div className="mt-4 rounded-3xl border border-dashed border-border bg-card/60 p-6 text-center"><Bookmark className="mx-auto h-5 w-5 text-muted-foreground"/><p className="mt-2 text-sm font-semibold">Inga sparade referensslag ännu</p><p className="mt-1 text-xs text-muted-foreground">Spara sådant du vill kunna slå upp snabbt igen.</p></div>}
      </section>

      <p className="mt-7 text-center text-[10px] leading-relaxed text-muted-foreground">Putting använder SG4 expected-putts v1. Övriga kategorier använder breda referensspann tills full expected-strokes-data per lie, distans och HCP finns på plats.</p>

      {calculatorOpen ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label="Kolla ett slag">
        <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl bg-background p-5 shadow-xl">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Shot Value</p><h2 className="mt-1 font-display text-3xl uppercase">Kolla ett slag</h2></div><button type="button" onClick={() => setCalculatorOpen(false)} className="rounded-full border border-border px-3 py-2 text-xs font-semibold">Stäng</button></div>

          {!showResult ? <>
            <p className="mt-5 text-xs font-semibold">1. Välj område</p>
            <div className="mt-3 grid grid-cols-2 gap-2">{CATEGORY_OPTIONS.map((item) => <button key={item.key} type="button" onClick={() => setCalcCategory(item.key)} className={`rounded-2xl border p-3 text-left text-sm font-semibold ${calcCategory === item.key ? "border-primary bg-primary/10" : "border-border bg-card"}`}>{item.label}</button>)}</div>

            {calcCategory === "putting" ? <>
              <p className="mt-5 text-xs font-semibold">2. Hur lång var putten?</p>
              <div className="mt-3 flex flex-wrap gap-2">{START_PRESETS.map((value) => <button key={value} type="button" onClick={() => setStartDistance(value)} className={`rounded-full border px-3 py-2 text-xs font-semibold ${startDistance === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{String(value).replace(".", ",")} m</button>)}</div>
              <p className="mt-5 text-xs font-semibold">3. Vad blev utfallet?</p>
              <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setHoled(true)} className={`rounded-2xl border p-4 text-left ${holed ? "border-primary bg-primary/10" : "border-border bg-card"}`}><p className="font-semibold">Sänkt</p></button><button type="button" onClick={() => setHoled(false)} className={`rounded-2xl border p-4 text-left ${!holed ? "border-primary bg-primary/10" : "border-border bg-card"}`}><p className="font-semibold">Miss</p></button></div>
              {!holed ? <div className="mt-3 flex flex-wrap gap-2">{LEAVE_PRESETS.map((value) => <button key={value} type="button" onClick={() => setRemainingDistance(value)} className={`rounded-full border px-3 py-2 text-xs font-semibold ${remainingDistance === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{String(value).replace(".", ",")} m kvar</button>)}</div> : null}
              <button type="button" onClick={() => setShowResult(true)} className="mt-6 w-full rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">Visa värdet</button>
            </> : <>
              <p className="mt-5 text-xs font-semibold">2. Välj situation</p>
              <div className="mt-3 space-y-2">{categoryScenarios.map((scenario) => <div key={scenario.id} className="rounded-2xl border border-border bg-card p-4"><p className="text-sm font-bold">{scenario.title}</p><p className="mt-1 text-xs text-muted-foreground">{scenario.goodLabel} vs {scenario.badLabel}</p><p className="mt-3 text-lg font-bold text-red-600">Skillnad: {formatRange(scenario.difference)} slag</p>{scenario.roundImpact ? <p className="mt-1 text-xs text-muted-foreground">Typisk rondeffekt: ~{formatRange(scenario.roundImpact)} slag</p> : null}<p className="mt-2 text-xs leading-relaxed">{scenario.takeaway}</p></div>)}</div>
            </>}
          </> : <>
            <section className="mt-5 rounded-3xl bg-foreground p-5 text-center text-background"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">Vad betyder slaget?</p><p className="mt-2 font-display text-4xl uppercase">≈ {approximateLevel?.label ?? "–"}</p><p className="mt-2 text-sm opacity-80">{startDistance} m → {holed ? "sänkt" : `${remainingDistance} m kvar`}</p></section>
            <p className="mt-4 rounded-2xl bg-muted/60 p-3 text-sm leading-relaxed">{hcp10 > 0.1 ? `Bra slag — ungefär ${signed(hcp10)} mot HCP 10.` : hcp10 < -0.1 ? `Kostsamt slag — ungefär ${signed(hcp10)} mot HCP 10.` : "Slaget var ungefär neutralt mot HCP 10."}</p>
            <div className="mt-4 overflow-hidden rounded-3xl border border-border bg-card">{result.map((row, index) => <div key={row.level} className={`grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3.5 ${index ? "border-t border-border/70" : ""}`}><p className="text-sm font-semibold">mot {row.label}</p><span className="text-base font-bold tabular-nums">{signed(row.value)}</span></div>)}</div>
            <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={saveCurrent} className="rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground">Spara referens</button><button type="button" onClick={() => setShowResult(false)} className="rounded-2xl border border-border bg-card py-3.5 text-sm font-semibold">Nytt slag</button></div>
          </>}
        </div>
      </div> : null}
    </main>
  );
}
