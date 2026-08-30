import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Dumbbell } from "lucide-react";

import { TRAINING_PLAN } from "@/lib/coaching";

export const Route = createFileRoute("/traning")({
  head: () => ({
    meta: [
      { title: "Skapa eget träningstest | SG4" },
      {
        name: "description",
        content: "Bygg ett eget träningstest i SG4 och välj hur resultatet ska mätas.",
      },
      { property: "og:title", content: "Skapa eget träningstest | SG4" },
      {
        property: "og:description",
        content: "Skapa ett eget test för att följa din golfträning över tid.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrainingPage,
});

type TrainingMetric = "attempts" | "points" | "percent";

type TrainingTest = {
  id: string;
  name: string;
  category: string;
  metric: TrainingMetric;
  max: number;
  results: [];
};

const CUSTOM_TESTS_KEY = "sg4-custom-training-tests-v1";

function loadCustomTests(): TrainingTest[] {
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

function persistCustomTests(tests: TrainingTest[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CUSTOM_TESTS_KEY, JSON.stringify(tests));
}

function TrainingPage() {
  const [customTests, setCustomTests] = useState<TrainingTest[]>([]);
  const [testName, setTestName] = useState("");
  const [testCategory, setTestCategory] = useState(TRAINING_PLAN[0].slug);
  const [testMetric, setTestMetric] = useState<TrainingMetric>("attempts");
  const [testMax, setTestMax] = useState("8");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setCustomTests(loadCustomTests());
  }, []);

  const createCustomTest = (e: React.FormEvent) => {
    e.preventDefault();
    const name = testName.trim();
    const max = testMetric === "percent" ? 100 : Number(testMax);
    if (!name || !Number.isFinite(max) || max <= 0) return;

    const next: TrainingTest[] = [
      {
        id: crypto.randomUUID(),
        name,
        category: testCategory,
        metric: testMetric,
        max,
        results: [],
      },
      ...customTests,
    ];

    setCustomTests(next);
    persistCustomTests(next);
    setTestName("");
    setTestMetric("attempts");
    setTestMax("8");
    setSaved(true);
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-10">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Träningstester</p>
        <h1 className="mt-2 flex items-center gap-2 font-display text-4xl leading-none">
          <Dumbbell className="h-7 w-7 text-primary" />
          Skapa eget test
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Bygg ett test för något du själv vill följa över tid. Resultatet påverkar inte ditt HCP.
        </p>
      </header>

      <form
        onSubmit={createCustomTest}
        className="mt-6 space-y-4 rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-glow)]"
      >
        <label className="block text-xs text-muted-foreground">
          Testnamn
          <input
            value={testName}
            onChange={(e) => {
              setTestName(e.target.value);
              setSaved(false);
            }}
            placeholder="Ex. 8-bolls putt"
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground"
            autoFocus
          />
        </label>

        <label className="block text-xs text-muted-foreground">
          Område
          <select
            value={testCategory}
            onChange={(e) => {
              setTestCategory(e.target.value);
              setSaved(false);
            }}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground"
          >
            {TRAINING_PLAN.map((plan) => (
              <option key={plan.slug} value={plan.slug}>
                {plan.title}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs text-muted-foreground">
          Mät resultat som
          <select
            value={testMetric}
            onChange={(e) => {
              const metric = e.target.value as TrainingMetric;
              setTestMetric(metric);
              setSaved(false);
              if (metric === "percent") setTestMax("100");
            }}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground"
          >
            <option value="attempts">X av Y</option>
            <option value="points">Poäng</option>
            <option value="percent">Procent</option>
          </select>
        </label>

        {testMetric !== "percent" ? (
          <label className="block text-xs text-muted-foreground">
            Maxresultat
            <input
              type="number"
              min={1}
              value={testMax}
              onChange={(e) => {
                setTestMax(e.target.value);
                setSaved(false);
              }}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground"
            />
          </label>
        ) : null}

        <button
          type="submit"
          className="w-full rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground"
        >
          Skapa test
        </button>

        {saved ? (
          <p className="text-center text-xs font-medium text-primary">
            Testet är sparat.
          </p>
        ) : null}
      </form>

      <Link
        to="/tester"
        className="mt-6 inline-block rounded-full border border-border px-4 py-2 text-sm text-muted-foreground"
      >
        Tillbaka till tester
      </Link>
    </main>
  );
}
