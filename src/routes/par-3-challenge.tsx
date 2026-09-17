import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, RotateCcw, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

export const Route = createFileRoute("/par-3-challenge")({
  head: () => ({ meta: [{ title: "Par 3 Challenge | SG4" }] }),
  component: Par3ChallengePage,
});

type Side = "left" | "right";
type Shot = { target: number; total: number; side: Side; lateral: number };

type SavedResult = {
  id: string;
  date: string;
  averageMiss: number;
  shots: Shot[];
};

const STORAGE_KEY = "sg4-par3-challenge-v1";
const TARGETS = [130, 140, 150, 160, 175, 185] as const;

function shuffledTargets() {
  const values = [...TARGETS];
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

function loadResults(): SavedResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function missDistance(target: number, total: number, lateral: number) {
  return Math.sqrt(Math.pow(total - target, 2) + Math.pow(lateral, 2));
}

function zoneFor(target: number) {
  if (target <= 140) return "Kort";
  if (target <= 165) return "Medium";
  return "Lång";
}

function Par3ChallengePage() {
  const [phase, setPhase] = useState<"intro" | "test" | "result">("intro");
  const [targets, setTargets] = useState<number[]>(() => shuffledTargets());
  const [index, setIndex] = useState(0);
  const [shots, setShots] = useState<Shot[]>([]);
  const [total, setTotal] = useState(150);
  const [side, setSide] = useState<Side>("right");
  const [lateral, setLateral] = useState(0);

  useHideBottomNav(phase === "test");

  const previous = loadResults();
  const best = previous.length ? Math.min(...previous.map((r) => r.averageMiss)) : null;
  const currentTarget = targets[index] ?? TARGETS[0];

  function start() {
    const nextTargets = shuffledTargets();
    setTargets(nextTargets);
    setIndex(0);
    setShots([]);
    setTotal(nextTargets[0]);
    setSide("right");
    setLateral(0);
    setPhase("test");
  }

  function goBack() {
    if (index === 0) {
      setPhase("intro");
      return;
    }
    const previousShot = shots[index - 1];
    setShots((current) => current.slice(0, -1));
    setIndex((current) => current - 1);
    if (previousShot) {
      setTotal(previousShot.total);
      setSide(previousShot.side);
      setLateral(previousShot.lateral);
    }
  }

  function register() {
    const shot: Shot = {
      target: currentTarget,
      total: Math.max(0, total),
      side,
      lateral: Math.max(0, lateral),
    };
    const next = [...shots, shot];
    if (index === targets.length - 1) {
      const avg = next.reduce((sum, item) => sum + missDistance(item.target, item.total, item.lateral), 0) / next.length;
      const record: SavedResult = {
        id: crypto.randomUUID?.() ?? `${Date.now()}`,
        date: new Date().toISOString(),
        averageMiss: avg,
        shots: next,
      };
      if (typeof window !== "undefined") {
        const all = [...loadResults(), record].slice(-50);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      }
      setShots(next);
      setPhase("result");
      return;
    }
    const nextIndex = index + 1;
    setShots(next);
    setIndex(nextIndex);
    setTotal(targets[nextIndex]);
    setSide("right");
    setLateral(0);
  }

  const averageMiss = useMemo(() => {
    if (!shots.length) return 0;
    return shots.reduce((sum, item) => sum + missDistance(item.target, item.total, item.lateral), 0) / shots.length;
  }, [shots]);

  const zoneStats = useMemo(() => {
    return ["Kort", "Medium", "Lång"].map((zone) => {
      const values = shots.filter((shot) => zoneFor(shot.target) === zone);
      const average = values.length
        ? values.reduce((sum, shot) => sum + missDistance(shot.target, shot.total, shot.lateral), 0) / values.length
        : 0;
      return { zone, average };
    });
  }, [shots]);

  if (phase === "intro") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-20 pt-8">
        <Link to="/standardiserade-tester" aria-label="Tillbaka" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card">
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <p className="mt-7 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Inspel · Standardiserat test</p>
        <h1 className="mt-2 font-display text-4xl leading-none">Par 3 Challenge</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          6 slag från vanliga par 3-distanser. Avstånden blandas varje gång så du måste kalibrera om inför varje slag.
        </p>

        <div className="mt-6 rounded-3xl border border-border bg-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Så fungerar det</p>
          <div className="mt-3 space-y-2 text-sm">
            <p>• Slå mot målet som visas.</p>
            <p>• Registrera bara total längd.</p>
            <p>• Ange vänster eller höger och sidled i meter.</p>
            <p>• Lägre genomsnittlig miss är bättre.</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Slag</p>
            <p className="mt-1 font-display text-3xl">6</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">PB · snittmiss</p>
            <p className="mt-1 font-display text-3xl">{best === null ? "–" : `${best.toFixed(1)} m`}</p>
          </div>
        </div>

        <button onClick={start} className="mt-6 w-full rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">
          Starta Par 3 Challenge
        </button>
      </main>
    );
  }

  if (phase === "test") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-10 pt-5">
        <div className="flex items-center justify-between">
          <button onClick={goBack} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card" aria-label="Tillbaka">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold">Slag {index + 1} av 6</span>
          <span className="w-10" />
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((index + 1) / 6) * 100}%` }} />
        </div>

        <section className="mt-6 rounded-3xl border border-border bg-card p-6 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Par 3 · {zoneFor(currentTarget)}</p>
          <p className="mt-2 font-display text-6xl leading-none">{currentTarget} m</p>
          <p className="mt-2 text-sm text-muted-foreground">Slå mot flaggan och registrera resultatet.</p>
        </section>

        <section className="mt-4 rounded-3xl border border-border bg-card p-5">
          <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Total längd</label>
          <div className="mt-2 flex items-center gap-3">
            <button type="button" onClick={() => setTotal((v) => Math.max(0, v - 1))} className="h-12 w-12 rounded-2xl border border-border text-xl font-bold">−</button>
            <div className="flex flex-1 items-baseline justify-center gap-1 rounded-2xl bg-muted/50 py-3">
              <input value={total} onChange={(e) => setTotal(Number(e.target.value) || 0)} inputMode="numeric" className="w-20 bg-transparent text-center font-display text-4xl outline-none" />
              <span className="text-sm text-muted-foreground">m</span>
            </div>
            <button type="button" onClick={() => setTotal((v) => v + 1)} className="h-12 w-12 rounded-2xl border border-border text-xl font-bold">+</button>
          </div>
        </section>

        <section className="mt-3 rounded-3xl border border-border bg-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Sidled</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setSide("left")} className={`rounded-2xl border py-3 text-sm font-semibold ${side === "left" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>Vänster</button>
            <button type="button" onClick={() => setSide("right")} className={`rounded-2xl border py-3 text-sm font-semibold ${side === "right" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>Höger</button>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button type="button" onClick={() => setLateral((v) => Math.max(0, v - 1))} className="h-12 w-12 rounded-2xl border border-border text-xl font-bold">−</button>
            <div className="flex flex-1 items-baseline justify-center gap-1 rounded-2xl bg-muted/50 py-3">
              <input value={lateral} onChange={(e) => setLateral(Math.max(0, Number(e.target.value) || 0))} inputMode="numeric" className="w-20 bg-transparent text-center font-display text-4xl outline-none" />
              <span className="text-sm text-muted-foreground">m</span>
            </div>
            <button type="button" onClick={() => setLateral((v) => v + 1)} className="h-12 w-12 rounded-2xl border border-border text-xl font-bold">+</button>
          </div>
        </section>

        <button onClick={register} className="mt-5 w-full rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">
          {index === 5 ? "Avsluta test" : "Nästa slag"}
        </button>
      </main>
    );
  }

  const isPb = best === null || averageMiss <= best;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-7">
      <div className="flex items-center gap-3">
        <Link to="/standardiserade-tester" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card" aria-label="Tillbaka">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold">Par 3 Challenge</h1>
          <p className="text-xs text-muted-foreground">6 slag · Resultat</p>
        </div>
      </div>

      <section className={`mt-5 rounded-3xl border p-6 text-center ${isPb ? "border-primary/30 bg-primary/[0.07]" : "border-border bg-card"}`}>
        {isPb ? <Trophy className="mx-auto h-5 w-5 text-primary" /> : null}
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Genomsnittlig miss</p>
        <p className="mt-2 font-display text-7xl leading-none">{averageMiss.toFixed(1)} m</p>
        <p className="mt-3 text-xs text-muted-foreground">{isPb ? "Personbästa" : `PB ${best?.toFixed(1)} m`}</p>
      </section>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {zoneStats.map((item) => (
          <div key={item.zone} className="rounded-2xl border border-border bg-card p-3 text-center">
            <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{item.zone}</p>
            <p className="mt-1 font-display text-2xl">{item.average.toFixed(1)} m</p>
          </div>
        ))}
      </div>

      <button onClick={start} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">
        <RotateCcw className="h-4 w-4" /> Kör igen
      </button>
    </main>
  );
}
