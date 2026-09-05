import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LIGHT_SURFACE } from "@/routes/8-bollar";
import {
  dateLabel,
  deleteSession,
  loadSessions,
  type AnalysisSection,
  type TrainingSession,
} from "@/lib/training/core";
import { AnalysisSections } from "@/components/training/scored-test";
import type { TrainingTestRoute } from "@/lib/training/routes";

export type TestHistoryProps = {
  testId: string;
  title: string;
  testTo: TrainingTestRoute;
  /** vad totalvärdet betyder */
  valueLabel: string;
  valueSuffix?: string;
  higherIsBetter: boolean;
  /** max/min-referens som visas som hint */
  scaleHint?: string;
  variants?: { id: string; label: string }[];
  breakdown?: (sessions: TrainingSession[]) => AnalysisSection[];
};

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl leading-none">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function TestHistory(props: TestHistoryProps) {
  const [all, setAll] = useState<TrainingSession[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [variant, setVariant] = useState<string>(props.variants?.[0]?.id ?? "");

  useEffect(() => {
    setAll(loadSessions(props.testId));
  }, [props.testId]);

  const sessions = useMemo(
    () => (props.variants ? all.filter((s) => (s.variant ?? props.variants?.[0]?.id) === variant) : all),
    [all, variant, props.variants],
  );

  function remove(id: string) {
    if (typeof window !== "undefined" && !window.confirm("Vill du ta bort det här testet?")) return;
    setAll(deleteSession(props.testId, id));
  }

  const totals = sessions.map((s) => s.total);
  const latest = sessions.length ? sessions[sessions.length - 1] : null;
  const best = totals.length
    ? props.higherIsBetter
      ? Math.max(...totals)
      : Math.min(...totals)
    : 0;
  const average = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
  const chartData = sessions.slice(-12).map((s) => ({ label: dateLabel(s.date), value: s.total }));
  const listed = showAll ? [...sessions].reverse() : [...sessions].reverse().slice(0, 5);
  const suffix = props.valueSuffix ? ` ${props.valueSuffix}` : "";

  return (
    <main
      style={LIGHT_SURFACE}
      className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-16 pt-6 text-foreground"
    >
      <header className="flex items-center gap-3">
        <Link
          to={props.testTo}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold leading-tight">{props.title}</h1>
          <p className="text-xs text-muted-foreground">Progress · träningstest</p>
        </div>
      </header>

      {props.variants ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {props.variants.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVariant(v.id)}
              className={`rounded-2xl border py-2.5 text-sm font-semibold transition-colors ${
                variant === v.id ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      ) : null}

      {sessions.length === 0 ? (
        <section className="mt-8 rounded-3xl border border-dashed border-border bg-card p-8 text-center">
          <p className="font-semibold">Ingen historik ännu</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Genomför ditt första test så börjar utvecklingen sparas här.
          </p>
          <Link
            to={props.testTo}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
          >
            Gör ett test <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      ) : (
        <>
          <section className="mt-5 rounded-2xl border border-border bg-card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {props.valueLabel}
            </p>
            <p className="mt-2 font-display text-6xl leading-none">
              {latest?.total ?? 0}
              {props.valueSuffix ? (
                <span className="ml-2 text-base text-muted-foreground">{props.valueSuffix}</span>
              ) : null}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Senaste testet{props.scaleHint ? ` · ${props.scaleHint}` : ""}
            </p>
          </section>

          <section className="mt-3 grid grid-cols-3 gap-3">
            <Kpi label="Bästa" value={`${best}${suffix}`} />
            <Kpi label="Snitt" value={`${average.toFixed(1)}`} />
            <Kpi label="Tester" value={String(sessions.length)} />
          </section>

          <section className="mt-3 rounded-2xl border border-border bg-card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Utveckling {props.higherIsBetter ? "(högre är bättre)" : "(lägre är bättre)"}
            </p>
            <div className="mt-3 h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                  <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis width={34} tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, fontSize: 12 }}
                    formatter={(value: number) => [`${value}${suffix}`, props.valueLabel]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {props.breakdown ? <AnalysisSections sections={props.breakdown(sessions)} /> : null}

          <section className="mt-3 rounded-2xl border border-border bg-card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Tidigare tester
            </p>
            <ul className="mt-3 space-y-2">
              {listed.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2.5"
                >
                  <span className="text-sm text-muted-foreground">{dateLabel(s.date)}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-semibold tabular-nums">
                      {s.total}
                      {suffix}
                    </span>
                    <button
                      onClick={() => remove(s.id)}
                      aria-label="Ta bort test"
                      className="text-muted-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            {sessions.length > 5 ? (
              <button
                onClick={() => setShowAll((v) => !v)}
                className="mt-3 w-full rounded-xl border border-border py-2.5 text-xs font-semibold text-muted-foreground"
              >
                {showAll ? "Visa färre" : `Visa fler (${sessions.length - 5})`}
              </button>
            ) : null}
          </section>

          <Link
            to={props.testTo}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground"
          >
            Kör testet igen <ArrowRight className="h-4 w-4" />
          </Link>
        </>
      )}
    </main>
  );
}
