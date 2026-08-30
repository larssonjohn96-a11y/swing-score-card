import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Dumbbell, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/traning")({
  head: () => ({
    meta: [
      { title: "Skapa eget träningstest | SG4" },
      {
        name: "description",
        content:
          "Bygg ett eget golftest för putting, närspel, approach eller off the tee och följ din utveckling över tid.",
      },
      { property: "og:title", content: "Skapa eget träningstest | SG4" },
      {
        property: "og:description",
        content: "Bygg flexibla golftester för allt från Pelz putting till shot shaping och range-träning.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  results: [];
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

function persistTest(test: CustomTrainingTest) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(CUSTOM_TESTS_KEY);
    const current = raw ? JSON.parse(raw) : [];
    const tests = Array.isArray(current) ? current : [];
    window.localStorage.setItem(CUSTOM_TESTS_KEY, JSON.stringify([test, ...tests]));
  } catch {
    window.localStorage.setItem(CUSTOM_TESTS_KEY, JSON.stringify([test]));
  }
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

function TrainingPage() {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [metric, setMetric] = useState<Metric | null>(null);
  const [direction, setDirection] = useState<Direction>("higher");
  const [maxPoints, setMaxPoints] = useState("3");
  const [parts, setParts] = useState<TestPart[]>([emptyPart(0)]);
  const [saved, setSaved] = useState(false);

  const selectedCategory = CATEGORIES.find((item) => item.value === category);
  const selectedMetric = METRICS.find((item) => item.value === metric);
  const totalAttempts = useMemo(
    () => parts.reduce((sum, part) => sum + Math.max(0, Number(part.attempts) || 0), 0),
    [parts],
  );

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

    persistTest(test);
    setSaved(true);
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
          Bygg testet en gång. Sedan kan SG4 guida varje slag och följa din progress.
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
                    <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                      {item.description}
                    </span>
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
              Lägg upp testet i delar. En del kan vara en bollflykt, ett avstånd eller ett specifikt target.
            </p>

            <div className="mt-4 space-y-3">
              {parts.map((part, index) => (
                <div key={part.id} className="rounded-2xl border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Del {index + 1}
                    </p>
                    {parts.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removePart(part.id)}
                        aria-label={`Ta bort del ${index + 1}`}
                        className="text-muted-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-2 grid grid-cols-[1fr_92px] gap-2">
                    <input
                      value={part.name}
                      onChange={(e) => updatePart(part.id, { name: e.target.value })}
                      placeholder="Ex. Draw eller 6 ft"
                      className="min-w-0 rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground"
                    />
                    <input
                      type="number"
                      min={1}
                      value={part.attempts}
                      onChange={(e) => updatePart(part.id, { attempts: Number(e.target.value) })}
                      aria-label="Antal slag"
                      className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground"
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">Namn på del · antal slag/försök</p>

                  <input
                    value={part.distance}
                    onChange={(e) => updatePart(part.id, { distance: e.target.value })}
                    placeholder="Avstånd / target, ex. 150 m eller Green 4 (valfritt)"
                    className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground"
                  />

                  <input
                    value={part.instruction}
                    onChange={(e) => updatePart(part.id, { instruction: e.target.value })}
                    placeholder="Instruktion för delen (valfritt)"
                    className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground"
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addPart}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3 text-sm font-medium text-muted-foreground"
            >
              <Plus className="h-4 w-4" />
              Lägg till del
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
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => chooseMetric(item.value)}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition-colors ${
                      active ? "border-primary bg-primary/10" : "border-border bg-background"
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-semibold">{item.title}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{item.description}</span>
                    </span>
                    {active ? <Check className="h-5 w-5 shrink-0 text-primary" /> : null}
                  </button>
                );
              })}
            </div>

            {metric === "points" ? (
              <label className="mt-4 block text-xs text-muted-foreground">
                Maxpoäng per slag
                <input
                  type="number"
                  min={1}
                  value={maxPoints}
                  onChange={(e) => setMaxPoints(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground"
                />
              </label>
            ) : null}
          </div>
        ) : null}

        {step === 5 ? (
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Steg 5 av 5</p>
            <h2 className="mt-1 font-display text-3xl leading-none">Hur räknas resultatet?</h2>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDirection("higher");
                  setSaved(false);
                }}
                className={`rounded-2xl border p-3 text-left ${
                  direction === "higher" ? "border-primary bg-primary/10" : "border-border bg-background"
                }`}
              >
                <span className="block text-sm font-semibold">Högre är bättre ↑</span>
                <span className="mt-1 block text-xs text-muted-foreground">Poäng, träffar, hålade</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDirection("lower");
                  setSaved(false);
                }}
                className={`rounded-2xl border p-3 text-left ${
                  direction === "lower" ? "border-primary bg-primary/10" : "border-border bg-background"
                }`}
              >
                <span className="block text-sm font-semibold">Lägre är bättre ↓</span>
                <span className="mt-1 block text-xs text-muted-foreground">Avstånd, antal slag</span>
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-background p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Sammanfattning</p>
              <p className="mt-2 text-lg font-semibold">{name || "Ditt test"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedCategory?.title} · {parts.length} delar · {totalAttempts} slag · {selectedMetric?.title}
              </p>
              {description ? <p className="mt-2 text-xs text-muted-foreground">{description}</p> : null}
            </div>

            <button
              type="button"
              onClick={createTest}
              className="mt-4 w-full rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground"
            >
              Skapa test
            </button>

            {saved ? (
              <p className="mt-3 text-center text-sm font-medium text-primary">Testet är sparat.</p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex gap-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((current) => Math.max(1, current - 1))}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-semibold"
            >
              <ArrowLeft className="h-4 w-4" />
              Tillbaka
            </button>
          ) : null}

          {step < 5 ? (
            <button
              type="button"
              disabled={!canContinue}
              onClick={() => canContinue && setStep((current) => Math.min(5, current + 1))}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              Nästa
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </section>

      <Link
        to="/tester"
        className="mt-6 inline-block rounded-full border border-border px-4 py-2 text-sm text-muted-foreground"
      >
        Tillbaka till tester
      </Link>
    </main>
  );
}
