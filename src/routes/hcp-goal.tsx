import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, ChevronRight, Flag, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { computeStableCategoryHandicaps } from "@/lib/category-index";
import {
  CATEGORY_WEIGHTS,
  computeEstimatedHandicap,
  hcpLabel,
  isScoringCategory,
  loadRealHandicap,
  type CategoryHandicap,
  type CategorySlug,
} from "@/lib/sg-handicap";

export const Route = createFileRoute("/hcp-goal")({
  head: () => ({ meta: [{ title: "HCP Goal | SG4" }] }),
  component: HcpGoalPage,
});

type GoalState = {
  targetHcp: number;
  startHcp: number;
  startedAt: string;
};

type FocusItem = {
  slug: CategorySlug;
  label: string;
  detail: string;
  currentHcp: number;
  gap: number;
  priority: number;
};

const STORAGE_KEY = "sg4-hcp-goal-v1";
const SPEED_TO_RESULT: Partial<Record<CategorySlug, number>> = {
  puttning: 1.35,
  "around-the-green": 1.2,
  approach: 1,
  driving: 0.9,
};

function loadGoal(): GoalState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GoalState;
    if (!Number.isFinite(parsed.targetHcp) || !Number.isFinite(parsed.startHcp) || !parsed.startedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveGoal(goal: GoalState | null) {
  if (typeof window === "undefined") return;
  if (!goal) window.localStorage.removeItem(STORAGE_KEY);
  else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(goal));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function goalSizeLabel(gap: number) {
  if (gap <= 3) return "Realistiskt";
  if (gap <= 6) return "Utmanande";
  return "Ambitiöst";
}

function statusLabel(progress: number, baselineReady: boolean) {
  if (!baselineReady) return "Baseline byggs";
  if (progress >= 100) return "Uppnått";
  if (progress >= 75) return "Nära";
  return "På väg";
}

function focusCopy(slug: CategorySlug) {
  if (slug === "puttning") return { label: "Putting", detail: "Öka sänkprocenten från 1–3 m och minska 3-puttar på lag putting." };
  if (slug === "around-the-green") return { label: "Närspel & wedgar", detail: "Få fler slag nära hål och skapa enklare par-/bogeychanser runt green." };
  if (slug === "approach") return { label: "Inspel / järnspel", detail: "Träffa bättre inspel mot green och bygg en stabilare scoring-bas." };
  if (slug === "driving") return { label: "Driver / bollen i spel", detail: "Håll fler utslag i spel och minska kostsamma missar från tee." };
  return { label: "Spelområde", detail: "Förbättra den här delen för att närma dig målet." };
}

function buildFocus(cats: CategoryHandicap[], targetHcp: number): FocusItem[] {
  return cats
    .filter((cat) => isScoringCategory(cat.slug) && cat.handicap !== undefined && cat.count > 0)
    .map((cat) => {
      const gap = Math.max(0, cat.handicap! - targetHcp);
      const speed = SPEED_TO_RESULT[cat.slug] ?? 1;
      const weight = CATEGORY_WEIGHTS[cat.slug] || 0.1;
      const copy = focusCopy(cat.slug);
      return {
        slug: cat.slug,
        label: copy.label,
        detail: copy.detail,
        currentHcp: cat.handicap!,
        gap,
        priority: gap * weight * speed,
      };
    })
    .filter((item) => item.gap > 0.05)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);
}

function HcpGoalPage() {
  const [cats, setCats] = useState<CategoryHandicap[]>([]);
  const [currentHcp, setCurrentHcp] = useState<number | undefined>();
  const [goal, setGoal] = useState<GoalState | null>(() => loadGoal());
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);

  useEffect(() => {
    const real = loadRealHandicap();
    const nextCats = computeStableCategoryHandicaps(undefined, real ?? undefined);
    setCats(nextCats);
    setCurrentHcp(real ?? computeEstimatedHandicap(nextCats));
  }, []);

  const scoringCats = cats.filter((cat) => isScoringCategory(cat.slug));
  const testedCats = scoringCats.filter((cat) => cat.count > 0);
  const baselineReady = testedCats.length >= 3 && currentHcp !== undefined;
  const missingCats = scoringCats.filter((cat) => cat.count === 0);

  const targetOptions = useMemo(() => {
    if (currentHcp === undefined) return [];
    const gaps = [2, 4, 6, 8, 10];
    const options = gaps.map((gap) => round1(currentHcp - gap));
    if (currentHcp > 0 && currentHcp <= 10) options.push(0);
    return [...new Set(options)].filter((value) => value < currentHcp - 0.05).sort((a, b) => b - a);
  }, [currentHcp]);

  const activeProgress = useMemo(() => {
    if (!goal || currentHcp === undefined) return 0;
    const total = goal.startHcp - goal.targetHcp;
    if (total <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round(((goal.startHcp - currentHcp) / total) * 100)));
  }, [goal, currentHcp]);

  const focus = useMemo(() => goal ? buildFocus(cats, goal.targetHcp) : [], [cats, goal]);

  function activateGoal() {
    if (selectedTarget === null || currentHcp === undefined) return;
    const next = { targetHcp: selectedTarget, startHcp: currentHcp, startedAt: new Date().toISOString() };
    saveGoal(next);
    setGoal(next);
  }

  function clearGoal() {
    saveGoal(null);
    setGoal(null);
    setSelectedTarget(null);
  }

  if (currentHcp === undefined) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-7">
        <header className="flex items-center justify-between">
          <button type="button" onClick={() => history.back()} className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card" aria-label="Tillbaka"><ArrowLeft className="h-4 w-4" /></button>
          <div className="text-center"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">SG4 Goal</p><h1 className="font-display text-3xl">HCP Goal</h1></div>
          <span className="h-10 w-10" />
        </header>
        <div className="mt-10 rounded-3xl border border-border bg-card p-6 text-center">
          <Target className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-3 font-display text-2xl">Skapa din baseline först</h2>
          <p className="mt-2 text-sm text-muted-foreground">Ange officiellt HCP eller gör tester så SG4 vet vilken nivå du startar från.</p>
          <Link to="/tester" className="mt-5 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Gör ett test</Link>
        </div>
      </main>
    );
  }

  if (!goal) {
    const chosenGap = selectedTarget !== null ? currentHcp - selectedTarget : 0;
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-7">
        <header className="flex items-center justify-between">
          <button type="button" onClick={() => history.back()} className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card" aria-label="Tillbaka"><ArrowLeft className="h-4 w-4" /></button>
          <div className="text-center"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">SG4 Goal</p><h1 className="font-display text-3xl">HCP Goal</h1></div>
          <span className="h-10 w-10" />
        </header>

        <section className="mt-8 text-center">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-foreground text-background"><Target className="h-9 w-9" /></span>
          <h2 className="mt-4 font-display text-4xl">Sätt ditt mål</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">Ett aktivt mål i taget. Max 10 HCP-slag från din nuvarande nivå.</p>
        </section>

        <section className="mt-7 grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
          <div className="flex min-h-40 flex-col items-center justify-center rounded-3xl border border-blue-500/35 bg-blue-500/5 p-4 text-center">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">Din nivå</span>
            <span className="mt-3 font-display text-5xl text-blue-600">{hcpLabel(currentHcp)}</span>
            <span className="mt-1 text-xs font-semibold text-muted-foreground">HCP</span>
          </div>
          <span className="self-center rounded-xl bg-foreground px-2.5 py-2 font-display text-xl text-background">→</span>
          <div className="flex min-h-40 flex-col items-center justify-center rounded-3xl border border-red-500/35 bg-red-500/5 p-4 text-center">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-red-600">Ditt mål</span>
            <span className="mt-3 font-display text-5xl text-red-600">{selectedTarget === null ? "–" : hcpLabel(selectedTarget)}</span>
            <span className="mt-1 text-xs font-semibold text-muted-foreground">HCP</span>
          </div>
        </section>

        <div className="mt-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Välj målnivå</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {targetOptions.map((target) => {
              const active = selectedTarget === target;
              return <button key={target} type="button" onClick={() => setSelectedTarget(target)} className={`rounded-2xl border px-3 py-3 text-center font-display text-xl ${active ? "border-red-500 bg-red-500/10 text-red-600" : "border-border bg-card"}`}>{hcpLabel(target)}</button>;
            })}
          </div>
        </div>

        {selectedTarget !== null ? <div className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"><span className="text-sm font-semibold">{goalSizeLabel(chosenGap)} mål</span><span className="text-xs text-muted-foreground">{round1(chosenGap).toString().replace(".", ",")} HCP-slag</span></div> : null}

        {!baselineReady ? <div className="mt-4 rounded-2xl border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Baseline behöver mer data</p><p className="mt-1 text-xs leading-relaxed">Du kan sätta målet nu, men rekommendationerna blir bättre när minst 3 av 4 huvudkategorier har testdata.</p></div> : null}

        <button type="button" disabled={selectedTarget === null} onClick={activateGoal} className="mt-6 w-full rounded-2xl bg-foreground py-4 font-display text-xl text-background disabled:cursor-not-allowed disabled:opacity-30">Sätt mål</button>
      </main>
    );
  }

  const remaining = Math.max(0, round1(currentHcp - goal.targetHcp));
  const started = new Date(goal.startedAt).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-7">
      <header className="flex items-center justify-between">
        <button type="button" onClick={() => history.back()} className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card" aria-label="Tillbaka"><ArrowLeft className="h-4 w-4" /></button>
        <div className="text-center"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">SG4 Goal</p><h1 className="font-display text-3xl">HCP Goal</h1></div>
        <button type="button" onClick={clearGoal} className="text-xs font-semibold text-muted-foreground">Ändra</button>
      </header>

      <section className="mt-7 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch">
          <div className="bg-blue-500/10 px-4 py-5 text-center"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">Nu</p><p className="mt-1 font-display text-4xl text-blue-600">{hcpLabel(currentHcp)}</p></div>
          <div className="flex items-center bg-foreground px-3 font-display text-lg text-background">→</div>
          <div className="bg-red-500/10 px-4 py-5 text-center"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-red-600">Mål</p><p className="mt-1 font-display text-4xl text-red-600">{hcpLabel(goal.targetHcp)}</p></div>
        </div>
        <div className="p-5">
          <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{statusLabel(activeProgress, baselineReady)}</p><h2 className="mt-1 font-display text-3xl">{activeProgress}% mot mål</h2></div><span className="text-xs text-muted-foreground">{remaining.toString().replace(".", ",")} kvar</span></div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${activeProgress}%` }} /></div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground"><span>{goalSizeLabel(goal.startHcp - goal.targetHcp)} mål</span><span>Start {started}</span></div>
        </div>
      </section>

      {!baselineReady ? (
        <section className="mt-5 rounded-3xl border border-amber-300/60 bg-amber-50 p-5 text-amber-950">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em]">Baseline byggs</p>
          <h2 className="mt-1 font-display text-2xl">Gör fler tester först</h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-900">SG4 behöver mer testdata innan vi kan rangordna dina tre snabbaste vägar mot målet på ett pålitligt sätt.</p>
          <div className="mt-4 space-y-2">
            {missingCats.slice(0, 2).map((cat) => <Link key={cat.slug} to="/kategori/$slug" params={{ slug: cat.slug }} className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 text-sm font-semibold">Gör {cat.title}-test<ChevronRight className="h-4 w-4" /></Link>)}
          </div>
        </section>
      ) : (
        <section className="mt-6">
          <div className="flex items-end justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Prioriterat</p><h2 className="mt-1 font-display text-3xl">Dina 3 fokus</h2></div><span className="text-xs text-muted-foreground">Snabbast HCP-effekt</span></div>
          <div className="mt-3 space-y-3">
            {focus.length ? focus.map((item, index) => {
              const itemProgress = Math.max(0, Math.min(100, Math.round((1 - item.gap / Math.max(1, goal.startHcp - goal.targetHcp)) * 100)));
              return <div key={item.slug} className="rounded-3xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground font-display text-lg text-background">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h3 className="font-display text-2xl leading-none">{item.label}</h3><span className="text-xs font-semibold text-muted-foreground">HCP {hcpLabel(item.currentHcp)}</span></div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.detail}</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${itemProgress}%` }} /></div><div className="mt-2 flex justify-between text-[11px] text-muted-foreground"><span>{itemProgress}% mot delmål</span><span>Mål HCP {hcpLabel(goal.targetHcp)}</span></div></div></div>
              </div>;
            }) : <div className="rounded-3xl border border-border bg-card p-5 text-center"><Check className="mx-auto h-6 w-6 text-primary" /><p className="mt-2 font-semibold">Alla huvudområden är på målnivå.</p></div>}
          </div>
        </section>
      )}

      <section className="mt-6 rounded-3xl border border-border bg-muted/45 p-5">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background"><Flag className="h-5 w-5" /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Nästa steg</p><h2 className="font-display text-2xl">{baselineReady ? (focus[0] ? `Fokusera på ${focus[0].label}` : "Sätt nästa mål") : "Bygg klart din baseline"}</h2></div></div>
        <Link to={baselineReady && focus[0] ? "/tester" : "/tester"} className="mt-4 flex items-center justify-between rounded-2xl bg-card px-4 py-3 text-sm font-semibold">Öppna tester<ChevronRight className="h-4 w-4" /></Link>
      </section>
    </main>
  );
}
