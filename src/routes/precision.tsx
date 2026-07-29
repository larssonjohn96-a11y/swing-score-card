import { Link, createFileRoute } from "@tanstack/react-router";
import { Check, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
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
  PRECISION_TOTAL_SHOTS,
  bestWorstTarget,
  emptyPrecisionShots,
  lengthError,
  lengthLabel,
  proximity,
  sideLabel,
  statsByTarget,
  summarize,
  type PrecisionShot,
} from "@/lib/precision";
import {
  deletePrecisionSession,
  loadPrecisionSessions,
  savePrecisionSession,
  type PrecisionSession,
} from "@/lib/precision-store";

export const Route = createFileRoute("/precision")({
  head: () => ({
    meta: [
      { title: "Approach Precision Test – 18 slag | SG4" },
      {
        name: "description",
        content:
          "18 inspel mot 55–165 m. Mata in carry och sidled så räknar appen ut längdfel, sidledsfel och avstånd till flaggan.",
      },
      { property: "og:title", content: "Approach Precision Test – 18 slag" },
      {
        property: "og:description",
        content: "Mät precision på inspel: proximity, spridning och konsistens per avstånd.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrecisionPage,
});

function PrecisionPage() {
  const [shots, setShots] = useState<PrecisionShot[]>(emptyPrecisionShots);
  const [index, setIndex] = useState(0);
  const [carry, setCarry] = useState("");
  const [offline, setOffline] = useState("");
  const [done, setDone] = useState(false);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [fade, setFade] = useState(false);
  const [sessions, setSessions] = useState<PrecisionSession[]>([]);

  useEffect(() => {
    setSessions(loadPrecisionSessions());
  }, []);

  const current = shots[Math.min(index, PRECISION_TOTAL_SHOTS - 1)];
  const next = shots[index + 1];
  const summary = useMemo(() => summarize(shots), [shots]);
  const stats = useMemo(() => statsByTarget(shots), [shots]);
  const { best: bestTarget, worst: worstTarget } = bestWorstTarget(stats);
  const filled = shots.filter((s) => s.filled);

  const num = (v: string) => Number(v.replace(",", ".").trim());

  function commit() {
    const c = num(carry);
    if (!Number.isFinite(c) || c <= 0) return;
    const o = offline.trim() === "" ? 0 : num(offline);
    if (!Number.isFinite(o)) return;
    setShots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, carry: c, offline: o, filled: true } : s)),
    );
    setCarry("");
    setOffline("");
    setFade(true);
    window.setTimeout(() => setFade(false), 220);
    if (index + 1 >= PRECISION_TOTAL_SHOTS) setDone(true);
    else setIndex(index + 1);
  }

  function save() {
    const record = savePrecisionSession(shots, note);
    setSessions((prev) => [...prev, record]);
    setNote("");
    setSaved(true);
  }

  function reset() {
    setShots(emptyPrecisionShots());
    setIndex(0);
    setCarry("");
    setOffline("");
    setDone(false);
    setSaved(false);
  }

  function remove(id: string) {
    setSessions(deletePrecisionSession(id));
  }

  const progress = Math.round((filled.length / PRECISION_TOTAL_SHOTS) * 100);

  const scatterData = filled.map((s) => ({
    x: Number(s.offline.toFixed(1)),
    y: Number(lengthError(s).toFixed(1)),
    label: `${s.target} m`,
  }));

  const barData = stats
    .filter((s) => s.count > 0)
    .map((s) => ({
      label: `${s.target}`,
      avg: Number(s.avg.toFixed(2)),
      isBest: bestTarget?.target === s.target,
      isWorst: worstTarget?.target === s.target,
    }));

  const seriesData = filled.map((s) => ({
    label: `${s.index}`,
    prox: Number(proximity(s).toFixed(2)),
  }));

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Approach · 18 slag
          </p>
          <h1 className="text-4xl leading-none">Precision test</h1>
        </div>
        <Link
          to="/kategori/$slug"
          params={{ slug: "approach" }}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Tillbaka
        </Link>
      </header>

      <div className="mt-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Slag {Math.min(filled.length + (done ? 0 : 1), PRECISION_TOTAL_SHOTS)} av{" "}
            {PRECISION_TOTAL_SHOTS}
          </span>
          <span>{progress} %</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {!done ? (
        <section
          className={`mt-6 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-glow)] transition-all duration-200 ${
            fade ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"
          }`}
        >
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Varv {current.round} · mål
          </p>
          <p className="font-[family-name:var(--font-display)] text-7xl leading-none text-flag">
            {current.target}
            <span className="ml-2 text-2xl text-muted-foreground">meter</span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Slå ett slag mot {current.target} meter.
          </p>

          <label htmlFor="carry" className="mt-6 block text-sm text-muted-foreground">
            Carry (meter)
          </label>
          <input
            id="carry"
            inputMode="decimal"
            autoFocus
            value={carry}
            onChange={(e) => setCarry(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commit()}
            placeholder="53,8"
            className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-5 text-center font-[family-name:var(--font-display)] text-5xl text-foreground outline-none focus:border-primary"
          />

          <label htmlFor="offline" className="mt-4 block text-sm text-muted-foreground">
            Sidled (meter) · − vänster / + höger
          </label>
          <input
            id="offline"
            inputMode="text"
            value={offline}
            onChange={(e) => setOffline(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commit()}
            placeholder="-2,1"
            className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-5 text-center font-[family-name:var(--font-display)] text-5xl text-foreground outline-none focus:border-primary"
          />

          <button
            onClick={commit}
            className="mt-5 w-full rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
          >
            Spara slag
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {next ? `Nästa: ${next.target} m (varv ${next.round})` : "Sista slaget"}
          </p>
        </section>
      ) : (
        <section className="mt-6 rounded-3xl border border-border bg-card p-6">
          <h2 className="text-2xl">Testet är klart</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Snittprecision {summary.avgProximity.toFixed(2)} m · konsistens {summary.consistency}
            /100
          </p>
          <label htmlFor="note" className="mt-5 block text-sm text-muted-foreground">
            Anteckning (valfritt)
          </label>
          <input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Simulator, boll, känsla…"
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

      {filled.length > 0 && (
        <section className="mt-6 grid grid-cols-2 gap-3">
          <Stat label="Snitt precision" value={`${summary.avgProximity.toFixed(2)} m`} />
          <Stat label="Median" value={`${summary.medianProximity.toFixed(2)} m`} />
          <Stat
            label="Bästa slag"
            value={summary.best ? `${proximity(summary.best).toFixed(2)} m` : "–"}
            hint={summary.best ? `${summary.best.target} m mål` : undefined}
          />
          <Stat
            label="Sämsta slag"
            value={summary.worst ? `${proximity(summary.worst).toFixed(2)} m` : "–"}
            hint={summary.worst ? `${summary.worst.target} m mål` : undefined}
          />
          <Stat
            label="Snitt längdfel"
            value={`${summary.avgLengthError > 0 ? "+" : ""}${summary.avgLengthError.toFixed(1)} m`}
            hint={summary.avgLengthError < 0 ? "kort" : "långt"}
          />
          <Stat
            label="Snitt sidled"
            value={`${summary.avgAbsSideError.toFixed(1)} m`}
            hint={sideLabel(summary.avgSideError)}
          />
          <div className="col-span-2 rounded-2xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Konsistenspoäng
            </p>
            <p className="font-[family-name:var(--font-display)] text-4xl leading-none">
              {summary.consistency}
              <span className="ml-1 text-lg text-muted-foreground">/100</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Spridning {summary.spread.toFixed(2)} m mellan slagen
            </p>
          </div>
        </section>
      )}

      {filled.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
            Resultat per avstånd
          </h2>
          <div className="mt-3 space-y-2">
            {stats.map((s) => (
              <div key={s.target} className="rounded-2xl border border-border bg-card px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span>{s.target} m</span>
                  <span className={s.count ? "text-flag" : "text-muted-foreground"}>
                    {s.count ? `${s.avg.toFixed(2)} m medel` : "–"}
                  </span>
                </div>
                <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  {s.shots.map((shot, i) => (
                    <p key={i}>
                      Varv {i + 1}:{" "}
                      {shot
                        ? `${shot.carry.toFixed(1)} m carry · ${sideLabel(shot.offline)} · ${proximity(shot).toFixed(2)} m från flaggan (${lengthLabel(shot)})`
                        : "–"}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {filled.length > 0 && (
        <>
          <ChartBlock title="Spridning runt mål">
            <ScatterChart margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                dataKey="x"
                name="Sidled"
                unit=" m"
                tick={{ fontSize: 11 }}
                stroke="currentColor"
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Längdfel"
                unit=" m"
                tick={{ fontSize: 11 }}
                stroke="currentColor"
              />
              <ZAxis range={[60, 60]} />
              <ReferenceLine x={0} stroke="hsl(var(--flag))" />
              <ReferenceLine y={0} stroke="hsl(var(--flag))" />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={scatterData} fill="hsl(var(--primary))" />
            </ScatterChart>
          </ChartBlock>

          <ChartBlock title="Snitt precision per avstånd">
            <BarChart data={barData} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" unit=" m" />
              <YAxis tick={{ fontSize: 11 }} stroke="currentColor" />
              <Tooltip formatter={(v: number) => `${v} m`} />
              <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
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

          <ChartBlock title="Konsistens – slag 1 till 18">
            <LineChart data={seriesData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" />
              <YAxis tick={{ fontSize: 11 }} stroke="currentColor" />
              <Tooltip formatter={(v: number) => `${v} m`} />
              <ReferenceLine
                y={Number(summary.avgProximity.toFixed(2))}
                stroke="hsl(var(--flag))"
                strokeDasharray="4 4"
              />
              <Line
                type="monotone"
                dataKey="prox"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ChartBlock>
        </>
      )}

      {sessions.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Historik</h2>
          <div className="mt-3 space-y-2">
            {[...sessions].reverse().map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm"
              >
                <div>
                  <p>
                    {new Date(s.date).toLocaleDateString("sv-SE")}{" "}
                    <span className="text-muted-foreground">
                      {new Date(s.date).toLocaleTimeString("sv-SE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.avgProximity.toFixed(2)} m snitt · median {s.medianProximity.toFixed(2)} m ·
                    konsistens {s.consistency}
                  </p>
                  {s.note ? <p className="text-xs text-muted-foreground">{s.note}</p> : null}
                </div>
                <button
                  onClick={() => remove(s.id)}
                  aria-label="Ta bort passet"
                  className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
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
