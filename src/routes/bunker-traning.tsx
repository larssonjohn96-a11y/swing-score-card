import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight, RotateCcw, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { LIGHT_SURFACE } from "./8-bollar";

export const Route = createFileRoute("/bunker-traning")({
  head: () => ({ meta: [{ title: "Bunkerträning | SG4" }] }),
  component: BunkerTrainingPage,
});

type Mode = "standard" | "advanced";
type ScoringMethod = "green" | "closest";
type LieId = "normal" | "plugged" | "uphill" | "downhill" | "ball-above" | "ball-below";
type ZoneId = "holed" | "under-1" | "1-2" | "2-3" | "3-5" | "5-plus";
type GreenOutcome = "green" | "miss";
type Step = "setup" | "play" | "result";
type ShotPlan = { lie: LieId };
type ShotResult = ShotPlan & { zone?: ZoneId; outcome?: GreenOutcome };

const LIES: Array<{ id: LieId; title: string; detail: string }> = [
  { id: "normal", title: "Normal", detail: "Normal bunkerlie" },
  { id: "plugged", title: "Pluggad", detail: "Bollen sitter ner" },
  { id: "uphill", title: "Uppförsläge", detail: "Bollen ligger i uppförslut" },
  { id: "downhill", title: "Nedförsläge", detail: "Bollen ligger i nedförslut" },
  { id: "ball-above", title: "Bollen ovanför fötterna", detail: "Sidolutning upp mot dig" },
  { id: "ball-below", title: "Bollen under fötterna", detail: "Sidolutning bort från dig" },
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

function makeAdvancedPlan(lies: LieId[], count: number) {
  const plans: ShotPlan[] = [];
  let previous: LieId | null = null;
  for (let i = 0; i < count; i++) {
    let lie = pick(lies);
    let tries = 0;
    while (lie === previous && lies.length > 1 && tries < 10) {
      lie = pick(lies);
      tries++;
    }
    plans.push({ lie });
    previous = lie;
  }
  return plans;
}

function SelectedCheck() {
  return <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm"><Check className="h-3.5 w-3.5" /></span>;
}

function BunkerTrainingPage() {
  const [step, setStep] = useState<Step>("setup");
  const [mode, setMode] = useState<Mode>("standard");
  const [scoringMethod, setScoringMethod] = useState<ScoringMethod>("green");
  const [selectedLies, setSelectedLies] = useState<LieId[]>(["normal"]);
  const [shotCount, setShotCount] = useState<3 | 5 | 10>(3);
  const [plan, setPlan] = useState<ShotPlan[]>([]);
  const [results, setResults] = useState<ShotResult[]>([]);
  const [shotIndex, setShotIndex] = useState(0);

  const current = plan[shotIndex];
  const setupValid = mode === "standard" || selectedLies.length > 0;
  const effectiveScoring: ScoringMethod = mode === "standard" ? "green" : scoringMethod;

  const within3 = useMemo(() => {
    if (!results.length) return 0;
    const hits = results.filter((result) => result.zone && ZONES.find((zone) => zone.id === result.zone)?.within3).length;
    return Math.round((hits / results.length) * 100);
  }, [results]);

  const bestZone = useMemo(() => {
    const zoned = results.filter((result): result is ShotResult & { zone: ZoneId } => Boolean(result.zone));
    if (!zoned.length) return null;
    return zoned.reduce((best, result) => {
      const rank = ZONES.find((zone) => zone.id === result.zone)?.rank ?? 99;
      const bestRank = ZONES.find((zone) => zone.id === best.zone)?.rank ?? 99;
      return rank < bestRank ? result : best;
    });
  }, [results]);

  const greenHits = results.filter((result) => result.outcome === "green").length;
  const misses = results.filter((result) => result.outcome === "miss").length;
  const greenHitPct = results.length ? Math.round((greenHits / results.length) * 100) : 0;

  function toggleLie(id: LieId) {
    setSelectedLies((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  }

  function startTraining() {
    if (!setupValid) return;
    const nextPlan = mode === "standard"
      ? Array.from({ length: shotCount }, () => ({ lie: "normal" as LieId }))
      : makeAdvancedPlan(selectedLies, shotCount);
    setPlan(nextPlan);
    setResults([]);
    setShotIndex(0);
    setStep("play");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function finishOrAdvance(next: ShotResult[]) {
    setResults(next);
    if (shotIndex + 1 >= plan.length) {
      setStep("result");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setShotIndex((index) => index + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function registerZone(zone: ZoneId) {
    if (current) finishOrAdvance([...results, { ...current, zone }]);
  }

  function registerOutcome(outcome: GreenOutcome) {
    if (current) finishOrAdvance([...results, { ...current, outcome }]);
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
        <Link to="/traning" search={{ category: "around-the-green" }} aria-label="Tillbaka till Närspel" className={`inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white/70 ${glass}`}>
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
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Bunker</p>
            <h1 className="mt-2 font-display text-4xl leading-none text-slate-950">Bunkerträning</h1>
            <p className="mt-3 text-[13px] leading-relaxed text-slate-600">Välj enkel standardträning eller en avancerad session med olika lies och mer exakt bedömning.</p>
          </section>

          <section className="mt-6">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Träningsläge</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setMode("standard")} className={`relative rounded-3xl border p-4 text-left ${mode === "standard" ? selectedClass : glass}`}>
                {mode === "standard" ? <SelectedCheck /> : null}
                <span className="block font-display text-2xl">Standard</span>
                <span className="mt-2 block text-[10px] leading-snug text-slate-600">Snabb träning. Välj bara antal slag och träffa green.</span>
              </button>
              <button type="button" onClick={() => setMode("advanced")} className={`relative rounded-3xl border p-4 text-left ${mode === "advanced" ? selectedClass : glass}`}>
                {mode === "advanced" ? <SelectedCheck /> : null}
                <span className="block font-display text-2xl">Avancerad</span>
                <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.12em] text-blue-600">För erfarna spelare</span>
                <span className="mt-2 block text-[10px] leading-snug text-slate-600">Välj lies och scoringmetod.</span>
              </button>
            </div>
          </section>

          {mode === "advanced" ? (
            <>
              <section className="mt-6">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">1 · Lie</p>
                    <h2 className="mt-1 font-display text-2xl">Välj lägen</h2>
                  </div>
                  <button type="button" onClick={() => setSelectedLies(selectedLies.length === LIES.length ? [] : LIES.map((item) => item.id))} className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-600">
                    {selectedLies.length === LIES.length ? "Rensa alla" : "Välj alla"}
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {LIES.map((item) => {
                    const selected = selectedLies.includes(item.id);
                    return (
                      <button key={item.id} type="button" onClick={() => toggleLie(item.id)} className={`relative min-h-[104px] rounded-3xl border p-4 text-left transition-all active:scale-[0.99] ${selected ? selectedClass : glass}`}>
                        {selected ? <SelectedCheck /> : null}
                        <span className="block pr-6 font-display text-xl leading-tight text-slate-950">{item.title}</span>
                        <span className="mt-2 block text-[10px] leading-snug text-slate-600">{item.detail}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="mt-6">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">2 · Scoringmetod</p>
                <h2 className="mt-1 font-display text-2xl">Hur ska slagen bedömas?</h2>
                <div className="mt-3 space-y-3">
                  <button type="button" onClick={() => setScoringMethod("closest")} className={`relative w-full rounded-3xl border p-4 text-left ${scoringMethod === "closest" ? selectedClass : glass}`}>
                    {scoringMethod === "closest" ? <SelectedCheck /> : null}
                    <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-blue-600">Avancerad bedömning</span>
                    <span className="mt-1 block font-display text-xl">Closest to Pin</span>
                    <span className="mt-1 block text-[10px] text-slate-600">Bedöm hur nära flaggan bollen stannar.</span>
                  </button>
                  <button type="button" onClick={() => setScoringMethod("green")} className={`relative w-full rounded-3xl border p-4 text-left ${scoringMethod === "green" ? selectedClass : glass}`}>
                    {scoringMethod === "green" ? <SelectedCheck /> : null}
                    <span className="block font-display text-xl">Träffad green</span>
                    <span className="mt-1 block text-[10px] text-slate-600">På green eller miss / kom inte upp ur bunkern.</span>
                  </button>
                </div>
              </section>
            </>
          ) : null}

          <section className="mt-6">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">{mode === "standard" ? "Session" : "3 · Session"}</p>
            <h2 className="mt-1 font-display text-2xl">Antal slag</h2>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {([3, 5, 10] as const).map((count) => {
                const selected = shotCount === count;
                return (
                  <button key={count} type="button" onClick={() => setShotCount(count)} className={`relative rounded-2xl border py-5 text-center transition-all ${selected ? selectedClass : glass}`}>
                    {selected ? <SelectedCheck /> : null}
                    <span className="font-display text-3xl leading-none text-slate-950">{count}</span>
                    <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">slag</span>
                  </button>
                );
              })}
            </div>
          </section>

          <button type="button" disabled={!setupValid} onClick={startTraining} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white shadow-sm disabled:opacity-30">
            Starta träning <ChevronRight className="h-5 w-5" />
          </button>
        </>
      ) : null}

      {step === "play" && current ? (
        <>
          <section className="mt-5 rounded-[30px] border border-slate-300/80 bg-white/78 p-5 text-center shadow-[0_20px_46px_-32px_rgba(15,23,42,.42)] backdrop-blur-2xl">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Slag {shotIndex + 1} av {plan.length}</p>
            <h1 className="mt-3 font-display text-4xl leading-none text-slate-950">Bunkerslag {shotIndex + 1}</h1>
            {mode === "advanced" ? <p className="mt-2 font-display text-2xl text-blue-700">{LIES.find((item) => item.id === current.lie)?.title}</p> : null}
            <p className="mt-2 text-[11px] text-slate-600">{effectiveScoring === "closest" ? "Slå mot flaggan och registrera var bollen stannar." : "Slå mot green och registrera utfallet."}</p>
          </section>

          <section className="mt-5">
            <div className="text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Registrering</p>
              <h2 className="mt-1 font-display text-2xl">{effectiveScoring === "closest" ? "Hur nära flaggan?" : "Vad hände?"}</h2>
            </div>

            {effectiveScoring === "closest" ? (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {ZONES.map((zone) => (
                  <button key={zone.id} type="button" onClick={() => registerZone(zone.id)} className={`rounded-3xl border p-4 text-center transition-all active:scale-[0.98] ${glass}`}>
                    <span className="block font-display text-2xl text-slate-950">{zone.short}</span>
                    <span className="mt-1 block text-[10px] font-semibold text-slate-500">{zone.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => registerOutcome("green")} className="rounded-3xl border border-emerald-200/90 bg-emerald-50/85 p-4 text-center transition-all active:scale-[0.98] active:border-emerald-400 active:bg-emerald-200/90">
                  <span className="block font-display text-2xl text-emerald-900">På green</span>
                  <span className="mt-1 block text-[10px] text-emerald-800/75">Bollen stannade på green</span>
                </button>
                <button type="button" onClick={() => registerOutcome("miss")} className="rounded-3xl border border-rose-200/90 bg-rose-50/85 p-4 text-center transition-all active:scale-[0.98] active:border-rose-400 active:bg-rose-200/90">
                  <span className="block font-display text-xl leading-tight text-rose-900">Miss / kom inte upp ur bunkern</span>
                  <span className="mt-1 block text-[10px] text-rose-800/75">Alla övriga utfall</span>
                </button>
              </div>
            )}
          </section>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${((shotIndex + 1) / plan.length) * 100}%` }} />
          </div>
        </>
      ) : null}

      {step === "result" ? (
        <>
          {effectiveScoring === "closest" ? (
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
            </>
          ) : (
            <>
              <section className="mt-5 rounded-[30px] border border-slate-300/80 bg-white/80 p-5 text-center shadow-[0_20px_46px_-32px_rgba(15,23,42,.45)] backdrop-blur-2xl">
                <Trophy className="mx-auto h-6 w-6 text-amber-500" />
                <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Session klar</p>
                <h1 className="mt-2 font-display text-4xl leading-none text-slate-950">{greenHitPct}% green hit</h1>
                <p className="mt-3 text-xs text-slate-600">{results.length} bunkerslag registrerade</p>
              </section>
              <section className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-3xl border border-emerald-200/90 bg-emerald-50/85 p-4 text-center">
                  <p className="font-display text-3xl text-emerald-900">{greenHits}</p>
                  <p className="mt-1 text-[9px] font-bold uppercase leading-tight text-emerald-800/75">På green</p>
                </div>
                <div className="rounded-3xl border border-rose-200/90 bg-rose-50/85 p-4 text-center">
                  <p className="font-display text-3xl text-rose-900">{misses}</p>
                  <p className="mt-1 text-[9px] font-bold uppercase leading-tight text-rose-800/75">Miss / kom inte upp</p>
                </div>
              </section>
            </>
          )}

          {mode === "advanced" ? (
            <section className={`mt-5 rounded-3xl border p-4 ${glass}`}>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Session</p>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-600">Lies: {selectedLies.map((id) => LIES.find((item) => item.id === id)?.title).join(", ")}.</p>
            </section>
          ) : null}

          <button type="button" onClick={reset} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white">
            <RotateCcw className="h-5 w-5" /> Ny session
          </button>
        </>
      ) : null}
    </main>
  );
}
