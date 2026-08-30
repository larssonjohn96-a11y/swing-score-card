import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

export const Route = createFileRoute("/traning")({
  head: () => ({
    meta: [
      { title: "Träningstester | SG4" },
      {
        name: "description",
        content:
          "Starta från en golfmall eller bygg ett eget test för putting, närspel, approach eller off the tee.",
      },
    ],
  }),
  component: TrainingPage,
});

type Category = "off-the-tee" | "approach" | "around-the-green" | "putting";
type Metric = "success" | "points" | "distance" | "strokes";
type Direction = "higher" | "lower";
type Structure = "single" | "distances" | "shapes" | "targets";

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

type TestTemplate = {
  id: string;
  category: Category;
  title: string;
  description: string;
  badge: string;
  metric: Metric;
  direction: Direction;
  maxPoints?: number;
  parts: Array<Omit<TestPart, "id">>;
};

const CUSTOM_TESTS_KEY = "sg4-custom-training-tests-v2";

const CATEGORIES: Array<{ value: Category; title: string; description: string }> = [
  { value: "off-the-tee", title: "Off the tee", description: "Driver, fairway och shot shaping" },
  { value: "approach", title: "Approach", description: "Järn, wedges och targets" },
  { value: "around-the-green", title: "Around green", description: "Chip, pitch och bunker" },
  { value: "putting", title: "Putting", description: "Startlinje, längdkontroll och hålade puttar" },
];

const METRICS: Array<{ value: Metric; title: string; description: string }> = [
  { value: "success", title: "Lyckad / missad", description: "Hålade puttar, träffad korridor eller rätt bollflykt" },
  { value: "points", title: "Poäng", description: "Ge varje slag ett värde, till exempel 0–3 poäng" },
  { value: "distance", title: "Avstånd från mål", description: "Registrera meter från flagga eller target" },
  { value: "strokes", title: "Antal slag", description: "Registrera hur många slag som krävs" },
];

const TEMPLATES: TestTemplate[] = [
  {
    id: "putt-369",
    category: "putting",
    title: "3–6–9 ft",
    description: "Tre puttar från tre avstånd. En enkel mall för hålade puttar.",
    badge: "9 puttar",
    metric: "success",
    direction: "higher",
    parts: [
      { name: "3 ft", distance: "3 ft", attempts: 3, instruction: "Håla tre puttar från 3 ft." },
      { name: "6 ft", distance: "6 ft", attempts: 3, instruction: "Håla tre puttar från 6 ft." },
      { name: "9 ft", distance: "9 ft", attempts: 3, instruction: "Håla tre puttar från 9 ft." },
    ],
  },
  {
    id: "putt-clock",
    category: "putting",
    title: "Around the clock",
    description: "Åtta positioner runt hålet. Markera varje putt som hålad eller missad.",
    badge: "8 puttar",
    metric: "success",
    direction: "higher",
    parts: Array.from({ length: 8 }, (_, index) => ({
      name: `Position ${index + 1}`,
      distance: "1.5 m",
      attempts: 1,
      instruction: "Putt från nästa position runt hålet.",
    })),
  },
  {
    id: "putt-speed",
    category: "putting",
    title: "Speed control",
    description: "Tre längder där du registrerar hur långt bollen stannar från målet.",
    badge: "9 puttar",
    metric: "distance",
    direction: "lower",
    parts: [
      { name: "Kort", distance: "6 m", attempts: 3, instruction: "Registrera avståndet från hålet efter varje putt." },
      { name: "Medium", distance: "9 m", attempts: 3, instruction: "Registrera avståndet från hålet efter varje putt." },
      { name: "Lång", distance: "12 m", attempts: 3, instruction: "Registrera avståndet från hålet efter varje putt." },
    ],
  },
  {
    id: "approach-wedge-ladder",
    category: "approach",
    title: "Wedge ladder",
    description: "Tre wedgeavstånd där du registrerar proximity till target.",
    badge: "9 slag",
    metric: "distance",
    direction: "lower",
    parts: [
      { name: "50 m", distance: "50 m", attempts: 3, instruction: "Registrera meter från target." },
      { name: "75 m", distance: "75 m", attempts: 3, instruction: "Registrera meter från target." },
      { name: "100 m", distance: "100 m", attempts: 3, instruction: "Registrera meter från target." },
    ],
  },
  {
    id: "approach-targets",
    category: "approach",
    title: "Range targets",
    description: "Byt mellan tre targets på rangen och registrera träffkvalitet.",
    badge: "9 slag",
    metric: "points",
    direction: "higher",
    maxPoints: 3,
    parts: [
      { name: "Target 1", distance: "Kort target", attempts: 3, instruction: "0–3 poäng per slag." },
      { name: "Target 2", distance: "Medium target", attempts: 3, instruction: "0–3 poäng per slag." },
      { name: "Target 3", distance: "Långt target", attempts: 3, instruction: "0–3 poäng per slag." },
    ],
  },
  {
    id: "approach-distance-ladder",
    category: "approach",
    title: "Distance ladder",
    description: "Öka avståndet successivt och mät precisionen mot varje mål.",
    badge: "12 slag",
    metric: "distance",
    direction: "lower",
    parts: [
      { name: "75 m", distance: "75 m", attempts: 3, instruction: "Registrera meter från target." },
      { name: "100 m", distance: "100 m", attempts: 3, instruction: "Registrera meter från target." },
      { name: "125 m", distance: "125 m", attempts: 3, instruction: "Registrera meter från target." },
      { name: "150 m", distance: "150 m", attempts: 3, instruction: "Registrera meter från target." },
    ],
  },
  {
    id: "green-up-down",
    category: "around-the-green",
    title: "Up & down",
    description: "Spela flera lägen och registrera hur många slag du behöver.",
    badge: "6 lägen",
    metric: "strokes",
    direction: "lower",
    parts: [
      { name: "Tight lie", distance: "", attempts: 2, instruction: "Spela bollen i hål och registrera antal slag." },
      { name: "Rough", distance: "", attempts: 2, instruction: "Spela bollen i hål och registrera antal slag." },
      { name: "Bunker", distance: "", attempts: 2, instruction: "Spela bollen i hål och registrera antal slag." },
    ],
  },
  {
    id: "green-landing",
    category: "around-the-green",
    title: "Landing spot",
    description: "Träffa en vald landningszon med chip eller pitch.",
    badge: "12 slag",
    metric: "success",
    direction: "higher",
    parts: [
      { name: "Chip", distance: "Kort", attempts: 6, instruction: "Markera lyckad när bollen landar i zonen." },
      { name: "Pitch", distance: "Medium", attempts: 6, instruction: "Markera lyckad när bollen landar i zonen." },
    ],
  },
  {
    id: "green-bunker",
    category: "around-the-green",
    title: "Bunker challenge",
    description: "Tre bunkerlägen där varje lyckat slag ger en träff.",
    badge: "9 slag",
    metric: "success",
    direction: "higher",
    parts: [
      { name: "Kort", distance: "Kort flagga", attempts: 3, instruction: "Lyckad = inom din definierade målzon." },
      { name: "Medium", distance: "Medium flagga", attempts: 3, instruction: "Lyckad = inom din definierade målzon." },
      { name: "Lång", distance: "Lång flagga", attempts: 3, instruction: "Lyckad = inom din definierade målzon." },
    ],
  },
  {
    id: "tee-shaping",
    category: "off-the-tee",
    title: "Shot shaping",
    description: "Draw, straight och fade med tre försök per bollflykt.",
    badge: "9 slag",
    metric: "success",
    direction: "higher",
    parts: [
      { name: "Draw", distance: "", attempts: 3, instruction: "Lyckad = bollen startar och kurvar enligt din draw-korridor." },
      { name: "Straight", distance: "", attempts: 3, instruction: "Lyckad = bollen håller din raka korridor." },
      { name: "Fade", distance: "", attempts: 3, instruction: "Lyckad = bollen startar och kurvar enligt din fade-korridor." },
    ],
  },
  {
    id: "tee-corridor",
    category: "off-the-tee",
    title: "Fairway corridor",
    description: "Tio drives där du markerar om bollen slutar i din korridor.",
    badge: "10 drives",
    metric: "success",
    direction: "higher",
    parts: [{ name: "Korridor", distance: "", attempts: 10, instruction: "Lyckad = bollen slutar inom vald korridor." }],
  },
  {
    id: "tee-points",
    category: "off-the-tee",
    title: "Driver accuracy",
    description: "Poängsätt varje drive utifrån hur bra den träffar din targetzon.",
    badge: "10 drives",
    metric: "points",
    direction: "higher",
    maxPoints: 3,
    parts: [{ name: "Driver", distance: "", attempts: 10, instruction: "0–3 poäng per drive." }],
  },
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

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toParts(parts: Array<Omit<TestPart, "id">>): TestPart[] {
  return parts.map((part) => ({ ...part, id: createId() }));
}

function emptyPart(index: number): TestPart {
  return { id: createId(), name: `Station ${index + 1}`, distance: "", attempts: 3, instruction: "" };
}

function scoreRun(test: CustomTrainingTest, attempts: AttemptResult[]) {
  const values = attempts.map((item) => item.value);
  if (!values.length) return 0;
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
  const [category, setCategory] = useState<Category | null>(null);
  const [screen, setScreen] = useState<"category" | "templates" | "preview" | "builder">("category");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const [builderStep, setBuilderStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [structure, setStructure] = useState<Structure | null>(null);
  const [metric, setMetric] = useState<Metric | null>(null);
  const [direction, setDirection] = useState<Direction>("higher");
  const [maxPoints, setMaxPoints] = useState("3");
  const [parts, setParts] = useState<TestPart[]>([emptyPart(0)]);

  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [partIndex, setPartIndex] = useState(0);
  const [attemptIndex, setAttemptIndex] = useState(0);
  const [runAttempts, setRunAttempts] = useState<AttemptResult[]>([]);
  const [numberInput, setNumberInput] = useState("");
  const [completedScore, setCompletedScore] = useState<number | null>(null);

  useEffect(() => setTests(loadTests()), []);

  const selectedTemplate = TEMPLATES.find((item) => item.id === selectedTemplateId) ?? null;
  const categoryTemplates = category ? TEMPLATES.filter((item) => item.category === category) : [];
  const selectedCategory = CATEGORIES.find((item) => item.value === category);
  const activeTest = tests.find((test) => test.id === activeTestId) ?? null;
  const activePart = activeTest?.parts[partIndex] ?? null;
  const totalBuilderAttempts = useMemo(
    () => parts.reduce((sum, part) => sum + Math.max(0, Number(part.attempts) || 0), 0),
    [parts],
  );
  const activeTotalAttempts = activeTest?.parts.reduce((sum, part) => sum + part.attempts, 0) ?? 0;

  function selectCategory(next: Category) {
    setCategory(next);
    setScreen("templates");
    setSelectedTemplateId(null);
  }

  function chooseTemplate(template: TestTemplate) {
    setSelectedTemplateId(template.id);
    setName(template.title);
    setDescription(template.description);
    setMetric(template.metric);
    setDirection(template.direction);
    setMaxPoints(String(template.maxPoints ?? 3));
    setParts(toParts(template.parts));
    setScreen("preview");
  }

  function startCustomBuilder() {
    setSelectedTemplateId(null);
    setName("");
    setDescription("");
    setStructure(null);
    setMetric(null);
    setDirection("higher");
    setMaxPoints("3");
    setParts([emptyPart(0)]);
    setBuilderStep(1);
    setScreen("builder");
  }

  function editTemplate() {
    setStructure(parts.length === 1 ? "single" : "targets");
    setBuilderStep(2);
    setScreen("builder");
  }

  function updatePart(id: string, patch: Partial<TestPart>) {
    setParts((current) => current.map((part) => (part.id === id ? { ...part, ...patch } : part)));
  }

  function addPart() {
    setParts((current) => [...current, emptyPart(current.length)]);
  }

  function removePart(id: string) {
    setParts((current) => (current.length === 1 ? current : current.filter((part) => part.id !== id)));
  }

  function applyStructure(next: Structure) {
    setStructure(next);
    if (next === "single") setParts([{ ...emptyPart(0), name: "Test" }]);
    if (next === "distances") {
      setParts([
        { ...emptyPart(0), name: "Kort", distance: "" },
        { ...emptyPart(1), name: "Medium", distance: "" },
        { ...emptyPart(2), name: "Lång", distance: "" },
      ]);
    }
    if (next === "shapes") {
      setParts([
        { ...emptyPart(0), name: "Draw" },
        { ...emptyPart(1), name: "Straight" },
        { ...emptyPart(2), name: "Fade" },
      ]);
    }
    if (next === "targets") {
      setParts([
        { ...emptyPart(0), name: "Target 1" },
        { ...emptyPart(1), name: "Target 2" },
        { ...emptyPart(2), name: "Target 3" },
      ]);
    }
  }

  function chooseMetric(next: Metric) {
    setMetric(next);
    setDirection(next === "distance" || next === "strokes" ? "lower" : "higher");
  }

  function materializeTest(): CustomTrainingTest | null {
    if (!category || !metric || !name.trim()) return null;
    return {
      id: createId(),
      version: 2,
      name: name.trim(),
      description: description.trim(),
      category,
      metric,
      direction,
      maxPoints: metric === "points" ? Math.max(1, Number(maxPoints) || 1) : undefined,
      parts: parts.map((part) => ({
        ...part,
        name: part.name.trim() || "Station",
        distance: part.distance.trim(),
        attempts: Math.max(1, Number(part.attempts) || 1),
        instruction: part.instruction.trim(),
      })),
      createdAt: new Date().toISOString(),
      results: [],
    };
  }

  function saveTest(startAfterSave = false) {
    const test = materializeTest();
    if (!test) return;
    const next = [test, ...tests];
    setTests(next);
    persistTests(next);
    if (startAfterSave) startTest(test, next);
    else {
      setScreen("category");
      setCategory(null);
    }
  }

  function deleteTest(id: string) {
    const next = tests.filter((test) => test.id !== id);
    setTests(next);
    persistTests(next);
  }

  function startTest(test: CustomTrainingTest, source = tests) {
    if (!source.find((item) => item.id === test.id)) {
      const next = [test, ...source];
      setTests(next);
      persistTests(next);
    }
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
    const nextAttempts = [...runAttempts, { partId: activePart.id, attempt: attemptIndex + 1, value }];
    setRunAttempts(nextAttempts);
    setNumberInput("");

    const lastInPart = attemptIndex + 1 >= activePart.attempts;
    const lastPart = partIndex + 1 >= activeTest.parts.length;
    if (lastInPart && lastPart) {
      const score = scoreRun(activeTest, nextAttempts);
      const run: TestRun = { id: createId(), createdAt: new Date().toISOString(), score, attempts: nextAttempts };
      const nextTests = tests.map((test) =>
        test.id === activeTest.id ? { ...test, results: [run, ...(test.results ?? [])] } : test,
      );
      setTests(nextTests);
      persistTests(nextTests);
      setCompletedScore(score);
      return;
    }
    if (lastInPart) {
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
    if (activeTest.metric === "points" && value > (activeTest.maxPoints ?? 1)) return;
    recordAttempt(value);
  }

  if (activeTest && activePart) {
    const progress = activeTotalAttempts ? (runAttempts.length / activeTotalAttempts) * 100 : 0;
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-8">
        <div className="flex items-center justify-between">
          <button type="button" onClick={closeRunner} className="flex h-10 w-10 items-center justify-center rounded-full border border-border" aria-label="Avsluta test">
            <X className="h-5 w-5" />
          </button>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{activeTest.name}</p>
          <span className="w-10" />
        </div>

        {completedScore !== null ? (
          <section className="mt-16 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <p className="mt-4 text-xs uppercase tracking-[0.22em] text-muted-foreground">Klart</p>
            <h1 className="mt-2 font-display text-4xl leading-none">{activeTest.name}</h1>
            <p className="mt-8 font-display text-6xl leading-none text-primary">{scoreLabel(activeTest, completedScore)}</p>
            <p className="mt-3 text-sm text-muted-foreground">{activeTest.direction === "higher" ? "Högre är bättre" : "Lägre är bättre"}</p>
            <button type="button" onClick={() => startTest(activeTest)} className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground">
              <RotateCcw className="h-5 w-5" /> Kör igen
            </button>
            <button type="button" onClick={closeRunner} className="mt-3 w-full rounded-2xl border border-border py-4 text-sm font-semibold">Till mina tester</button>
          </section>
        ) : (
          <>
            <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-right text-xs text-muted-foreground">{runAttempts.length + 1} av {activeTotalAttempts}</p>
            <section className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-glow)]">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Station {partIndex + 1} av {activeTest.parts.length}</p>
              <h1 className="mt-2 font-display text-4xl leading-none">{activePart.name}</h1>
              {activePart.distance ? <p className="mt-2 text-sm font-semibold text-primary">{activePart.distance}</p> : null}
              {activePart.instruction ? <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{activePart.instruction}</p> : null}
              <div className="mt-8 rounded-2xl bg-muted/50 p-4 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Försök</p>
                <p className="mt-1 font-display text-4xl leading-none">{attemptIndex + 1} / {activePart.attempts}</p>
              </div>

              {activeTest.metric === "success" ? (
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => recordAttempt(0)} className="rounded-2xl border border-border py-5 font-display text-xl">Missad</button>
                  <button type="button" onClick={() => recordAttempt(1)} className="rounded-2xl bg-primary py-5 font-display text-xl text-primary-foreground">Lyckad</button>
                </div>
              ) : (
                <div className="mt-6">
                  <label className="block text-xs text-muted-foreground">
                    {activeTest.metric === "points" ? `Poäng 0–${activeTest.maxPoints ?? 1}` : activeTest.metric === "distance" ? "Avstånd från mål (meter)" : "Antal slag"}
                    <input type="number" min={0} max={activeTest.metric === "points" ? activeTest.maxPoints : undefined} step="any" value={numberInput} onChange={(e) => setNumberInput(e.target.value)} className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-4 text-center font-display text-3xl" autoFocus />
                  </label>
                  <button type="button" onClick={submitNumber} className="mt-3 w-full rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground">Spara & nästa</button>
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
          <Dumbbell className="h-7 w-7 text-primary" /> Skapa test
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Välj en snabbmall eller bygg själv. SG4 hjälper dig hela vägen.</p>
      </header>

      {screen === "category" ? (
        <section className="mt-7">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Vad vill du träna?</p>
          <h2 className="mt-1 font-display text-3xl leading-none">Välj kategori</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {CATEGORIES.map((item) => (
              <button key={item.value} type="button" onClick={() => selectCategory(item.value)} className="rounded-3xl border border-border bg-card p-4 text-left shadow-[var(--shadow-glow)] transition-colors hover:border-primary">
                <span className="block font-display text-2xl leading-none">{item.title}</span>
                <span className="mt-2 block text-xs leading-snug text-muted-foreground">{item.description}</span>
                <ChevronRight className="mt-4 h-4 w-4 text-primary" />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {screen === "templates" && category ? (
        <section className="mt-7">
          <button type="button" onClick={() => setScreen("category")} className="flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Kategorier</button>
          <p className="mt-5 text-xs uppercase tracking-[0.2em] text-primary">{selectedCategory?.title}</p>
          <h2 className="mt-1 font-display text-3xl leading-none">Välj ett upplägg</h2>
          <p className="mt-2 text-sm text-muted-foreground">Snabbmallarna är redan uppsatta. Du kan starta direkt eller anpassa dem.</p>
          <div className="mt-4 space-y-3">
            {categoryTemplates.map((template) => (
              <button key={template.id} type="button" onClick={() => chooseTemplate(template)} className="flex w-full items-center gap-4 rounded-3xl border border-border bg-card p-4 text-left shadow-[var(--shadow-glow)] transition-colors hover:border-primary">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Sparkles className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-2xl leading-none">{template.title}</span>
                  <span className="mt-1 block text-xs leading-snug text-muted-foreground">{template.description}</span>
                  <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{template.badge}</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </button>
            ))}
            <button type="button" onClick={startCustomBuilder} className="flex w-full items-center gap-4 rounded-3xl border border-dashed border-border p-4 text-left">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"><Plus className="h-5 w-5" /></span>
              <span><span className="block text-sm font-semibold">Bygg själv</span><span className="mt-1 block text-xs text-muted-foreground">SG4 guidar dig en fråga i taget.</span></span>
            </button>
          </div>
        </section>
      ) : null}

      {screen === "preview" && selectedTemplate && category ? (
        <section className="mt-7">
          <button type="button" onClick={() => setScreen("templates")} className="flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Mallar</button>
          <div className="mt-5 rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-glow)]">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Redo att köra</p>
            <h2 className="mt-2 font-display text-4xl leading-none">{name}</h2>
            <p className="mt-3 text-sm text-muted-foreground">{description}</p>
            <div className="mt-5 space-y-2">
              {parts.map((part) => (
                <div key={part.id} className="flex items-center justify-between gap-3 rounded-2xl bg-muted/50 p-3">
                  <div><p className="text-sm font-semibold">{part.name}</p>{part.distance ? <p className="text-xs text-muted-foreground">{part.distance}</p> : null}</div>
                  <p className="text-xs font-semibold text-muted-foreground">{part.attempts} försök</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{parts.reduce((sum, part) => sum + part.attempts, 0)} försök totalt · {METRICS.find((item) => item.value === metric)?.title}</p>
            <button type="button" onClick={() => saveTest(true)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground"><Play className="h-5 w-5" /> Starta test</button>
            <button type="button" onClick={editTemplate} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-4 text-sm font-semibold"><Pencil className="h-4 w-4" /> Anpassa</button>
          </div>
        </section>
      ) : null}

      {screen === "builder" && category ? (
        <section className="mt-7">
          <button type="button" onClick={() => setScreen("templates")} className="flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Mallar</button>
          <div className="mt-5 flex gap-2" aria-label={`Steg ${builderStep} av 5`}>
            {[1, 2, 3, 4, 5].map((item) => <span key={item} className={`h-1.5 flex-1 rounded-full ${item <= builderStep ? "bg-primary" : "bg-muted"}`} />)}
          </div>
          <div className="mt-5 rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-glow)]">
            {builderStep === 1 ? (
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">1 av 5</p>
                <h2 className="mt-1 font-display text-3xl leading-none">Vad heter testet?</h2>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Shot shaping 150 m" className="mt-5 w-full rounded-2xl border border-border bg-background px-4 py-4 text-sm" autoFocus />
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Kort beskrivning (valfritt)" className="mt-3 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm" />
              </div>
            ) : null}

            {builderStep === 2 ? (
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">2 av 5</p>
                <h2 className="mt-1 font-display text-3xl leading-none">Hur är testet uppbyggt?</h2>
                <div className="mt-4 space-y-2">
                  {([
                    ["single", "Ett moment", "Samma uppgift upprepas flera gånger"],
                    ["distances", "Flera avstånd", "Ex. 3 ft, 6 ft och 9 ft"],
                    ["shapes", "Flera slagtyper", "Ex. draw, straight och fade"],
                    ["targets", "Flera targets", "Ex. olika greener eller mål på rangen"],
                  ] as Array<[Structure, string, string]>).map(([value, title, helper]) => (
                    <button key={value} type="button" onClick={() => applyStructure(value)} className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left ${structure === value ? "border-primary bg-primary/10" : "border-border bg-background"}`}>
                      <span><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs text-muted-foreground">{helper}</span></span>{structure === value ? <Check className="h-5 w-5 text-primary" /> : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {builderStep === 3 ? (
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">3 av 5</p>
                <h2 className="mt-1 font-display text-3xl leading-none">Sätt upp stationerna</h2>
                <p className="mt-2 text-sm text-muted-foreground">Ge varje station ett namn och antal försök. Avstånd/target är valfritt.</p>
                <div className="mt-4 space-y-3">
                  {parts.map((part, index) => (
                    <div key={part.id} className="rounded-2xl border border-border bg-background p-3">
                      <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Station {index + 1}</p>{parts.length > 1 ? <button type="button" onClick={() => removePart(part.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></button> : null}</div>
                      <input value={part.name} onChange={(e) => updatePart(part.id, { name: e.target.value })} placeholder="Namn" className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-3 text-sm" />
                      <div className="mt-2 grid grid-cols-[1fr_90px] gap-2">
                        <input value={part.distance} onChange={(e) => updatePart(part.id, { distance: e.target.value })} placeholder="Avstånd / target" className="rounded-xl border border-border bg-card px-3 py-3 text-sm" />
                        <input type="number" min={1} value={part.attempts} onChange={(e) => updatePart(part.id, { attempts: Math.max(1, Number(e.target.value) || 1) })} className="rounded-xl border border-border bg-card px-3 py-3 text-sm" />
                      </div>
                      <input value={part.instruction} onChange={(e) => updatePart(part.id, { instruction: e.target.value })} placeholder="Instruktion (valfritt)" className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-3 text-sm" />
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addPart} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3 text-sm text-muted-foreground"><Plus className="h-4 w-4" /> Lägg till station</button>
                <p className="mt-3 text-xs text-muted-foreground">{totalBuilderAttempts} försök totalt</p>
              </div>
            ) : null}

            {builderStep === 4 ? (
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">4 av 5</p>
                <h2 className="mt-1 font-display text-3xl leading-none">Vad registrerar du?</h2>
                <div className="mt-4 space-y-2">
                  {METRICS.map((item) => (
                    <button key={item.value} type="button" onClick={() => chooseMetric(item.value)} className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left ${metric === item.value ? "border-primary bg-primary/10" : "border-border bg-background"}`}>
                      <span><span className="block text-sm font-semibold">{item.title}</span><span className="mt-1 block text-xs text-muted-foreground">{item.description}</span></span>{metric === item.value ? <Check className="h-5 w-5 text-primary" /> : null}
                    </button>
                  ))}
                </div>
                {metric === "points" ? <label className="mt-4 block text-xs text-muted-foreground">Maxpoäng per försök<input type="number" min={1} value={maxPoints} onChange={(e) => setMaxPoints(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm" /></label> : null}
              </div>
            ) : null}

            {builderStep === 5 ? (
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">5 av 5</p>
                <h2 className="mt-1 font-display text-3xl leading-none">Redo?</h2>
                <p className="mt-2 text-sm text-muted-foreground">SG4 räknar resultatet automatiskt utifrån vad du registrerar.</p>
                <div className="mt-4 space-y-2 rounded-2xl bg-muted/50 p-4 text-sm">
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Test</span><span className="font-semibold text-right">{name}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Stationer</span><span className="font-semibold">{parts.length}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Försök</span><span className="font-semibold">{totalBuilderAttempts}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Registrera</span><span className="font-semibold">{METRICS.find((item) => item.value === metric)?.title ?? "–"}</span></div>
                </div>
                <button type="button" onClick={() => saveTest(true)} disabled={!metric || !name.trim()} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground disabled:opacity-40"><Play className="h-5 w-5" /> Skapa & starta</button>
                <button type="button" onClick={() => saveTest(false)} disabled={!metric || !name.trim()} className="mt-3 w-full rounded-2xl border border-border py-4 text-sm font-semibold disabled:opacity-40">Spara till senare</button>
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex gap-3">
            {builderStep > 1 ? <button type="button" onClick={() => setBuilderStep((current) => current - 1)} className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-semibold"><ArrowLeft className="h-4 w-4" /> Tillbaka</button> : null}
            {builderStep < 5 ? <button type="button" disabled={(builderStep === 1 && !name.trim()) || (builderStep === 2 && !structure) || (builderStep === 3 && !parts.length) || (builderStep === 4 && !metric)} onClick={() => setBuilderStep((current) => current + 1)} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40">Nästa <ArrowRight className="h-4 w-4" /></button> : null}
          </div>
        </section>
      ) : null}

      {tests.length > 0 && screen === "category" ? (
        <section className="mt-10">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Mina tester</p>
          <div className="mt-3 space-y-3">
            {tests.map((test) => {
              const latest = test.results?.[0];
              return (
                <div key={test.id} className="rounded-3xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><h3 className="font-display text-2xl leading-none">{test.name}</h3><p className="mt-1 text-xs text-muted-foreground">{CATEGORIES.find((item) => item.value === test.category)?.title} · {test.parts.reduce((sum, part) => sum + part.attempts, 0)} försök</p>{latest ? <p className="mt-2 text-sm font-semibold text-primary">Senast: {scoreLabel(test, latest.score)}</p> : null}</div>
                    <button type="button" onClick={() => deleteTest(test.id)} aria-label={`Ta bort ${test.name}`}><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
                  </div>
                  <button type="button" onClick={() => startTest(test)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-semibold text-primary-foreground"><Play className="h-4 w-4" /> Starta test</button>
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
