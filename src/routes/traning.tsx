import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Dumbbell,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";

export const Route = createFileRoute("/traning")({
  head: () => ({
    meta: [
      { title: "Skapa eget träningstest | SG4" },
      {
        name: "description",
        content:
          "Bygg och genomför egna golftester för putting, närspel, approach eller off the tee och följ din utveckling över tid.",
      },
    ],
  }),
  component: TrainingPage,
});

type Category = "off-the-tee" | "approach" | "around-the-green" | "putting";
type Metric = "success" | "points" | "distance" | "strokes";
type Direction = "higher" | "lower";

type TestPart = {
  id: string;
  name: string;
  distance: string;
  attempts: number;
  instruction: string;
};

type AttemptResult = {
  partId: string;
  attempt: number;
  value: number;
};

type TestRun = {
  id: string;
  createdAt: string;
  score: number;
  attempts: AttemptResult[];
};

type CustomTrainingTest = {
  id: string;
  version: 2;
  name: string;
  description: string;
  category: Category;
  metric: Metric;
  direction: Direction;
  maxPoints?: number;
  parts: TestPart[];
  createdAt: string;
  results: TestRun[];
};

const CUSTOM_TESTS_KEY = "sg4-custom-training-tests-v2";

const CATEGORIES: Array<{ value: Category; title: string; description: string }> = [
  { value: "off-the-tee", title: "Off the tee", description: "Driver, fairway och shot shaping" },
  { value: "approach", title: "Approach", description: "Järn, wedges och targets" },
  { value: "around-the-green", title: "Around green", description: "Chip, pitch och bunker" },
  { value: "putting", title: "Putting", description: "Startlinje, längdkontroll och hålade puttar" },
];

const METRICS: Array<{ value: Metric; title: string; description: string }> = [
  { value: "success", title: "Lyckad / missad", description: "Ex. draw i rätt korridor eller hålad putt" },
  { value: "points", title: "Poäng", description: "Ex. 0–3 poäng per slag" },
  { value: "distance", title: "Avstånd från mål", description: "Ex. meter från flagga eller target" },
  { value: "strokes", title: "Antal slag", description: "Ex. up & down eller slutför en uppgift" },
];

function loadTests(): CustomTrainingTest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_TESTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistTests(tests: CustomTrainingTest[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CUSTOM_TESTS_KEY, JSON.stringify(tests));
}

function emptyPart(index: number): TestPart {
  return {
    id: crypto.randomUUID(),
    name: `Del ${index + 1}`,
    distance: "",
    attempts: 3,
    instruction: "",
  };
}

function scoreRun(test: CustomTrainingTest, attempts: AttemptResult[]) {
  const values = attempts.map((item) => item.value);
  if (values.length === 0) return 0;
  if (test.metric === "distance" || test.metric === "strokes") {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
  return values.reduce((sum, value) => sum + value, 0);
}

function scoreLabel(test: CustomTrainingTest, score: number) {
  if (test.metric === "success") {
    const total = test.parts.reduce((sum, part) => sum + part.attempts, 0);
    return `${Math.round(score)}/${total}`;
  }
  if (test.metric === "distance") return `${score.toFixed(1)} m`;
  if (test.metric === "strokes") return `${score.toFixed(1)} slag`;
  return `${score.toFixed(score % 1 === 0 ? 0 : 1)} p`;
}

function TrainingPage() {
  const [tests, setTests] = useState<CustomTrainingTest[]>([]);
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [metric, setMetric] = useState<Metric | null>(null);
  const [direction, setDirection] = useState<Direction>("higher");
  const [maxPoints, setMaxPoints] = useState("3");
  const [parts, setParts] = useState<TestPart[]>([emptyPart(0)]);
  const [saved, setSaved] = useState(false);

  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [partIndex, setPartIndex] = useState(0);
  const [attemptIndex, setAttemptIndex] = useState(0);
  const [runAttempts, setRunAttempts] = useState<AttemptResult[]>([]);
  const [numberInput, setNumberInput] = useState("");
  const [completedScore, setCompletedScore] = useState<number | null>(null);

  useEffect(() => {
    setTests(loadTests());
  }, []);

  const selectedCategory = CATEGORIES.find((item) => item.value === category);
  const selectedMetric = METRICS.find((item) => item.value === metric);
  const totalAttempts = useMemo(
    () => parts.reduce((sum, part) => sum + Math.max(0, Number(part.attempts) || 0), 0),
    [parts],
  );

  const activeTest = tests.find((test) => test.id === activeTestId) ?? null;
  const activePart = activeTest?.parts[partIndex] ?? null;
  const activeTotalAttempts = activeTest?.parts.reduce((sum, part) => sum + part.attempts, 0) ?? 0;
  const completedAttempts = runAttempts.length;

  const canContinue =
    (step === 1 && category !== null) ||
    (step === 2 && name.trim().length > 0) ||
    (step === 3 && parts.length > 0 && parts.every((part) => part.name.trim() && part.attempts > 0)) ||
    (step === 4 && metric !== null);

  function updatePart(id: string, patch: Partial<TestPart>) {
    setParts((current) => current.map((part) => (part.id === id ? { ...part, ...patch } : part)));
    setSaved(false);
  }

  function addPart() {
    setParts((current) => [...current, emptyPart(current.length)]);
    setSaved(false);
  }

  function removePart(id: string) {
    setParts((current) => (current.length === 1 ? current : current.filter((part) => part.id !== id)));
    setSaved(false);
  }

  function chooseMetric(nextMetric: Metric) {
    setMetric(nextMetric);
    setDirection(nextMetric === "distance" || nextMetric === "strokes" ? "lower" : "higher");
    setSaved(false);
  }

  function resetBuilder() {
    setStep(1);
    setCategory(null);
    setName("");
    setDescription("");
    setMetric(null);
    setDirection("higher");
    setMaxPoints("3");
    setParts([emptyPart(0)]);
    setSaved(false);
  }

  function createTest() {
    if (!category || !metric || !name.trim()) return;

    const test: CustomTrainingTest = {
      id: crypto.randomUUID(),
      version: 2,
      name: name.trim(),
      description: description.trim(),
      category,
      metric,
      direction,
      maxPoints: metric === "points" ? Math.max(1, Number(maxPoints) || 1) : undefined,
      parts: parts.map((part) => ({
        ...part,
        name: part.name.trim(),
        distance: part.distance.trim(),
        instruction: part.instruction.trim(),
        attempts: Math.max(1, Number(part.attempts) || 1),
      })),
      createdAt: new Date().toISOString(),
      results: [],
    };

    const next = [test, ...tests];
    setTests(next);
    persistTests(next);
    setSaved(true);
  }

  function deleteTest(id: string) {
    const next = tests.filter((test) => test.id !== id);
    setTests(next);
    persistTests(next);
  }

  function startTest(test: CustomTrainingTest) {
    setActiveTestId(test.id);
    setPartIndex(0);
    setAttemptIndex(0);
    setRunAttempts([]);
    setNumberInput("");
    setCompletedScore(null);
  }

  function closeRunner() {
    setActiveTestId(null);
    setCompletedScore(null);
    setRunAttempts([]);
    setNumberInput("");
  }

  function recordAttempt(value: number) {
    if (!activeTest || !activePart) return;

    const nextAttempts = [
      ...runAttempts,
      { partId: activePart.id, attempt: attemptIndex + 1, value },
    ];
    setRunAttempts(nextAttempts);
    setNumberInput("");

    const isLastAttemptInPart = attemptIndex + 1 >= activePart.attempts;
    const isLastPart = partIndex + 1 >= activeTest.parts.length;

    if (isLastAttemptInPart && isLastPart) {
      const score = scoreRun(activeTest, nextAttempts);
      const run: TestRun = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        score,
        attempts: nextAttempts,
      };
      const nextTests = tests.map((test) =>
        test.id === activeTest.id ? { ...test, results: [run, ...(test.results ?? [])] } : test,
      );
      setTests(nextTests);
      persistTests(nextTests);
      setCompletedScore(score);
      return;
    }

    if (isLastAttemptInPart) {
      setPartIndex((current) => current + 1);
      setAttemptIndex(0);
    } else {
      setAttemptIndex((current) => current + 1);
    }
  }

  function submitNumber() {
    if (!activeTest) return;
    const value = Number(numberInput);
    if (!Number.isFinite(value) || value < 0) return;
    if (activeTest.metric === "points" && value > (activeTest.maxPoints ?? 0)) return;
    recordAttempt(value);
  }

  if (activeTest && activePart) {
    const progress = activeTotalAttempts > 0 ? (completedAttempts / activeTotalAttempts) * 100 : 0;

    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-8">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={closeRunner}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border"
            aria-label="Avsluta test"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Eget test</p>
          <span className="w-10" />
        </div>

        {completedScore !== null ? (
          <section className="mt-16 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <p className="mt-4 text-xs uppercase tracking-[0.22em] text-muted-foreground">Klart</p>
            <h1 className="mt-2 font-display text-4xl leading-none">{activeTest.name}</h1>
            <p className="mt-8 font-display text-6xl leading-none text-primary">
              {scoreLabel(activeTest, completedScore)}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {activeTest.direction === "higher" ? "Högre är bättre" : "Lägre är bättre"}
            </p>

            <button
              type="button"
              onClick={() => startTest(activeTest)}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground"
            >
              <RotateCcw className="h-5 w-5" />
              Kör igen
            </button>
            <button
              type="button"
              onClick={closeRunner}
              className="mt-3 w-full rounded-2xl border border-border py-4 text-sm font-semibold"
            >
              Till mina tester
            </button>
          </section>
        ) : (
          <>
            <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-right text-xs text-muted-foreground">
              {completedAttempts + 1} av {activeTotalAttempts}
            </p>

            <section className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-glow)]">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Del {partIndex + 1} av {activeTest.parts.length}
              </p>
              <h1 className="mt-2 font-display text-4xl leading-none">{activePart.name}</h1>
              {activePart.distance ? (
                <p className="mt-2 text-sm font-semibold text-primary">{activePart.distance}</p>
              ) : null}
              {activePart.instruction ? (
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{activePart.instruction}</p>
              ) : null}

              <div className="mt-8 rounded-2xl bg-muted/50 p-4 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Försök</p>
                <p className="mt-1 font-display text-4xl leading-none">
                  {attemptIndex + 1} / {activePart.attempts}
                </p>
              </div>

              {activeTest.metric === "success" ? (
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => recordAttempt(0)}
                    className="rounded-2xl border border-border py-5 font-display text-xl"
                  >
                    Missad
                  </button>
                  <button
                    type="button"
                    onClick={() => recordAttempt(1)}
                    className="rounded-2xl bg-primary py-5 font-display text-xl text-primary-foreground"
                  >
                    Lyckad
                  </button>
                </div>
              ) : (
                <div className="mt-6">
                  <label className="block text-xs text-muted-foreground">
                    {activeTest.metric === "points"
                      ? `Poäng 0–${activeTest.maxPoints ?? 1}`
                      : activeTest.metric === "distance"
                        ? "Avstånd från mål (meter)"
                        : "Antal slag"}
                    <input
                      type="number"
                      min={0}
                      max={activeTest.metric === "points" ? activeTest.maxPoints : undefined}
                      step="any"
                      value={numberInput}
                      onChange={(e) => setNumberInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitNumber();
                      }}
                      autoFocus
                      className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-5 text-center font-display text-3xl text-foreground"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={submitNumber}
                    className="mt-3 w-full rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground"
                  >
                    Spara & nästa
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-10">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Träningstester</p>
        <h1 className="mt-2 flex items-center gap-2 font-display text-4xl leading-none">
          <Dumbbell className="h-7 w-7 text-primary" />
          Bygg eget test
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Bygg testet en gång. Sedan guidar SG4 dig genom varje del och varje slag.
        </p>
      </header>

      <div className="mt-6 flex gap-2" aria-label={`Steg ${step} av 5`}>
        {[1, 2, 3, 4, 5].map((item) => (
          <span
            key={item}
            className={`h-1.5 flex-1 rounded-full ${item <= step ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>

      <section className="mt-6 rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-glow)]">
        {step === 1 ? (
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Steg 1 av 5</p>
            <h2 className="mt-1 font-display text-3xl leading-none">Vad vill du testa?</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {CATEGORIES.map((item) => {
                const active = category === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setCategory(item.value);
                      setSaved(false);
                    }}
                    className={`rounded-2xl border p-3 text-left transition-colors ${
                      active ? "border-primary bg-primary/10" : "border-border bg-background"
                    }`}
                  >
                    <span className="block text-sm font-semibold">{item.title}</span>
                    <span className="mt-1 block text-xs leading-snug text-muted-foreground">{item.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Steg 2 av 5</p>
            <h2 className="mt-1 font-display text-3xl leading-none">Om testet</h2>
            <p className="mt-2 text-xs text-muted-foreground">{selectedCategory?.title}</p>
            <label className="mt-4 block text-xs text-muted-foreground">
              Testnamn
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSaved(false);
                }}
                placeholder="Ex. Shot Shaping 150 m"
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground"
                autoFocus
              />
            </label>
            <label className="mt-3 block text-xs text-muted-foreground">
              Beskrivning <span className="opacity-70">(valfritt)</span>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setSaved(false);
                }}
                rows={3}
                placeholder="Ex. Slå draw, straight och fade mot 150 m-målet."
                className="mt-1 w-full resize-none rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground"
              />
            </label>
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Steg 3 av 5</p>
            <h2 className="mt-1 font-display text-3xl leading-none">Testupplägg</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              En del kan vara en bollflykt, ett avstånd eller ett specifikt target.
            </p>
            <div className="mt-4 space-y-3">
              {parts.map((part, index) => (
                <div key={part.id} className="rounded-2xl border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Del {index + 1}</p>
                    {parts.length > 1 ? (
                      <button type="button" onClick={() => removePart(part.id)} aria-label={`Ta bort del ${index + 1}`} className="text-muted-foreground">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-2 grid grid-cols-[1fr_92px] gap-2">
                    <input value={part.name} onChange={(e) => updatePart(part.id, { name: e.target.value })} placeholder="Ex. Draw eller 6 ft" className="min-w-0 rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground" />
                    <input type="number" min={1} value={part.attempts} onChange={(e) => updatePart(part.id, { attempts: Number(e.target.value) })} aria-label="Antal slag" className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground" />
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">Namn på del · antal slag/försök</p>
                  <input value={part.distance} onChange={(e) => updatePart(part.id, { distance: e.target.value })} placeholder="Avstånd / target, ex. 150 m eller Green 4 (valfritt)" className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground" />
                  <input value={part.instruction} onChange={(e) => updatePart(part.id, { instruction: e.target.value })} placeholder="Instruktion för delen (valfritt)" className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground" />
                </div>
              ))}
            </div>
            <button type="button" onClick={addPart} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3 text-sm font-medium text-muted-foreground">
              <Plus className="h-4 w-4" /> Lägg till del
            </button>
            <p className="mt-3 text-xs text-muted-foreground">Totalt {totalAttempts} slag/försök</p>
          </div>
        ) : null}

        {step === 4 ? (
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Steg 4 av 5</p>
            <h2 className="mt-1 font-display text-3xl leading-none">Hur bedöms varje slag?</h2>
            <div className="mt-4 space-y-2">
              {METRICS.map((item) => {
                const active = metric === item.value;
                return (
                  <button key={item.value} type="button" onClick={() => chooseMetric(item.value)} className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition-colors ${active ? "border-primary bg-primary/10" : "border-border bg-background"}`}>
                    <span><span className="block text-sm font-semibold">{item.title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{item.description}</span></span>
                    {active ? <Check className="h-5 w-5 shrink-0 text-primary" /> : null}
                  </button>
                );
              })}
            </div>
            {metric === "points" ? (
              <label className="mt-4 block text-xs text-muted-foreground">Maxpoäng per slag
                <input type="number" min={1} value={maxPoints} onChange={(e) => setMaxPoints(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground" />
              </label>
            ) : null}
          </div>
        ) : null}

        {step === 5 ? (
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Steg 5 av 5</p>
            <h2 className="mt-1 font-display text-3xl leading-none">Hur räknas resultatet?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              SG4 sammanfattar automatiskt {selectedMetric?.title.toLowerCase()} över hela testet.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setDirection("higher")} className={`rounded-2xl border p-4 text-left ${direction === "higher" ? "border-primary bg-primary/10" : "border-border bg-background"}`}>
                <span className="block text-sm font-semibold">Högre är bättre ↑</span>
                <span className="mt-1 block text-xs text-muted-foreground">Poäng, träffar, hålade puttar</span>
              </button>
              <button type="button" onClick={() => setDirection("lower")} className={`rounded-2xl border p-4 text-left ${direction === "lower" ? "border-primary bg-primary/10" : "border-border bg-background"}`}>
                <span className="block text-sm font-semibold">Lägre är bättre ↓</span>
                <span className="mt-1 block text-xs text-muted-foreground">Proximity eller antal slag</span>
              </button>
            </div>
            <div className="mt-5 rounded-2xl border border-border bg-background p-4">
              <p className="font-display text-2xl leading-none">{name || "Ditt test"}</p>
              <p className="mt-2 text-xs text-muted-foreground">{selectedCategory?.title} · {parts.length} delar · {totalAttempts} försök</p>
              <p className="mt-1 text-xs text-muted-foreground">{selectedMetric?.title} · {direction === "higher" ? "högre är bättre" : "lägre är bättre"}</p>
            </div>
            <button type="button" onClick={createTest} className="mt-5 w-full rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground">Skapa test</button>
            {saved ? <p className="mt-3 text-center text-xs font-medium text-primary">Testet är sparat och klart att starta.</p> : null}
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1} className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm disabled:opacity-30">
            <ArrowLeft className="h-4 w-4" /> Tillbaka
          </button>
          {step < 5 ? (
            <button type="button" disabled={!canContinue} onClick={() => setStep((current) => Math.min(5, current + 1))} className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-30">
              Nästa <ArrowRight className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </section>

      {tests.length > 0 ? (
        <section className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Mina tester</p>
              <h2 className="mt-1 font-display text-3xl leading-none">Starta test</h2>
            </div>
            <button type="button" onClick={resetBuilder} className="text-xs font-semibold text-primary">Nytt test</button>
          </div>
          <div className="mt-4 space-y-3">
            {tests.map((test) => {
              const latest = test.results?.[0];
              return (
                <div key={test.id} className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-glow)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-2xl leading-none">{test.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{CATEGORIES.find((item) => item.value === test.category)?.title} · {test.parts.reduce((sum, part) => sum + part.attempts, 0)} försök</p>
                    </div>
                    <button type="button" onClick={() => deleteTest(test.id)} aria-label={`Ta bort ${test.name}`} className="text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  {latest ? <p className="mt-3 text-sm text-muted-foreground">Senast: <span className="font-semibold text-foreground">{scoreLabel(test, latest.score)}</span></p> : null}
                  <button type="button" onClick={() => startTest(test)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-display text-xl text-primary-foreground">
                    <Play className="h-5 w-5" /> Starta test
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <Link to="/tester" className="mt-8 inline-block rounded-full border border-border px-4 py-2 text-sm text-muted-foreground">Tillbaka till tester</Link>
    </main>
  );
}
