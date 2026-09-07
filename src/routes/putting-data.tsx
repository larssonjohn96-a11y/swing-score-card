import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { useMemo, useState } from "react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import {
  RECENT_PUTT_SAMPLE,
  collectLagHoleOutStarts,
  collectLagProximityStarts,
  collectPuttStarts,
  groupedLagHoleOutStats,
  groupedLagProximityStats,
  latestRows,
  puttingMakeStats,
} from "@/lib/putting-global";

export const Route = createFileRoute("/putting-data")({
  head: () => ({
    meta: [
      { title: "Puttingdata – alla tester samlat | SG4" },
      {
        name: "description",
        content: "Samlad puttingdata från flera SG4-tester: träffprocent, lagputt, riskzon och spelarprofil.",
      },
    ],
  }),
  component: PuttingDataPage,
});

const fmt = (value: number, decimals = 0) => value.toFixed(decimals).replace(".", ",");
const clampPct = (value: number) => Math.max(0, Math.min(100, value));

const SHORT_PUTT_BINS = [
  { min: 0, max: 1, label: "0–1 m" },
  { min: 1, max: 2, label: "1–2 m" },
  { min: 2, max: 3, label: "2–3 m" },
  { min: 3, max: 4, label: "3–4 m" },
  { min: 4, max: 5, label: "4–5 m" },
] as const;

type ShortPuttBin = { label: string; made: number; attempts: number; pct: number };
type Scope = "recent" | "all";

function shortPuttBins(exact: ReturnType<typeof puttingMakeStats>): ShortPuttBin[] {
  return SHORT_PUTT_BINS.map((bin, index) => {
    const rows = exact.filter((row) => index === 0 ? row.distance >= bin.min && row.distance <= bin.max : row.distance > bin.min && row.distance <= bin.max);
    const made = rows.reduce((sum, row) => sum + row.made, 0);
    const attempts = rows.reduce((sum, row) => sum + row.attempts, 0);
    return { label: bin.label, made, attempts, pct: attempts ? (made / attempts) * 100 : 0 };
  });
}

function weightedPct(rows: Array<{ made: number; attempts: number }>) {
  const attempts = rows.reduce((sum, row) => sum + row.attempts, 0);
  const made = rows.reduce((sum, row) => sum + row.made, 0);
  return attempts ? (made / attempts) * 100 : 0;
}

function PuttingDataPage() {
  const [scope, setScope] = useState<Scope>("recent");

  const allStarts = useMemo(() => collectPuttStarts(), []);
  const allLagHoleOut = useMemo(() => collectLagHoleOutStarts(), []);
  const allLagProximity = useMemo(() => collectLagProximityStarts(), []);

  const starts = scope === "recent" ? latestRows(allStarts) : allStarts;
  const lagHoleOutStarts = scope === "recent" ? latestRows(allLagHoleOut) : allLagHoleOut;
  const lagProximityStarts = scope === "recent" ? latestRows(allLagProximity) : allLagProximity;

  const makeStats = puttingMakeStats(starts);
  const shortStats = shortPuttBins(makeStats);
  const lagHoleOut = groupedLagHoleOutStats(lagHoleOutStarts);
  const lagProximity = groupedLagProximityStats(lagProximityStarts);
  const totalStarts = starts.length;

  const threePuttAvoidance = lagHoleOutStarts.length
    ? 100 - (lagHoleOutStarts.filter((row) => row.strokes >= 3).length / lagHoleOutStarts.length) * 100
    : 0;
  const withinOneMetre = lagProximityStarts.length
    ? (lagProximityStarts.filter((row) => row.score <= 0).length / lagProximityStarts.length) * 100
    : 0;

  const radarData = [
    { subject: "0–1 m", value: shortStats[0]?.pct ?? 0 },
    { subject: "1–2 m", value: shortStats[1]?.pct ?? 0 },
    { subject: "2–3 m", value: shortStats[2]?.pct ?? 0 },
    { subject: "3–5 m", value: weightedPct(shortStats.slice(3)) },
    { subject: "3-putt undvik.", value: threePuttAvoidance },
    { subject: "Lag inom 1 m", value: withinOneMetre },
  ];

  const reliableRisk = lagHoleOut.find((row) => row.attempts >= 5 && row.threePuttPct >= 20);
  const highestRisk = [...lagHoleOut].filter((row) => row.attempts >= 3).sort((a, b) => b.threePuttPct - a.threePuttPct)[0];

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-24 pt-8">
      <header>
        <Link to="/traning" search={{ category: "putting" }} aria-label="Tillbaka" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="mt-6 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><BarChart3 className="h-5 w-5" /></span>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Global skill data</p>
            <h1 className="mt-1 font-display text-4xl leading-none">Puttingdata</h1>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Samma putt räknas efter avstånd och utfall, oavsett vilket test den kom från.</p>
      </header>

      <div className="mt-5 grid grid-cols-2 rounded-2xl border border-border bg-muted/50 p-1">
        <button type="button" onClick={() => setScope("recent")} className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${scope === "recent" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
          Senaste {RECENT_PUTT_SAMPLE}
        </button>
        <button type="button" onClick={() => setScope("all")} className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${scope === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
          Alla puttar
        </button>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        {scope === "recent" ? `Visar upp till de ${RECENT_PUTT_SAMPLE} senaste registreringarna per datatyp.` : "Visar hela din sparade puttinghistorik."}
      </p>

      <section className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-border bg-card p-5 text-center shadow-[var(--shadow-glow)]">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Registrerade puttar</p>
          <p className="mt-1 font-display text-5xl leading-none text-primary">{totalStarts}</p>
          <p className="mt-1 text-xs text-muted-foreground">kort/medel-data</p>
        </div>
        <div className="rounded-3xl border border-border bg-card p-5 text-center">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Lagputtar</p>
          <p className="mt-1 font-display text-5xl leading-none">{lagHoleOutStarts.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">med hole-out-data</p>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Puttingprofil</p>
          <h2 className="font-display text-3xl">Din spelbild</h2>
          <p className="mt-1 text-xs text-muted-foreground">Bara mätvärden som faktiskt registreras i testerna. Alla axlar är 0–100 %.</p>
        </div>
        <div className="mt-2 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="70%">
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.18} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-end justify-between gap-3">
          <div><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Kortputt</p><h2 className="font-display text-3xl">Sänkprocent</h2></div>
          <span className="text-xs text-muted-foreground">alla kompatibla tester</span>
        </div>
        <div className="mt-3 space-y-2">
          {shortStats.map((row) => (
            <div key={row.label} className="rounded-2xl border border-border bg-card px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div><p className="font-display text-2xl">{row.label}</p><p className="text-xs text-muted-foreground">{row.attempts ? `${row.made} satta av ${row.attempts}` : "Ingen data ännu"}</p></div>
                <p className="font-display text-3xl text-primary">{row.attempts ? `${fmt(row.pct)}%` : "–"}</p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${clampPct(row.pct)}%` }} /></div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Lagputt · håla ut</p>
        <h2 className="font-display text-3xl">Puttar till hål</h2>
        <p className="mt-1 text-xs text-muted-foreground">Avstånden är sammanslagna till större zoner för stabilare statistik.</p>

        {(reliableRisk || highestRisk) ? (
          <div className="mt-3 rounded-2xl border border-primary/30 bg-primary/[0.04] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">3-putt risk</p>
            {reliableRisk ? (
              <p className="mt-1 text-sm"><span className="font-semibold">Riskzon från {reliableRisk.label}</span> · {fmt(reliableRisk.threePuttPct)}% av {reliableRisk.attempts} försök blev 3-putt+.</p>
            ) : (
              <p className="mt-1 text-sm"><span className="font-semibold">Högst hittills: {highestRisk?.label}</span> · {fmt(highestRisk?.threePuttPct ?? 0)}% 3-putt+. Mer data behövs för en stabil cutoff.</p>
            )}
          </div>
        ) : null}

        <div className="mt-3 space-y-2">
          {lagHoleOut.some((row) => row.attempts) ? lagHoleOut.filter((row) => row.attempts).map((row) => (
            <div key={row.label} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
              <div><p className="font-display text-2xl">{row.label}</p><p className="text-xs text-muted-foreground">{row.attempts} starter · {fmt(row.onePuttPct)}% 1-putt · {fmt(row.threePuttPct)}% 3-putt+</p></div>
              <div className="text-right"><p className="font-display text-3xl text-primary">{fmt(row.avgPutts, 2)}</p><p className="text-[10px] text-muted-foreground">snitt puttar</p></div>
            </div>
          )) : <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">Ingen hole-out-data på lagputtar ännu.</p>}
        </div>
      </section>

      <section className="mt-7">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Lagputt · längdkontroll</p>
        <h2 className="font-display text-3xl">Första putten</h2>
        <p className="mt-1 text-xs text-muted-foreground">Samma zoner, men bara tester som mäter var första putten stannade.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {lagProximity.some((row) => row.attempts) ? lagProximity.filter((row) => row.attempts).map((row) => (
            <div key={row.label} className="rounded-2xl border border-border bg-card p-3">
              <p className="font-display text-2xl">{row.label}</p>
              <p className="mt-1 text-sm font-semibold text-primary">{fmt(row.within1mPct)}% inom 1 m</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{row.attempts} puttar · {fmt(row.holedPct)}% hålade</p>
            </div>
          )) : <p className="col-span-2 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">Ingen längdkontrolldata ännu.</p>}
        </div>
      </section>
    </main>
  );
}
