import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, CheckCircle2, Info, Mountain, Target, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DIRECTIONS,
  MAX_POINTS,
  SHORT_PUTT_TOTAL,
  computeShortPuttResult,
  emptyShortPutts,
  loadShortPuttSessions,
  puttingLevelLabel,
  saveShortPuttSession,
  type GreenType,
  type ShortPutt,
} from "@/lib/shortputt";
import { hcpLabel } from "@/lib/sg-handicap";
import {
  PuttingPositionDiagram,
  PuttingResultCompass,
  ScoreRing,
} from "@/components/shortputt-visuals";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

export const Route = createFileRoute("/kortputt")({
  head: () => ({
    meta: [
      { title: "Short Putting Test – 12 puttar från 1–3 m | SG4" },
      {
        name: "description",
        content:
          "Short Putting Test: 12 puttar från fyra riktningar (klockan 12/3/6/9) på 1, 2 och 3 meter. Short Putting HCP, score och analys per riktning.",
      },
    ],
  }),
  component: ShortPuttPage,
});

type Phase = "setup" | "test" | "result";

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
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [hcpInfoOpen, setHcpInfoOpen] = useState(false);

  useHideBottomNav(phase === "test");

  useEffect(() => {
    const sessions = loadShortPuttSessions();
    const last = sessions[sessions.length - 1];
    setPrevScore(last ? last.score : null);
  }, []);

  function startTest(type: GreenType) {
    setGreenType(type);
    setStartedAt(Date.now());
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
    setStartedAt(null);
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
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
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
  const testMinutes = startedAt
    ? Math.max(1, Math.round((Date.now() - startedAt) / 60000))
    : undefined;

  const distStats = result.byDistance.map((d) => ({
    ...d,
    pct: d.count ? Math.round((d.holed / d.count) * 100) : 0,
  }));
  const bestDist = [...distStats].sort((a, b) => b.pct - a.pct)[0];
  const worstDist = [...distStats].sort((a, b) => a.pct - b.pct)[0];
  const best = result.bestDirection;
  const worst = result.worstDirection;

  const strengthText =
    bestDist && best
      ? `Stark från ${bestDist.distance} meter och från ${best.label.toLowerCase()}. Du är stabil i dina korta puttar.`
      : undefined;
  const improvementText =
    worstDist && worst
      ? `Fokusområde: ${worstDist.distance} meter och ${worst.label.toLowerCase()}. Här tappar du flest slag.`
      : undefined;
  const trainingText =
    worstDist && worst
      ? `Träna mer på ${worstDist.distance} meter, särskilt från ${worst.label.toLowerCase()}. Lägg in fler övningar för distanskänsla och startlinje från den riktningen.`
      : result.analysis;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-6">
      <div className="flex items-center justify-between">
        <Link
          to="/kategori/$slug"
          params={{ slug: "puttning" }}
          aria-label="Tillbaka"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <p className="flex items-center gap-1 text-xs text-primary">
          <Check className="h-4 w-4" /> Testet är klart
        </p>
        <span className="w-9" />
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-flag">Puttning</p>
          <h1 className="mt-1 text-4xl leading-none">Short Putting Test</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Så säker är du på korta puttar från 1–3 meter – och från olika riktningar.
          </p>
        </div>
        <button
          onClick={() => setAboutOpen((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Info className="h-3.5 w-3.5" /> Om testet
        </button>
      </div>

      {aboutOpen && (
        <p className="mt-3 rounded-2xl border border-border bg-card/60 p-3 text-xs leading-relaxed text-muted-foreground">
          12 puttar från fyra riktningar – klockan 12, 3, 6 och 9 – på 1, 2 och 3 meter. Satta
          puttar viktas efter avstånd eftersom en miss från nära håll väger tyngre. Green:{" "}
          {greenType === "sloped" ? "lutande" : "rak"}.
        </p>
      )}

      <div className="mt-5 rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-glow)]">
        <div className="grid grid-cols-[1fr_auto] gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Short Putting HCP
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-6xl leading-none text-primary">
              {hcpLabel(result.handicap)}
            </p>
            <p className="mt-2 inline-flex items-center rounded-full bg-flag/10 px-2.5 py-1 text-xs font-semibold text-flag">
              {puttingLevelLabel(result.score)}
            </p>
          </div>
          <div className="flex flex-col items-center justify-center">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Score</p>
            <div className="mt-1">
              <ScoreRing value={result.points} max={MAX_POINTS} />
            </div>
            <p className="mt-1 text-sm font-semibold">{result.score}%</p>
          </div>
        </div>

        <button
          onClick={() => setHcpInfoOpen((v) => !v)}
          className="mt-4 flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Info className="h-3.5 w-3.5" /> Vad betyder detta?
        </button>
        {hcpInfoOpen && (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Din kortputtning motsvarar en spelare med {hcpLabel(result.handicap)} i handicap på
            puttar från 1–3 meter. Det här testet ingår i ditt totala Putting HCP tillsammans med
            Lagputt. Ett enda test är ett litet stickprov – blir stabilare efter fler tester.
          </p>
        )}

        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
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

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Totalt satta
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-xl leading-none">
            {result.holed}/{result.count}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{Math.round(result.pct)}%</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Poäng</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-xl leading-none">
            {result.points}/{MAX_POINTS}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{result.score}%</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Testtid</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-xl leading-none">
            {testMinutes ?? "–"} min
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Per avstånd</p>
        <div className="mt-3 space-y-3">
          {distStats.map((s) => (
            <div key={s.distance}>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{s.distance} meter</span>
                <span className="font-semibold">
                  {s.holed}/{s.count} <span className="text-muted-foreground">{s.pct}%</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${s.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {result.byDirection.length > 0 && (
        <div className="mt-4 rounded-3xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Träffbild (hålprocent)
          </p>
          <PuttingResultCompass byDirection={result.byDirection} />
        </div>
      )}

      {(strengthText || improvementText) && (
        <div className="mt-4 rounded-3xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Styrkor &amp; Utvecklingsområden
          </p>
          <div className="mt-3 space-y-4">
            {strengthText && (
              <div className="flex gap-2.5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-primary">Styrkor</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                    {strengthText}
                  </p>
                </div>
              </div>
            )}
            {improvementText && (
              <div className="flex gap-2.5">
                <Target className="mt-0.5 h-5 w-5 shrink-0 text-sand" />
                <div>
                  <p className="text-sm font-semibold text-sand">Utvecklingsområden</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                    {improvementText}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {trainingText && (
        <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Rekommenderad träning</p>
          <p className="mt-1.5 text-sm leading-relaxed">{trainingText}</p>
        </div>
      )}

      <label htmlFor="notes" className="mt-5 block text-sm text-muted-foreground">
        Anteckning (valfritt)
      </label>
      <input
        id="notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Lägg till anteckning…"
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
            Spara resultat
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
