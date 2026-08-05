import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Mountain, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DIRECTIONS,
  SHORT_PUTT_ROUNDS,
  SHORT_PUTT_TOTAL,
  computeShortPuttResult,
  emptyShortPutts,
  loadShortPuttSessions,
  puttingLevelLabel,
  saveShortPuttSession,
  type GreenType,
  type ShortPutt,
} from "@/lib/shortputt";
import { PuttingPositionDiagram } from "@/components/shortputt-visuals";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

export const Route = createFileRoute("/kortputt")({
  head: () => ({
    meta: [
      { title: "Short Putting Test – 24 puttar från 1–3 m | SG4" },
      {
        name: "description",
        content:
          "Short Putting Test: 24 puttar (2 varv) från fyra riktningar (klockan 12/3/6/9) på 1, 2 och 3 meter. Viktad score, HCP-uppskattning och analys per riktning.",
      },
    ],
  }),
  component: ShortPuttPage,
});

type Phase = "setup" | "test" | "result";

const PUTTS_PER_ROUND = SHORT_PUTT_TOTAL / SHORT_PUTT_ROUNDS;

function ShortPuttPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("setup");
  const [greenType, setGreenType] = useState<GreenType>("flat");
  const [putts, setPutts] = useState<ShortPutt[]>(emptyShortPutts);
  const [index, setIndex] = useState(0);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [prevScore, setPrevScore] = useState<number | null>(null);
  const [flash, setFlash] = useState<"made" | "missed" | null>(null);

  useHideBottomNav(phase === "test");

  useEffect(() => {
    const sessions = loadShortPuttSessions();
    const last = sessions[sessions.length - 1];
    setPrevScore(last ? last.score : null);
  }, []);

  function startTest(type: GreenType) {
    setGreenType(type);
    setPhase("test");
  }

  function commit(made: boolean) {
    if (flash) return;
    setFlash(made ? "made" : "missed");
    window.setTimeout(() => {
      setPutts((p) => p.map((putt, i) => (i === index ? { ...putt, holed: made } : putt)));
      setFlash(null);
      if (index + 1 >= SHORT_PUTT_TOTAL) {
        setPhase("result");
      } else {
        setIndex(index + 1);
      }
    }, 260);
  }

  function back() {
    if (index === 0) return;
    setIndex(index - 1);
  }

  function save() {
    saveShortPuttSession(putts, greenType, notes);
    setNotes("");
    setSaved(true);
  }

  function restart() {
    setSaved(false);
    setPutts(emptyShortPutts());
    setIndex(0);
    setFlash(null);
    setPhase("setup");
  }

  if (phase === "setup") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-8">
        <header className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Innan du börjar
            </p>
            <h1 className="text-4xl leading-none">Short Putting Test</h1>
          </div>
          <Link
            to="/kategori/$slug"
            params={{ slug: "puttning" }}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Avbryt
          </Link>
        </header>

        <div className="mt-8 flex justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mountain className="h-8 w-8 text-primary" />
          </span>
        </div>
        <h2 className="mt-4 text-center text-2xl leading-tight">
          Är hålet du puttar mot rakt eller lutande?
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Avgör om missar beror på teknik eller greenläsning, och gör resultatet jämförbart över
          tid.
        </p>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => startTest("flat")}
            className="w-full rounded-2xl border-2 border-border bg-card p-4 text-left transition-colors hover:border-primary"
          >
            <p className="font-[family-name:var(--font-display)] text-2xl leading-none">Rakt</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ingen tydlig lutning – testar främst startlinje och teknik.
            </p>
          </button>
          <button
            onClick={() => startTest("sloped")}
            className="w-full rounded-2xl border-2 border-border bg-card p-4 text-left transition-colors hover:border-primary"
          >
            <p className="font-[family-name:var(--font-display)] text-2xl leading-none">Lutande</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tydlig lutning – testar även greenläsning och fartkontroll.
            </p>
          </button>
        </div>
      </main>
    );
  }

  if (phase === "test") {
    const current = putts[index];
    const label = DIRECTIONS.find((d) => d.key === current.direction)?.label;
    const pct = Math.round((index / SHORT_PUTT_TOTAL) * 100);

    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-4">
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

        <div className="mt-3">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold">
              Putt {index + 1} <span className="text-muted-foreground">av {SHORT_PUTT_TOTAL}</span>
            </span>
            <span className="text-muted-foreground">{pct} %</span>
          </div>
          <div className="mt-1.5 flex gap-2">
            {[1, 2].map((round) => {
              const filledInRound = Math.min(
                PUTTS_PER_ROUND,
                Math.max(0, index - (round - 1) * PUTTS_PER_ROUND),
              );
              return (
                <div key={round} className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(filledInRound / PUTTS_PER_ROUND) * 100}%` }}
                    />
                  </div>
                  <p
                    className={`mt-0.5 text-[10px] uppercase tracking-[0.2em] ${
                      current.round === round ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    Varv {round}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-border bg-card p-3">
          <PuttingPositionDiagram
            activeDirection={current.direction}
            activeDistance={current.distance}
          />
        </div>

        <div
          className={`mt-4 rounded-3xl border-2 p-6 text-center shadow-[var(--shadow-glow)] transition-colors duration-200 ${
            flash === "made"
              ? "border-primary bg-primary/15"
              : flash === "missed"
                ? "border-destructive bg-destructive/15"
                : "border-border bg-card"
          }`}
        >
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Riktning</p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl leading-tight">
            {label}
          </h2>
          <p className="mt-2 font-[family-name:var(--font-display)] text-7xl leading-none text-flag">
            {current.distance}
            <span className="ml-2 text-2xl text-muted-foreground">m</span>
          </p>
          {flash && (
            <p
              className={`mt-3 text-lg font-bold uppercase tracking-wide ${
                flash === "made" ? "text-primary" : "text-destructive"
              }`}
            >
              {flash === "made" ? "Satt!" : "Missad"}
            </p>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={() => commit(true)}
            disabled={!!flash}
            className="flex-1 rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground transition-transform active:scale-95 disabled:opacity-60"
          >
            Satt
          </button>
          <button
            onClick={() => commit(false)}
            disabled={!!flash}
            className="flex-1 rounded-2xl border-2 border-destructive/60 py-5 font-[family-name:var(--font-display)] text-2xl text-destructive transition-transform active:scale-95 disabled:opacity-60"
          >
            Missad
          </button>
        </div>
      </main>
    );
  }

  const result = computeShortPuttResult(putts, greenType);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-10">
      <p className="mb-6 flex items-center justify-center gap-1 text-xs text-primary">
        <Check className="h-4 w-4" /> Testet är klart
      </p>

      <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-[var(--shadow-glow)]">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Short Putting Score
        </p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-7xl leading-none text-flag">
          {result.score}
          <span className="ml-1 text-2xl text-muted-foreground">/100</span>
        </p>
        <p className="mt-2 inline-flex items-center rounded-full bg-flag/10 px-3 py-1 text-sm font-semibold text-flag">
          {puttingLevelLabel(result.score)}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Uppskattad Short Putting HCP: {result.handicapRange[0]}–{result.handicapRange[1]}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Ett enda test räcker inte för ett exakt tal – blir stabilare efter fler tester.
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          <Mountain className="h-3.5 w-3.5" />
          {greenType === "sloped" ? "Lutande green" : "Rak green"}
        </p>
        {prevScore !== null && (
          <p
            className={`mt-2 text-sm ${result.score - prevScore >= 0 ? "text-primary" : "text-destructive"}`}
          >
            {result.score - prevScore > 0 ? "+" : ""}
            {result.score - prevScore} sedan förra testet
          </p>
        )}
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
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Totalpoäng
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl leading-none">
            {result.points}/72
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Per avstånd</p>
        <div className="mt-3 space-y-2 text-sm">
          {result.byDistance.map((s) => (
            <div key={s.distance} className="flex justify-between border-b border-border pb-1.5">
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
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Per riktning</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {result.byDirection.map((d) => (
              <div key={d.direction} className="rounded-xl border border-border p-2 text-center">
                <p className="text-[11px] text-muted-foreground">{d.label}</p>
                <p className="mt-0.5 font-semibold">
                  {d.holed}/{d.count}
                </p>
              </div>
            ))}
          </div>
          {result.worstDirection && (
            <p className="mt-3 text-xs text-muted-foreground">
              Svagaste riktning:{" "}
              <span className="text-foreground">{result.worstDirection.label}</span>
            </p>
          )}
        </div>
      )}

      {result.analysis && (
        <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">
            Rekommenderat träningsfokus
          </p>
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
        placeholder="Green, känsla…"
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
          onClick={restart}
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
    </main>
  );
}
