import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  PRECISION_TARGETS,
  analysePrecision,
  handicapLabel,
  missPattern,
  precisionResult,
  scoreGrade,
  type PrecisionShot,
} from "@/lib/precision";
import { loadPrecisionSessions, type PrecisionSession } from "@/lib/precision-store";
import { PrecisionReport } from "@/components/precision-report";

export const Route = createFileRoute("/precision-historik")({
  head: () => ({
    meta: [
      { title: "Historik – Inspelstest | SG4" },
      {
        name: "description",
        content:
          "Följ din Precision Score över tid, se snittscore per avstånd, missmönster och rekommendationer inför nästa träningspass.",
      },
      { property: "og:title", content: "Historik – Inspelstest" },
      {
        property: "og:description",
        content: "Utveckling, styrkor, svagheter och missmönster i ditt inspelsspel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrecisionHistoryPage,
});

const GRADE_BAR: Record<string, string> = {
  good: "bg-primary",
  mid: "bg-flag",
  poor: "bg-destructive",
};

function PrecisionHistoryPage() {
  const [sessions, setSessions] = useState<PrecisionSession[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    setSessions(loadPrecisionSessions());
  }, []);

  const recent = useMemo(() => sessions.slice(-5), [sessions]);

  const overview = useMemo(() => {
    if (!recent.length) return null;
    const scores = recent.map((s) => s.score ?? 0);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const first = scores[0];
    const last = scores[scores.length - 1];
    const changePct = first > 0 ? Math.round(((last - first) / first) * 100) : 0;

    const allShots: PrecisionShot[] = recent.flatMap((s) => s.shots);
    const results = recent.map((s) => precisionResult(s.shots));
    const perTarget = PRECISION_TARGETS.map((target) => {
      const vals = results
        .map((r) => r.perTarget.find((t) => t.target === target))
        .filter((t) => t && t.count > 0)
        .map((t) => t!.score);
      return {
        target,
        score: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null,
      };
    });
    const withData = perTarget.filter((t) => t.score !== null);
    const sorted = [...withData].sort((a, b) => b.score! - a.score!);
    const analysis = analysePrecision(allShots);
    return {
      avg,
      changePct,
      perTarget,
      best: sorted[0],
      worst: sorted[sorted.length - 1],
      miss: missPattern(allShots),
      analysis,
      lastHcp: precisionResult(recent[recent.length - 1].shots).handicap,
    };
  }, [recent]);

  const chartData = sessions.map((s) => ({
    label: new Date(s.date).toLocaleDateString("sv-SE", { day: "2-digit", month: "2-digit" }),
    score: s.score ?? 0,
  }));

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-20 pt-10">
      <Link to="/precision" className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
        ← Inspelstest
      </Link>
      <h1 className="mt-3 text-5xl leading-none">Historik</h1>

      {!overview ? (
        <p className="mt-8 rounded-3xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          Inga tester sparade än. Genomför Inspelstestet så visas utvecklingen här.
        </p>
      ) : (
        <div className="mt-10 space-y-10">
          <section className="text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Snitt senaste {recent.length} testerna
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-7xl leading-none">
              {overview.avg}
              <span className="ml-1 text-2xl text-muted-foreground">/100</span>
            </p>
            <p
              className={`mt-1 text-sm ${overview.changePct >= 0 ? "text-primary" : "text-destructive"}`}
            >
              {overview.changePct > 0 ? "+" : ""}
              {overview.changePct} % utveckling · est. handicap{" "}
              {handicapLabel(overview.lastHcp)}
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl leading-none">Utveckling över tid</h2>
            <div className="mt-4 h-56 rounded-3xl border border-border bg-card p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="currentColor" />
                  <Tooltip formatter={(v: number) => `${v} / 100`} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl leading-none">Snittscore per avstånd</h2>
            <div className="mt-4 space-y-3">
              {overview.perTarget.map((t) => (
                <div key={t.target} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-sm text-muted-foreground">{t.target} m</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${t.score !== null ? GRADE_BAR[scoreGrade(t.score)] : "bg-muted"}`}
                      style={{ width: `${t.score ?? 0}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right text-sm font-semibold">
                    {t.score ?? "–"}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Starkast {overview.best?.target} m · svagast {overview.worst?.target} m
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl leading-none">Missmönster</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MissStat label="Kort" value={overview.miss.shortPct} />
              <MissStat label="Långt" value={overview.miss.longPct} />
              <MissStat label="Vänster" value={overview.miss.leftPct} />
              <MissStat label="Höger" value={overview.miss.rightPct} />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-2xl leading-none">Analys</h2>
            <Block title="Styrkor" items={overview.analysis.strengths} tone="text-primary" />
            <Block
              title="Svagheter"
              items={overview.analysis.improvements}
              tone="text-destructive"
            />
            <Block
              title="Inför nästa träningspass"
              items={overview.analysis.focus}
              tone="text-flag"
            />
          </section>

          <section>
            <h2 className="font-display text-2xl leading-none">Alla tester</h2>
            <div className="mt-4 space-y-3">
              {[...sessions].reverse().map((s) => {
                const isOpen = open === s.id;
                return (
                  <div key={s.id} className="rounded-3xl border border-border bg-card">
                    <button
                      onClick={() => setOpen(isOpen ? null : s.id)}
                      className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                    >
                      <div>
                        <p className="text-sm">
                          {new Date(s.date).toLocaleDateString("sv-SE")}{" "}
                          <span className="text-muted-foreground">
                            {new Date(s.date).toLocaleTimeString("sv-SE", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {s.avgProximity.toFixed(1)} m till flaggan
                          {s.avgProximityPct !== undefined
                            ? ` · ${s.avgProximityPct.toFixed(1)} %`
                            : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-[family-name:var(--font-display)] text-3xl leading-none">
                          {s.score ?? "–"}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </div>
                    </button>
                    {isOpen ? (
                      <div className="border-t border-border px-5 py-6">
                        <PrecisionReport shots={s.shots} compact />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function MissStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-3xl leading-none">{value} %</p>
    </div>
  );
}

function Block({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <p className={`text-xs uppercase tracking-[0.2em] ${tone}`}>{title}</p>
      <ul className="mt-3 space-y-2">
        {items.map((t) => (
          <li key={t} className="flex gap-2 text-sm leading-relaxed">
            <span className={tone}>•</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
