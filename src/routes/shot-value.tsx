import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Bookmark, Check, ChevronRight, Crosshair, Flag, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
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
  type ShotValueCategory,
} from "@/lib/shot-value";

export const Route = createFileRoute("/shot-value")({
  head: () => ({ meta: [{ title: "Shot Value | SG4" }] }),
  component: ShotValuePage,
});

type VisualZone = {
  id: string;
  label: string;
  short: string;
  x: number;
  y: number;
  cost: [number, number];
  impact?: [number, number];
  quality: "Bra" | "Neutral" | "Kostsamt" | "Mycket kostsamt";
  explanation: string;
};

type VisualCategory = {
  key: ShotValueCategory;
  label: string;
  eyebrow: string;
  headline: string;
  reference: string;
  compareLabel: string;
  zones: VisualZone[];
};

const CATEGORIES: VisualCategory[] = [
  {
    key: "offtee",
    label: "Off the Tee",
    eyebrow: "Tee shot",
    headline: "Spelbar slår ofta längre",
    reference: "fairway",
    compareLabel: "fairway",
    zones: [
      { id: "fairway", label: "Fairway · 225 m", short: "Fairway", x: 50, y: 39, cost: [0, 0], impact: [0, 0], quality: "Bra", explanation: "Bra lie och fri väg till green. Det är referenspunkten här." },
      { id: "rough", label: "Ruff · 240 m", short: "Ruff", x: 72, y: 34, cost: [0.1, 0.3], impact: [1, 3], quality: "Neutral", explanation: "15 meter längre, men sämre lie gör nästa slag svårare." },
      { id: "trouble", label: "Problem · 235 m", short: "Problem", x: 20, y: 29, cost: [0.5, 1.2], impact: [2, 5], quality: "Mycket kostsamt", explanation: "Recovery eller pliktrisk gör några extra meter nästan irrelevanta." },
    ],
  },
  {
    key: "approach",
    label: "Approach",
    eyebrow: "Approach · 150 m",
    headline: "Rätt miss är ofta bättre",
    reference: "safe",
    compareLabel: "safe side",
    zones: [
      { id: "safe", label: "Safe side · 9 m", short: "Safe side", x: 30, y: 46, cost: [0, 0], impact: [0, 0], quality: "Bra", explanation: "Lite längre från flaggan men mycket green att arbeta med." },
      { id: "center", label: "Green · 6 m", short: "Green", x: 55, y: 43, cost: [0, 0.1], impact: [0, 1], quality: "Bra", explanation: "På green och fullt spelbar. Små skillnader här betyder mindre än att undvika den dyra sidan." },
      { id: "short", label: "Short side · 5 m", short: "Short side", x: 76, y: 39, cost: [0.3, 0.7], impact: [2, 4], quality: "Kostsamt", explanation: "Närmare flaggan, men nästa slag blir betydligt svårare. Avståndet lurar ögat." },
      { id: "bunker", label: "Short-sided bunker", short: "Bunker", x: 80, y: 58, cost: [0.4, 0.8], impact: [2, 4], quality: "Mycket kostsamt", explanation: "Bunker + lite green att jobba med gör missen klart dyrare än en längre miss på rätt sida." },
    ],
  },
  {
    key: "around",
    label: "Around Green",
    eyebrow: "Greenside",
    headline: "Green att jobba med är värde",
    reference: "longside",
    compareLabel: "long side",
    zones: [
      { id: "longside", label: "Long side · mycket green", short: "Long side", x: 27, y: 52, cost: [0, 0], impact: [0, 0], quality: "Bra", explanation: "Du har plats att landa bollen och låta den rulla. Det gör nästa slag enklare." },
      { id: "fringe", label: "Fringe · spelbar", short: "Fringe", x: 45, y: 35, cost: [0.1, 0.2], impact: [0.5, 1.5], quality: "Neutral", explanation: "Inte perfekt, men fortfarande ett förutsägbart och spelbart läge." },
      { id: "shortbunker", label: "Short-sided bunker", short: "Short bunker", x: 78, y: 48, cost: [0.4, 0.8], impact: [2, 4], quality: "Mycket kostsamt", explanation: "Kort landningsyta och bunker gör nästa slag markant svårare." },
      { id: "rough", label: "Short-side rough", short: "Short rough", x: 72, y: 28, cost: [0.2, 0.6], impact: [1, 3], quality: "Kostsamt", explanation: "Placeringen av missen kan vara viktigare än hur många meter du missade med." },
    ],
  },
  {
    key: "putting",
    label: "Putting",
    eyebrow: "10 m lag putt",
    headline: "Fartkontroll sparar slag",
    reference: "close",
    compareLabel: "60 cm",
    zones: [
      { id: "close", label: "60 cm kvar", short: "60 cm", x: 53, y: 45, cost: [0, 0], impact: [0, 0], quality: "Bra", explanation: "En enkel andra putt. Det är referenspunkten för den här lagputten." },
      { id: "meter", label: "1 m kvar", short: "1 m", x: 44, y: 50, cost: [0.05, 0.15], impact: [0.5, 1.5], quality: "Neutral", explanation: "Fortfarande bra fartkontroll, men du lämnar lite mer arbete kvar." },
      { id: "two", label: "2 m kvar", short: "2 m", x: 35, y: 58, cost: [0.2, 0.5], impact: [1, 3], quality: "Kostsamt", explanation: "Den här lilla skillnaden efter första putten ökar treputtsrisken tydligt." },
      { id: "three", label: "3 m kvar", short: "3 m", x: 27, y: 66, cost: [0.4, 0.7], impact: [2, 4], quality: "Mycket kostsamt", explanation: "Du har i praktiken lämnat en ny riktig putt i stället för en enkel tap-in." },
    ],
  },
];

const START_PRESETS = [1, 1.5, 2, 3, 5, 8, 10, 15, 20];
const LEAVE_PRESETS = [0.3, 0.6, 1, 1.5, 2, 3];

function formatNumber(value: number) {
  return String(Math.round(value * 10) / 10).replace(".", ",");
}

function formatRange(range: [number, number]) {
  if (range[0] === range[1]) return formatNumber(range[0]);
  return `${formatNumber(range[0])}–${formatNumber(range[1])}`;
}

function signed(value: number) {
  const rounded = Math.round(value * 10) / 10;
  const abs = Math.abs(rounded).toFixed(1).replace(".", ",");
  return `${rounded > 0 ? "+" : rounded < 0 ? "−" : ""}${abs}`;
}

function nearestZone(zones: VisualZone[], x: number, y: number) {
  return zones.reduce((best, zone) => {
    const d = Math.hypot(zone.x - x, zone.y - y);
    const bd = Math.hypot(best.x - x, best.y - y);
    return d < bd ? zone : best;
  }, zones[0]);
}

function qualityClasses(quality: VisualZone["quality"]) {
  if (quality === "Bra") return "bg-primary/10 text-primary";
  if (quality === "Neutral") return "bg-muted text-foreground";
  if (quality === "Kostsamt") return "bg-amber-500/10 text-amber-700";
  return "bg-red-500/10 text-red-600";
}

function FieldGraphic({ category, selectedId, onSelect }: { category: VisualCategory; selectedId: string; onSelect: (id: string) => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = category.zones.find((zone) => zone.id === selectedId) ?? category.zones[0];

  function selectFromPointer(clientX: number, clientY: number) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    onSelect(nearestZone(category.zones, x, y).id);
  }

  const isOfftee = category.key === "offtee";
  const isPutting = category.key === "putting";

  return (
    <div
      ref={wrapRef}
      className="relative aspect-[4/5] w-full touch-pan-y overflow-hidden rounded-[28px] border border-border bg-[#dfe7d7]"
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest("button")) return;
        selectFromPointer(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (event.buttons !== 1) return;
        selectFromPointer(event.clientX, event.clientY);
      }}
      aria-label="Interaktiv golfvy. Tryck eller dra bollen mellan markerade lägen."
    >
      {isOfftee ? (
        <>
          <div className="absolute left-[29%] top-[-8%] h-[110%] w-[42%] rotate-[4deg] rounded-[46%] bg-[#b8caa8]" />
          <div className="absolute left-[7%] top-[8%] h-[34%] w-[18%] rounded-[44%] bg-[#c8d8ba]" />
          <div className="absolute right-[4%] top-[5%] h-[38%] w-[18%] rounded-[44%] bg-[#c8d8ba]" />
          <div className="absolute bottom-[5%] left-1/2 h-12 w-24 -translate-x-1/2 rounded-[50%] bg-[#c7d2ba]" />
          <div className="absolute bottom-[8%] left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-foreground" />
          <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-[0.14em] text-foreground/55">Tee</div>
        </>
      ) : (
        <>
          <div className="absolute left-[16%] top-[16%] h-[58%] w-[68%] -rotate-[7deg] rounded-[48%] bg-[#b8caa8]" />
          {!isPutting ? <div className="absolute right-[8%] top-[43%] h-[20%] w-[22%] rotate-[14deg] rounded-[48%] bg-[#e9dfbd]" /> : null}
          {!isPutting ? <div className="absolute left-[4%] top-[48%] h-[18%] w-[17%] -rotate-[12deg] rounded-[48%] bg-[#c9d5bd]" /> : null}
          <div className="absolute left-[57%] top-[31%] h-8 w-[2px] bg-foreground/70" />
          <div className="absolute left-[57%] top-[29%] h-3 w-4 bg-foreground/80 [clip-path:polygon(0_0,100%_50%,0_100%)]" />
          <div className="absolute left-[55.7%] top-[38%] h-2.5 w-2.5 rounded-full border border-background bg-foreground" />
          <div className="absolute left-[61%] top-[28%] text-[9px] font-bold uppercase tracking-[0.12em] text-foreground/55">Pin</div>
        </>
      )}

      {category.zones.map((zone) => {
        const active = zone.id === selectedId;
        return (
          <button
            key={zone.id}
            type="button"
            onClick={(event) => { event.stopPropagation(); onSelect(zone.id); }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all ${active ? "h-11 w-11 border-background bg-foreground text-background shadow-lg" : "h-8 w-8 border-background/90 bg-background/85 text-foreground"}`}
            style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
            aria-label={zone.label}
          >
            <span className="text-[10px] font-black">{active ? "●" : "○"}</span>
          </button>
        );
      })}

      <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-2xl bg-background/90 px-3 py-2.5 backdrop-blur-sm">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Flytta bollen</p>
        <p className="mt-0.5 text-sm font-bold">{selected.label}</p>
      </div>
    </div>
  );
}

function ShotValuePage() {
  useHideBottomNav(true);
  const [categoryKey, setCategoryKey] = useState<ShotValueCategory>("approach");
  const category = CATEGORIES.find((item) => item.key === categoryKey) ?? CATEGORIES[1];
  const [zoneByCategory, setZoneByCategory] = useState<Record<ShotValueCategory, string>>({
    offtee: "rough",
    approach: "short",
    around: "shortbunker",
    putting: "two",
  });
  const selected = category.zones.find((zone) => zone.id === zoneByCategory[category.key]) ?? category.zones[0];
  const reference = category.zones.find((zone) => zone.id === category.reference) ?? category.zones[0];
  const [exactPuttOpen, setExactPuttOpen] = useState(false);
  const [startDistance, setStartDistance] = useState(2);
  const [holed, setHoled] = useState(true);
  const [remainingDistance, setRemainingDistance] = useState(0.6);
  const [showPuttResult, setShowPuttResult] = useState(false);
  const [saved, setSaved] = useState<SavedShotReference[]>(() => loadSavedShotReferences());
  const [savedFeedback, setSavedFeedback] = useState(false);

  const puttResults = useMemo(() => comparePuttingShot(startDistance, holed, remainingDistance), [startDistance, holed, remainingDistance]);
  const approximateLevel = useMemo(() => approximateShotLevel(puttResults), [puttResults]);
  const hcp10 = puttResults.find((row) => row.level === "hcp10")?.value ?? 0;

  function setSelected(id: string) {
    setZoneByCategory((current) => ({ ...current, [category.key]: id }));
  }

  function saveCurrentPutt() {
    setSaved(saveShotReference(startDistance, holed, remainingDistance));
    setSavedFeedback(true);
  }

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-md bg-background px-5 pb-12 pt-[max(1rem,env(safe-area-inset-top))] text-foreground">
      <header className="grid grid-cols-[40px_1fr_40px] items-center">
        <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card" aria-label="Tillbaka"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">SG4 Reference</p>
          <h1 className="font-display text-3xl uppercase">Shot Value</h1>
        </div>
        <span />
      </header>

      <section className="mt-7 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-foreground text-background"><Crosshair className="h-7 w-7" /></div>
        <h2 className="mt-4 font-display text-4xl uppercase leading-none">Flytta bollen.<br />Förstå värdet.</h2>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">Se vad olika missar och positioner faktiskt kostar — utan att logga en hel rond.</p>
      </section>

      <section className="mt-6">
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {CATEGORIES.map((item) => (
            <button key={item.key} type="button" onClick={() => setCategoryKey(item.key)} className={`shrink-0 rounded-full border px-3.5 py-2.5 text-xs font-semibold ${category.key === item.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{item.label}</button>
          ))}
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-[32px] border border-border bg-card p-3">
        <div className="px-2 pb-3 pt-1 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{category.eyebrow}</p>
          <h3 className="mt-1 font-display text-2xl uppercase">{category.headline}</h3>
          <p className="mt-1 text-xs text-muted-foreground">Tryck på ett läge eller dra bollen över bilden.</p>
        </div>

        <FieldGraphic category={category} selectedId={selected.id} onSelect={setSelected} />

        <div className="mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {category.zones.map((zone) => (
            <button key={zone.id} type="button" onClick={() => setSelected(zone.id)} className={`shrink-0 rounded-full border px-3 py-2 text-[11px] font-semibold ${zone.id === selected.id ? "border-foreground bg-foreground text-background" : "border-border bg-background"}`}>{zone.short}</button>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-[28px] border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Det här läget</p>
            <h3 className="mt-1 text-xl font-bold leading-tight">{selected.label}</h3>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${qualityClasses(selected.quality)}`}>{selected.quality}</span>
        </div>

        {selected.id === reference.id ? (
          <div className="mt-5 rounded-2xl bg-primary/10 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Referensläge</p>
            <p className="mt-1 text-2xl font-black text-primary">Bra utgångsläge</p>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl bg-muted/55 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Jämfört med {category.compareLabel}</p>
            <p className="mt-1 text-2xl font-black">~{formatRange(selected.cost)} slag dyrare</p>
          </div>
        )}

        <p className="mt-4 text-sm leading-relaxed">{selected.explanation}</p>

        {selected.impact && selected.impact[1] > 0 ? (
          <div className="mt-4 flex items-center justify-between gap-4 border-t border-border pt-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Om det blir ett återkommande mönster</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Automatiskt pedagogiskt spann — du behöver inte ange frekvens själv.</p>
            </div>
            <p className="shrink-0 text-lg font-black">~{formatRange(selected.impact)}<br /><span className="text-[10px] font-semibold text-muted-foreground">slag/rond</span></p>
          </div>
        ) : null}
      </section>

      {category.zones.length > 1 ? (
        <section className="mt-4 rounded-[28px] bg-foreground p-5 text-background">
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.16em] opacity-65">A / B-jämförelse</p>
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="text-center"><span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/15 text-xs font-black">A</span><p className="mt-2 text-sm font-bold">{selected.short}</p></div>
            <div className="text-center text-[10px] font-black uppercase tracking-[0.12em] opacity-60">vs</div>
            <div className="text-center"><span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/15 text-xs font-black">B</span><p className="mt-2 text-sm font-bold">{reference.short}</p></div>
          </div>
          <p className="mt-5 text-center font-display text-2xl uppercase leading-tight">{selected.id === reference.id ? `${reference.short} är referensen` : `${reference.short} är ~${formatRange(selected.cost)} slag bättre`}</p>
        </section>
      ) : null}

      <section className="mt-8">
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Lär dig som en multiplikationstabell</p>
          <h2 className="mt-1 font-display text-2xl uppercase">Vanliga facit</h2>
        </div>
        <div className="mt-4 space-y-2">
          {category.zones.filter((zone) => zone.id !== reference.id).map((zone) => (
            <button key={zone.id} type="button" onClick={() => { setSelected(zone.id); window.scrollTo({ top: 300, behavior: "smooth" }); }} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${qualityClasses(zone.quality)}`}>{zone.quality === "Bra" ? "+" : "−"}</span>
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{zone.label}</p><p className="mt-0.5 text-[11px] text-muted-foreground">~{formatRange(zone.cost)} slag dyrare än {category.compareLabel}</p></div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>

        {category.key === "putting" ? (
          <button type="button" onClick={() => { setExactPuttOpen(true); setShowPuttResult(false); setSavedFeedback(false); }} className="mt-3 w-full rounded-2xl border border-border bg-card py-3.5 text-sm font-semibold">Exakt putt →</button>
        ) : null}
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Ditt eget facit</p><h2 className="mt-1 font-display text-2xl uppercase">Mina referenser</h2></div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{saved.length}</span>
        </div>
        {saved.length ? (
          <div className="mt-4 overflow-hidden rounded-3xl border border-border bg-card">
            {saved.map((item, index) => {
              const value = puttingShotValue(item.startDistanceM, item.holed, item.remainingDistanceM, "hcp10");
              return (
                <div key={item.id} className={`flex items-center gap-3 px-4 py-3.5 ${index ? "border-t border-border/70" : ""}`}>
                  <div className="min-w-0 flex-1"><span className="rounded-full bg-tint-strong px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-primary">Putting</span><p className="mt-1.5 text-sm font-semibold">{item.startDistanceM} m → {item.holed ? "Sänkt" : `${item.remainingDistanceM} m kvar`}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{shotValueLabel(value)} · vs HCP 10 {signed(value)}</p></div>
                  <button type="button" onClick={() => setSaved(deleteShotReference(item.id))} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground" aria-label="Ta bort"><Trash2 className="h-4 w-4" /></button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-3xl border border-dashed border-border bg-card/60 p-5 text-center"><Bookmark className="mx-auto h-5 w-5 text-muted-foreground" /><p className="mt-2 text-sm font-semibold">Inga sparade referenser ännu</p><p className="mt-1 text-xs text-muted-foreground">Spara exakta puttingreferenser du vill kunna i huvudet.</p></div>
        )}
      </section>

      <p className="mt-7 text-center text-[10px] leading-relaxed text-muted-foreground">Off the Tee, Approach och Around Green använder medvetet breda SG4-referensspann. Putting använder SG4 expected-putts v1. Shot Value är ett läroverktyg — inte en rondtracker.</p>

      {exactPuttOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label="Exakt putt">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl bg-background p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Shot Value · Putting</p><h2 className="mt-1 font-display text-3xl uppercase">Exakt putt</h2></div><button type="button" onClick={() => setExactPuttOpen(false)} className="rounded-full border border-border px-3 py-2 text-xs font-semibold">Stäng</button></div>

            {!showPuttResult ? (
              <>
                <p className="mt-5 text-xs font-semibold">1. Hur lång var putten?</p>
                <div className="mt-3 flex flex-wrap gap-2">{START_PRESETS.map((value) => <button key={value} type="button" onClick={() => setStartDistance(value)} className={`rounded-full border px-3 py-2 text-xs font-semibold ${startDistance === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{formatNumber(value)} m</button>)}</div>
                <p className="mt-5 text-xs font-semibold">2. Vad blev utfallet?</p>
                <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setHoled(true)} className={`rounded-2xl border p-4 text-left ${holed ? "border-primary bg-primary/10" : "border-border bg-card"}`}><p className="font-semibold">Sänkt</p></button><button type="button" onClick={() => setHoled(false)} className={`rounded-2xl border p-4 text-left ${!holed ? "border-primary bg-primary/10" : "border-border bg-card"}`}><p className="font-semibold">Miss</p></button></div>
                {!holed ? <div className="mt-3 flex flex-wrap gap-2">{LEAVE_PRESETS.map((value) => <button key={value} type="button" onClick={() => setRemainingDistance(value)} className={`rounded-full border px-3 py-2 text-xs font-semibold ${remainingDistance === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{formatNumber(value)} m kvar</button>)}</div> : null}
                <button type="button" onClick={() => setShowPuttResult(true)} className="mt-6 w-full rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">Visa värdet</button>
              </>
            ) : (
              <>
                <section className="mt-5 rounded-3xl bg-foreground p-5 text-center text-background"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">Det här enskilda slaget</p><p className="mt-2 font-display text-4xl uppercase">≈ {approximateLevel?.label ?? "–"}</p><p className="mt-2 text-sm opacity-80">{formatNumber(startDistance)} m → {holed ? "sänkt" : `${formatNumber(remainingDistance)} m kvar`}</p></section>
                <div className="mt-4 rounded-2xl border border-border bg-card p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Mot HCP 10</p><div className="mt-1 flex items-end justify-between gap-4"><p className="text-lg font-bold">{shotValueLabel(hcp10)}</p><p className="text-2xl font-black">{signed(hcp10)}</p></div></div>
                <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={saveCurrentPutt} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground">{savedFeedback ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}{savedFeedback ? "Sparat" : "Spara"}</button><button type="button" onClick={() => setShowPuttResult(false)} className="rounded-2xl border border-border bg-card py-3.5 text-sm font-semibold">Nytt slag</button></div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
