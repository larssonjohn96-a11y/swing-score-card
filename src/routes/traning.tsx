import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Dumbbell, Trash2 } from "lucide-react";

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
      { title: "Träning – dagbok och övningar per område | SG4" },
      {
        name: "description",
        content:
          "Träningsdagbok och färdiga övningar för driving, approach, around the green och puttning så du har en plan när du kommer till golfklubben.",
      },
      { property: "og:title", content: "Träning – dagbok och övningar per område" },
      {
        property: "og:description",
        content: "Logga dina pass och få konkreta övningar för varje del av spelet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrainingPage,
});

function TrainingPage() {
  const [ratings, setRatings] = useState<CategoryRating[] | null>(null);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState(TRAINING_PLAN[0].slug);
  const [minutes, setMinutes] = useState("30");
  const [note, setNote] = useState("");
  const [openPlan, setOpenPlan] = useState<string | null>(null);

  useEffect(() => {
    setRatings(computeRatings());
    setEntries(loadDiary());
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

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-10">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">SG4</p>
      <h1 className="mt-2 flex items-center gap-2 font-display text-4xl leading-none">
        <Dumbbell className="h-7 w-7 text-primary" />
        Träning
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Logga dina pass och ta med en färdig plan till klubben.
      </p>

      {insight.weakest ? (
        <div className="mt-6 rounded-2xl border border-flag/40 bg-flag/5 p-4">
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
        to="/"
        className="mt-8 inline-block rounded-full border border-border px-4 py-2 text-sm text-muted-foreground"
      >
        Till menyn
      </Link>
    </main>
  );
}
