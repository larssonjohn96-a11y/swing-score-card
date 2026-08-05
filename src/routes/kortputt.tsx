import { Link, createFileRoute } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DIRECTIONS,
  SHORT_PUTT_TOTAL,
  computeShortPuttResult,
  deleteShortPuttSession,
  emptyShortPutts,
  loadShortPuttSessions,
  saveShortPuttSession,
  type ShortPutt,
  type ShortPuttSession,
} from "@/lib/shortputt";

export const Route = createFileRoute("/kortputt")({
  head: () => ({
    meta: [
      { title: "Short Putting Test – 12 puttar från 1–3 m | SG4" },
      {
        name: "description",
        content:
          "Short Putting Test: 12 puttar från fyra riktningar (klockan 12/3/6/9) på 1, 2 och 3 meter. Viktad score, HCP-uppskattning och analys per riktning.",
      },
      { property: "og:title", content: "Short Putting Test – 12 puttar från 1–3 m" },
      {
        property: "og:description",
        content: "4 riktningar × 3 avstånd (1–3 m). Score 0–100 och uppskattat handicap.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ShortPuttPage,
});

function ShortPuttPage() {
  const [putts, setPutts] = useState<ShortPutt[]>(emptyShortPutts);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [sessions, setSessions] = useState<ShortPuttSession[]>([]);

  useEffect(() => setSessions(loadShortPuttSessions()), []);

  const played = done ? putts : putts.slice(0, index);
  const result = computeShortPuttResult(played);

  function commit(made: boolean) {
    setPutts(putts.map((p, i) => (i === index ? { ...p, holed: made } : p)));
    if (index + 1 >= SHORT_PUTT_TOTAL) setDone(true);
    else setIndex(index + 1);
  }

  function save() {
    setSessions((prev) => [...prev, saveShortPuttSession(putts, notes)]);
    setNotes("");
    setSaved(true);
  }

  function reset() {
    setSaved(false);
    setPutts(emptyShortPutts());
    setIndex(0);
    setDone(false);
  }

  const currentLabel = DIRECTIONS.find((d) => d.key === putts[index]?.direction)?.label;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-24 pt-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Puttning · 12 puttar
          </p>
          <h1 className="text-4xl leading-none">Short Putting Test</h1>
        </div>
        <Link
          to="/kategori/$slug"
          params={{ slug: "puttning" }}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Tillbaka
        </Link>
      </header>

      {!done ? (
        <>
          <section className="mt-6 rounded-3xl border border-border bg-card p-6 text-center shadow-[var(--shadow-glow)]">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Putt {index + 1} av {SHORT_PUTT_TOTAL}
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl leading-tight">
              {currentLabel}
            </h2>
            <p className="mt-1 font-[family-name:var(--font-display)] text-6xl leading-none text-flag">
              {putts[index]?.distance}
              <span className="ml-1 text-2xl text-muted-foreground">m</span>
            </p>
          </section>

          <div className="mt-5 flex gap-3">
            <button
              onClick={() => commit(true)}
              className="flex-1 rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
            >
              Satt
            </button>
            <button
              onClick={() => commit(false)}
              className="flex-1 rounded-2xl border border-border py-5 font-[family-name:var(--font-display)] text-2xl text-muted-foreground"
            >
              Missad
            </button>
          </div>
        </>
      ) : (
        <section className="mt-6">
          <p className="flex items-center justify-center gap-1 text-xs text-primary">
            <Check className="h-4 w-4" /> Testet är klart
          </p>

          <div className="mt-4 rounded-3xl border border-border bg-card p-6 text-center shadow-[var(--shadow-glow)]">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Short Putting Score
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-7xl leading-none text-flag">
              {result.score}
              <span className="ml-1 text-2xl text-muted-foreground">/100</span>
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Uppskattad Short Putting HCP: {result.handicapRange[0]}–{result.handicapRange[1]}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ett enda test räcker inte för ett exakt tal – blir stabilare efter fler tester.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-card p-3">
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                Totalt satta
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-2xl leading-none">
                {result.holed}/{result.count}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-3">
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Poäng</p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-2xl leading-none">
                {result.points}/36
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-3xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Per avstånd</p>
            <div className="mt-3 space-y-2 text-sm">
              {result.byDistance.map((s) => (
                <div
                  key={s.distance}
                  className="flex justify-between border-b border-border pb-1.5"
                >
                  <span className="text-muted-foreground">{s.distance} m</span>
                  <span className="font-semibold">
                    {s.holed}/{s.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {result.byDirection.length > 0 && (
            <div className="mt-4 rounded-3xl border border-border bg-card p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Per riktning
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                {result.byDirection.map((d) => (
                  <div
                    key={d.direction}
                    className="rounded-xl border border-border p-2 text-center"
                  >
                    <p className="text-[11px] text-muted-foreground">{d.label}</p>
                    <p className="mt-0.5 font-semibold">
                      {d.holed}/{d.count}
                    </p>
                  </div>
                ))}
              </div>
              {(result.bestDirection || result.worstDirection) && (
                <div className="mt-3 space-y-0.5 text-xs text-muted-foreground">
                  {result.bestDirection && (
                    <p>
                      Bästa riktning:{" "}
                      <span className="text-foreground">{result.bestDirection.label}</span>
                    </p>
                  )}
                  {result.worstDirection && (
                    <p>
                      Svagaste riktning:{" "}
                      <span className="text-foreground">{result.worstDirection.label}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {result.analysis && (
            <div className="mt-4 rounded-2xl border border-border bg-card/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Analys</p>
              <p className="mt-1.5 text-sm leading-relaxed">{result.analysis}</p>
            </div>
          )}

          <label htmlFor="notes" className="mt-5 block text-sm text-muted-foreground">
            Anteckning (valfritt)
          </label>
          <input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Green, lutning, känsla…"
            className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:border-primary"
          />
          <div className="mt-4 flex gap-3">
            {saved ? (
              <div className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-primary bg-primary/10 py-4 text-base font-semibold text-primary">
                <Check className="h-5 w-5" /> Testet sparat
              </div>
            ) : (
              <button
                onClick={save}
                className="flex-1 rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
              >
                Spara
              </button>
            )}
            <button
              onClick={reset}
              className="flex-1 rounded-2xl border border-border py-4 font-[family-name:var(--font-display)] text-2xl text-muted-foreground"
            >
              Nytt test
            </button>
          </div>
        </section>
      )}

      {!done && (
        <section className="mt-6">
          <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Alla puttar</h2>
          <div className="mt-3 space-y-2">
            {putts.map((p, i) => {
              const label = DIRECTIONS.find((d) => d.key === p.direction)?.label;
              return (
                <div
                  key={p.index}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${
                    i === index
                      ? "border-primary bg-primary/15"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  <span>
                    {i + 1}. {label} · {p.distance} m
                  </span>
                  <span>{i < index ? (p.holed ? "Satt" : "Missad") : "–"}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {sessions.length ? (
        <section className="mt-8">
          <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Historik</h2>
          <div className="mt-3 space-y-2">
            {[...sessions].reverse().map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm"
              >
                <span className="text-muted-foreground">
                  {new Date(s.date).toLocaleDateString("sv-SE")}
                </span>
                <span>
                  {s.score}/100 · {s.holed}/{s.putts.length}
                </span>
                <button
                  onClick={() => setSessions(deleteShortPuttSession(s.id))}
                  aria-label="Ta bort test"
                  className="text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8 rounded-2xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">
        <h2 className="text-base text-foreground">Så funkar testet</h2>
        <p className="mt-2">
          Fyra startlinjer runt hålet – klockan 12, 3, 6 och 9 – med en putt från vardera 1, 2 och 3
          meter. Totalt 12 puttar. En satt putt från 1 m ger 2 poäng, från 2 m 3 poäng och från 3 m
          4 poäng (max 36). Testet mäter framför allt förmågan att håla puttar från 1–3 meter, inte
          hela puttingförmågan – prova Lagputt för längre puttar och distanskontroll.
        </p>
      </section>
    </main>
  );
}
