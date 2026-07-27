import { Link, createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import {
  POINTS_PER_PUTT,
  TORNADO_TOTAL,
  deleteTornadoSession,
  loadTornadoSessions,
  randomTornadoPutts,
  saveTornadoSession,
  tornadoStats,
  type TornadoPutt,
  type TornadoSession,
} from "@/lib/tornado";

export const Route = createFileRoute("/tornado")({
  head: () => ({
    meta: [
      { title: "Tornado drill – 10 puttar runt hålet | SG4" },
      {
        name: "description",
        content:
          "Tornado drill: 10 puttar i slumpad ordning – 3 från 1 m, 4 från 2 m och 3 från 3 m runt hålet. 10 poäng per isatt putt, max 100.",
      },
      { property: "og:title", content: "Tornado drill – 10 puttar runt hålet" },
      {
        property: "og:description",
        content: "Slumpade avstånd och positioner runt hålet. 10 poäng per putt, max 100 poäng.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TornadoPage,
});

function TornadoPage() {
  const [putts, setPutts] = useState<TornadoPutt[]>([]);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [sessions, setSessions] = useState<TornadoSession[]>([]);

  useEffect(() => {
    setPutts(randomTornadoPutts());
    setSessions(loadTornadoSessions());
  }, []);

  const played = done ? putts : putts.slice(0, index);
  const holed = played.filter((p) => p.holed).length;
  const points = holed * POINTS_PER_PUTT;
  const stats = tornadoStats(played);

  function commit(made: boolean) {
    setPutts(putts.map((p, i) => (i === index ? { ...p, holed: made } : p)));
    if (index + 1 >= TORNADO_TOTAL) setDone(true);
    else setIndex(index + 1);
  }

  function save() {
    setSessions((prev) => [...prev, saveTornadoSession(putts, notes)]);
    setNotes("");
    setSaved(true);
  }

  function reset() {
    setSaved(false);
    setPutts(randomTornadoPutts());
    setIndex(0);
    setDone(false);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-24 pt-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Puttning · 10 puttar
          </p>
          <h1 className="text-4xl leading-none">Tornado drill</h1>
        </div>
        <Link
          to="/kategori/$slug"
          params={{ slug: "puttning" }}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Tillbaka
        </Link>
      </header>

      <section className="mt-6 rounded-3xl border border-border bg-card p-6 text-center shadow-[var(--shadow-glow)]">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Poäng</p>
        <p className="font-[family-name:var(--font-display)] text-7xl leading-none text-flag">
          {points}
          <span className="ml-2 text-2xl text-muted-foreground">/ 100</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {holed} av {played.length || 0} isatta ·{" "}
          {done ? "klart" : `Putt ${Math.min(index + 1, TORNADO_TOTAL)} av ${TORNADO_TOTAL}`}
        </p>
      </section>

      {!putts.length ? null : done ? (
        <section className="mt-6 rounded-3xl border border-border bg-card p-6">
          <h2 className="text-2xl">Testet är klart</h2>
          <div className="mt-3 space-y-2 text-sm">
            {stats.map((s) => (
              <div key={s.distance} className="flex justify-between border-b border-border pb-1">
                <span className="text-muted-foreground">{s.distance} m</span>
                <span>
                  {s.holed}/{s.count} · {s.pct.toFixed(0)} %
                </span>
              </div>
            ))}
          </div>
          <label htmlFor="notes" className="mt-5 block text-sm text-muted-foreground">
            Anteckning (valfritt)
          </label>
          <input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Green, lutning, känsla…"
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
      ) : (
        <section className="mt-6 rounded-3xl border border-border bg-card p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Putt {index + 1} av {TORNADO_TOTAL}
          </p>
          <h2 className="text-3xl leading-tight">
            {putts[index].distance} meter · {putts[index].position}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ställ dig på angiven position runt hålet.
          </p>
          <button
            onClick={() => commit(true)}
            className="mt-5 w-full rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
          >
            I hål
          </button>
          <button
            onClick={() => commit(false)}
            className="mt-3 w-full rounded-2xl border border-border py-4 font-[family-name:var(--font-display)] text-2xl text-muted-foreground"
          >
            Miss
          </button>
        </section>
      )}

      {putts.length ? (
        <section className="mt-6">
          <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Alla puttar</h2>
          <div className="mt-3 space-y-2">
            {putts.map((p, i) => (
              <div
                key={i}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${
                  !done && i === index
                    ? "border-primary bg-primary/15"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                <span>
                  {i + 1}. {p.distance} m · {p.position}
                </span>
                <span>{done || i < index ? (p.holed ? "I hål" : "Miss") : "–"}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {sessions.length ? (
        <>
          <ChartCard
            title="Totalpoäng över tid"
            footer={
              <p className="text-xs text-muted-foreground">
                Poäng per pass (max 100). Tryck på grafen för helskärm.
              </p>
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="Poäng"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {overall ? (
            <section className="mt-6 rounded-3xl border border-border bg-card p-5">
              <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
                Avstånd – bäst och sämst
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-primary/40 bg-primary/10 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Bäst
                  </p>
                  <p className="font-[family-name:var(--font-display)] text-3xl leading-none">
                    {overall.best.distance} m
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {overall.best.pct.toFixed(0)} % ({overall.best.holed}/{overall.best.count})
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Sämst
                  </p>
                  <p className="font-[family-name:var(--font-display)] text-3xl leading-none text-flag">
                    {overall.worst.distance} m
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {overall.worst.pct.toFixed(0)} % ({overall.worst.holed}/{overall.worst.count})
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {overall.stats.map((s) => (
                  <div key={s.distance}>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{s.distance} m</span>
                      <span>
                        {s.holed}/{s.count} · {s.pct.toFixed(0)} %
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-border">
                      <div className="h-full bg-primary" style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-8">
            <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Historik</h2>
            <div className="mt-3 space-y-2">
              {[...sessions].reverse().map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm"
                >
                  <span className="text-muted-foreground">
                    {new Date(s.date).toLocaleDateString("sv-SE")}{" "}
                    {new Date(s.date).toLocaleTimeString("sv-SE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span>
                    {s.holed}/{s.putts.length} · {s.points} p
                  </span>
                  <button
                    onClick={() => setSessions(deleteTornadoSession(s.id))}
                    className="text-xs text-muted-foreground underline"
                  >
                    Ta bort
                  </button>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}


      <section className="mt-8 rounded-2xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">
        <h2 className="text-base text-foreground">Så funkar testet</h2>
        <p className="mt-2">
          Tio puttar runt hålet: 3 från 1 meter, 4 från 2 meter och 3 från 3 meter. Ordningen
          slumpas och varje putt tas från en ny position runt hålet. Varje isatt putt ger 10 poäng –
          sätter du alla får du 100 poäng.
        </p>
      </section>
    </main>
  );
}
