import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Dumbbell, Plus, Target, Trash2, TrendingUp } from "lucide-react";

import { TRAINING_PLAN, buildInsight } from "@/lib/coaching";
import { computeRatings, type CategoryRating } from "@/lib/focus";
import {
  deleteDiaryEntry,
  diaryStats,
  loadDiary,
  saveDiaryEntry,
  todayISO,
  type DiaryEntry,
} from "@/lib/diary";

export const Route = createFileRoute("/traning")({
  head: () => ({
    meta: [
      { title: "Träningstester, dagbok och övningar | SG4" },
      {
        name: "description",
        content:
          "Skapa egna träningstester, följ din progress och använd SG4:s träningsdagbok och övningar för driving, approach, around the green och puttning.",
      },
      { property: "og:title", content: "Träningstester och träning | SG4" },
      {
        property: "og:description",
        content: "Bygg egna tester och följ utvecklingen utan att påverka ditt HCP.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrainingPage,
});

type TrainingMetric = "attempts" | "points" | "percent";

type TrainingTestResult = {
  id: string;
  value: number;
  date: string;
};

type TrainingTest = {
  id: string;
  name: string;
  category: string;
  metric: TrainingMetric;
  max: number;
  results: TrainingTestResult[];
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

function metricLabel(test: TrainingTest, value: number) {
  if (test.metric === "attempts") return `${value}/${test.max}`;
  if (test.metric === "percent") return `${value}%`;
  return test.max > 0 ? `${value}/${test.max} p` : `${value} p`;
}

function TrainingPage() {
  const [ratings, setRatings] = useState<CategoryRating[] | null>(null);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState(TRAINING_PLAN[0].slug);
  const [minutes, setMinutes] = useState("30");
  const [note, setNote] = useState("");
  const [openPlan, setOpenPlan] = useState<string | null>(null);

  const [customTests, setCustomTests] = useState<TrainingTest[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [testName, setTestName] = useState("");
  const [testCategory, setTestCategory] = useState(TRAINING_PLAN[0].slug);
  const [testMetric, setTestMetric] = useState<TrainingMetric>("attempts");
  const [testMax, setTestMax] = useState("8");
  const [resultInputs, setResultInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    setRatings(computeRatings());
    setEntries(loadDiary());
    setCustomTests(loadCustomTests());
  }, []);

  const insight = useMemo(() => buildInsight(ratings ?? []), [ratings]);
  const stats = diaryStats(entries);

  useEffect(() => {
    if (insight.weakest) setOpenPlan(insight.weakest.slug);
  }, [insight.weakest?.slug]);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const m = Number(minutes);
    if (!date || !Number.isFinite(m) || m <= 0) return;
    setEntries(saveDiaryEntry({ date, category, minutes: m, note: note.trim() }));
    setNote("");
  };

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
    setShowBuilder(false);
  };

  const saveTestResult = (test: TrainingTest) => {
    const value = Number(resultInputs[test.id]);
    if (!Number.isFinite(value) || value < 0 || value > test.max) return;

    const next = customTests.map((item) =>
      item.id === test.id
        ? {
            ...item,
            results: [
              { id: crypto.randomUUID(), value, date: todayISO() },
              ...item.results,
            ],
          }
        : item,
    );
    setCustomTests(next);
    persistCustomTests(next);
    setResultInputs((current) => ({ ...current, [test.id]: "" }));
  };

  const deleteCustomTest = (id: string) => {
    const next = customTests.filter((test) => test.id !== id);
    setCustomTests(next);
    persistCustomTests(next);
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-10">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">SG4</p>
      <h1 className="mt-2 flex items-center gap-2 font-display text-4xl leading-none">
        <Dumbbell className="h-7 w-7 text-primary" />
        Träningstester
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Följ det du tränar på. Resultaten här är träningsmetrics och påverkar inte ditt HCP.
      </p>

      <section className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Mina tester</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Skapa till exempel 8-bolls putt, wedge ladder eller ett eget coachtest.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowBuilder((open) => !open)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
            aria-label="Skapa eget test"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {showBuilder ? (
          <form
            onSubmit={createCustomTest}
            className="mt-4 space-y-3 rounded-3xl border border-primary/30 bg-primary/5 p-4"
          >
            <label className="block text-xs text-muted-foreground">
              Testnamn
              <input
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="Ex. 8-bolls putt"
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
                autoFocus
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-muted-foreground">
                Område
                <select
                  value={testCategory}
                  onChange={(e) => setTestCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
                >
                  {TRAINING_PLAN.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-muted-foreground">
                Mät som
                <select
                  value={testMetric}
                  onChange={(e) => {
                    const metric = e.target.value as TrainingMetric;
                    setTestMetric(metric);
                    if (metric === "percent") setTestMax("100");
                  }}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
                >
                  <option value="attempts">X av Y</option>
                  <option value="points">Poäng</option>
                  <option value="percent">Procent</option>
                </select>
              </label>
            </div>

            {testMetric !== "percent" ? (
              <label className="block text-xs text-muted-foreground">
                Maxresultat
                <input
                  type="number"
                  min={1}
                  value={testMax}
                  onChange={(e) => setTestMax(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
                />
              </label>
            ) : null}

            <div className="rounded-2xl border border-border bg-background/60 p-3 text-xs text-muted-foreground">
              Exempel: <span className="font-semibold text-foreground">8-bolls putt</span> · Puttning · X av Y · max 8.
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-primary py-3 font-display text-xl text-primary-foreground"
            >
              Skapa test
            </button>
          </form>
        ) : null}

        <div className="mt-4 space-y-3">
          {customTests.length === 0 ? (
            <button
              type="button"
              onClick={() => setShowBuilder(true)}
              className="flex w-full items-center gap-3 rounded-3xl border border-dashed border-border p-4 text-left"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Target className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold">Skapa ditt första träningstest</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Tar bara namn, område och hur resultatet mäts.
                </span>
              </span>
            </button>
          ) : (
            customTests.map((test) => {
              const plan = TRAINING_PLAN.find((p) => p.slug === test.category);
              const latest = test.results[0];
              const best = test.results.length
                ? Math.max(...test.results.map((result) => result.value))
                : null;

              return (
                <div key={test.id} className="rounded-3xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-2xl leading-none">{test.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {plan?.title ?? test.category} · Ej HCP-grundande
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteCustomTest(test.id)}
                      className="text-muted-foreground transition-colors hover:text-flag"
                      aria-label={`Ta bort ${test.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Senast</p>
                      <p className="mt-1 font-display text-2xl leading-none">
                        {latest ? metricLabel(test, latest.value) : "–"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Bäst</p>
                      <p className="mt-1 flex items-center gap-1 font-display text-2xl leading-none">
                        {best !== null ? metricLabel(test, best) : "–"}
                        {best !== null ? <TrendingUp className="h-4 w-4 text-primary" /> : null}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <input
                      type="number"
                      min={0}
                      max={test.max}
                      step="any"
                      value={resultInputs[test.id] ?? ""}
                      onChange={(e) =>
                        setResultInputs((current) => ({ ...current, [test.id]: e.target.value }))
                      }
                      placeholder={test.metric === "percent" ? "Resultat %" : `Resultat, max ${test.max}`}
                      className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => saveTestResult(test)}
                      className="rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
                    >
                      Spara
                    </button>
                  </div>

                  {test.results.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {test.results.slice(0, 5).map((result) => (
                        <span
                          key={result.id}
                          className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground"
                        >
                          {metricLabel(test, result.value)} · {result.date.slice(5)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>

      {insight.weakest ? (
        <div className="mt-8 rounded-2xl border border-flag/40 bg-flag/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-flag">Prioritera</p>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{insight.weakest.title}</span> är
            ditt svagaste område – ungefär {insight.strokes} slag per rond att hämta.
          </p>
        </div>
      ) : null}

      <section className="mt-6 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Loggade pass</p>
          <p className="mt-1 font-display text-3xl leading-none">{stats.sessions}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total tid</p>
          <p className="mt-1 font-display text-3xl leading-none">
            {stats.hours.toFixed(1)}
            <span className="ml-1 text-sm text-muted-foreground">h</span>
          </p>
        </div>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Övningar per område
        </h2>
        {TRAINING_PLAN.map((plan) => {
          const open = openPlan === plan.slug;
          return (
            <div key={plan.slug} className="rounded-3xl border border-border bg-card p-4">
              <button
                type="button"
                onClick={() => setOpenPlan(open ? null : plan.slug)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <span>
                  <span className="font-display text-2xl leading-none">{plan.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {plan.focus}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">{open ? "–" : "+"}</span>
              </button>

              {open ? (
                <div className="mt-3 space-y-2">
                  {plan.drills.map((d) => (
                    <div key={d.title} className="rounded-2xl border border-border p-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold">{d.title}</span>
                        <span className="text-xs text-muted-foreground">{d.time}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{d.detail}</p>
                    </div>
                  ))}
                  <Link
                    to="/kategori/$slug"
                    params={{ slug: plan.slug }}
                    className="inline-block text-xs text-primary underline"
                  >
                    Testa dig i {plan.title}
                  </Link>
                </div>
              ) : null}
            </div>
          );
        })}
      </section>

      <section className="mt-8">
        <h2 className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Träningsdagbok
        </h2>

        <form onSubmit={add} className="mt-3 space-y-3 rounded-3xl border border-border bg-card p-4">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground">
              Datum
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Minuter
              <input
                type="number"
                min={1}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </label>
          </div>

          <label className="block text-xs text-muted-foreground">
            Område
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {TRAINING_PLAN.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs text-muted-foreground">
            Anteckning
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Vad tränade du och hur kändes det?"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-2xl bg-primary py-3 font-display text-xl text-primary-foreground"
          >
            Spara pass
          </button>
        </form>

        <div className="mt-4 space-y-2">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga pass loggade ännu.</p>
          ) : (
            entries.map((e) => {
              const plan = TRAINING_PLAN.find((p) => p.slug === e.category);
              return (
                <div
                  key={e.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {plan?.title ?? e.category}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {e.date} · {e.minutes} min
                      </span>
                    </p>
                    {e.note ? (
                      <p className="mt-1 text-xs text-muted-foreground">{e.note}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    aria-label="Ta bort pass"
                    onClick={() => setEntries(deleteDiaryEntry(e.id))}
                    className="text-muted-foreground transition-colors hover:text-flag"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>

      <Link
        to="/tester"
        className="mt-8 inline-block rounded-full border border-border px-4 py-2 text-sm text-muted-foreground"
      >
        Till tester
      </Link>
    </main>
  );
}
