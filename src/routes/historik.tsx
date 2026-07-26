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

export const Route = createFileRoute("/historik")({
  head: () => ({
    meta: [
      { title: "Historik – följ din golfdrill över tid" },
      {
        name: "description",
        content:
          "Se alla dina 18-bollarspass, snittscore och träffprocent per avstånd så du kan följa utvecklingen över tid.",
      },
      { property: "og:title", content: "Historik – följ din golfdrill över tid" },
      {
        property: "og:description",
        content: "Snittscore, bästa pass och träffprocent per avstånd.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  const chartData = sessions.map((s, i) => ({
    name: `#${i + 1}`,
    score: Number(s.score.toFixed(2)),
  }));
  const best = sessions.reduce((m, s) => Math.max(m, s.score), 0);
  const avg = sessions.length ? sessions.reduce((a, s) => a + s.score, 0) / sessions.length : 0;
  const allShots = sessions.flatMap((s) => s.shots);

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
          Till drillen
        </Link>
      </header>

      {sessions.length === 0 ? (
        <p className="mt-10 rounded-3xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Inga pass sparade ännu. Kör drillen så dyker resultaten upp här.
        </p>
      ) : (
        <>
          <section className="mt-6 grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Pass", value: String(sessions.length) },
              { label: "Snitt", value: formatScore(avg) },
              { label: "Bäst", value: formatScore(best) },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
                <p className="font-[family-name:var(--font-display)] text-3xl leading-none text-primary">
                  {s.value}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                  {s.label}
                </p>
              </div>
            ))}
          </section>

          <section className="mt-4 h-56 rounded-3xl border border-border bg-card p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis
                  domain={[0, 3]}
                  ticks={[0, 1, 2, 3]}
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--color-primary)"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "var(--color-primary)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </section>

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
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                        aria-hidden
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mt-4 space-y-2">
            <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Alla pass</h2>
            {[...sessions].reverse().map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
              >
                <div>
                  <p className="font-[family-name:var(--font-display)] text-2xl leading-none text-primary">
                    {formatScore(s.score)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.date).toLocaleDateString("sv-SE", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {s.shots.filter((x) => x.hit).length} träff av {s.shots.length}
                  </p>
                </div>
                <button
                  onClick={() => setSessions(deleteSession(s.id))}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                >
                  Ta bort
                </button>
              </div>
            ))}
          </section>
        </>
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Avstånd: {DISTANCES.join(" / ")} meter · sparas lokalt på din telefon
      </p>
    </main>
  );
}
