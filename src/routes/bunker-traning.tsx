import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight, RotateCcw, Target, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { LIGHT_SURFACE } from "./8-bollar";

export const Route = createFileRoute("/bunker-traning")({
  head: () => ({ meta: [{ title: "Bunkerträning | SG4" }] }),
  component: BunkerTrainingPage,
});

type LieId = "normal" | "plugged" | "uphill" | "downhill" | "ball-above" | "ball-below";
type DistanceId = "short" | "medium" | "long";
type ZoneId = "holed" | "under-1" | "1-2" | "2-3" | "3-5" | "5-plus";
type Step = "setup" | "play" | "result";

type ShotPlan = {
  lie: LieId;
  distance: DistanceId;
  target: number;
};

type ShotResult = ShotPlan & { zone: ZoneId };

const LIES: Array<{ id: LieId; title: string; detail: string }> = [
  { id: "normal", title: "Normal", detail: "Normal bunkerlie" },
  { id: "plugged", title: "Pluggad", detail: "Bollen sitter ner" },
  { id: "uphill", title: "Uppförsläge", detail: "Bollen ligger i uppförslut" },
  { id: "downhill", title: "Nedförsläge", detail: "Bollen ligger i nedförslut" },
  { id: "ball-above", title: "Bollen över fötterna", detail: "Sidolutning upp mot dig" },
  { id: "ball-below", title: "Bollen under fötterna", detail: "Sidolutning bort från dig" },
];

const DISTANCES: Array<{ id: DistanceId; title: string; range: string; min: number; max: number }> = [
  { id: "short", title: "Kort", range: "5–10 m", min: 5, max: 10 },
  { id: "medium", title: "Medium", range: "10–20 m", min: 10, max: 20 },
  { id: "long", title: "Lång", range: "20–30 m", min: 20, max: 30 },
];

const ZONES: Array<{ id: ZoneId; label: string; short: string; rank: number; within3: boolean }> = [
  { id: "holed", label: "Sänkt", short: "Sänkt", rank: 0, within3: true },
  { id: "under-1", label: "Under 1 m", short: "<1 m", rank: 1, within3: true },
  { id: "1-2", label: "1–2 m", short: "1–2 m", rank: 2, within3: true },
  { id: "2-3", label: "2–3 m", short: "2–3 m", rank: 3, within3: true },
  { id: "3-5", label: "3–5 m", short: "3–5 m", rank: 4, within3: false },
  { id: "5-plus", label: "5+ m", short: "5+ m", rank: 5, within3: false },
];

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makePlan(lies: LieId[], distances: DistanceId[], count: number) {
  const plans: ShotPlan[] = [];
  let previous = "";

  for (let i = 0; i < count; i++) {
    let lie = pick(lies);
    let distance = pick(distances);
    let key = `${lie}-${distance}`;
    let tries = 0;

    while (key === previous && lies.length * distances.length > 1 && tries < 10) {
      lie = pick(lies);
      distance = pick(distances);
      key = `${lie}-${distance}`;
      tries++;
    }

    const band = DISTANCES.find((item) => item.id === distance)!;
    plans.push({ lie, distance, target: rand(band.min, band.max) });
    previous = key;
  }

  return plans;
}

function SelectedCheck() {
  return (
    <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
      <Check className="h-3.5 w-3.5" />
    </span>
  );
}

function BunkerTrainingPage() {
  const [step, setStep] = useState<Step>("setup");
  const [selectedLies, setSelectedLies] = useState<LieId[]>(["normal"]);
  const [selectedDistances, setSelectedDistances] = useState<DistanceId[]>(["short", "medium"]);
  const [shotCount, setShotCount] = useState<5 | 10 | 20>(10);
  const [plan, setPlan] = useState<ShotPlan[]>([]);
  const [results, setResults] = useState<ShotResult[]>([]);
  const [shotIndex, setShotIndex] = useState(0);

  const current = plan[shotIndex];
  const setupValid = selectedLies.length > 0 && selectedDistances.length > 0;

  const within3 = useMemo(() => {
    if (!results.length) return 0;
    const hits = results.filter((result) => ZONES.find((zone) => zone.id === result.zone)?.within3).length;
    return Math.round((hits / results.length) * 100);
  }, [results]);

  const bestZone = useMemo(() => {
    if (!results.length) return null;
    return results.reduce((best, result) => {
      const rank = ZONES.find((zone) => zone.id === result.zone)?.rank ?? 99;
      const bestRank = ZONES.find((zone) => zone.id === best.zone)?.rank ?? 99;
      return rank < bestRank ? result : best;
    });
  }, [results]);

  function toggleLie(id: LieId) {
    setSelectedLies((items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]));
  }

  function toggleDistance(id: DistanceId) {
    setSelectedDistances((items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]));
  }

  function startTraining() {
    if (!setupValid) return;
    setPlan(makePlan(selectedLies, selectedDistances, shotCount));
    setResults([]);
    setShotIndex(0);
    setStep("play");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function registerZone(zone: ZoneId) {
    if (!current) return;
    const next = [...results, { ...current, zone }];
    setResults(next);

    if (shotIndex + 1 >= plan.length) {
      setStep("result");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setShotIndex((index) => index + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setResults([]);
    setPlan([]);
    setShotIndex(0);
    setStep("setup");
  }

  const selectedClass = "border-blue-400/80 bg-gradient-to-br from-blue-100/80 via-white/84 to-sky-50/72 ring-2 ring-blue-500/35 shadow-[0_18px_42px_-30px_rgba(37,99,235,.5)]";
  const glass = "border-slate-300/80 bg-gradient-to-br from-slate-100/86 via-white/80 to-slate-100/72 shadow-[0_18px_42px_-32px_rgba(15,23,42,.38)]";

  return (
    <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-28 pt-6 text-foreground">
      <header className="flex items-center justify-between">
        <Link
          to="/traning"
          search={{ category: "around-the-green" }}
          aria-label="Tillbaka till Närspel"
          className={`inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white/70 ${glass}`}
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="text-center">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Around the Green</p>
          <p className="text-[11px] font-semibold text-slate-800">Bunkerträning</p>
        </div>
        <span className="h-10 w-10" />
      </header>

      {step === "setup" ? (
        <>
          <section className="mt-5 rounded-[30px] border border-slate-300/80 bg-white/72 p-5 shadow-[0_20px_46px_-32px_rgba(15,23,42,.4)] backdrop-blur-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Precision</p>
            <h1 className="mt-2 font-display text-4xl leading-none text-slate-950">Bunkerträning</h1>
            <p className="mt-3 text-[13px] leading-relaxed text-slate-600">Bygg en session med olika bunkerlägen och avstånd. Bedöm bara var bollen stannar efter slaget.</p>
          </section>

          <section className="mt-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">1 · Lie</p>
                <h2 className="mt-1 font-display text-2xl">Välj lägen</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLies(selectedLies.length === LIES.length ? [] : LIES.map((item) => item.id))}
                className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-600"
              >
                {selectedLies.length === LIES.length ? "Rensa alla" : "Välj alla"}
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {LIES.map((item) => {
                const selected = selectedLies.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleLie(item.id)}
                    className={`relative min-h-[104px] rounded-3xl border p-4 text-left transition-all active:scale-[0.99] ${selected ? selectedClass : glass}`}
                  >
                    {selected ? <SelectedCheck /> : null}
                    <span className="block pr-6 font-display text-xl leading-tight text-slate-950">{item.title}</span>
                    <span className="mt-2 block text-[10px] leading-snug text-slate-600">{item.detail}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-6">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">2 · Avstånd</p>
              <h2 className="mt-1 font-display text-2xl">Välj avstånd</h2>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2.5">
              {DISTANCES.map((item) => {
                const selected = selectedDistances.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleDistance(item.id)}
                    className={`relative min-h-[92px] rounded-2xl border px-2 py-4 text-center transition-all active:scale-[0.98] ${selected ? selectedClass : glass}`}
                  >
                    {selected ? <SelectedCheck /> : null}
                    <span className="block font-display text-xl text-slate-950">{item.title}</span>
                    <span className="mt-1 block text-[10px] font-semibold text-slate-500">{item.range}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-6">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">3 · Session</p>
            <h2 className="mt-1 font-display text-2xl">Antal slag</h2>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {([5, 10, 20] as const).map((count) => {
                const selected = shotCount === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setShotCount(count)}
                    className={`relative rounded-2xl border py-5 text-center transition-all ${selected ? selectedClass : glass}`}
                  >
                    {selected ? <SelectedCheck /> : null}
                    <span className="font-display text-3xl leading-none text-slate-950">{count}</span>
                    <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">slag</span>
                  </button>
                );
              })}
            </div>
          </section>

          <button
            type="button"
            disabled={!setupValid}
            onClick={startTraining}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white shadow-sm disabled:opacity-30"
          >
            Starta träning <ChevronRight className="h-5 w-5" />
          </button>
        </>
      ) : null}

      {step === "play" && current ? (
        <>
          <section className="mt-5 rounded-[30px] border border-slate-300/80 bg-white/78 p-5 text-center shadow-[0_20px_46px_-32px_rgba(15,23,42,.42)] backdrop-blur-2xl">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Slag {shotIndex + 1} av {plan.length}</p>
            <div className="mx-auto mt-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-600">
              <Target className="h-5 w-5" />
            </div>
            <h1 className="mt-3 font-display text-4xl leading-none text-slate-950">{LIES.find((item) => item.id === current.lie)?.title}</h1>
            <p className="mt-2 font-display text-3xl text-blue-700">{current.target} m</p>
            <p className="mt-2 text-[11px] text-slate-600">Slå mot flaggan och registrera sedan var bollen stannade.</p>
          </section>

          <section className="mt-5">
            <div className="text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Registrering</p>
              <h2 className="mt-1 font-display text-2xl">Hur nära flaggan?</h2>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {ZONES.map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => registerZone(zone.id)}
                  className={`rounded-3xl border p-4 text-center transition-all active:scale-[0.98] ${glass}`}
                >
                  <span className="block font-display text-2xl text-slate-950">{zone.short}</span>
                  <span className="mt-1 block text-[10px] font-semibold text-slate-500">{zone.label}</span>
                </button>
              ))}
            </div>
          </section>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${((shotIndex + 1) / plan.length) * 100}%` }} />
          </div>
        </>
      ) : null}

      {step === "result" ? (
        <>
          <section className="mt-5 rounded-[30px] border border-slate-300/80 bg-white/80 p-5 text-center shadow-[0_20px_46px_-32px_rgba(15,23,42,.45)] backdrop-blur-2xl">
            <Trophy className="mx-auto h-6 w-6 text-amber-500" />
            <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Session klar</p>
            <h1 className="mt-2 font-display text-4xl leading-none text-slate-950">{within3}% inom 3 m</h1>
            <p className="mt-3 text-xs text-slate-600">{results.length} bunkerslag registrerade</p>
          </section>

          <section className="mt-5 grid grid-cols-2 gap-3">
            <div className={`rounded-3xl border p-4 ${glass}`}>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Bästa slag</p>
              <p className="mt-2 font-display text-2xl text-slate-950">{bestZone ? ZONES.find((zone) => zone.id === bestZone.zone)?.label : "–"}</p>
            </div>
            <div className={`rounded-3xl border p-4 ${glass}`}>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Variation</p>
              <p className="mt-2 font-display text-2xl text-slate-950">{new Set(results.map((result) => result.lie)).size} lies</p>
            </div>
          </section>

          <section className="mt-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Resultat</p>
                <h2 className="mt-1 font-display text-2xl">Zonfördelning</h2>
              </div>
              <span className="text-[10px] font-semibold text-slate-500">{results.length} slag</span>
            </div>
            <div className="mt-3 overflow-hidden rounded-3xl border border-slate-300/80 bg-white/70">
              {ZONES.map((zone) => {
                const count = results.filter((result) => result.zone === zone.id).length;
                const percent = results.length ? Math.round((count / results.length) * 100) : 0;
                return (
                  <div key={zone.id} className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 last:border-b-0">
                    <span className="w-16 font-display text-lg text-slate-900">{zone.short}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="w-14 text-right text-[10px] font-bold text-slate-600">{count} · {percent}%</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className={`mt-5 rounded-3xl border p-4 ${glass}`}>
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Session</p>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
              Lies: {selectedLies.map((id) => LIES.find((item) => item.id === id)?.title).join(", ")}. Avstånd: {selectedDistances.map((id) => DISTANCES.find((item) => item.id === id)?.range).join(", ")}.
            </p>
          </section>

          <button type="button" onClick={reset} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white">
            <RotateCcw className="h-5 w-5" /> Ny session
          </button>
        </>
      ) : null}
    </main>
  );
}
