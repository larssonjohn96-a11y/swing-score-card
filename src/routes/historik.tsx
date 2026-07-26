import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import {
  DISTANCES,
  deleteSession,
  distanceStats,
  formatScore,
  loadSessions,
  type SessionRecord,
} from "@/lib/drill";
import {
  BUNKER_LIES,
  deleteBunkerSession,
  loadBunkerSessions,
  type BunkerSession,
} from "@/lib/bunker";

export const Route = createFileRoute("/historik")({
  head: () => ({
    meta: [
      { title: "Historik – följ dina golftester över tid" },
      {
        name: "description",
        content:
          "Se alla dina 18-bollarspass och bunkertester, snittresultat och träffprocent per avstånd.",
      },
      { property: "og:title", content: "Historik – följ dina golftester över tid" },
      {
        property: "og:description",
        content: "Snittscore, bästa pass, träffprocent per avstånd och bunkersnitt i fot.",
      },
    ],
  }),
  component: HistoryPage,
});

type Tab = "drill" | "bunker";

function HistoryPage() {
  const [tab, setTab] = useState<Tab>("drill");
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [bunker, setBunker] = useState<BunkerSession[]>([]);

  useEffect(() => {
    setSessions(loadSessions());
    setBunker(loadBunkerSessions());
  }, []);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Utveckling</p>
          <h1 className="text-4xl leading-none">Historik</h1>
        </div>
        <Link
          to="/"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Tester
        </Link>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-1">
        {(
          [
            ["drill", "18 bollar"],
            ["bunker", "Bunkerslag"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-xl py-2 text-sm font-medium transition-colors ${
              tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "drill" ? (
        <DrillHistory sessions={sessions} onDelete={(id) => setSessions(deleteSession(id))} />
      ) : (
        <BunkerHistory sessions={bunker} onDelete={(id) => setBunker(deleteBunkerSession(id))} />
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="font-[family-name:var(--font-display)] text-3xl leading-none text-primary">
        {value}
      </p>
      <p className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}

function Chart({
  data,
  domain,
  ticks,
}: {
  data: { name: string; value: number }[];
  domain: [number, number | "auto"];
  ticks?: number[];
}) {
  return (
    <section className="mt-4 h-56 rounded-3xl border border-border bg-card p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
          <YAxis
            domain={domain}
            ticks={ticks}
            stroke="var(--color-muted-foreground)"
            fontSize={11}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-primary)"
            strokeWidth={3}
            connectNulls
            isAnimationActive={false}
            dot={{ r: 4, fill: "var(--color-primary)", stroke: "hsl(var(--card))", strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="mt-10 rounded-3xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}

function DrillHistory({
  sessions,
  onDelete,
}: {
  sessions: SessionRecord[];
  onDelete: (id: string) => void;
}) {
  if (sessions.length === 0)
    return <Empty text="Inga pass sparade ännu. Kör 18-bollarsdrillen så dyker resultaten upp här." />;

  const best = sessions.reduce((m, s) => Math.max(m, s.score), 0);
  const avg = sessions.reduce((a, s) => a + s.score, 0) / sessions.length;
  const allShots = sessions.flatMap((s) => s.shots);

  return (
    <>
      <section className="mt-4 grid grid-cols-3 gap-3 text-center">
        <Stat label="Pass" value={String(sessions.length)} />
        <Stat label="Snitt" value={formatScore(avg)} />
        <Stat label="Bäst" value={formatScore(best)} />
      </section>

      <Chart
        data={sessions.map((s, i) => ({ name: `#${i + 1}`, value: Number(s.score.toFixed(2)) }))}
        domain={[0, 3]}
        ticks={[0, 1, 2, 3]}
      />

      <section className="mt-4 rounded-3xl border border-border bg-card p-5">
        <h2 className="text-xl">Träffprocent per avstånd</h2>
        <div className="mt-3 space-y-3">
          {distanceStats(allShots).map((s) => {
            const pct = s.attempts ? Math.round((s.hits / s.attempts) * 100) : 0;
            return (
              <div key={s.distance}>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{s.distance}m</span>
                  <span>
                    {pct}% ({s.hits}/{s.attempts})
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-secondary">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-4 space-y-2">
        <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Alla pass</h2>
        {[...sessions].reverse().map((s) => (
          <Row
            key={s.id}
            big={formatScore(s.score)}
            date={s.date}
            info={`${s.shots.filter((x) => x.hit).length} träff av ${s.shots.length}`}
            onDelete={() => onDelete(s.id)}
          />
        ))}
      </section>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Avstånd: {DISTANCES.join(" / ")} meter · sparas lokalt på din telefon
      </p>
    </>
  );
}

function BunkerHistory({
  sessions,
  onDelete,
}: {
  sessions: BunkerSession[];
  onDelete: (id: string) => void;
}) {
  if (sessions.length === 0)
    return <Empty text="Inga bunkertester sparade ännu. Kör testet så dyker resultaten upp här." />;

  const best = Math.min(...sessions.map((s) => s.avgFeet));
  const avg = sessions.reduce((a, s) => a + s.avgFeet, 0) / sessions.length;

  const perLie = BUNKER_LIES.map((lie) => {
    const rows = sessions.flatMap((s) => s.shots.filter((x) => x.lie === lie));
    const total = rows.reduce((a, r) => a + r.feet, 0);
    return { lie, avg: rows.length ? total / rows.length : 0, count: rows.length };
  });
  const worst = Math.max(...perLie.map((p) => p.avg), 1);

  return (
    <>
      <section className="mt-4 grid grid-cols-3 gap-3 text-center">
        <Stat label="Test" value={String(sessions.length)} />
        <Stat label="Snitt fot" value={avg.toFixed(1)} />
        <Stat label="Bäst" value={best.toFixed(1)} />
      </section>

      <Chart
        data={sessions.map((s, i) => ({ name: `#${i + 1}`, value: Number(s.avgFeet.toFixed(1)) }))}
        domain={[0, "auto"]}
      />

      <section className="mt-4 rounded-3xl border border-border bg-card p-5">
        <h2 className="text-xl">Snitt per läge (fot)</h2>
        <div className="mt-3 space-y-3">
          {perLie.map((p) => (
            <div key={p.lie}>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{p.lie}</span>
                <span>{p.avg.toFixed(1)} fot</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-secondary">
                <div
                  className="h-2 rounded-full bg-flag"
                  style={{ width: `${Math.round((p.avg / worst) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 space-y-2">
        <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Alla test</h2>
        {[...sessions].reverse().map((s) => (
          <Row
            key={s.id}
            big={`${s.avgFeet.toFixed(1)}`}
            date={s.date}
            info={`${s.totalFeet} fot totalt · ${s.shots.filter((x) => !x.out).length} ej ur bunkern`}
            onDelete={() => onDelete(s.id)}
          />
        ))}
      </section>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Lägre snitt är bättre · sparas lokalt på din telefon
      </p>
    </>
  );
}

function Row({
  big,
  date,
  info,
  onDelete,
}: {
  big: string;
  date: string;
  info: string;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
      <div>
        <p className="font-[family-name:var(--font-display)] text-2xl leading-none text-primary">
          {big}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(date).toLocaleDateString("sv-SE", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          · {info}
        </p>
      </div>
      <button
        onClick={onDelete}
        className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
      >
        Ta bort
      </button>
    </div>
  );
}
