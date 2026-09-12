import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Crosshair,
  MapPin,
  Monitor,
  Plus,
  Target,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LIGHT_SURFACE } from "./8-bollar";

export const Route = createFileRoute("/approach-pei-valj")({
  head: () => ({ meta: [{ title: "Approach Precision – Träningstest | SG4" }] }),
  component: PeiChoosePage,
});

const TESTS = [
  {
    to: "/approach-pei-wedge" as const,
    title: "Wedge Precision",
    range: "50–120 m",
    method: "PEI Wedge",
    description: "Mät hur nära målet du slår dina wedges över varierade avstånd.",
  },
  {
    to: "/approach-pei-iron" as const,
    title: "Iron Precision",
    range: "120–190 m",
    method: "PEI Iron",
    description: "Mät precisionen på dina järninspel över varierade avstånd.",
  },
  {
    to: "/approach-pei" as const,
    title: "Approach Precision",
    range: "50–220 m",
    method: "PEI Total",
    description: "Komplett precisionstest över hela ditt approachspel – från wedge till långa inspel.",
  },
];

type Step = "environment" | "range-select" | "range-mode" | "precision" | "range-targets" | "session";
type DistanceBand = "50–75 m" | "75–100 m" | "100–150 m" | "150–200+ m" | "Blandat";
type TargetKind = "flag" | "green" | "bunker" | "other";
type ShotScore = "close5" | "close10" | "outside" | "hit" | "miss";

type RangeTarget = {
  id: string;
  name: string;
  kind: TargetKind;
  band: Exclude<DistanceBand, "Blandat">;
};

type RangeProfile = {
  id: string;
  name: string;
  targets: RangeTarget[];
};

const DISTANCE_BANDS: DistanceBand[] = ["50–75 m", "75–100 m", "100–150 m", "150–200+ m", "Blandat"];
const TARGET_BANDS: Exclude<DistanceBand, "Blandat">[] = ["50–75 m", "75–100 m", "100–150 m", "150–200+ m"];
const RANGE_STORAGE_KEY = "sg4-approach-range-profiles-v1";
const DEFAULT_RANGES: RangeProfile[] = [{ id: "jonkopings-gk-range", name: "Jönköpings GK Range", targets: [] }];

function PeiChoosePage() {
  const glass = "border-slate-200/90 bg-white/72 shadow-[0_18px_48px_-34px_rgba(15,23,42,.38)] backdrop-blur-2xl";
  const introGlass = "border-slate-300/80 bg-white/82 shadow-[0_20px_48px_-32px_rgba(15,23,42,.42)] backdrop-blur-2xl";
  const cardGlass = "border-slate-200/95 bg-gradient-to-br from-slate-50/90 via-white/76 to-blue-50/55 shadow-[0_18px_44px_-32px_rgba(15,23,42,.34)] backdrop-blur-2xl";

  const [step, setStep] = useState<Step>("environment");
  const [precisionContext, setPrecisionContext] = useState("Simulator");
  const [ranges, setRanges] = useState<RangeProfile[]>(DEFAULT_RANGES);
  const [selectedRangeId, setSelectedRangeId] = useState(DEFAULT_RANGES[0].id);
  const [newRangeName, setNewRangeName] = useState("");
  const [shotCount, setShotCount] = useState<9 | 18>(9);
  const [distanceBand, setDistanceBand] = useState<DistanceBand>("100–150 m");
  const [targetName, setTargetName] = useState("");
  const [targetKind, setTargetKind] = useState<TargetKind>("flag");
  const [targetBand, setTargetBand] = useState<Exclude<DistanceBand, "Blandat">>("100–150 m");
  const [sessionTargets, setSessionTargets] = useState<RangeTarget[]>([]);
  const [scores, setScores] = useState<ShotScore[]>([]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(RANGE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as RangeProfile[];
        if (Array.isArray(parsed) && parsed.length) setRanges(parsed);
      }
    } catch {
      // Local range profiles are optional; the flow still works without persisted data.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(RANGE_STORAGE_KEY, JSON.stringify(ranges));
    } catch {
      // Ignore storage errors.
    }
  }, [ranges]);

  const selectedRange = useMemo(
    () => ranges.find((range) => range.id === selectedRangeId) ?? ranges[0],
    [ranges, selectedRangeId],
  );

  const eligibleTargets = useMemo(() => {
    if (!selectedRange) return [];
    if (distanceBand === "Blandat") return selectedRange.targets;
    return selectedRange.targets.filter((target) => target.band === distanceBand);
  }, [distanceBand, selectedRange]);

  const handleBack = () => {
    if (step === "range-select") setStep("environment");
    else if (step === "range-mode") setStep("range-select");
    else if (step === "precision") setStep(precisionContext === "Simulator" ? "environment" : "range-mode");
    else if (step === "range-targets") setStep("range-mode");
    else if (step === "session") setStep("range-targets");
  };

  const addRange = () => {
    const name = newRangeName.trim();
    if (!name) return;
    const id = `${Date.now()}-${name.toLowerCase().replace(/[^a-z0-9åäö]+/gi, "-")}`;
    const nextRange: RangeProfile = { id, name, targets: [] };
    setRanges((current) => [...current, nextRange]);
    setSelectedRangeId(id);
    setNewRangeName("");
    setStep("range-mode");
  };

  const addTarget = () => {
    const name = targetName.trim();
    if (!name || !selectedRange) return;
    const target: RangeTarget = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      kind: targetKind,
      band: targetBand,
    };
    setRanges((current) =>
      current.map((range) =>
        range.id === selectedRange.id ? { ...range, targets: [...range.targets, target] } : range,
      ),
    );
    setTargetName("");
  };

  const removeTarget = (targetId: string) => {
    if (!selectedRange) return;
    setRanges((current) =>
      current.map((range) =>
        range.id === selectedRange.id
          ? { ...range, targets: range.targets.filter((target) => target.id !== targetId) }
          : range,
      ),
    );
  };

  const startTargetSession = () => {
    if (!eligibleTargets.length) return;
    const targets = Array.from({ length: shotCount }, (_, index) => eligibleTargets[index % eligibleTargets.length]);
    setSessionTargets(targets);
    setScores([]);
    setStep("session");
  };

  const recordScore = (score: ShotScore) => {
    setScores((current) => [...current, score]);
  };

  const currentTarget = sessionTargets[scores.length];
  const sessionComplete = sessionTargets.length > 0 && scores.length >= sessionTargets.length;
  const close5 = scores.filter((score) => score === "close5").length;
  const within10 = scores.filter((score) => score === "close5" || score === "close10").length;
  const outside10 = scores.filter((score) => score === "outside").length;
  const hits = scores.filter((score) => score === "hit").length;
  const misses = scores.filter((score) => score === "miss").length;

  const PrecisionTests = () => (
    <>
      <section className={`mt-5 rounded-[30px] border p-5 ${introGlass}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Approach · {precisionContext}</p>
        <h1 className="mt-2 font-display text-4xl leading-none">Exakt precision</h1>
        <p className="mt-3 max-w-[32ch] text-[13px] leading-relaxed text-slate-600">
          Använd simulator, TrackMan Range eller liknande när du kan mäta exakt avstånd från målet.
        </p>
      </section>

      <div className="mb-2 mt-5 flex items-center justify-between">
        <h2 className="font-display text-2xl leading-none">Välj träning</h2>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">3 upplägg</span>
      </div>

      <div className="space-y-3">
        {TESTS.map((test, index) => (
          <Link key={test.to} to={test.to} className={`group flex items-center gap-4 rounded-3xl border p-4 transition-all active:scale-[0.99] ${cardGlass}`}>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-200/80 bg-blue-500/[0.09] text-blue-600">
              {index === 2 ? <Target className="h-5 w-5" /> : <Crosshair className="h-5 w-5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-display text-2xl leading-none">{test.title}</span>
                <span className="shrink-0 text-[11px] font-bold text-blue-600">{test.range}</span>
              </span>
              <span className="mt-1.5 block text-xs leading-relaxed text-slate-600">{test.description}</span>
              <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-600">{test.method}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-blue-500" />
          </Link>
        ))}
      </div>
    </>
  );

  return (
    <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-24 pt-6 text-foreground">
      <div className="flex items-center justify-between">
        {step === "environment" ? (
          <Link to="/traning" search={{ category: "approach" }} className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${glass}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        ) : (
          <button type="button" onClick={handleBack} className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${glass}`}>
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <Link to="/approach-pei-historik" className="inline-flex items-center gap-2 rounded-full border border-slate-400/70 bg-slate-200/75 px-3.5 py-2 text-xs font-semibold text-slate-700 backdrop-blur-xl">
          <BarChart3 className="h-4 w-4" />
          Analys & framsteg
        </Link>
      </div>

      {step === "environment" ? (
        <>
          <section className={`mt-5 rounded-[30px] border p-5 ${introGlass}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Approach · Träning</p>
            <h1 className="mt-2 font-display text-4xl leading-none">Var tränar du?</h1>
            <p className="mt-3 max-w-[32ch] text-[13px] leading-relaxed text-slate-600">SG4 anpassar träningen efter den utrustning och de mål du faktiskt har tillgång till.</p>
          </section>

          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={() => {
                setPrecisionContext("Simulator");
                setStep("precision");
              }}
              className={`group flex w-full items-center gap-4 rounded-3xl border p-4 text-left active:scale-[0.99] ${cardGlass}`}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-200/80 bg-blue-500/[0.09] text-blue-600"><Monitor className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-2xl leading-none">Simulator</span>
                <span className="mt-1.5 block text-xs leading-relaxed text-slate-600">Träna med exakt avstånd och mätdata i simulator.</span>
              </span>
              <ArrowRight className="h-4 w-4 text-blue-500" />
            </button>

            <button type="button" onClick={() => setStep("range-select")} className={`group flex w-full items-center gap-4 rounded-3xl border p-4 text-left active:scale-[0.99] ${cardGlass}`}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-200/80 bg-emerald-500/[0.08] text-emerald-700"><MapPin className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-2xl leading-none">Range</span>
                <span className="mt-1.5 block text-xs leading-relaxed text-slate-600">Välj din range och träna med eller utan Range-simulator.</span>
              </span>
              <ArrowRight className="h-4 w-4 text-emerald-600" />
            </button>
          </div>
        </>
      ) : null}

      {step === "range-select" ? (
        <>
          <section className={`mt-5 rounded-[30px] border p-5 ${introGlass}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Approach · Range</p>
            <h1 className="mt-2 font-display text-4xl leading-none">Välj range</h1>
            <p className="mt-3 text-[13px] leading-relaxed text-slate-600">En range behöver bara mappas en gång. Dina mål sparas på rangeprofilen.</p>
          </section>

          <div className="mt-5 space-y-3">
            {ranges.map((range) => (
              <button
                key={range.id}
                type="button"
                onClick={() => {
                  setSelectedRangeId(range.id);
                  setStep("range-mode");
                }}
                className={`flex w-full items-center gap-4 rounded-3xl border p-4 text-left ${cardGlass}`}
              >
                <MapPin className="h-5 w-5 shrink-0 text-emerald-700" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-950">{range.name}</span>
                  <span className="mt-1 block text-[11px] text-slate-600">{range.targets.length ? `${range.targets.length} sparade mål` : "Inga mål mappade ännu"}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-slate-500" />
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-3xl border border-slate-200/90 bg-white/70 p-4 backdrop-blur-2xl">
            <p className="text-xs font-semibold text-slate-900">Lägg till annan range</p>
            <div className="mt-3 flex gap-2">
              <input value={newRangeName} onChange={(event) => setNewRangeName(event.target.value)} placeholder="Namn på range" className="min-w-0 flex-1 rounded-2xl border border-slate-300 bg-white/80 px-3 py-3 text-sm outline-none" />
              <button type="button" onClick={addRange} className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white"><Plus className="h-5 w-5" /></button>
            </div>
          </div>
        </>
      ) : null}

      {step === "range-mode" && selectedRange ? (
        <>
          <section className={`mt-5 rounded-[30px] border p-5 ${introGlass}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{selectedRange.name}</p>
            <h1 className="mt-2 font-display text-4xl leading-none">Hur tränar du?</h1>
            <p className="mt-3 text-[13px] leading-relaxed text-slate-600">Välj om rangen ger exakt slagdata eller om du tränar mot de fysiska målen framför dig.</p>
          </section>

          <div className="mt-5 space-y-3">
            <button type="button" onClick={() => { setPrecisionContext(`${selectedRange.name} · Range-simulator`); setStep("precision"); }} className={`flex w-full items-center gap-4 rounded-3xl border p-4 text-left ${cardGlass}`}>
              <Monitor className="h-5 w-5 shrink-0 text-blue-600" />
              <span className="min-w-0 flex-1"><span className="block font-display text-2xl leading-none">Med Range-simulator</span><span className="mt-1.5 block text-xs text-slate-600">TrackMan Range, Toptracer eller liknande.</span></span>
              <ArrowRight className="h-4 w-4 text-blue-500" />
            </button>

            <button type="button" onClick={() => setStep("range-targets")} className={`flex w-full items-center gap-4 rounded-3xl border p-4 text-left ${cardGlass}`}>
              <Target className="h-5 w-5 shrink-0 text-emerald-700" />
              <span className="min-w-0 flex-1"><span className="block font-display text-2xl leading-none">Utan Range-simulator</span><span className="mt-1.5 block text-xs text-slate-600">Mot mål på rangen.</span></span>
              <ArrowRight className="h-4 w-4 text-emerald-600" />
            </button>
          </div>
        </>
      ) : null}

      {step === "precision" ? <PrecisionTests /> : null}

      {step === "range-targets" && selectedRange ? (
        <>
          <section className={`mt-5 rounded-[30px] border p-5 ${introGlass}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{selectedRange.name} · Mot mål</p>
            <h1 className="mt-2 font-display text-4xl leading-none">Bygg passet</h1>
            <p className="mt-3 text-[13px] leading-relaxed text-slate-600">Välj antal slag och avstånd. Resultatet registreras med enkel ögonmåtts-scoring.</p>
          </section>

          <section className="mt-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Antal slag</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[9, 18].map((count) => (
                <button key={count} type="button" onClick={() => setShotCount(count as 9 | 18)} className={`rounded-2xl border px-4 py-3 text-sm font-bold ${shotCount === count ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white/70 text-slate-700"}`}>{count} slag</button>
              ))}
            </div>
          </section>

          <section className="mt-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Avstånd</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {DISTANCE_BANDS.map((band) => (
                <button key={band} type="button" onClick={() => setDistanceBand(band)} className={`rounded-2xl border px-3 py-3 text-xs font-bold ${distanceBand === band ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white/70 text-slate-700"}`}>{band}</button>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-slate-200/90 bg-white/70 p-4 backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-sm font-semibold text-slate-950">Mål på rangen</p><p className="mt-1 text-[11px] text-slate-600">Lägg in flaggor, greener, bunkrar eller andra tydliga mål.</p></div>
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{selectedRange.targets.length} mål</span>
            </div>

            {selectedRange.targets.length ? (
              <div className="mt-3 space-y-2">
                {selectedRange.targets.map((target) => (
                  <div key={target.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-3 py-3">
                    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">{target.name}</span><span className="mt-0.5 block text-[10px] uppercase tracking-[0.12em] text-slate-500">{target.band} · {target.kind === "flag" ? "Flagga" : target.kind === "green" ? "Green" : target.kind === "bunker" ? "Bunker" : "Annat"}</span></span>
                    <button type="button" onClick={() => removeTarget(target.id)} className="text-xs font-semibold text-slate-400">Ta bort</button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-4 border-t border-slate-200 pt-4">
              <input value={targetName} onChange={(event) => setTargetName(event.target.value)} placeholder="T.ex. blå flagga" className="w-full rounded-2xl border border-slate-300 bg-white/90 px-3 py-3 text-sm outline-none" />
              <div className="mt-3 grid grid-cols-4 gap-2">
                {(["flag", "green", "bunker", "other"] as TargetKind[]).map((kind) => (
                  <button key={kind} type="button" onClick={() => setTargetKind(kind)} className={`rounded-xl border px-2 py-2 text-[10px] font-bold ${targetKind === kind ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"}`}>{kind === "flag" ? "Flagga" : kind === "green" ? "Green" : kind === "bunker" ? "Bunker" : "Annat"}</button>
                ))}
              </div>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Ungefärligt avstånd</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {TARGET_BANDS.map((band) => (
                  <button key={band} type="button" onClick={() => setTargetBand(band)} className={`rounded-xl border px-2 py-2 text-[10px] font-bold ${targetBand === band ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-600"}`}>{band}</button>
                ))}
              </div>
              <button type="button" onClick={addTarget} disabled={!targetName.trim()} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"><Plus className="h-4 w-4" /> Lägg till mål</button>
            </div>
          </section>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-white/65 p-4">
            <div className="flex items-center justify-between"><span className="text-sm font-semibold">Tillgängliga mål för passet</span><span className="text-sm font-bold">{eligibleTargets.length}</span></div>
            <p className="mt-1 text-[11px] text-slate-600">{distanceBand === "Blandat" ? "Alla sparade mål kan användas." : `Endast mål i ${distanceBand} används.`}</p>
          </div>

          <button type="button" onClick={startTargetSession} disabled={!eligibleTargets.length} className="mt-4 w-full rounded-2xl bg-blue-600 px-4 py-4 text-sm font-bold text-white shadow-lg shadow-blue-600/15 disabled:bg-slate-300 disabled:shadow-none">Starta {shotCount}-slagspass</button>
        </>
      ) : null}

      {step === "session" ? (
        <>
          <section className={`mt-5 rounded-[30px] border p-5 ${introGlass}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Approach · {selectedRange?.name}</p>
            <div className="mt-2 flex items-end justify-between"><h1 className="font-display text-4xl leading-none">{sessionComplete ? "Pass klart" : `Slag ${scores.length + 1}`}</h1><span className="text-sm font-bold text-slate-500">{scores.length}/{sessionTargets.length}</span></div>
          </section>

          {!sessionComplete && currentTarget ? (
            <div className="mt-5 rounded-[30px] border border-slate-200 bg-white/78 p-5 text-center shadow-[0_18px_44px_-32px_rgba(15,23,42,.34)] backdrop-blur-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{currentTarget.band}</p>
              <h2 className="mt-2 font-display text-4xl leading-none">{currentTarget.name}</h2>
              <p className="mt-3 text-xs text-slate-600">{currentTarget.kind === "green" || currentTarget.kind === "bunker" ? "Bedöm bara om målet träffades." : "Bedöm ungefär hur nära målet bollen stannade."}</p>

              {currentTarget.kind === "green" || currentTarget.kind === "bunker" ? (
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => recordScore("hit")} className="rounded-2xl bg-emerald-600 px-4 py-4 text-sm font-bold text-white">Träff</button>
                  <button type="button" onClick={() => recordScore("miss")} className="rounded-2xl bg-slate-200 px-4 py-4 text-sm font-bold text-slate-700">Miss</button>
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => recordScore("close5")} className="rounded-2xl bg-emerald-600 px-2 py-4 text-xs font-bold text-white">≤ 5 m</button>
                  <button type="button" onClick={() => recordScore("close10")} className="rounded-2xl bg-blue-600 px-2 py-4 text-xs font-bold text-white">5–10 m</button>
                  <button type="button" onClick={() => recordScore("outside")} className="rounded-2xl bg-slate-200 px-2 py-4 text-xs font-bold text-slate-700">&gt; 10 m</button>
                </div>
              )}
            </div>
          ) : null}

          {sessionComplete ? (
            <div className="mt-5 rounded-[30px] border border-slate-200 bg-white/78 p-5 backdrop-blur-2xl">
              <h2 className="font-display text-3xl leading-none">Sammanfattning</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-100 p-4"><span className="block text-2xl font-bold">{close5}</span><span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">inom 5 m</span></div>
                <div className="rounded-2xl bg-slate-100 p-4"><span className="block text-2xl font-bold">{within10}</span><span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">inom 10 m</span></div>
                <div className="rounded-2xl bg-slate-100 p-4"><span className="block text-2xl font-bold">{outside10}</span><span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">utanför 10 m</span></div>
                <div className="rounded-2xl bg-slate-100 p-4"><span className="block text-2xl font-bold">{hits}/{hits + misses || 0}</span><span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">målträffar</span></div>
              </div>
              <button type="button" onClick={() => { setScores([]); setStep("range-targets"); }} className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-4 text-sm font-bold text-white">Tillbaka till rangeupplägg</button>
            </div>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
