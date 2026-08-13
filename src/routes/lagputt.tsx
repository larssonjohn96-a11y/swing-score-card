import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Compass, Target, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  LAG_OK_LIMIT,
  LAG_PUTT_DISTANCES,
  emptyLagPutts,
  isApproved,
  loadLagPuttSessions,
  mean,
  intervalMidpoint,
  saveLagPuttSession,
  type LagPutt,
} from "@/lib/lagputt";
import { INTERVALS, type IntervalKey } from "@/lib/shortgame";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { TestHowItWorksLink } from "@/components/test-story";
import { LAGPUTT_STORY } from "@/lib/test-story-content";
import { hcpLabel } from "@/lib/sg-handicap";
import { TestResultProcessing, TestResultReveal, type RevealState } from "@/components/test-reveal";
import { computeRevealState } from "@/lib/test-reveal-helpers";

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

type Phase = "test" | "processing" | "reveal" | "result";

type RevealData = {
  state: RevealState;
  hcpLabel: string;
  previousHcpLabel?: string;
  deltaLabel?: string;
  isRetest: boolean;
};

const TOTAL = LAG_PUTT_DISTANCES.length; // 6

function LagPuttPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("test");
  const [putts, setPutts] = useState<LagPutt[]>(emptyLagPutts);
  const [index, setIndex] = useState(0);
  const [interval, setInterval] = useState<IntervalKey | null>(null);
  const [prevPct, setPrevPct] = useState<number | null>(null);
  const [prevHcp, setPrevHcp] = useState<number | null>(null);
  const [reveal, setReveal] = useState<RevealData | null>(null);

  const current = putts[Math.min(index, TOTAL - 1)];

  useHideBottomNav(true);

  function start() {
    const sessions = loadLagPuttSessions();
    const last = sessions[sessions.length - 1];
    setPrevPct(last ? last.pct : null);
    setPrevHcp(last ? last.handicap : null);
    setPutts(emptyLagPutts());
    setIndex(0);
    setInterval(null);
    setReveal(null);
    setPhase("test");
  }

  useEffect(() => {
    start();
  }, []);

  function commit() {
    if (!interval) return;
    const updatedPutts = putts.map((putt, i) => (i === index ? { ...putt, interval } : putt));
    setPutts(updatedPutts);
    setInterval(null);
    const next = index + 1;
    if (next >= TOTAL) {
      const previousSessions = loadLagPuttSessions();
      const previousHcps = previousSessions.map((s) => s.handicap);
      const saved = saveLagPuttSession(updatedPutts);
      const derived = computeRevealState(previousHcps, saved.handicap);
      setReveal({
        state: derived.state,
        hcpLabel: hcpLabel(saved.handicap),
        previousHcpLabel:
          derived.previousHcp !== undefined ? hcpLabel(derived.previousHcp) : undefined,
        deltaLabel: derived.deltaLabel,
        isRetest: previousSessions.length > 0,
      });
      setPhase("processing");
    } else {
      setIndex(next);
    }
  }

  function back() {
    if (index === 0) return;
    const i = index - 1;
    setIndex(i);
    setInterval(putts[i].interval ?? null);
  }

  if (phase === "test") {
    const pct = Math.round((index / TOTAL) * 100);
    const selected = INTERVALS.find((iv) => iv.key === interval);

    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-32 pt-4">
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

        <div className="mt-5 rounded-3xl border-2 border-border bg-card p-6 text-center shadow-[var(--shadow-glow)]">
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

        <div className="mt-5 rounded-2xl border border-border bg-card p-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Hur nära hålet stannade putten?
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {INTERVALS.map((iv) => (
              <button
                key={iv.key}
                type="button"
                onClick={() => setInterval(iv.key)}
                aria-pressed={interval === iv.key}
                className={`rounded-xl border-2 py-3.5 text-sm font-semibold leading-tight transition-colors ${
                  interval === iv.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-transparent text-foreground active:bg-muted"
                }`}
              >
                {iv.label}
              </button>
            ))}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 px-6 pb-6 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <p className="mb-3 text-center text-sm leading-snug text-muted-foreground">
            {selected ? (
              <>
                Putten stannade{" "}
                <span className="font-semibold text-foreground">
                  {selected.label.toLowerCase()}
                </span>{" "}
                från hålet.
              </>
            ) : (
              "Välj hur nära hålet putten stannade."
            )}
          </p>
          <button
            onClick={commit}
            disabled={!interval}
            className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground disabled:opacity-40"
          >
            {index + 1 === TOTAL ? "Avsluta test" : "Nästa putt"}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </main>
    );
  }

  if (phase === "processing" && reveal) {
    return (
      <TestResultProcessing
        testLabel="Lagputt"
        secondaryLabel={`${TOTAL} / ${TOTAL} puttar`}
        isRetest={reveal.isRetest}
        onDone={() => setPhase("reveal")}
      />
    );
  }

  if (phase === "reveal" && reveal) {
    return (
      <TestResultReveal
        testLabel="Lagputt"
        value={reveal.hcpLabel}
        previousValue={reveal.previousHcpLabel}
        deltaLabel={reveal.deltaLabel}
        state={reveal.state}
        profileUpdated
        onContinue={() => setPhase("result")}
      />
    );
  }

  return <LagPuttReport putts={putts} prevPct={prevPct} prevHcp={prevHcp} onRestart={start} />;
}

/* --------------------------------------------------------------- result */

function LagPuttReport({
  putts,
  prevPct,
  prevHcp,
  onRestart,
}: {
  putts: LagPutt[];
  prevPct: number | null;
  prevHcp: number | null;
  onRestart: () => void;
}) {
  const approved = putts.filter(isApproved).length;
  const pct = putts.length ? (approved / putts.length) * 100 : 0;
  const avgLeft = mean(putts.map((p) => intervalMidpoint(p.interval)));
  const handicap = Math.max(-4, Math.min(36, 30 - pct * 0.34));
  const sortedPutts = [...putts].sort((a, b) => a.distance - b.distance);
  const bestPutt = [...putts].sort(
    (a, b) => intervalMidpoint(a.interval) - intervalMidpoint(b.interval),
  )[0];

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-10">
      <p className="mb-6 flex items-center justify-center gap-1 text-xs text-primary">
        <Check className="h-4 w-4" /> Testet är sparat
      </p>

      <section className="rounded-3xl border border-border bg-card p-6 text-center shadow-[var(--shadow-glow)]">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Lagputt HCP</p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-7xl leading-none text-primary">
          {hcpLabel(handicap)}
        </p>
        {prevHcp !== null && (
          <p
            className={`mt-2 text-sm font-medium ${
              handicap <= prevHcp ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {handicap <= prevHcp ? "↓" : "↑"} {Math.abs(Math.round((handicap - prevHcp) * 10) / 10)}{" "}
            sedan förra testet
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 divide-x divide-border border-t border-border pt-4">
          <div>
            <p className="font-[family-name:var(--font-display)] text-3xl leading-none">
              {pct.toFixed(0)}
              <span className="text-base text-muted-foreground">%</span>
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              Godkända (≤{LAG_OK_LIMIT} m)
            </p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-display)] text-3xl leading-none">
              {avgLeft.toFixed(1)}
              <span className="text-base text-muted-foreground"> m</span>
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              Snitt kvar
            </p>
          </div>
        </div>
        {prevPct !== null && (
          <p
            className={`mt-3 text-xs ${pct - prevPct >= 0 ? "text-primary" : "text-muted-foreground"}`}
          >
            {pct - prevPct > 0 ? "+" : ""}
            {Math.round(pct - prevPct)} procentenheter godkända sedan förra testet
          </p>
        )}
      </section>

      <p className="mt-4 rounded-2xl bg-primary/5 p-4 text-sm leading-relaxed text-foreground">
        {approved === putts.length
          ? "Alla puttar godkända – mycket stabil längdkänsla över hela testet."
          : bestPutt
            ? `Bäst längdkänsla på ${bestPutt.distance} m. ${
                putts.length - approved
              } putt${putts.length - approved === 1 ? "" : "ar"} hamnade utanför godkänt intervall.`
            : ""}
      </p>

      <section className="mt-4 rounded-3xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Alla puttar · efter avstånd
        </p>
        <div className="mt-3 space-y-2">
          {sortedPutts.map((p, i) => {
            const iv = INTERVALS.find((x) => x.key === p.interval);
            const ok = isApproved(p);
            return (
              <div
                key={i}
                className="flex items-center justify-between rounded-2xl border border-border px-4 py-2.5 text-sm"
              >
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Target className="h-3.5 w-3.5" />
                  {p.distance} m
                </span>
                <span className={ok ? "font-semibold text-primary" : "text-muted-foreground"}>
                  {iv?.label ?? "–"} · {ok ? "Godkänt" : "Ej godkänt"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-6 flex gap-3">
        <div className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-primary bg-primary/10 py-4 text-base font-semibold text-primary">
          <Check className="h-5 w-5" /> Testet sparat
        </div>
        <button
          onClick={onRestart}
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
