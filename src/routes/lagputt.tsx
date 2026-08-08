import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Compass, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  LAG_OK_LIMIT,
  LAG_PUTT_DISTANCES,
  emptyLagPutts,
  isApproved,
  loadLagPuttSessions,
  mean,
  saveLagPuttSession,
  type LagPutt,
} from "@/lib/lagputt";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { TestHowItWorksLink } from "@/components/test-story";
import { LAGPUTT_STORY } from "@/lib/test-story-content";

export const Route = createFileRoute("/lagputt")({
  head: () => ({
    meta: [
      { title: "Lagputt – 6 puttar 8–18 m | SG4" },
      {
        name: "description",
        content:
          "Lagputtstestet: 6 långa puttar från 8 till 18 meter i slumpad ordning. Allt inom 1 meter från hålet är godkänt.",
      },
    ],
  }),
  component: LagPuttPage,
});

type Phase = "test" | "result";

const TOTAL = LAG_PUTT_DISTANCES.length; // 6

function LagPuttPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("test");
  const [putts, setPutts] = useState<LagPutt[]>(emptyLagPutts);
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [prevPct, setPrevPct] = useState<number | null>(null);

  const current = putts[Math.min(index, TOTAL - 1)];

  useHideBottomNav(phase === "test" || phase === "result");

  function start() {
    const sessions = loadLagPuttSessions();
    const last = sessions[sessions.length - 1];
    setPrevPct(last ? last.pct : null);
    setPutts(emptyLagPutts());
    setIndex(0);
    setValue("");
    setSaved(false);
    setPhase("test");
  }

  useEffect(() => {
    start();
  }, []);

  function commit() {
    const num = Math.max(0, Number(value.replace(",", ".")) || 0);
    setPutts((p) => p.map((putt, i) => (i === index ? { ...putt, left: num } : putt)));
    setValue("");
    const next = index + 1;
    if (next >= TOTAL) setPhase("result");
    else setIndex(next);
  }

  function back() {
    if (index === 0) return;
    setIndex(index - 1);
    setValue("");
  }

  if (phase === "test") {
    const pct = Math.round((index / TOTAL) * 100);

    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-6 pt-4">
        <div className="flex items-center justify-between">
          <button
            onClick={back}
            disabled={index === 0}
            aria-label="Föregående putt"
            className="rounded-full border border-border p-2 text-muted-foreground disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate({ to: "/kategori/$slug", params: { slug: "puttning" } })}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Avbryt test
          </button>
        </div>

        {index === 0 && <TestHowItWorksLink config={LAGPUTT_STORY} />}

        <div className="mt-3">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold">
              Putt {index + 1} <span className="text-muted-foreground">av {TOTAL}</span>
            </span>
            <span className="text-muted-foreground">{pct} %</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="mt-6 rounded-3xl border-2 border-border bg-card p-6 text-center shadow-[var(--shadow-glow)]">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Avstånd</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-7xl leading-none text-flag">
            {current.distance}
            <span className="ml-2 text-lg text-muted-foreground">m</span>
          </p>
        </div>

        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-border bg-card/60 p-3 text-sm text-muted-foreground">
          <Compass className="mt-0.5 h-4 w-4 shrink-0 text-flag" />
          Gå i en annan riktning från hålet den här gången, så du inte puttar samma linje två gånger
          i rad.
        </p>

        <label htmlFor="left" className="mt-5 block text-sm text-muted-foreground">
          Kvar till hålet (meter) – 0 om den gick i
        </label>
        <input
          id="left"
          inputMode="decimal"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          placeholder="0"
          className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-5 text-center font-[family-name:var(--font-display)] text-5xl text-foreground outline-none focus:border-primary"
        />

        <button
          onClick={commit}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
        >
          {index + 1 === TOTAL ? "Avsluta test" : "Nästa putt"}
          <ArrowRight className="h-5 w-5" />
        </button>
      </main>
    );
  }

  const approved = putts.filter(isApproved).length;
  const pct = putts.length ? (approved / putts.length) * 100 : 0;
  const avgLeft = mean(putts.map((p) => p.left));

  function save() {
    saveLagPuttSession(putts, notes);
    setNotes("");
    setSaved(true);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-10">
      <p className="mb-6 flex items-center justify-center gap-1 text-xs text-primary">
        <Check className="h-4 w-4" /> Testet är klart
      </p>

      <section className="rounded-3xl border border-border bg-card p-6 text-center shadow-[var(--shadow-glow)]">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Godkända (inom {LAG_OK_LIMIT} m)
        </p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-7xl leading-none text-primary">
          {pct.toFixed(0)}
          <span className="ml-1 text-2xl text-muted-foreground">%</span>
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          {approved} av {putts.length} · snitt {avgLeft.toFixed(2)} m kvar
        </p>
        {prevPct !== null && (
          <p className={`mt-2 text-sm ${pct - prevPct >= 0 ? "text-primary" : "text-destructive"}`}>
            {pct - prevPct > 0 ? "+" : ""}
            {Math.round(pct - prevPct)} % sedan förra testet
          </p>
        )}
      </section>

      <section className="mt-4 rounded-3xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Alla puttar</p>
        <div className="mt-3 space-y-2">
          {putts.map((p, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-2xl border border-border px-4 py-2.5 text-sm"
            >
              <span className="text-muted-foreground">{p.distance} m</span>
              <span
                className={isApproved(p) ? "font-semibold text-primary" : "text-muted-foreground"}
              >
                {p.left.toFixed(2)} m · {isApproved(p) ? "Godkänt" : "Ej godkänt"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <label htmlFor="notes" className="mt-5 block text-sm text-muted-foreground">
        Anteckning (valfritt)
      </label>
      <input
        id="notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Greenfart, lutning, känsla…"
        className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:border-primary"
      />

      <div className="mt-6 flex gap-3">
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
          onClick={start}
          className="flex-1 rounded-2xl border border-border py-4 font-[family-name:var(--font-display)] text-2xl text-muted-foreground"
        >
          Nytt test
        </button>
      </div>

      <Link
        to="/kategori/$slug"
        params={{ slug: "puttning" }}
        className="mt-4 block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Tillbaka till Puttning
      </Link>

      <div className="mt-3 flex gap-3">
        <Link
          to="/"
          className="flex-1 rounded-2xl border border-border py-3 text-center text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          Startsida
        </Link>
        <Link
          to="/utveckling"
          className="flex-1 rounded-2xl border border-border py-3 text-center text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          Utveckling
        </Link>
      </div>
    </main>
  );
}
