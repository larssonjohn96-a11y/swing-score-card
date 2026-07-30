import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Minus, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  PRECISION_BENCHMARKS,
  PRECISION_TARGETS,
  PRECISION_TOTAL_SHOTS,
  benchmarkLabel,
  emptyPrecisionShots,
  lengthError,
  precisionAdvice,
  precisionResult,
  proximity,
  type PrecisionShot,
} from "@/lib/precision";
import { loadPrecisionSessions, savePrecisionSession } from "@/lib/precision-store";

export const Route = createFileRoute("/precision")({
  head: () => ({
    meta: [
      { title: "Approach Test – 18 inspel | SG4" },
      {
        name: "description",
        content:
          "18 inspel mot 55–165 m. Få Approach Score, uppskattat approach-handicap, snittavstånd till flaggan och personliga träningsrekommendationer.",
      },
      { property: "og:title", content: "Approach Test – 18 inspel" },
      {
        property: "og:description",
        content: "Approach Score, handicapskattning och analys per avstånd.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrecisionPage,
});

type Phase = "intro" | "test" | "result";

function PrecisionPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [shots, setShots] = useState<PrecisionShot[]>(emptyPrecisionShots);
  const [index, setIndex] = useState(0);
  const [carry, setCarry] = useState(0);
  const [side, setSide] = useState<-1 | 0 | 1>(0);
  const [offset, setOffset] = useState(0);
  const [prev, setPrev] = useState<{ score: number; avgProximity: number } | null>(null);
  const savedRef = useRef(false);

  const current = shots[Math.min(index, PRECISION_TOTAL_SHOTS - 1)];

  function start() {
    const sessions = loadPrecisionSessions();
    const last = sessions[sessions.length - 1];
    setPrev(last ? { score: last.score ?? 0, avgProximity: last.avgProximity } : null);
    setShots(emptyPrecisionShots());
    setIndex(0);
    setCarry(PRECISION_TARGETS[0]);
    setSide(0);
    setOffset(0);
    savedRef.current = false;
    setPhase("test");
  }

  function commit() {
    const offline = side * offset;
    const next = index + 1;
    setShots((p) =>
      p.map((s, i) => (i === index ? { ...s, carry, offline, filled: true } : s)),
    );
    if (next >= PRECISION_TOTAL_SHOTS) {
      setPhase("result");
    } else {
      setIndex(next);
      setCarry(shots[next].target);
      setSide(0);
      setOffset(0);
    }
  }

  function back() {
    if (index === 0) return;
    const i = index - 1;
    setIndex(i);
    setCarry(shots[i].filled ? shots[i].carry : shots[i].target);
    setSide(shots[i].offline === 0 ? 0 : shots[i].offline < 0 ? -1 : 1);
    setOffset(Math.abs(shots[i].offline));
  }

  useEffect(() => {
    if (phase === "result" && !savedRef.current) {
      savedRef.current = true;
      savePrecisionSession(shots);
    }
  }, [phase, shots]);

  if (phase === "intro") return <Intro onStart={start} />;
  if (phase === "test")
    return (
      <TestScreen
        current={current}
        index={index}
        carry={carry}
        side={side}
        offset={offset}
        setCarry={setCarry}
        setSide={setSide}
        setOffset={setOffset}
        onCommit={commit}
        onBack={back}
      />
    );
  return <ResultScreen shots={shots} prev={prev} onRestart={start} />;
}

/* ---------------------------------------------------------------- intro */

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-8">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Approach</p>
          <h1 className="text-4xl leading-none">Approach Test</h1>
        </div>
        <Link
          to="/kategori/$slug"
          params={{ slug: "approach" }}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Tillbaka
        </Link>
      </header>

      <section className="mt-6 space-y-3">
        <InfoCard title="Syfte">
          Mät hur nära flaggan dina inspel landar över nio avstånd. Du får en Approach Score 0–100,
          ett uppskattat approach-handicap och ser exakt vilka avstånd som kostar dig slag.
        </InfoCard>
        <InfoCard title="Det här behöver du">
          Range eller simulator där du ser carry och sidled, 18 bollar och cirka 20 minuter.
        </InfoCard>
        <InfoCard title="Så går det till">
          18 slag: nio avstånd (55, 64, 73, 82, 91, 110, 128, 146, 165 m) i två varv. Ett slag i
          taget – du registrerar carry och sidled med knappar. Inga resultat visas förrän testet är
          klart.
        </InfoCard>
        <InfoCard title="Så räknas resultatet">
          Avstånd till flaggan = √(längdfel² + sidled²). Det delas med slagets längd till en
          procentsiffra, som översätts till score och handicap. 5 % ≈ PGA Tour, 12 % ≈ hcp 10.
        </InfoCard>
      </section>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md bg-gradient-to-t from-background via-background to-transparent px-5 pb-6 pt-4">
        <button
          onClick={onStart}
          className="w-full rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
        >
          Starta test
        </button>
        <Link
          to="/precision-historik"
          className="mt-2 block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Se historik
        </Link>
      </div>
    </main>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-foreground">{children}</p>
    </div>
  );
}

/* ----------------------------------------------------------------- test */

function TestScreen({
  current,
  index,
  carry,
  side,
  offset,
  setCarry,
  setSide,
  setOffset,
  onCommit,
  onBack,
}: {
  current: PrecisionShot;
  index: number;
  carry: number;
  side: -1 | 0 | 1;
  offset: number;
  setCarry: (n: number) => void;
  setSide: (s: -1 | 0 | 1) => void;
  setOffset: (n: number) => void;
  onCommit: () => void;
  onBack: () => void;
}) {
  const diff = carry - current.target;
  return (
    <main className="mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden px-5 pb-5 pt-5">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          disabled={index === 0}
          aria-label="Föregående slag"
          className="rounded-full border border-border p-2 text-muted-foreground disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Slag {index + 1} / {PRECISION_TOTAL_SHOTS} · varv {current.round}
        </p>
        <span className="w-8" />
      </div>

      <div className="mt-3 flex gap-1">
        {Array.from({ length: PRECISION_TOTAL_SHOTS }, (_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${i <= index ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>

      <div className="mt-5 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Måldistans</p>
        <p className="font-[family-name:var(--font-display)] text-6xl leading-none text-flag">
          {current.target}
          <span className="ml-2 text-xl text-muted-foreground">m</span>
        </p>
      </div>

      <div className="mt-5 rounded-3xl border border-border bg-card p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Carry</p>
        <div className="mt-1 flex items-center justify-between">
          <StepButton onClick={() => setCarry(Math.max(0, carry - 1))} icon="minus" />
          <div className="text-center">
            <p className="font-[family-name:var(--font-display)] text-5xl leading-none">{carry}</p>
            <p className="text-xs text-muted-foreground">
              {diff === 0 ? "på måldistans" : `${diff > 0 ? "+" : ""}${diff} m`}
            </p>
          </div>
          <StepButton onClick={() => setCarry(carry + 1)} icon="plus" />
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[-10, -5, 5, 10].map((d) => (
            <button
              key={d}
              onClick={() => setCarry(Math.max(0, carry + d))}
              className="rounded-xl border border-border py-2 text-sm font-semibold text-muted-foreground active:bg-muted"
            >
              {d > 0 ? `+${d}` : d}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-3xl border border-border bg-card p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sidled</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(
            [
              { v: -1 as const, label: "Vänster" },
              { v: 0 as const, label: "Rakt" },
              { v: 1 as const, label: "Höger" },
            ]
          ).map((o) => (
            <button
              key={o.label}
              onClick={() => {
                setSide(o.v);
                if (o.v === 0) setOffset(0);
                else if (offset === 0) setOffset(3);
              }}
              className={`rounded-xl py-3 text-sm font-semibold transition-colors ${
                side === o.v
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {side !== 0 && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[1, 3, 5, 8, 10, 15, 20, 25].map((m) => (
              <button
                key={m}
                onClick={() => setOffset(m)}
                className={`rounded-xl py-2 text-sm font-semibold transition-colors ${
                  offset === m
                    ? "bg-flag text-background"
                    : "border border-border text-muted-foreground"
                }`}
              >
                {m} m
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onCommit}
        className="mt-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
      >
        {index + 1 === PRECISION_TOTAL_SHOTS ? "Avsluta test" : "Nästa slag"}
        <ArrowRight className="h-5 w-5" />
      </button>
    </main>
  );
}

function StepButton({ onClick, icon }: { onClick: () => void; icon: "plus" | "minus" }) {
  return (
    <button
      onClick={onClick}
      aria-label={icon === "plus" ? "Öka" : "Minska"}
      className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border text-foreground active:bg-muted"
    >
      {icon === "plus" ? <Plus className="h-6 w-6" /> : <Minus className="h-6 w-6" />}
    </button>
  );
}

/* --------------------------------------------------------------- result */

function ResultScreen({
  shots,
  prev,
  onRestart,
}: {
  shots: PrecisionShot[];
  prev: { score: number; avgProximity: number } | null;
  onRestart: () => void;
}) {
  const result = useMemo(() => precisionResult(shots), [shots]);
  const filled = shots.filter((s) => s.filled);
  const scoreDelta = prev ? result.score - prev.score : null;

  const scatterData = filled.map((s) => ({
    x: Number(s.offline.toFixed(1)),
    y: Number(lengthError(s).toFixed(1)),
  }));
  const barData = result.perTarget
    .filter((t) => t.count > 0)
    .map((t) => ({
      label: `${t.target}`,
      score: t.score,
      isBest: result.strongest?.target === t.target,
      isWorst: result.weakest?.target === t.target,
    }));

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-8">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Approach Test · klart
        </p>
        <h1 className="text-4xl leading-none">Ditt resultat</h1>
        <p className="mt-2 flex items-center gap-1 text-xs text-primary">
          <Check className="h-4 w-4" /> Testet är sparat i historiken
        </p>
      </header>

      <section className="mt-5 rounded-3xl border border-border bg-card p-6 text-center shadow-[var(--shadow-glow)]">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Approach Score</p>
        <p className="font-[family-name:var(--font-display)] text-7xl leading-none">
          {result.score}
          <span className="ml-1 text-2xl text-muted-foreground">/100</span>
        </p>
        {scoreDelta !== null && (
          <p
            className={`mt-1 flex items-center justify-center gap-1 text-sm ${
              scoreDelta >= 0 ? "text-primary" : "text-flag"
            }`}
          >
            {scoreDelta >= 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {scoreDelta > 0 ? "+" : ""}
            {scoreDelta} sedan förra testet
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Score bygger på hur nära flaggan du landar i procent av slaglängden.
        </p>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <Stat
          label="Est. approach-hcp"
          value={result.handicap.toFixed(1)}
          hint="Skattat utifrån precision"
        />
        <Stat
          label="Snitt till flaggan"
          value={`${result.avgProximity.toFixed(1)} m`}
          hint={
            prev
              ? `${result.avgProximity - prev.avgProximity > 0 ? "+" : ""}${(result.avgProximity - prev.avgProximity).toFixed(1)} m mot förra`
              : "Alla 18 slag"
          }
        />
        <Stat
          label="Snitt i procent"
          value={`${result.avgProximityPct.toFixed(1)} %`}
          hint="Av slagets längd"
        />
        <Stat
          label="Konsistens"
          value={`${result.consistency}/100`}
          hint="Jämnhet mellan slagen"
        />
      </section>

      <section className="mt-6">
        <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
          Resultat per avstånd
        </h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid grid-cols-4 gap-2 border-b border-border px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <span>Mål</span>
            <span className="text-right">Score</span>
            <span className="text-right">Hcp</span>
            <span className="text-right">Närhet</span>
          </div>
          {result.perTarget.map((t) => (
            <div
              key={t.target}
              className="grid grid-cols-4 gap-2 border-b border-border/50 px-4 py-2 text-sm last:border-0"
            >
              <span>{t.target} m</span>
              <span className="text-right font-semibold">{t.count ? t.score : "–"}</span>
              <span className="text-right text-muted-foreground">
                {t.count ? t.handicap.toFixed(1) : "–"}
              </span>
              <span className="text-right text-muted-foreground">
                {t.count ? `${t.avgProximity.toFixed(1)} m` : "–"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <ChartBlock title="Score per avstånd">
        <BarChart data={barData} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" unit=" m" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="currentColor" />
          <Tooltip formatter={(v: number) => `${v} / 100`} />
          <Bar dataKey="score" radius={[6, 6, 0, 0]}>
            {barData.map((d) => (
              <Cell
                key={d.label}
                fill={
                  d.isBest
                    ? "hsl(var(--primary))"
                    : d.isWorst
                      ? "hsl(var(--flag))"
                      : "hsl(var(--muted-foreground))"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ChartBlock>

      <ChartBlock title="Spridning runt flaggan">
        <ScatterChart margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" dataKey="x" name="Sidled" unit=" m" tick={{ fontSize: 11 }} stroke="currentColor" />
          <YAxis type="number" dataKey="y" name="Längdfel" unit=" m" tick={{ fontSize: 11 }} stroke="currentColor" />
          <ZAxis range={[60, 60]} />
          <ReferenceLine x={0} stroke="hsl(var(--flag))" />
          <ReferenceLine y={0} stroke="hsl(var(--flag))" />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Scatter data={scatterData} fill="hsl(var(--primary))" />
        </ScatterChart>
      </ChartBlock>

      <section className="mt-6 space-y-3">
        <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Din analys</h2>
        <InfoCard title="Största styrka">
          {result.strongest
            ? `${result.strongest.target} m – score ${result.strongest.score}/100. Här landar du närmast flaggan i förhållande till slaglängden.`
            : "–"}
        </InfoCard>
        <InfoCard title="Största svaghet">
          {result.weakest
            ? `${result.weakest.target} m – score ${result.weakest.score}/100. Det avståndet drar ner din totala Approach Score mest.`
            : "–"}
        </InfoCard>
        <InfoCard title="Mot referensnivåer">
          Du snittar {result.avgProximityPct.toFixed(1)} % av slaglängden till flaggan, vilket
          motsvarar {benchmarkLabel(result.avgProximityPct).toLowerCase()}. Referens:{" "}
          {PRECISION_BENCHMARKS.map((b) => `${b.label} ${b.pct} %`).join(", ")}.
        </InfoCard>
        <InfoCard title="Träningsrekommendation">{precisionAdvice(result)}</InfoCard>
        <InfoCard title="Nästa test">
          Gör om Approach Test en gång per vecka eller en gång per månad för att följa din
          utveckling.
        </InfoCard>
      </section>

      <div className="mt-6 flex gap-3">
        <button
          onClick={onRestart}
          className="flex-1 rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
        >
          Nytt test
        </button>
        <Link
          to="/"
          className="flex-1 rounded-2xl border border-border py-4 text-center font-[family-name:var(--font-display)] text-2xl text-muted-foreground"
        >
          Startsidan
        </Link>
      </div>
      <Link
        to="/precision-historik"
        className="mt-3 block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Se historik
      </Link>
    </main>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="font-[family-name:var(--font-display)] text-3xl leading-none">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function ChartBlock({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <section className="mt-6 rounded-3xl border border-border bg-card p-4">
      <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">{title}</h2>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </section>
  );
}
